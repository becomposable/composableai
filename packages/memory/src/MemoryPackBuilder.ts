import { writeFile } from "fs/promises";
import { Builder } from "./Builder.js";
import { ContentSource } from "./ContentSource.js";
import { MEMORY_METADATA_ENTRY, MemoryPack, ProjectionProperties } from "./MemoryPack.js";
import { normalizePath, TarBuilder } from "./utils/tar.js";
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import zlib from 'node:zlib';
import { Readable } from "stream";

export interface FromOptions {
    files?: string[];
    projection?: ProjectionProperties;
}

export class MemoryPackBuilder {
    baseContext: any;
    entries: { [path: string]: ContentSource } = {};

    constructor(public builder: Builder) {
    }

    async load(memory: MemoryPack, options: FromOptions = {}) {
        const files = options.files || [];
        // do not fetch the context entry an the .index file
        files.push(`!${MEMORY_METADATA_ENTRY}`);
        const entries = memory.getEntries(files);
        for (const entry of entries) {
            this.add(entry.name, entry);
        }
        this.baseContext = await memory.getMetadata(options.projection);
    }

    add(path: string, content: ContentSource) {
        path = normalizePath(path);
        this.entries[path] = content;
    }

    stringifyContext(context: object) {
        return JSON.stringify(context, undefined, this.builder.options.indent || undefined);
    }

    private async _buildTar(file: string, context: object) {
        if (this.builder.options.gzip) {
            file += ".gz";
        }
        const tar = new TarBuilder(file);
        const keys = Object.keys(this.entries).sort();
        for (const key of keys) {
            const source = this.entries[key];
            tar.add(key, await source.getContent());
        }
        tar.add(MEMORY_METADATA_ENTRY, Buffer.from(this.stringifyContext(context), "utf-8"));
        await tar.build();
        return file;
    }

    private async _buildJson(file: string, context: object) {
        const buffer = Buffer.from(this.stringifyContext(context), "utf-8");
        if (this.builder.options.gzip) {
            file += ".gz";
            await pipeline(
                Readable.from(buffer),
                zlib.createGzip(),
                createWriteStream(file)
            );
        } else {
            await writeFile(file, buffer);
        }
        return file;
    }

    build(baseName: string, context: Record<string, any> = {}) {
        if (this.baseContext) {
            context = Object.assign({}, this.baseContext, context);
        }
        if (!Object.keys(this.entries).length) {
            return this._buildJson(baseName + '.json', context);
        } else {
            return this._buildTar(baseName + '.tar', context);
        }
    }
}
