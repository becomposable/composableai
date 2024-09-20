import { manyToMarkdown, pdfToText, transformImage } from "@becomposable/converters";
import fs from "fs";
import { Builder } from "../Builder";
import { ContentSource } from "../source";

export class ContentObject {
    content?: Buffer;
    constructor(public builder: Builder, public source: ContentSource) { }

    async getContent(): Promise<Buffer> {
        if (!this.content) {
            this.content = await this.source.getContent();
        }
        return this.content;
    }

    getStream(): Promise<NodeJS.ReadableStream> {
        return this.source.getStream();
    }

    copyTo(entry: string) {
        this.builder.en
    }

    async copyToFile(file: string): Promise<fs.WriteStream> {

        const input = await this.getStream();
        const out = fs.createWriteStream(file);
        const stream = input.pipe(out);
        return new Promise((resolve, reject) => {
            const handleError = (err: any) => {
                reject(err);
                out.close();
            }
            stream.on('finish', () => {
                resolve(stream);
                out.close();
            });
            input.on('error', handleError);
            stream.on('error', handleError);
        })
    }

    /**
     * Get a text representation of the object
     */
    async getText(encoding: BufferEncoding = "utf-8"): Promise<string> {
        return (await this.getContent()).toString(encoding);

    }

    getJSONValue(): Promise<any> {
        return this.getText();
    }
}

export class JsonObject extends ContentObject {
    async getText(encoding: BufferEncoding = "utf-8"): Promise<string> {
        return (await this.getContent()).toString(encoding);
    }
    async getJSONValue(): Promise<any> {
        return JSON.parse(await this.getText());
    }
}

export interface MediaOptions {
    max_hw?: number;
    format?: "jpeg" | "png";
}
export class ImageObject extends ContentObject {
    constructor(builder: Builder, source: ContentSource, public options: MediaOptions = {}) {
        super(builder, source);
    }
    async getStream(): Promise<NodeJS.ReadableStream> {
        const stream = await this.getStream();
        return await transformImage(stream, this.options);
    }
    async getContent(): Promise<Buffer> {
        const stream = await this.getStream();
        return (await transformImage(stream, this.options)).toBuffer();
    }
    async getText(encoding: BufferEncoding = "base64"): Promise<string> {
        return (await this.getContent()).toString(encoding);
    }
}


export class PdfObject extends ContentObject {
    constructor(builder: Builder, source: ContentSource) {
        super(builder, source);
    }
    async getText(): Promise<string> {
        return await pdfToText(await this.getContent());
    }

}


export class DocxObject extends ContentObject {
    constructor(builder: Builder, source: ContentSource) {
        super(builder, source);
    }
    async getText(): Promise<string> {
        return await manyToMarkdown(await this.getContent(), "docx");
    }

}
