import { GoogleDriveStorage } from "./google-drive.js";
import { GoogleStorage } from "./google.js";
import { Blob, BlobStorage, Bucket, CreateBucketOptions } from "./storage.js";

export const defaultCreateBucketOpts: CreateBucketOptions = {
    cors: {
        maxAgeSeconds: 3600,
        method: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE'],
        origin: ['*'],
        responseHeader: ['*']
    },
}

export class BlobUri {
    scheme: string;
    bucket: string;
    file: string;
    constructor(uri: string) {
        let i = uri.indexOf('://');
        if (i < 1) {
            throw new Error(`Invalid URI: ${uri}`);
        }
        this.scheme = uri.substring(0, i);
        const remaining = uri.substring(i + 3);
        i = remaining.indexOf('/');
        if (i < 0) {
            this.bucket = remaining;
            this.file = '';
        } else {
            this.bucket = remaining.substring(0, i);
            this.file = remaining.substring(i + 1);
        }
    }

    static from(uri: string | BlobUri) {
        return typeof uri === 'string' ? new BlobUri(uri) : uri;
    }
}

const impls: Record<string, () => Promise<BlobStorage>> = {
    gs: async () => new GoogleStorage(),
    gdrive: () => GoogleDriveStorage.connectImpersonated()
}

function getStorage(scheme: string) {
    const factory = impls[scheme];
    if (!factory) {
        throw new Error(`Unsupported storage type for scheme: ${scheme}`);
    }
    return factory();
}


async function getBucket(uri: string | BlobUri): Promise<Bucket> {
    const { scheme, bucket } = BlobUri.from(uri);
    const storage = await getStorage(scheme);
    return storage.bucket(bucket);
}

async function getOrCreateBucket(uri: string | BlobUri, opts: CreateBucketOptions = defaultCreateBucketOpts): Promise<Bucket> {
    const bucket = await getBucket(uri);
    if (!(await bucket.exists())) {
        await bucket.create(opts);
    }
    return bucket;
}

async function getFile(uri: string | BlobUri): Promise<Blob> {
    const ref = BlobUri.from(uri);
    const bucket = await getBucket(ref);
    return bucket.file(ref.file);
}

export const Blobs = {
    getBucket, getOrCreateBucket, getFile, getStorage
}

export * from "./md5.js";
export * from "./storage.js";
// export * from "./google-drive.js";
// export * from "./google.js";
