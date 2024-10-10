import { Bucket as GBucket, File as GFile, Storage as GStorage } from '@google-cloud/storage';
import { AbstractBlob, Blob, BlobStorage, Bucket, CreateBucketOptions, getContentDispositionType, SignedUrlOptions } from './storage.js';


export class GoogleStorage implements BlobStorage {
    storage: GStorage;
    scheme = "gs";
    constructor() {
        this.storage = new GStorage();
    }

    bucket(name: string) {
        return new GoogleBucket(this.storage, name);
    }

}

export class GoogleBucket implements Bucket {
    bucket: GBucket;
    constructor(public storage: GStorage, name: string) {
        this.bucket = this.storage.bucket(name);
    }
    get name() {
        return this.bucket.name;
    }
    get uri() {
        return `gs://${this.name}`;
    }
    async file(name: string): Promise<Blob> {
        if (!name) throw new Error(`Invalid file URI: ${this.uri}/. Trying to get a file with no name`);
        return new GoogleBlob(this.bucket.file(name));
    }
    exists(): Promise<boolean> {
        return this.bucket.exists().then((r: any) => r[0]);
    }
    async create(opts?: CreateBucketOptions): Promise<void> {
        const cors = opts?.cors;
        await this.bucket.create({
            cors: cors ? [cors] : undefined
        });
        // enable uniformBucketLevelAccess for the worker auth to work
        await this.bucket.setMetadata({
            iamConfiguration: {
                uniformBucketLevelAccess: {
                    enabled: true,
                },
            },
        });
        if (cors) {
            // set cors if needed
            await this.bucket.setCorsConfiguration([cors]);
        }
    }
}

export class GoogleBlob extends AbstractBlob {

    file: GFile;

    constructor(file: GFile) {
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

    async getUploadUrl(opts: SignedUrlOptions = {}): Promise<string> {
        const [url] = await this.file.getSignedUrl({
            version: 'v4',
            //action: 'resumable',
            action: 'write',
            expires: opts.ttl || Date.now() + 15 * 60 * 1000, // 15 minutes
            //this is throwing a 403 - signature doesn't match - even if the content-type is included when PUTting
            //contentType: opts.mimeType || 'application/octet-stream',
        });
        return url;
    }

    async getDownloadUrl(opts: SignedUrlOptions = {}): Promise<string> {
        let contentDisposition: string | undefined;
        if (opts.name) {
            contentDisposition = `${opts.disposition || "attachment"}; filename="${opts.name}"`;
        }
        const [url] = await this.file.getSignedUrl({
            version: 'v4',
            action: 'read',
            expires: Date.now() + 15 * 60 * 1000, // 15 minutes
            responseDisposition: contentDisposition,
            responseType: opts.mimeType,
        });
        return url;
    }

    getPublicUrl(): Promise<string> {
        return Promise.resolve(`https://storage.googleapis.com/storage/v1/${this.file.bucket.name}/${this.file.name}`);
    }

    async setFileNameAndType(fileName?: string, mimeType?: string) {
        if (mimeType || fileName) {
            const type = getContentDispositionType(mimeType);
            await this.file.setMetadata({
                contentType: mimeType,
                contentDisposition: fileName ? `${type}; filename="${fileName}"` : undefined,
            });
        }
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
