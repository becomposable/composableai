import { ExecutionRunStatus } from './interaction.js';
import { SupportedEmbeddingTypes } from './project.js';

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

export interface VectorSearchQuery {
    objectId?: string;
    values?: number[];
    text?: string;
    image?: string;
    threshold?: number;
    type: SupportedEmbeddingTypes
}

export interface SimpleSearchQuery {
    name?: string;
    status?: string;
}

export interface ObjectSearchQuery extends SimpleSearchQuery {
    location?: string;
    parent?: string;
    similarTo?: string;
    embeddingType?: SupportedEmbeddingTypes;
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

export interface ComplexSearchQuery extends ObjectSearchQuery {
    vector?: VectorSearchQuery;
}