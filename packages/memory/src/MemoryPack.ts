import { readFile } from "fs/promises";
import micromatch from 'micromatch';
import { AbstractContentSource } from "./ContentSource.js";
import { TarEntryIndex, loadTarIndex, TarIndex } from "./tar.js";

export const MEMORY_CONTEXT_ENTRY = "context.json";

/**
 * Projection cannot contains both include and exclude keys
 */
export interface ProjectionProperties {
    [key: string]: boolean | 0 | 1;
}

function applyProjection(projection: ProjectionProperties, object: any) {
    const keys = Object.keys(projection);
    if (keys.length < 1) {
        return object;
    }
    const isInclusion = !!projection[keys[0]];
    const out: any = {};
    if (isInclusion) {
        for (const key of Object.keys(object)) {
            if (projection[key]) {
                out[key] = object[key];
            }
        }
    } else {
        for (const key of Object.keys(object)) {
            const value = projection[key];
            if (value === undefined || value) {
                out[key] = object[key];
            }
        }
    }
    return out;
}


export interface MemoryPack {
    getContext(projection?: ProjectionProperties): Promise<any>;
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
    constructor(public index: TarIndex) {
        if (!index.get(MEMORY_CONTEXT_ENTRY)) {
            throw new Error("Invalid memory tar file. Context entry not found");
        }
    }
    async getContext(projection?: ProjectionProperties) {
        const content = await this.index.getContent(MEMORY_CONTEXT_ENTRY);
        if (content) {
            let context = JSON.parse(content.toString('utf-8'));
            if (projection) {
                context = applyProjection(projection, context);
            }
            return context;
        } else {
            throw new Error("Invalid memory tar file. Context entry not found");
        }
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
            const entry: TarEntryIndex = index.get(path);
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

export function loadMemoryPack(location: string, type?: 'tar' | 'json'): Promise<MemoryPack> {
    // TODO we only support file paths as location for now
    if (!type) {
        if (location.endsWith('.tar')) {
            type = 'tar';
        } else if (location.endsWith('.json')) {
            type = 'json';
        } else {
            throw new Error("Invalid memory pack file extension. Expecting .tar or .json");
        }
    }
    if (type === 'tar') {
        return TarMemoryPack.loadFile(location);
    } else {
        return JsonMemoryPack.loadFile(location);
    }
}