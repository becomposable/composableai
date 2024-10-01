import { Command } from "commander";
import { getClient } from "../client.js"
import { ComposableClient, StreamSource } from "@becomposable/client";
import { createReadableStreamFromReadable } from "node-web-stream-adapters";
import { createReadStream } from "fs";

export function getPublishMemoryAction(program: Command) {
    return (file: string, name: string) => {
        const client = getClient(program);
        return publishMemory(client, file, name);
    }
}

async function publishMemory(client: ComposableClient, file: string, name: string) {

    const fileId = `memories/${name}`;
    console.log('Publishing memory to', fileId)

    const stream = createReadableStreamFromReadable(createReadStream(file));
    await client.objects.upload(new StreamSource(stream,
        `${name}.tar.gz`,
        "application/gzip",
        fileId
    ));

    return fileId;
}
