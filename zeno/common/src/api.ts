export interface GetUploadUrlPayload {
    name: string;
    mime_type?: string;
    ttl?: number;
}

export interface GetUploadUrlResponse {
    url: string;
    id: string;
    mime_type: string;
}