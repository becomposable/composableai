import { ApiTopic, ClientBase } from '@becomposable/api-fetch-client';
import { ComplexSearchPayload, ComputeObjectFacetPayload, ContentObject, ContentObjectItem, ContentSource, CreateContentObjectPayload, Embedding, ExportPropertiesPayload, ExportPropertiesResponse, FindPayload, GetRenditionResponse, GetUploadUrlPayload, GetUploadUrlResponse, ListWorkflowRunsResponse, ObjectSearchPayload, ObjectSearchQuery, SupportedEmbeddingTypes } from '@becomposable/common';

import { StreamSource } from '../StreamSource.js';

export interface UploadContentObjectPayload extends Omit<CreateContentObjectPayload, 'content'> {
    content?: StreamSource | File | {

        // the source URI
        source: string,
        // the original name of the input file if any
        name?: string,
        // the mime type of the content source.
        type?: string

        // the target id in the content store
        id?: string

    }
}

export interface ComputeFacetsResponse {
    type?: { _id: string, count: number }[];
    location?: { _id: string, count: number }[];
    status?: { _id: string, count: number }[];
    total?: { count: number }[];
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

    getContentSource(objectId: string): Promise<ContentSource> {
        return this.get(`/${objectId}/content-source`);
    }

    list(payload: ObjectSearchPayload = {}): Promise<ContentObjectItem[]> {
        const limit = payload.limit || 100;
        const offset = payload.offset || 0;
        const query = payload.query || {} as ObjectSearchQuery;

        return this.get("/", {
            query: {
                limit,
                offset,
                ...query
            }
        });
    }

    computeFacets(query: ComputeObjectFacetPayload): Promise<ComputeFacetsResponse> {
        return this.post("/facets", {
            payload: query
        });
    }

    listFolders(path: string = '/') {
        path;//TODO
    }

    find(payload: FindPayload): Promise<ContentObject[]> {
        return this.post("/find", {
            payload
        });
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
        const { url, id, mime_type } = await this.getUploadUrl({
            id: isStream ? source.id : undefined,
            name: source.name,
            mime_type: source.type
        });

        console.log(`Uploading file to ${url}`, { id, mime_type, isStream, source })

        // upload the file content to the signed URL
        /*const res = await this.fetch(url, {
            method: 'PUT',
            //@ts-ignore: duplex is not in the types. See https://github.com/node-fetch/node-fetch/issues/1769
            duplex: isStream ? "half" : undefined,
            body: isStream ? source.stream : source,
            headers: {
                'Content-Type': mime_type || 'application/octet-stream'
            }
        }).then((res: Response) => {
            if (res.ok) {
                return res;
            } else {
                console.log(res);
                throw new Error(`Failed to upload file: ${res.statusText}`);
            }
        });*/

        const res = await fetch(url, {
            method: 'PUT',
            body: isStream ? source.stream : source,
            //@ts-ignore: duplex is not in the types. See https://github.com/node-fetch/node-fetch/issues/1769
            duplex: isStream ? "half" : undefined,
            headers: {
                'Content-Type': mime_type || 'application/octet-stream'
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


        return {
            source: id,
            name: source.name,
            type: mime_type,
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
        return await this.post('/', {
            payload: createPayload
        });
    }

    update(id: string, payload: Partial<CreateContentObjectPayload>): Promise<ContentObject> {
        return this.put(`/${id}`, {
            payload
        });
    }

    delete(id: string): Promise<{ id: string }> {
        return this.del(`/${id}`);
    }

    listWorkflowRuns(documentId: string): Promise<ListWorkflowRunsResponse> {

        return this.get(`/${documentId}/workflow-runs`)

    }

    listRenditions(documentId: string): Promise<ContentObjectItem[]> {
        return this.get(`/${documentId}/renditions`);
    }

    getRendition(documentId: string, options: GetRenditionParams): Promise<GetRenditionResponse> {

        const query = {
            max_hw: options.max_hw,
            generate_if_missing: options.generate_if_missing
        }

        return this.get(`/${documentId}/renditions/${options.format}`, { query });
    }

    exportProperties(payload: ExportPropertiesPayload): Promise<ExportPropertiesResponse> {
        return this.post("/export", {
            payload
        });
    }

    setEmbedding(id: string, type: SupportedEmbeddingTypes, payload: Embedding): Promise<Record<SupportedEmbeddingTypes, Embedding>> {
        return this.put(`/${id}/embeddings/${type}`, {
            payload
        });
    }

}

interface GetRenditionParams {
    format: string;
    max_hw?: number;
    generate_if_missing?: boolean;
}