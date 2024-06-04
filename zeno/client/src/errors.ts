import { RequestError } from "api-fetch-client";

export class ZenoClientNotFoundError extends RequestError {
    constructor(error: RequestError) {
        super("Resource not found: " + error.message, 404, error.payload);
    }
}