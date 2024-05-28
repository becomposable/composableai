export interface GetUploadUrlPayload {
    name: string;
    mimeType?: string;
    ttl?: number;
}

export interface GetUploadUrlResponse {
    url: string;
    id: string;
    mimeType: string;
}