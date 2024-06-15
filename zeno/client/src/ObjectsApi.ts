import { ComplexSearchPayload, ComputeFacetPayload, ContentObject, ContentObjectItem, CreateContentObjectPayload, GetUploadUrlPayload, GetUploadUrlResponse, ListWorkflowRunsResponse, SearchPayload, SimpleSearchQuery } from "@composableai/zeno-common";
import { ApiTopic, ClientBase } from "api-fetch-client";

export class StreamSource {
    constructor(public stream: ReadableStream, public name: string, public type?: string) { }
}

export interface UploadContentObjectPayload extends Omit<CreateContentObjectPayload, 'content'> {
    content?: StreamSource | File | {
        // the source URI
        source: string,
        // the original name of the input file if any
        name?: string,
        // the mime type of the content source.
        type?: string
    }
}

export interface ComputeFacetsResponse {
    type?: { _id: string, count: number }[];
    location?: { _id: string, count: number }[];
    status?: { _id: string, count: number }[];
    total?: { count: number }[];
    //[key: string]: { _id: string, count: number }[];
}

export class ObjectsApi extends ApiTopic {

    constructor(parent: ClientBase) {
        super(parent, "/api/v1/objects");
    }

    getUploadUrl(payload: GetUploadUrlPayload): Promise<GetUploadUrlResponse> {
        return this.post('/upload-url', {
            payload
        })
    }

    getDownloadUrl(fileUri: string): Promise<{ url: string }> {
        return this.post('/download-url', {
            payload: {
                file: fileUri
            }
        })
    }

    list(payload: SearchPayload = {}): Promise<ContentObjectItem[]> {
        const limit = payload.limit || 100;
        const offset = payload.offset || 0;
        const query = payload.query || {} as SimpleSearchQuery;

        return this.get("/", {
            query: {
                limit,
                offset,
                ...query
            }
        });
    }

    computeFacets(query: ComputeFacetPayload): Promise<ComputeFacetsResponse> {
        return this.post("/facets", {
            payload: query
        });
    }

    listFolders(path: string = '/') {
        path;//TODO
    }

    search(payload: ComplexSearchPayload): Promise<ContentObjectItem[]> {
        return this.post("/search", {
            payload
        });
    }

    retrieve(id: string, select?: string): Promise<ContentObject> {
        return this.get(`/${id}`, {
            query: {
                select
            }
        });
    }

    getObjectText(id: string): Promise<{ text: string }> {
        return this.get(`/${id}/text`);
    }

    async upload(source: StreamSource | File) {
        const isStream = source instanceof StreamSource;
        // get a signed URL to upload the file a computed mimeType and the file object id.
        const { url, id, mimeType } = await this.getUploadUrl({
            name: source.name,
            mimeType: source.type
        });
        // upload the file content to the signed URL
        const res = await this.fetch(url, {
            method: 'PUT',
            //@ts-ignore: duplex is not in the types. See https://github.com/node-fetch/node-fetch/issues/1769
            duplex: isStream ? "half" : undefined,
            body: isStream ? source.stream : source,
            headers: {
                'Content-Type': mimeType || 'application/octet-stream'
            }
        }).then((res: Response) => {
            if (res.ok) {
                return res;
            } else {
                throw new Error(`Failed to upload file: ${res.statusText}`);
            }
        });
        return {
            source: id,
            name: source.name,
            type: mimeType,
            etag: res.headers.get('etag') ?? undefined
        }
    }

    async create(payload: UploadContentObjectPayload): Promise<ContentObject> {

        const createPayload: CreateContentObjectPayload = {
            ...payload
        };
        if (payload.content instanceof StreamSource || payload.content instanceof File) {
            createPayload.content = await this.upload(payload.content);
        }
        // create the object
        return await this.post('/', {
            payload: createPayload
        });
    }

    update(id: string, payload: Partial<CreateContentObjectPayload>): Promise<ContentObject> {
        return this.put(`/${id}`, {
            payload
        });
    }

    delete(id: string): Promise<{id: string}> {
        return this.del(`/${id}`);
    }

    listWorkflowRuns(documentId: string): Promise<ListWorkflowRunsResponse> {

        return this.get(`/${documentId}/workflow-runs`)

    }


}