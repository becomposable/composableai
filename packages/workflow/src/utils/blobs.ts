import crypto from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { rm } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { VertesiaClient } from '@vertesia/client';
import tmp from 'tmp';
import { DocumentNotFoundError } from '../errors.js';

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
export async function fetchBlobAsBuffer(client: VertesiaClient, blobUri: string): Promise<Buffer> {
    const stream = await fetchBlobAsStream(client, blobUri);
    const buffers: Uint8Array[] = [];
    for await (const data of stream) {
        buffers.push(data);
    }
    return Buffer.concat(buffers);
}

export async function fetchBlobAsBase64(client: VertesiaClient, blobUri: string): Promise<string> {
    const buffer = await fetchBlobAsBuffer(client, blobUri);
    return buffer.toString('base64');
}

async function saveBlobToFile(client: VertesiaClient, blobUri: string, toFile: string): Promise<void> {
    const stream = await fetchBlobAsStream(client, blobUri);

    const nodeReadable = Readable.from(stream);
    // 'wx' creates the file exclusively; the stream closes its own descriptor once the pipeline settles.
    const out = createWriteStream(toFile, { flags: 'wx', mode: 0o600 });

    await pipeline(nodeReadable, out); // Ensures completion before continuing
}

/**
 * Download a blob to a new temporary file and return its path.
 *
 * The caller owns the file and must remove it (e.g. `fs.promises.rm(path, { force: true })` in a `finally`).
 * No descriptor is left open and nothing is registered for exit-time cleanup, so removing the path frees its space.
 */
export async function saveBlobToTempFile(client: VertesiaClient, blobUri: string, fileExt?: string): Promise<string> {
    const fileName = tmp.tmpNameSync({
        prefix: 'vertesia-activity-',
        postfix: fileExt ? `.${fileExt.replace(/^\./, '')}` : '',
    });
    try {
        await saveBlobToFile(client, blobUri, fileName);
        return fileName;
    } catch (err: unknown) {
        // Preserve the download failure, which is the actionable error for the caller. EEXIST means the exclusive
        // create found someone else's file at this name, which is not ours to remove.
        if ((err as NodeJS.ErrnoException).code !== 'EEXIST') {
            await rm(fileName, { force: true }).catch(() => undefined);
        }
        throw err;
    }
}

export function md5(contents: string) {
    return crypto.createHash('md5').update(contents).digest('hex');
}
