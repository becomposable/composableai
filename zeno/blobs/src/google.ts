import { Bucket, File, Storage } from '@google-cloud/storage';
import { AbstractBlob, FileStorage } from './storage.js';


export class GoogleFileStorage implements FileStorage {
    readonly name: string = "GoogleCloudStorage";
    storage: Storage;
    bucket: Bucket;

    constructor(bucketName: string) {
        this.storage = new Storage();
        this.bucket = this.storage.bucket(bucketName);
    }

    validateUri(uri: string): boolean {

        if (!uri.startsWith("gs://")) {
            return false;
        }

        const path = uri.substring(5);
        const i = path.indexOf("/");
        if (i < 0) {
            return false;
        }

        return true;
    }

    async resolve(uri: string): Promise<GoogleBlob> {
        if (!this.validateUri(uri)) {
            throw new Error(`Invalid file URI for ${this.name}: ${uri}`);
        }

        const path = uri.substring(5);
        const i = path.indexOf("/");
        const bucket = path.substring(0, i);
        const file = path.substring(i + 1);
        return new GoogleBlob(this.storage.bucket(bucket).file(file));
    }

    async getByPath(name: string): Promise<GoogleBlob> {
        return new GoogleBlob(this.bucket.file(name));
    }
}

export class GoogleBlob extends AbstractBlob {

    file: File;

    constructor(file: File) {
        super();
        this.file = file;
    }

    get id() {
        return this.file.cloudStorageURI.href;
    }

    get name() {
        return this.file.name;
    }

    get contentDisposition() {
        return this.metadata.contentDisposition
    }

    get metadata() {
        return this.file.metadata
    }

    get md5Hash() {
        return this.metadata.md5Hash ?? this.metadata.etag;
    }

    async getUploadUrl(opts: { mimeType?: string, ttl?: number } = {}): Promise<string> {
        const [url] = await this.file.getSignedUrl({
            version: 'v4',
            //action: 'resumable',
            action: 'write',
            expires: opts.ttl || Date.now() + 15 * 60 * 1000, // 15 minutes
            contentType: opts.mimeType || 'application/octet-stream',
        });
        return url;
    }

    async getDownloadUrl(): Promise<string> {
        const [url] = await this.file.getSignedUrl({
            version: 'v4',
            action: 'read',
            expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        });
        return url;
    }

    getPublicUrl(): Promise<string> {
        return Promise.resolve(`https://storage.googleapis.com/storage/v1/${this.file.bucket.name}/${this.file.name}`);
    }

    async setContentDisposition(value: string) {
        await this.file.setMetadata({
            contentDisposition: value,
        });
    }

    async setMetadata(meta: Record<string, any>): Promise<void> {
        await this.file.setMetadata(meta);
    }

    async exists(): Promise<boolean> {
        const [r] = await this.file.exists();
        return r;
    }

    async delete(): Promise<void> {
        await this.file.delete();
    }

    async read() {
        return this.file.createReadStream();
    }

    async readAsBuffer(): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const stream = this.file.createReadStream();
            const bufs: Buffer[] = [];
            stream.on('error', reject);
            stream.on('data', function (d: any) { bufs.push(d); });
            stream.on('end', function () {
                resolve(Buffer.concat(bufs));
            })
        });
    }

}
