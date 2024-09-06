import { RequestError } from "@becomposable/api-fetch-client";

export class ZenoClientNotFoundError extends RequestError {
    constructor(req: Request, error: RequestError) {
        super("Resource not found: " + error.message, req, 404, error.payload);
    }
}