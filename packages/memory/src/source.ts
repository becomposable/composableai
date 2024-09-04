import { readFile } from "fs/promises"
import { basename, extname } from "path";

export interface ContentSource {
    getContent(): Promise<Buffer>
}

export interface MemoryFile extends ContentSource {
    name: string;
}

export class Text implements ContentSource {
    constructor(public value: string, public encoding: BufferEncoding = "utf-8") { }

    getContent() {
        return Promise.resolve(Buffer.from(this.value, this.encoding));
    }
}


export class FileSource implements ContentSource {
    constructor(public file: string) { }

    get name() {
        return basename(this.file);
    }

    get extname() {
        return extname(this.file);
    }

    get nameWithoutExt() {
        return this.name.slice(0, -this.extname.length);
    }

    getContent() {
        return readFile(this.file);
    }

}
