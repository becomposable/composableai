import { ComposableClient } from "@becomposable/client";
import crypto from "crypto";
import { createWriteStream } from "fs";
import tmp from "tmp";
import { NoDocumentFound } from "../errors.js";

tmp.setGracefulCleanup();

export async function fetchBlobAsStream(client: ComposableClient, blobName: string): Promise<ReadableStream<Uint8Array>> {
    try {
        return await client.files.downloadFile(blobName);
    } catch (err: any) {
        throw new NoDocumentFound(`Blob ${blobName} not found`, []);
    }
}
export async function fetchBlobAsBuffer(client: ComposableClient, blobName: string): Promise<Buffer> {
    let stream = await fetchBlobAsStream(client, blobName);
    const buffers: Uint8Array[] = [];
    for await (const data of stream) {
        buffers.push(data);
    }
    return Buffer.concat(buffers);
}

export async function fetchBlobAsBase64(client: ComposableClient, blobName: string): Promise<string> {
    const buffer = await fetchBlobAsBuffer(client, blobName);
    return buffer.toString('base64');
}

export async function saveBlobToFile(client: ComposableClient, blobName: string, toFile: string): Promise<void> {
    let stream = await fetchBlobAsStream(client, blobName);
    const out = createWriteStream(toFile);
    await writeChunksToStream(stream, out);
}

export async function saveBlobToTempFile(client: ComposableClient, blobName: string, fileExt?: string): Promise<string> {
    const tmpFile = tmp.fileSync({
        prefix: "composable-activity-",
        postfix: fileExt,
        discardDescriptor: true
    });
    await saveBlobToFile(client, blobName, tmpFile.name);
    return tmpFile.name;
}

async function writeChunksToStream(chunks: AsyncIterable<Uint8Array>, out: NodeJS.WritableStream) {
    for await (const chunk of chunks) {
        if (!out.write(chunk)) {
            // If the internal buffer is full, wait until it's drained
            await new Promise(resolve => out.once('drain', resolve));
        }
    }
    out.end(); // Close the stream when done
}

export function md5(contents: string) {
    return crypto.createHash('md5').update(contents).digest("hex");
}
