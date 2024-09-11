import { PromptTemplate, PromptTemplateForkPayload, PromptTemplateCreatePayload, PromptTemplateRef, PromptTemplateUpdatePayload } from "@becomposable/common";
import { ApiTopic, ClientBase } from "@becomposable/api-fetch-client";

export default class PromptsApi extends ApiTopic {
    constructor(parent: ClientBase) {
        super(parent, "/api/v1/prompts")
    }

    /**
     * Get the list of all prompt templates
     * @param project optional project id to filter by
     * @returns PromptTemplate[]
     **/
    list(project?: string): Promise<PromptTemplateRef[]> {
        const query = project ? `?project=${project}` : '';
        return this.get('/' + query);
    }

    /**
     * Create a new prompt template
     * @param payload PromptTemplateCreatePayload
     * @returns PromptTemplate
     * @throws ApiError
     * @throws 400 if payload is invalid
     * @throws 500 if creation fails
     **/
    create(payload: PromptTemplateCreatePayload): Promise<PromptTemplate> {
        return this.post('/', {
            payload
        });
    }

    /**
     * Retrieve an existing prompt template
     * @param id of the prompt template to retrieve
     * @returns PromptTemplate
     **/
    retrieve(id: string): Promise<PromptTemplate> {
        return this.get(`/${id}`);
    }

    /**
     * Update an existing prompt template
     * @param id of the prompt template to update
     * @param payload PromptTemplateCreatePayload
     * @returns PromptTemplate
     * @throws ApiError
     * @throws 400 if payload is invalid
     * @throws 500 if update fails
     * @throws 404 if not found
     **/
    update(id: string, payload: PromptTemplateUpdatePayload): Promise<PromptTemplate> {
        return this.put(`/${id}`, {
            payload
        });
    }

    /**
     * Delete an existing prompt template
     * @param id of the prompt template to delete
     * @returns void
     */
    delete(id: string): Promise<void> {
        return this.del(`/${id}`);
    }

    /**
     * Fork an existing prompt template
     * @param id of the prompt template to fork
     * @param payload PromptTemplateForkPayload
     * @returns Forked PromptTemplate
     */
    fork(id: string, payload: PromptTemplateForkPayload): Promise<PromptTemplate> {
        return this.post(`/${id}/fork`, {
            payload
        });
    }

    /**
     * Render a prompt template
     * @param id of the prompt template to render
     * @param payload that will be passed to the prompt template to generate the prompts
     * @returns PromptTemplate
     * @throws ApiError
     * @throws 404 if not found
     * @throws 400 if payload is invalid
     * @throws 500 if render fails
     **/
    render(id: string, payload: {}): Promise<PromptTemplate> {
        return this.post(`/${id}/render`, {
            payload
        });
    }

    /**
     * Get options for a field
     * @param field name to get options for
     * @returns string[]
     */
    options(field: string): Promise<string[]> {
        return this.get(`/options/${field}`);
    }

    /**
     * List the versions of the prompt template. Returens an empty array if no versions are found
     * @param id
     * @returns the versions list or an empty array if no versions are found
     */
    listVersions(id: string): Promise<PromptTemplateRef[]> {
        return this.get(`/${id}/versions`);
    }


    /**
     * Retrieve list of interactions that use the prompt template
     */
    listInteractions(id: string): Promise<ListInteractionsResponse> {
        return this.get(`/${id}/interactions`);
    }

    /**
     * List the forks of the prompt. Returns an empty array if no forks are found
     * @param id of the prompt to search forks
     * @returns the versions list or an empty array if no forks are found
     */
    listForks(id: string): Promise<PromptTemplateRef[]> {
        return this.get(`/${id}/forks`);
    }

}

export interface ListInteractionsResponse {
    prompt: string,
    interactions: {
        id: string,
        name: string,
        versions: string[],
    }[]
}
