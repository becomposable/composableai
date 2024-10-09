import { ExecutionRunStatus } from "./interaction.js";

export interface RunListingQueryOptions {
    project?: string;
    interaction?: string;
    limit?: number;
    offset?: number;
    filters?: RunListingFilters;
}

export interface RunListingFilters {
    interaction?: string,
    status?: ExecutionRunStatus,
    model?: string,
    environment?: string,
    tag?: string,
    fromDate?: string,
    toDate?: string,
    parent?: string | false,
}

export interface SimpleSearchQuery {
    name?: string;
    status?: string;
}

export interface ObjectSearchQuery extends SimpleSearchQuery {
    location?: string;
    parent?: string;
    similarTo?: string;
    type?: string;
}

export interface ObjectTypeSearchQuery extends SimpleSearchQuery {
    chunckable?: boolean;
}

export interface PromptSearchQuery extends SimpleSearchQuery {
    role?: string;
}

export interface InteractionSearchQuery extends SimpleSearchQuery {
    prompt?: string;
    tags?: string[];
    version?: number;
}

export interface RunSearchQuery extends SimpleSearchQuery {
    offset?: number;
    interaction?: string;
    environment?: string;
    model?: string;
    status?: ExecutionRunStatus;
    tags?: string[];
    query?: string;
    default_query_path?: string;
    parent?: string[] | false;
    object?: string;
    start?: string;
    end?: string;
}