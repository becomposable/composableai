import { ApiTopic, ClientBase } from "@becomposable/api-fetch-client";
import { GetFileUrlPayload, GetFileUrlResponse, GetUploadUrlPayload } from "@becomposable/common";
import { StreamSource } from "../StreamSource.js";

export const MEMORIES_PREFIX = 'memories';

export function getMemoryFilePath(name: string) {
    const nameWithExt = name.endsWith(".tar.gz") ? name : name + ".tar.gz";
    return `${MEMORIES_PREFIX}/${nameWithExt}`;
}


export class FilesApi extends ApiTopic {

    constructor(parent: ClientBase) {
        super(parent, "/api/v1/files");
    }

    /**
     * Get or create a bucket for the project. If the bucket already exists, it does nothing.
     * The bucket URI is returned.
     * @returns
     */
    getOrCreateBucket(): Promise<{ bucket: string }> {
        return this.post('/bucket');
    }

    getUploadUrl(payload: GetUploadUrlPayload): Promise<GetFileUrlResponse> {
        return this.post('/upload-url', {
            payload
        })
    }

    getDownloadUrl(file: string): Promise<GetFileUrlResponse> {
        return this.post('/download-url', {
            payload: {
                file
            } satisfies GetFileUrlPayload
        })
    }

    /**
     * Upload content to a file and return the full path (including bucket name) of the uploaded file
     * @param source
     * @returns
     */
    async uploadFile(source: StreamSource | File): Promise<string> {
        const isStream = source instanceof StreamSource;
        const { url, path } = await this.getUploadUrl(source);

        await fetch(url, {
            method: 'PUT',
            body: isStream ? source.stream : source,
            //@ts-ignore: duplex is not in the types. See https://github.com/node-fetch/node-fetch/issues/1769
            duplex: isStream ? "half" : undefined,
            headers: {
                'Content-Type': source.type || 'application/gzip'
            }
        }).then((res: Response) => {
            if (res.ok) {
                return res;
            } else {
                console.log(res);
                throw new Error(`Failed to upload file: ${res.statusText}`);
            }
        }).catch(err => {
            console.error('Failed to upload file', err);
            throw err;
        });

        return path;
    }

    async downloadFile(name: string): Promise<ReadableStream<Uint8Array>> {
        const { url } = await this.getDownloadUrl(name);

        const res = await fetch(url, {
            method: 'GET',
        }).then((res: Response) => {
            if (res.ok) {
                return res;
            } else {
                console.log(res);
                throw new Error(`Failed to download file ${name}: ${res.statusText}`);
            }
        }).catch(err => {
            console.error(`Failed to download file ${name}.`, err);
            throw err;
        });

        if (!res.body) {
            throw new Error(`No body in response while downloading memory pack ${name}`);
        }

        return res.body;
    }

    async uploadMemoryPack(source: StreamSource | File): Promise<string> {
        const fileId = getMemoryFilePath(source.name);
        const nameWithExt = source.name.endsWith(".tar.gz") ? source.name : source.name + ".tar.gz";
        if (source instanceof File) {
            let file = source as File;
            return this.uploadFile(new StreamSource(file.stream(), nameWithExt, file.type, fileId));
        } else {
            return this.uploadFile(new StreamSource(source.stream, nameWithExt, source.type, fileId));
        }
    }

    async downloadMemoryPack(name: string, gunzip: boolean = false): Promise<ReadableStream<Uint8Array>> {
        let stream = await this.downloadFile(getMemoryFilePath(name));
        if (gunzip) {
            const ds = new DecompressionStream("gzip");
            stream = stream.pipeThrough(ds);
        }
        return stream;
    }
}
