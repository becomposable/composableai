import { ExecutionRun, GenerateTestDataPayload, ImprovePromptPayload, Interaction, InteractionCreatePayload, InteractionExecutionPayload, InteractionForkPayload, InteractionPublishPayload, InteractionRef, InteractionRefWithSchema, InteractionUpdatePayload, InteractionsExportPayload } from "@becomposable/common";
import { ApiTopic, ClientBase } from "api-fetch-client";
import { ComposableClient } from "./client.js";
import { executeInteraction, executeInteractionByName } from "./execute.js";

export default class InteractionsApi extends ApiTopic {
    constructor(parent: ClientBase) {
        super(parent, "/api/v1/interactions");
    }

    /**
     * Get the list of all interactions in the current project
     * @returns IInteractionRef[]
     **/
    list({ name, tags, version }: { name?: string, tags?: string[], version?: number } = {}): Promise<InteractionRef[]> {
        const searchParams = {
            name,
            tags,
            version
        };
        return this.get('/', { query: searchParams });
    }

    /**
     * List interaction names in the current project
     * @returns
     */
    listNames(): Promise<{ id: string, name: string }[]> {
        return this.get('/names');
    }

    /**
     * Get the list of all interactions in rthe current project. Schemas will be returned too.
     * @returns InteractionRefWithSchema[]
     **/
    export(payload: InteractionsExportPayload): Promise<InteractionRefWithSchema[]> {
        return this.post('/export', { payload });
    }

    /**
     * Create a new interaction
     * @param payload InteractionCreatePayload
     * @returns Interaction
     * @throws ApiError
     * @throws 400 if payload is invalid
     * @throws 500 if interaction creation fails
     **/
    create(payload: InteractionCreatePayload): Promise<Interaction> {
        return this.post('/', {
            payload
        });
    }

    /**
     * Retrieve an existing interaction definiton
     * @param id of the interaction to retrieve
     * @returns Interaction
     **/
    retrieve(id: string): Promise<Interaction> {
        return this.get(`/${id}`);
    }

    /**
     * Update an existing interaction definiton
     * @param id of the interaction to update
     * @param payload InteractionUpdatePayload
     * @returns Interaction
     * @throws ApiError
     * @throws 400 if payload is invalid
     * @throws 500 if interaction update fails
     * @throws 404 if interaction not found
     **/
    update(id: string, payload: InteractionUpdatePayload): Promise<Interaction> {
        return this.put(`/${id}`, {
            payload
        });
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
     * @returns Promise<ExecutionRun>
     * @throws ApiError
     * @throws 404 if interaction not found
     * @throws 400 if payload is invalid
     * @throws 500 if interaction execution fails
     * @throws 500 if interaction execution times out
     **/
    execute<P = any, R = any>(id: string, payload: InteractionExecutionPayload = {},
        onChunk?: (chunk: string) => void): Promise<ExecutionRun<P, R>> {
        return executeInteraction(this.client as ComposableClient, id, payload, onChunk);
    }

    /**
     * Same as execute but uses the interaction name selector instead of the id.
     *
     * A name selector is the interaction endpoint name suffuxed with an optional tag or version wich is starting with a `@` character.
     * The special `draft` tag is used to select the draft version of the interaction. If no tag or version is specified then the latest version is selected.
     * Examples of selectors:
     * - `ReviewContract` - select the latest version of the ReviewContract interaction
     * - `ReviewContract@1` - select the version 1 of the ReviewContract interaction
     * - `ReviewContract@draft` - select the draft version of the ReviewContract interaction
     * - `ReviewContract@fixed` - select the ReviewContract interaction which is tagged with 'fixed' tag.
     * @param nameWithTag
     * @param payload
     * @param onChunk
     * @returns
     */
    executeByName<P = any, R = any>(nameWithTag: string, payload: InteractionExecutionPayload = {},
        onChunk?: (chunk: string) => void): Promise<ExecutionRun<P, R>> {
        return executeInteractionByName(this.client as ComposableClient, nameWithTag, payload, onChunk);
    }

    publish(id: string, payload: InteractionPublishPayload): Promise<Interaction> {
        return this.post(`/${id}/publish`, {
            payload
        });
    }

    fork(id: string, payload: InteractionForkPayload): Promise<Interaction> {
        return this.post(`/${id}/fork`, {
            payload
        });
    }

    /**
     * Generate Test Data for an interaction
     **/
    generateTestData(id: string, payload: GenerateTestDataPayload): Promise<any[]> {

        return this.post(`${id}/generate-test-data`, {
            payload
        });

    }

    /**
     * Suggest Improvement for a prompt
     */
    suggestImprovements(id: string, payload: ImprovePromptPayload): Promise<{ result: string; }> {
        return this.post(`${id}/suggest-prompt-improvements`, {
            payload
        });
    }

    /**
     * List the versions of the interaxction. Returns an empty array if no versions are found
     * @param id
     * @returns the versions list or an empty array if no versions are found
     */
    listVersions(id: string): Promise<InteractionRef[]> {
        return this.get(`/${id}/versions`);
    }

    /**
     * List the forks of the interaxction. Returns an empty array if no forks are found
     * @param id
     * @returns the versions list or an empty array if no forks are found
     */
    listForks(id: string): Promise<InteractionRef[]> {
        return this.get(`/${id}/forks`);
    }

}
