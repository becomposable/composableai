import { StreamSource } from "@composableai/studio-client";
import { Command } from "commander";
import { Dirent, Stats, createReadStream } from "fs";
import { readdir, stat } from "fs/promises";
import { glob } from 'glob';
import { createReadableStreamFromReadable } from "node-web-stream-adapters";
import { basename, join, resolve } from "path";
import { getClient } from "../client.js";

function splitInChunksWithSize<T>(arr: Array<T>, size: number): T[][] {
    if (size < 1) {
        return [];
    }
    const chunks: T[][] = [];
    const len = arr.length;
    let i = 0;
    while (i < len) {
        chunks.push(arr.slice(i, i + size));
        i += size;
    }
    return chunks;
}

function splitInChunks<T>(arr: Array<T>, chunksCount: number): T[][] {
    if (arr.length < 1) {
        return [];
    }
    if (chunksCount <= arr.length) {
        const size = Math.ceil(arr.length / chunksCount);
        return splitInChunksWithSize(arr, size);
    } else {
        return [arr];
    }
}

async function listFilesInDirectory(dir: string, recursive = false): Promise<string[]> {
    return await readdir(dir, {
        withFileTypes: true,
        recursive,
    }).then((ents: Dirent[]) => ents.filter(ent => {
        // eclude hidden files and include only file with extensions
        return ent.isFile() && ent.name.lastIndexOf('.') > 0;
    }).map(ent => join(ent.path || '', ent.name)));
}


export async function createObject(program: Command, files: string[], options: Record<string, any>) {
    if (files.length === 0) {
        return "No files specified"
    } else if (files.length > 1) {
        return createObjectFromFiles(program, files, options);
    } else {
        let file = files[0];
        if (file.indexOf('*') > -1) {
            const files = await glob(file);
            return createObjectFromFiles(program, files, options);
        } else {
            file = resolve(file);
            let stats: Stats;
            try {
                stats = await stat(file);
            } catch (err: any) {
                if (err.code === 'ENOENT') {
                    console.error('No such file or directory: ', file);
                    process.exit(2);
                }
                console.error(err);
                process.exit(2);
            }
            if (stats.isFile()) {
                createObjectFromFile(program, file, options);
            } else if (stats.isDirectory()) {
                const files = await listFilesInDirectory(file, options.recursive || false);
                return createObjectFromFiles(program, files, options);
            }
        }
    }
}


export async function createObjectFromFiles(program: Command, files: string[], options: Record<string, any>) {
    if (!options) options = {};
    // split in 10 chunks
    const chunks = splitInChunks(files, 10);
    Promise.all(chunks.map(async (chunk) => {
        for (const file of chunk) {
            await createObjectFromFile(program, file, options);
        }
    }));
}

export async function createObjectFromFile(program: Command, file: string, options: Record<string, any>) {
    const fileName = basename(file);
    const client = getClient(program);
    const stream = createReadStream(file);

    const res = await client.objects.create({
        name: options.name || fileName,
        type: options.type,
        location: options.path,
        content: new StreamSource(createReadableStreamFromReadable(stream), fileName),
    });

    console.log('Created object', res.id);
}

export async function deleteObject(program: Command, objectId: string, _options: Record<string, any>) {
    await getClient(program).objects.delete(objectId);
}

export async function getObject(program: Command, objectId: string, _options: Record<string, any>) {
    const object = await getClient(program).objects.retrieve(objectId);
    console.log(object);
}

//@ts-ignore
export async function listObjects(program: Command, folderPath: string | undefined, _options: Record<string, any>) {
    const objects = await getClient(program).objects.list();
    console.log(objects.map(o => `${o.id}\t ${o.name}`).join('\n'));
}
