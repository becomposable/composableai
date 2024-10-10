import { Command } from "commander";
import { getClient } from "../client.js"
import { ComposableClient, StreamSource } from "@becomposable/client";
import { createReadStream } from "fs";
import { readableToWebStream } from "node-web-stream-adapters";

export function getPublishMemoryAction(program: Command) {
    return (file: string, name: string) => {
        const client = getClient(program);
        return publishMemory(client, file, name);
    }
}

async function publishMemory(client: ComposableClient, file: string, name: string) {
    const fileId = `memories/${name}`;
    const stream = readableToWebStream(createReadStream(file));
    await client.memory.uploadMemoryPack(new StreamSource(stream,
        `${name}.tar.gz`,
        "application/gzip",
        fileId
    ));
    return fileId;
}
