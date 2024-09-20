import { writeFile } from "fs/promises";
import { join } from "path";
import { Builder } from "./Builder.js";
import { ContentSource } from "./ContentSource.js";
import { MEMORY_CONTEXT_ENTRY, MemoryPack, ProjectionProperties } from "./MemoryPack.js";
import { normalizePath, TarBuilder } from "./tar.js";

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
        files.push(`!${MEMORY_CONTEXT_ENTRY}`);
        const entries = memory.getEntries(files);
        for (const entry of entries) {
            this.add(entry.name, entry);
        }
        this.baseContext = await memory.getContext(options.projection);
    }

    add(path: string, content: ContentSource) {
        path = normalizePath(path);
        this.entries[path] = content;
    }

    stringifyContext(context: object) {
        return JSON.stringify(context, undefined, this.builder.options.indent || undefined);
    }

    private async _buildTar(file: string, context: object) {
        const tar = new TarBuilder(file);
        const keys = Object.keys(this.entries).sort();
        for (const key of keys) {
            const source = this.entries[key];
            tar.add(key, await source.getContent());
        }
        tar.add(MEMORY_CONTEXT_ENTRY, Buffer.from(this.stringifyContext(context), "utf-8"));
        await tar.build();
        return file;
    }

    private async _buildJson(file: string, context: object) {
        await writeFile(file, this.stringifyContext(context), "utf-8");
        return file;
    }

    build(baseName: string, context: Record<string, any> = {}) {
        if (this.baseContext) {
            context = Object.assign({}, this.baseContext, context);
        }
        if (!this.entries.length) {
            return this._buildJson(join(this.builder.tmpdir, baseName + '.json'), context);
        } else {
            return this._buildTar(join(this.builder.tmpdir, baseName + '.tar'), context);
        }
    }
}
