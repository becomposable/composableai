import { ApiTopic, ClientBase } from "@becomposable/api-fetch-client";
import { GetMemoryUploadUrlPayload, GetMemoryUrlResponse } from "@becomposable/common";
import { StreamSource } from "./StreamSource.js";

export class MemoryApi extends ApiTopic {

    constructor(parent: ClientBase) {
        super(parent, "/api/v1/memory");
    }

    getUploadUrl(payload: GetMemoryUploadUrlPayload): Promise<GetMemoryUrlResponse> {
        return this.post('/upload-url', {
            payload
        })
    }

    getDownloadUrl(name: string): Promise<GetMemoryUrlResponse> {
        return this.post('/download-url', {
            payload: {
                name
            }
        })
    }

    /**
     * Upload a memory pack and return the full path (including bucket name) of the uploaded file
     * @param source
     * @returns
     */
    async uploadMemoryPack(source: StreamSource | File): Promise<string> {
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

    async downloadMemoryPack(name: string): Promise<ReadableStream<Uint8Array>> {
        const { url } = await this.getDownloadUrl(name);

        const res = await fetch(url, {
            method: 'GET',
        }).then((res: Response) => {
            if (res.ok) {
                return res;
            } else {
                console.log(res);
                throw new Error(`Failed to download memory file ${name}: ${res.statusText}`);
            }
        }).catch(err => {
            console.error(`Failed to download memory file ${name}.`, err);
            throw err;
        });

        if (!res.body) {
            throw new Error(`No body in response while downloading memory pack ${name}`);
        }

        return res.body;
    }
}
