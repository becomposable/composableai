import { join } from "path";
import { Builder } from "./Builder";
import { writeFile } from "fs/promises";
import { MEMORY_CONTEXT_ENTRY, MemoryPack } from "./MemoryPack";
import { ContentSource } from "./source";
import { normalizePath, TarBuilder } from "./tar";


export class MemoryPackBuilder {
    context: any;
    entries: { [path: string]: ContentSource } = {};

    constructor(public builder: Builder) {
    }

    async load(memory: MemoryPack, filters: string[] = []) {
        // do not fetch the context entry
        filters.push(`!${MEMORY_CONTEXT_ENTRY}`);
        const entries = memory.getEntries(filters);
        for (const entry of entries) {
            this.add(entry.name, entry);
        }
    }

    add(path: string, content: ContentSource) {
        path = normalizePath(path);
        this.entries[path] = content;
    }

    private async _buildTar(file: string) {
        const tar = new TarBuilder(file);
        const keys = Object.keys(this.entries).sort();
        for (const key of keys) {
            const source = this.entries[key];
            tar.add(key, await source.getContent());
        }
        tar.add(MEMORY_CONTEXT_ENTRY, Buffer.from(JSON.stringify(this.context), "utf-8"));
        await tar.build();
    }

    private async _buildJson(file: string) {
        await writeFile(file, JSON.stringify(this.context), "utf-8");
    }

    build() {
        if (!this.entries.length) {
            return this._buildJson(join(this.builder.tmpdir, '.memory.json'));
        } else {
            return this._buildTar(join(this.builder.tmpdir, '.memory.tar'));
        }
    }
}
