import { ExecutionRun, InteractionUpdatePayload, InteractionExecutionPayload } from "@vertesia/common";
import { ComposableClient, ComposableClientProps } from "./client.js";
import { executeInteraction } from "./execute.js";

export class InteractionBase<P = any, R = any> {
    client: ComposableClient;

    constructor(public id: string, clientOrOpts: ComposableClient | ComposableClientProps) {
        if (clientOrOpts instanceof ComposableClient) {
            this.client = clientOrOpts;
        } else {
            this.client = new ComposableClient(clientOrOpts);
        }
    }

    retrieve() {
        return this.client.interactions.retrieve(this.id);
    }

    update(payload: InteractionUpdatePayload) {
        return this.client.interactions.update(this.id, payload);
    }

    render(data: P) {
        data;
        //TODO
    }

    /**
     * Execute an interaction and return a promise which will be resolved with the executed run when
     * the run completes or fails.
     * If the onChunk callback is passed then the streaming of the result is enabled.
     * The onChunk callback with be called with the next chunk of the result as soon as it is available.
     * When all chunks are received the fucntion will return the resolved promise
     * @param id of the interaction to execute
     * @param payload InteractionExecutionPayload
     * @param onChunk callback to be called when the next chunk of the response is available
     * @returns the resolved execution run as Promise<ExecutionRun>
     */
    async execute(payload: InteractionExecutionPayload = {},
        onChunk?: (chunk: string) => void): Promise<ExecutionRun<P, R>> {
        return executeInteraction<P, R>(this.client, this.id, payload, onChunk);
    }
}
