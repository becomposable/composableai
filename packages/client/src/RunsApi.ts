import { ExecutionRun, ExecutionRunRef, FindPayload, RunCreatePayload, RunListingFilters, RunListingQueryOptions, RunSearchPayload, RunSearchResponse } from "@composableai/common";
import { ApiTopic, ClientBase } from "api-fetch-client";
import { ComposableClient } from "./client.js";


export interface FilterOption {
    id: string,
    name: string,
    count: number
}


export class RunsApi extends ApiTopic {

    constructor(parent: ClientBase) {
        super(parent, "/api/v1/runs")
    }

    /**
     * Get the list of all runs
     * @param project optional project id to filter by
     * @param interaction optional interaction id to filter by
     * @returns InteractionResult[]
     **/
    list({ limit, offset, filters }: RunListingQueryOptions): Promise<ExecutionRunRef[]> {

        const query = {
            limit,
            offset,
            ...filters
        }

        return this.get('/', { query: query });
    }

    find(payload: FindPayload): Promise<ExecutionRun[]> {
        return this.post("/find", {
            payload
        });
    }

    /**
     * Get a run by id
     * @param id
     * @returns InteractionResult
     **/
    retrieve(id: string): Promise<ExecutionRun> {
        return this.get('/' + id);
    }


    /**
     * Get filter options for a field
     * return FilterOption[]
     */
    filterOptions(field: string, filters: RunListingFilters): Promise<FilterOption[]> {
        const query = {
            ...filters
        }
        return this.get(`/filter-options/${field}`, { query });

    }

    create(payload: RunCreatePayload): Promise<ExecutionRun> {
        const sessionTags = (this.client as ComposableClient).sessionTags;
        if (sessionTags) {
            let tags = Array.isArray(sessionTags) ? sessionTags : [sessionTags];
            if (Array.isArray(payload.tags)) {
                tags = tags.concat(payload.tags)
            } else if (payload.tags) {
                tags = tags.concat([payload.tags])
            }
            payload = { ...payload, tags }
        }
        return this.post("/", {
            payload
        });
    }

    search(payload: RunSearchPayload): Promise<RunSearchResponse> {
        return this.post("/search", {
            payload
        });
    }

}