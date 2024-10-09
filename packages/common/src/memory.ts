export const MEMORY_INPUT_PREFIX = "memory:";

/**
 * Payload to get a memory pack URL for the current project
 */
export interface GetMemoryUploadUrlPayload {
    /**
     * The memory pack name (can contains / for subdirectories)
     */
    name: string;
    mime_type?: string;
    ttl?: number;
}

/**
 * Payload to get a memory pack URL for the current project
 */
export interface GetMemoryDownloadUrlPayload {
    // the memory pack name (can contains / for subdirectories)
    name: string;
}

export interface GetMemoryUrlResponse {
    url: string;
}