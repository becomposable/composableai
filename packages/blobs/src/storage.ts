import fs from "fs";
import { Readable } from "stream";
import { UnsupportedBlobOperationError } from "./UnsupportedOperationError.js";

const INLINE_MIME_TYPES = new Set([
    "application/json",
    "application/xml",
    "application/pdf",
]);

export function getContentDispositionType(mimeType: string | undefined) {
    if (!mimeType) return "attachment";
    if (mimeType.startsWith("text/")
        || mimeType.startsWith("image/")
        || INLINE_MIME_TYPES.has(mimeType)) return "inline";
    return "attachment";
}

interface WriteStreamOptions {
    flags?: string | undefined;
    encoding?: BufferEncoding | undefined;
    fd?: number | fs.promises.FileHandle | undefined;
    mode?: number | undefined;
    autoClose?: boolean | undefined;
    emitClose?: boolean | undefined;
    start?: number | undefined;
    signal?: AbortSignal | null | undefined;
    highWaterMark?: number | undefined;
    flush?: boolean | undefined;
}

export interface BlobStorage {
    scheme: string;
    bucket(name: string): Bucket;
}

export interface Blob {
    id: string;
    name: string;
    metadata: Record<string, any>;
    md5Hash?: string;
    contentDisposition: string | undefined;
    isWriteable: boolean;
    getDownloadUrl(opts?: SignedUrlOptions | undefined): Promise<string>;
    getPublicUrl(): Promise<string>;
    exists(): Promise<boolean>;
    read(): Promise<Readable>;
    readAsBuffer(): Promise<Buffer>;
    saveToFile(file: string, options?: BufferEncoding | WriteStreamOptions | undefined): Promise<fs.WriteStream>;
    // writable methods
    getUploadUrl(opts?: SignedUrlOptions | undefined): Promise<string>;
    setFileNameAndType(fileName?: string, mimeType?: string): Promise<void>;
    setMetadata(meta: Record<string, any>): Promise<void>;
    delete(): Promise<void>;
}

export interface CreateBucketOptions {
    // if defined it will set an origin policy for the bucket
    cors?: {
        origin?: string[],
        method?: string[],
        responseHeader?: string[],
        maxAgeSeconds?: number
    }
}

export interface Bucket {
    name: string;
    file(name: string): Promise<Blob>;
    exists(): Promise<boolean>;
    create(opts?: CreateBucketOptions): Promise<void>;
}

export interface SignedUrlOptions {
    mimeType?: string | undefined;
    ttl?: number | undefined;
    // a content disposition file name for GET signed URLs
    name?: string | undefined;
    // optional disposition to generate a content dispoition for GET signed URLs
    disposition?: "inline" | "attachment";
}

export abstract class AbstractBlob implements Blob {
    constructor(public isWriteable = true) {
    }
    abstract id: string;
    abstract name: string;
    abstract metadata: Record<string, any>;
    abstract md5Hash?: string;
    abstract contentDisposition: string | undefined;
    abstract getDownloadUrl(opts?: SignedUrlOptions | undefined): Promise<string>;
    abstract getPublicUrl(): Promise<string>;
    abstract exists(): Promise<boolean>;
    abstract read(): Promise<Readable>;
    async readAsBuffer(): Promise<Buffer> {
        return new Promise(async (resolve, reject) => {
            let stream;
            try {
                stream = await this.read();
            } catch (err) {
                reject(err);
                return;
            }
            const bufs: Buffer[] = [];
            stream.on('error', reject);
            stream.on('data', function (d) { bufs.push(d); });
            stream.on('end', function () {
                resolve(Buffer.concat(bufs));
            })
        });
    }
    async saveToFile(file: string, options?: BufferEncoding | WriteStreamOptions | undefined) {
        const stream = await this.read();
        const w = stream.pipe(fs.createWriteStream(file, options));
        await new Promise(resolve => w.on("finish", resolve));
        return w;
    }
    //writeable methods
    abstract getUploadUrl(opts?: SignedUrlOptions | undefined): Promise<string>;
    abstract setFileNameAndType(fileName?: string, mimeType?: string): Promise<void>;
    abstract setMetadata(meta: Record<string, any>): Promise<void>;
    abstract delete(): Promise<void>;

}

export abstract class AbstractReadableBlob extends AbstractBlob {
    constructor() { super(false) }
    getUploadUrl(): Promise<string> {
        throw new UnsupportedBlobOperationError("getUploadUrl");
    }
    setFileNameAndType(): Promise<void> {
        throw new UnsupportedBlobOperationError("setContentDisposition");
    }
    setMetadata(): Promise<void> {
        throw new UnsupportedBlobOperationError("setMetadata");
    }
    delete(): Promise<void> {
        throw new UnsupportedBlobOperationError("delete");
    }
}
