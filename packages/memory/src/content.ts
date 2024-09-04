import fs from "fs/promises";

export interface TextOptions {
    encoding?: BufferEncoding;
    transform?: (content: string) => any;
}
export interface PdfOptions {
}

export interface DocxOptions {
}


export interface RefConstructor<T, O extends Record<string, any>, R extends ContentRef<T, O>> {
    new(value?: T): R;
}
export abstract class ContentRef<T = any, O extends Record<string, any> = any> {
    private resolved = false;
    private value: T | undefined = undefined;

    constructor(value?: T) {
        if (value !== undefined) {
            this.set(value);
        }
    }

    set(value: T) {
        this.resolved = true;
        this.value = value;
    }

    get(): T {
        if (!this.resolved) {
            throw new Error("TextRef not resolved");
        }
        return this.value!;
    }

    toJSON() {
        return this.value;
    }

    abstract load(file: string, options: O): Promise<void>;

}

export class TextRef extends ContentRef<string, TextOptions> {
    load(file: string) {
        return loadText(file).then(text => this.set(text));
    }
}

export class JsonRef extends ContentRef<any, TextOptions> {
    load(file: string) {
        return loadText(file).then(text => this.set(JSON.parse(text)));
    }
}

export class PdfRef extends ContentRef<any, PdfOptions> {
    load(file: string) {
        return loadPdf(file).then(text => this.set(text));
    }
}

export class DocxRef extends ContentRef<any, DocxOptions> {
    load(file: string) {
        return loadDocx(file).then(text => this.set(text));
    }
}

export function loadText(file: string, options: TextOptions = {}): Promise<any> {
    return fs.readFile(file, options.encoding || "utf-8").then(text => options.transform ? options.transform(text) : text);
}

//@ts-ignore
export function loadPdf(file: string, options: PdfOptions = {}) {
    //pdfFileToText(file);
    //TODO: implement
    return Promise.resolve();
}
//@ts-ignore
export function loadDocx(file: string, options: DocxOptions = {}) {
    //TODO: implement
    return Promise.resolve();
}
