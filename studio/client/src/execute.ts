import { ExecutionRun, ExecutionRunStatus, InteractionExecutionPayload } from '@composableai/studio-common';
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
        handleStreaming(client, response.id, onChunk);
    }
    return response;
}

/**
 * Same as executeInteraction but uses the interaction name selector instead of the id.
 * A name selector is the interaction endpoint name suffuxed with an optional tag or version wich is starting with a `@` character.
 * The special `draft` tag is used to select the draft version of the interaction. If no tag or version is specified then the latest version is selected.
 * Examples of selectors:
 * - `ReviewContract` - select the latest version of the ReviewContract interaction
 * - `ReviewContract@1` - select the version 1 of the ReviewContract interaction
 * - `ReviewContract@draft` - select the draft version of the ReviewContract interaction
 * - `ReviewContract@fixed` - select the ReviewContract interaction which is tagged with 'fixed' tag.
 *
 * @param client
 * @param interaction
 * @param payload
 * @param onChunk
 * @returns
 */
export async function executeInteractionByName<P = any, R = any>(client: StudioClient,
    interaction: string,
    payload: InteractionExecutionPayload<P> = {},
    onChunk?: (chunk: string) => void): Promise<ExecutionRun<P, R>> {
    const stream = !!onChunk;
    const response = await client.post('/api/v1/execute', {
        payload: {
            ...payload,
            interaction,
            stream
        },
    });
    if (stream) {
        if (response.status === ExecutionRunStatus.failed) {
            return response;
        }
        handleStreaming(client, response.id, onChunk);
    }
    return response;
}

function handleStreaming(client: StudioClient, runId: string, onChunk: (chunk: string) => void) {
    return new Promise(async (resolve, reject) => {
        try {
            const EventSourceImpl = await EventSourceProvider();
            const sse = new EventSourceImpl(client.runs.baseUrl + '/' + runId + '/stream');
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