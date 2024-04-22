import { ExecutionRun, ExecutionRunStatus, InteractionExecutionPayload } from '@composableai/common';
import { StudioClient } from './client.js';

export function EventSourceProvider(): Promise<typeof EventSource> {
    if (typeof globalThis.EventSource === 'function') {
        return Promise.resolve(globalThis.EventSource)
    } else {
        return import('eventsource').then(module => module.default as unknown as typeof EventSource);
    }
}
/**
 * 
 * Execute an interaction and return a promise which will be resolved with the executed run when 
 * the run completes or fails.
 * If the onChunk callback is passed then the streaming of the result is enabled. 
 * The onChunk callback with be called with the next chunk of the result as soon as it is available.
 * When all chunks are received the fucntion will return the resolved promise 
 * @param id of the interaction to execute
 * @param payload InteractionExecutionPayload
 * @param onChunk callback to be called when the next chunk of the response is available
 */
export async function executeInteraction<P = any, R = any>(client: StudioClient,
    interactionId: string,
    payload: InteractionExecutionPayload<P> = {},
    onChunk?: (chunk: string) => void): Promise<ExecutionRun<P, R>> {
    const stream = !!onChunk;
    const response = await client.runs.create({
        ...payload, interaction: interactionId, stream
    });
    if (stream) {
        if (response.status === ExecutionRunStatus.failed) {
            return response;
        }
        return new Promise(async (resolve, reject) => {
            try {
                const EventSourceImpl = await EventSourceProvider();
                const sse = new EventSourceImpl(client.runs.baseUrl + '/' + response.id + '/stream');
                sse.addEventListener("message", ev => {
                    const data = JSON.parse(ev.data);
                    if (data) {
                        onChunk && onChunk(data);
                    }
                });
                sse.addEventListener("close", (ev) => {
                    try {
                        sse.close();
                        const msg = JSON.parse(ev.data)
                        resolve(msg);
                    } catch (err) {
                        reject(err);
                    }
                });
            } catch (err) {
                reject(err);
            }
        });
    }
    return response;
}
