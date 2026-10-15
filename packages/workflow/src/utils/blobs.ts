import crypto from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { VertesiaClient } from '@vertesia/client';
import tmp from 'tmp';
import { DocumentNotFoundError, FileTooLargeError } from '../errors.js';

tmp.setGracefulCleanup();

export async function fetchBlobAsStream(client: VertesiaClient, blobUri: string): Promise<ReadableStream<Uint8Array>> {
    try {
        return await client.files.downloadFile(blobUri);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes('not found')) {
            //TODO improve error handling with a fetch fail error class in the client
            throw new DocumentNotFoundError(`Not found at ${blobUri}: ${message}`, []);
        } else if (message.includes('forbidden')) {
            throw new DocumentNotFoundError(`Forbidden at ${blobUri}: ${message}`);
        } else {
            throw new Error(`Failed to download blob ${blobUri}: ${message}`);
        }
    }
}
export interface FetchBlobOptions {
    /**
     * The most bytes to read. A larger blob stops the download as soon as it goes over, and throws a
     * {@link FileTooLargeError}, so a huge file costs at most this much memory or disk.
     */
    maxBytes?: number;
}

export async function fetchBlobAsBuffer(
    client: VertesiaClient,
    blobUri: string,
    options: FetchBlobOptions = {},
): Promise<Buffer> {
    const { maxBytes } = options;
    const stream = await fetchBlobAsStream(client, blobUri);
    const buffers: Uint8Array[] = [];
    let size = 0;
    // Throwing out of the loop cancels the stream, which aborts the download.
    for await (const data of stream) {
        size += data.byteLength;
        if (maxBytes !== undefined && size > maxBytes) {
            throw new FileTooLargeError(blobUri, maxBytes);
        }
        buffers.push(data);
    }
    return Buffer.concat(buffers);
}

export async function fetchBlobAsBase64(client: VertesiaClient, blobUri: string): Promise<string> {
    const buffer = await fetchBlobAsBuffer(client, blobUri);
    return buffer.toString('base64');
}

/** Passes bytes through until more than `maxBytes` went by, then fails the pipeline. */
function limitBytes(blobUri: string, maxBytes: number): Transform {
    let size = 0;
    return new Transform({
        transform(chunk: Buffer, _encoding, callback) {
            size += chunk.length;
            if (size > maxBytes) {
                callback(new FileTooLargeError(blobUri, maxBytes));
            } else {
                callback(null, chunk);
            }
        },
    });
}

async function saveBlobToFile(
    client: VertesiaClient,
    blobUri: string,
    toFile: string,
    options: FetchBlobOptions,
): Promise<void> {
    const stream = await fetchBlobAsStream(client, blobUri);

    const nodeReadable = Readable.from(stream);
    const out = createWriteStream(toFile);

    // Ensures completion before continuing. On failure, pipeline destroys the source, which aborts the download.
    if (options.maxBytes === undefined) {
        await pipeline(nodeReadable, out);
    } else {
        await pipeline(nodeReadable, limitBytes(blobUri, options.maxBytes), out);
    }
}

export async function saveBlobToTempFile(
    client: VertesiaClient,
    blobUri: string,
    fileExt?: string,
    options: FetchBlobOptions = {},
): Promise<string> {
    const tmpFile = tmp.fileSync({
        prefix: 'vertesia-activity-',
        postfix: fileExt ? `.${fileExt}` : '',
    });
    try {
        await saveBlobToFile(client, blobUri, tmpFile.name, options);
        return tmpFile.name;
    } catch (err: unknown) {
        try {
            tmpFile.removeCallback();
        } catch {
            // Preserve the download failure, which is the actionable error for the caller.
        }
        throw err;
    }
}

export function md5(contents: string) {
    return crypto.createHash('md5').update(contents).digest('hex');
}
