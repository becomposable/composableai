import { ComposableClient, StreamSource } from "@becomposable/client";
import { Command } from "commander";
import { createReadStream } from "fs";
import { readableToWebStream } from "node-web-stream-adapters";
import { getClient } from "../client.js";

export function getPublishMemoryAction(program: Command) {
    return (file: string, name: string) => {
        const client = getClient(program);
        return publishMemory(client, file, name);
    }
}

async function publishMemory(client: ComposableClient, file: string, name: string) {
    const stream = readableToWebStream(createReadStream(file));
    const path = await client.files.uploadMemoryPack(new StreamSource(stream,
        name,
        "application/gzip"
    ));
    return path;
}
