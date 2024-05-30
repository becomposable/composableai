import { ComputeFacetPayload, ContentObject, ContentObjectItem, ContentObjectType, ContentObjectTypeItem, ContentObjectTypeLayout, CreateContentObjectPayload, CreateContentObjectTypePayload, GetUploadUrlPayload, GetUploadUrlResponse, ListWorkflowRunsResponse, SearchPayload } from "@composableai/zeno-common";
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

export class StoreApi extends ApiTopic {

    constructor(parent: ClientBase) {
        super(parent, "/api/v1/store");
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

    listObjects(payload: SearchPayload = {}): Promise<ContentObjectItem[]> {
        const limit = payload.limit || 100;
        const offset = payload.offset || 0;
        return this.get("/objects", {
            query: {
                limit, offset,
                ...payload.query
            }
        });
    }

    computeFacets(query: ComputeFacetPayload): Promise<ComputeFacetsResponse> {
        return this.post("/objects/facets", {
            payload: query
        });
    }

    listFolders(path: string = '/') {
        path;//TODO
    }

    search(payload: SearchPayload): Promise<ContentObjectItem[]> {
        return this.post("/objects/search", {
            payload
        });
    }

    getObject(id: string): Promise<ContentObject> {
        return this.get(`/objects/${id}`);
    }

    getObjectText(id: string): Promise<{ text: string }> {
        return this.get(`/objects/${id}/text`);
    }

    async uploadFile(source: StreamSource | File) {
        const isStream = source instanceof StreamSource;
        // get a signed URL to upload the file a computed mimeType and the file object id.
        const { url, id, mimeType } = await this.getUploadUrl({
            name: source.name,
            mimeType: source.type
        });
        // upload the file content to the signed URL
        await this.fetch(url, {
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
            type: mimeType
        }
    }

    async createObject(payload: UploadContentObjectPayload): Promise<ContentObject> {

        const createPayload: CreateContentObjectPayload = {
            ...payload
        };
        if (payload.content instanceof StreamSource || payload.content instanceof File) {
            createPayload.content = await this.uploadFile(payload.content);
        }
        // create the object
        return await this.post('/objects', {
            payload: createPayload
        });
    }

    deleteObject(id: string) {
        return this.del(`/objects/${id}`);
    }


    listTypes(): Promise<ContentObjectTypeItem[]> {
        return this.get('/types');
    }

    listTypeLayouts(): Promise<ContentObjectTypeLayout[]> {
        return this.get('/types', {
            query: { layout: true }
        });
    }

    getType(typeId: string): Promise<ContentObjectType> {
        return this.get(`/types/${typeId}`);
    }

    getTypeByName(typeName: string): Promise<ContentObjectType> {
        return this.get("/types", {
            query: { name: typeName }
        });
    }

    updateType(typeId: string, payload: Partial<CreateContentObjectTypePayload>): Promise<ContentObjectType> {
        return this.put(`/types/${typeId}`, {
            payload
        });
    }

    createType(payload: CreateContentObjectTypePayload): Promise<ContentObjectType> {
        return this.post(`/types`, {
            payload
        });
    }

    deleteType(id: string) {
        return this.del(`/types/${id}`);
    }

    listWorkflowRuns(documentId: string): Promise<ListWorkflowRunsResponse> {

        return this.get(`/objects/${documentId}/workflow-runs`)

    }


}