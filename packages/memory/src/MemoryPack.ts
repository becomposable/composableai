import { readFile } from "fs/promises";
import micromatch from 'micromatch';
import { AbstractContentSource } from "./ContentSource.js";
import { loadTarIndex, TarEntryIndex, TarIndex } from "./utils/tar.js";

export const MEMORY_METADATA_ENTRY = "metadata.json";

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
    getMetadata(projection?: ProjectionProperties): Promise<any>;
    getEntry(path: string): MemoryEntry | null;
    getEntries(filters?: string[]): MemoryEntry[];
    getEntryContent(path: string): Promise<Buffer | null>;
    getEntryText(path: string, encoding?: BufferEncoding): Promise<string | null>;
    getEntriesContent(filters?: string[]): Promise<Buffer[]>;
    getEntriesText(filters?: string[], encoding?: BufferEncoding): Promise<string[]>;
}


export class MemoryEntry extends AbstractContentSource {
    constructor(public index: TarIndex, public name: string, public offset: number, public size: number) {
        super();
    }
    getContent(): Promise<Buffer> {
        return this.index.getContentAt(this.offset, this.size);
    }
    getText(encoding: BufferEncoding = "utf-8"): Promise<string> {
        return this.getContent().then((b) => b.toString(encoding));
    }
}

export class TarMemoryPack implements MemoryPack {
    constructor(public index: TarIndex) {
        if (!index.get(MEMORY_METADATA_ENTRY)) {
            throw new Error("Invalid memory tar file. Context entry not found");
        }
    }
    async getMetadata(projection?: ProjectionProperties) {
        const content = await this.index.getContent(MEMORY_METADATA_ENTRY);
        if (content) {
            let metadata = JSON.parse(content.toString('utf-8'));
            if (projection) {
                metadata = applyProjection(projection, metadata);
            }
            return metadata;
        } else {
            throw new Error("Invalid memory tar file. Context entry not found");
        }
    }

    getPaths(filters?: string[]) {
        let paths = this.index.getSortedPaths();
        if (filters && filters.length > 0) {
            paths = micromatch(paths, filters);
        }
        return paths;
    }

    getEntries(filters?: string[]) {
        return this._getEntries(this.getPaths(filters));
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

    getEntriesContent(filters?: string[]) {
        const paths = this.getPaths(filters);
        const promises: Promise<Buffer>[] = [];
        for (const path of paths) {
            promises.push(this.getEntryContent(path) as Promise<Buffer>);
        }
        return Promise.all(promises);
    }

    getEntriesText(filters?: string[], encoding: BufferEncoding = "utf-8") {
        const paths = this.getPaths(filters);
        const promises: Promise<string>[] = [];
        for (const path of paths) {
            promises.push(this.getEntryText(path, encoding) as Promise<string>);
        }
        return Promise.all(promises);
    }

    getEntry(path: string) {
        const entry = this.index.get(path);
        return entry ? new MemoryEntry(this.index, path, entry.offset, entry.size) : null;
    }

    getEntryContent(path: string): Promise<Buffer | null> {
        const entry = this.index.get(path);
        if (!entry) {
            return Promise.resolve(null);
        } else {
            return this.index.getContentAt(entry.offset, entry.size);
        }
    }

    getEntryText(path: string, encoding: BufferEncoding = "utf-8"): Promise<string | null> {
        return this.getEntryContent(path).then((b) => b?.toString(encoding) || null);
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

    getMetadata() {
        return Promise.resolve(this.context);
    }

    getEntry(_path: string) {
        return null;
    }

    getEntries(_filters?: string[]): MemoryEntry[] {
        return [];
    }

    getEntryContent(): Promise<Buffer | null> {
        return Promise.resolve(null);
    }

    getEntryText(): Promise<string | null> {
        return Promise.resolve(null);
    }
    getEntriesContent(_filters?: string[]): Promise<Buffer[]> {
        return Promise.resolve([]);
    }
    getEntriesText(_filters?: string[]): Promise<string[]> {
        return Promise.resolve([]);
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