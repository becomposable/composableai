import { readFile } from "fs/promises";
import micromatch from 'micromatch';
import { AbstractContentSource } from "./source";
import { EntryIndex, loadTarIndex, TarIndex } from "./tar";

export const MEMORY_CONTEXT_ENTRY = "context.json";

export interface MemoryPack {
    getContext(): Promise<any>;
    getEntry(path: string): MemoryEntry | null;
    getEntries(filters?: string[]): MemoryEntry[];
}


export class MemoryEntry extends AbstractContentSource {
    constructor(public index: TarIndex, public name: string, public offset: number, public size: number) {
        super();
    }
    getContent(): Promise<Buffer> {
        return this.index.getContentAt(this.offset, this.size);
    }
}

export class TarMemoryPack implements MemoryPack {
    context: Promise<any> | undefined;
    constructor(public index: TarIndex) {
        if (!index.get(MEMORY_CONTEXT_ENTRY)) {
            throw new Error("Invalid memory tar file. Context entry not found");
        }
    }
    async getContext() {
        if (!this.context) {
            const content = await this.index.getContent(MEMORY_CONTEXT_ENTRY);
            if (content) {
                this.context = JSON.parse(content.toString('utf-8'));
            } else {
                throw new Error("Invalid memory tar file. Context entry not found");
            }
        }
        return this.context;
    }

    getEntries(filters?: string[]) {
        let paths = this.index.getSortedPaths();
        if (filters && filters.length > 0) {
            paths = micromatch(paths, filters);
        }
        return this._getEntries(paths);
    }

    private _getEntries(paths: string[]) {
        const entries: MemoryEntry[] = [];
        const index = this.index;
        for (const path of paths) {
            const entry: EntryIndex = index.get(path);
            entries.push(new MemoryEntry(index, path, entry.offset, entry.size));
        }
        return entries;
    }

    getEntry(path: string) {
        const entry = this.index.get(path);
        return entry ? new MemoryEntry(this.index, path, entry.offset, entry.size) : null;
    }

    static async loadFile(file: string) {
        const index = await loadTarIndex(file);
        if (!index) {
            throw new Error("Invalid memory tar file. Cannot load index");
        }
        return new TarMemoryPack(index);
    }

}

export class JsonMemoryPack implements MemoryPack {
    constructor(public context: any) {
    }

    getContext() {
        return Promise.resolve(this.context);
    }

    getEntry(_path: string) {
        return null;
    }

    getEntries(_filters?: string[]): MemoryEntry[] {
        return [];
    }

    static async loadFile(file: string) {
        return new JsonMemoryPack(JSON.parse(await readFile(file, 'utf-8')));
    }
}
