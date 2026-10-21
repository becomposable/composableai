import { type LookupAddress, lookup } from 'node:dns';
import { request as httpRequest, type IncomingMessage } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { BlockList, isIP, type LookupFunction } from 'node:net';
import type { Readable } from 'node:stream';
import { createBrotliDecompress, createGunzip, createInflate } from 'node:zlib';

// Every IANA special-purpose IPv4 range, plus multicast and the reserved block: loopback, private,
// link-local (which holds the cloud metadata address 169.254.169.254), CGNAT and documentation ranges.
// https://www.iana.org/assignments/iana-ipv4-special-registry/
const blocked4 = new BlockList();
for (const [address, prefix] of [
    ['0.0.0.0', 8],
    ['10.0.0.0', 8],
    ['100.64.0.0', 10],
    ['127.0.0.0', 8],
    ['169.254.0.0', 16],
    ['172.16.0.0', 12],
    ['192.0.0.0', 24],
    ['192.0.2.0', 24],
    ['192.31.196.0', 24],
    ['192.52.193.0', 24],
    ['192.88.99.0', 24],
    ['192.168.0.0', 16],
    ['192.175.48.0', 24],
    ['198.18.0.0', 15],
    ['198.51.100.0', 24],
    ['203.0.113.0', 24],
    ['224.0.0.0', 4],
    ['240.0.0.0', 4],
] as const) {
    blocked4.addSubnet(address, prefix, 'ipv4');
}
// IPv6 special-purpose ranges, including every prefix that embeds or translates an IPv4 address. A
// separate list: BlockList matches IPv4 addresses against IPv4-mapped IPv6 rules, so ::ffff:0:0/96 in
// the IPv4 list would block every IPv4 address.
// https://www.iana.org/assignments/iana-ipv6-special-registry/
const blocked6 = new BlockList();
for (const [address, prefix] of [
    ['::', 96],
    ['::ffff:0:0', 96],
    ['64:ff9b::', 96],
    ['64:ff9b:1::', 48],
    ['100::', 64],
    ['2001::', 23],
    ['2001:db8::', 32],
    ['2002::', 16],
    ['3fff::', 20],
    ['5f00::', 16],
    ['fc00::', 7],
    ['fe80::', 10],
    ['fec0::', 10],
    ['ff00::', 8],
] as const) {
    blocked6.addSubnet(address, prefix, 'ipv6');
}

/**
 * True when `address` is an IP address that is safe to reach from a server: not loopback, private,
 * link-local, metadata, CGNAT, multicast, documentation or otherwise reserved.
 */
export function isPublicAddress(address: string): boolean {
    const family = isIP(address);
    if (family === 4) {
        return !blocked4.check(address, 'ipv4');
    }
    if (family === 6) {
        return !blocked6.check(address, 'ipv6');
    }
    return false;
}

/** The URL, a redirect target or a resolved address is not allowed. Nothing was sent to that host. */
export class UnsafeUrlError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'UnsafeUrlError';
    }
}

/** The fetch was allowed but did not complete: timeout, too many redirects, or an oversized body. */
export class SafeFetchError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
        this.name = 'SafeFetchError';
    }
}

export interface SafeFetchOptions {
    /** Request headers, sent on every hop. */
    headers?: Record<string, string>;
    /** Accept `http:` URLs as well as `https:`. Defaults to false. */
    allowHttp?: boolean;
    /** Redirects to follow before failing. Defaults to 5. */
    maxRedirects?: number;
    /** Deadline for the whole chain, DNS and body included. Defaults to 15000. */
    timeoutMs?: number;
    /** Largest body accepted, after decompression. Defaults to 5 MiB. */
    maxBytes?: number;
    /**
     * Decides whether an address may be connected to. Defaults to {@link isPublicAddress}. Override it
     * only for tests or trusted local development.
     */
    allowAddress?: (address: string) => boolean;
}

const DEFAULT_MAX_REDIRECTS = 5;
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;

/**
 * GET a caller-supplied URL from a tool server without letting it reach internal hosts (SSRF).
 *
 * - Only `https:` (and `http:` with `allowHttp`) URLs without credentials are accepted.
 * - The address is checked inside the socket's own DNS lookup, against every address the name resolves
 *   to, so the connection goes to exactly the address that passed and DNS cannot be rebound in between.
 *   IP literals are checked before connecting.
 * - Redirects are followed by hand, each target checked the same way, up to `maxRedirects`.
 * - One deadline covers the whole chain, and the body is capped at `maxBytes` after decompression.
 *
 * Resolves with the final response, its body fully read. A non-2xx status is returned, not thrown.
 *
 * @throws {UnsafeUrlError} when the URL, a redirect target or a resolved address is refused
 * @throws {SafeFetchError} on timeout, too many redirects or an oversized body
 */
export async function safeFetch(url: string, options: SafeFetchOptions = {}): Promise<Response> {
    const {
        allowHttp = false,
        maxRedirects = DEFAULT_MAX_REDIRECTS,
        timeoutMs = DEFAULT_TIMEOUT_MS,
        maxBytes = DEFAULT_MAX_BYTES,
        allowAddress = isPublicAddress,
    } = options;
    const signal = AbortSignal.timeout(timeoutMs);
    let current = parseTarget(url, allowHttp, allowAddress);
    for (let redirects = 0; ; redirects++) {
        const res = await send(current, options.headers ?? {}, signal, timeoutMs, allowAddress);
        const location = res.headers.location;
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400 && location) {
            res.destroy();
            if (redirects >= maxRedirects) {
                throw new SafeFetchError(`Too many redirects (more than ${maxRedirects})`);
            }
            current = parseTarget(new URL(location, current).toString(), allowHttp, allowAddress);
            continue;
        }
        const body = await readBody(res, maxBytes, signal, timeoutMs);
        const headers = new Headers();
        for (const [name, value] of Object.entries(res.headers)) {
            // The body is already decoded, so its original encoding and length no longer apply.
            if (value === undefined || name === 'content-encoding' || name === 'content-length') {
                continue;
            }
            for (const v of Array.isArray(value) ? value : [value]) {
                headers.append(name, v);
            }
        }
        const nullBody = status === 204 || status === 205 || status === 304;
        const response = new Response(nullBody ? null : new Uint8Array(body), { status, headers });
        Object.defineProperty(response, 'url', { value: current.toString() });
        return response;
    }
}

function parseTarget(url: string, allowHttp: boolean, allowAddress: (address: string) => boolean): URL {
    let target: URL;
    try {
        target = new URL(url);
    } catch {
        throw new UnsafeUrlError('Invalid URL');
    }
    if (target.protocol !== 'https:' && !(allowHttp && target.protocol === 'http:')) {
        throw new UnsafeUrlError(`URL scheme ${target.protocol} is not allowed`);
    }
    if (target.username || target.password) {
        throw new UnsafeUrlError('URLs with credentials are not allowed');
    }
    // net.connect skips the lookup hook for an IP literal, so check it here.
    const literal = target.hostname.replace(/^\[|\]$/g, '');
    if (isIP(literal) && !allowAddress(literal)) {
        throw new UnsafeUrlError(`Address ${literal} is not public`);
    }
    return target;
}

function guardedLookup(allowAddress: (address: string) => boolean): LookupFunction {
    return (hostname, options, callback) => {
        lookup(hostname, { all: true }, (error, addresses: LookupAddress[]) => {
            if (error) {
                callback(error, '', 4);
                return;
            }
            const refused = addresses.find(({ address }) => !allowAddress(address));
            if (refused || addresses.length === 0) {
                callback(new UnsafeUrlError(`Host ${hostname} resolves to an address that is not public`), '', 4);
            } else if (options.all) {
                callback(null, addresses);
            } else {
                callback(null, addresses[0].address, addresses[0].family);
            }
        });
    };
}

function send(
    target: URL,
    headers: Record<string, string>,
    signal: AbortSignal,
    timeoutMs: number,
    allowAddress: (address: string) => boolean,
): Promise<IncomingMessage> {
    const request = target.protocol === 'https:' ? httpsRequest : httpRequest;
    return new Promise((resolve, reject) => {
        const req = request(
            target,
            {
                method: 'GET',
                headers: { 'accept-encoding': 'gzip, deflate, br', ...headers },
                // A fresh socket per request: never reuse a connection made for another host or address.
                agent: false,
                signal,
                lookup: guardedLookup(allowAddress),
            },
            resolve,
        );
        req.on('error', (error) => reject(toFetchError(error, signal, timeoutMs)));
        req.end();
    });
}

async function readBody(
    res: IncomingMessage,
    maxBytes: number,
    signal: AbortSignal,
    timeoutMs: number,
): Promise<Buffer> {
    if (Number(res.headers['content-length']) > maxBytes) {
        res.destroy();
        throw new SafeFetchError(`Response is larger than ${maxBytes} bytes`);
    }
    const encoding = res.headers['content-encoding']?.toLowerCase();
    let stream: Readable = res;
    if (encoding === 'gzip' || encoding === 'x-gzip') {
        stream = res.pipe(createGunzip());
    } else if (encoding === 'deflate') {
        stream = res.pipe(createInflate());
    } else if (encoding === 'br') {
        stream = res.pipe(createBrotliDecompress());
    }
    const chunks: Buffer[] = [];
    let size = 0;
    try {
        for await (const chunk of stream) {
            size += (chunk as Buffer).length;
            if (size > maxBytes) {
                throw new SafeFetchError(`Response is larger than ${maxBytes} bytes`);
            }
            chunks.push(chunk as Buffer);
        }
    } catch (error) {
        throw toFetchError(error, signal, timeoutMs);
    } finally {
        res.destroy();
        if (stream !== res) {
            stream.destroy();
        }
    }
    return Buffer.concat(chunks);
}

function toFetchError(error: unknown, signal: AbortSignal, timeoutMs: number): unknown {
    if (error instanceof UnsafeUrlError || error instanceof SafeFetchError) {
        return error;
    }
    if (signal.aborted) {
        return new SafeFetchError(`Request timed out after ${timeoutMs} ms`, { cause: error });
    }
    return error;
}
