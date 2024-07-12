
export class UnsupportedBlobOperationError extends Error {
    constructor(name: string, message?: string) {
        super("Unsupported operation: " + name + (message ? ": " + message : ""));
        this.name = "UnsupportedBlobOperationError";
    }
}