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
    location?: string;
    name?: string;
    parent?: string;
    prompt?: string;
    role?: string;
    similarTo?: string;
    status?: string;
    tags?: string[];
    type?: string;
    version?: number;
}