import { FacetSpec } from "./facets.js";
import { InteractionSearchQuery, ObjectSearchQuery, ObjectTypeSearchQuery, PromptSearchQuery, RunSearchQuery, SimpleSearchQuery } from "./query.js";

export interface SearchPayload {
    query?: SimpleSearchQuery;
    limit?: number;
    offset?: number;
}

export interface ComputeFacetPayload {
    facets: FacetSpec[];
    query?: SimpleSearchQuery;
}

export interface InteractionSearchPayload extends SearchPayload {
    query?: InteractionSearchQuery;
}

export interface ObjectSearchPayload extends SearchPayload {
    query?: ObjectSearchQuery;
}

export interface ObjectTypeSearchPayload extends SearchPayload {
    query?: ObjectTypeSearchQuery;
}

export interface PromptSearchPayload extends SearchPayload {
    query?: PromptSearchQuery;
}

export interface RunSearchPayload extends SearchPayload {
    query?: RunSearchQuery;
}

export interface ComputeInteractionFacetPayload extends ComputeFacetPayload {
    query?: InteractionSearchQuery;
}

export interface ComputeObjectFacetPayload extends ComputeFacetPayload {
    query?: ObjectSearchQuery;
}

export interface ComputePromptFacetPayload extends ComputeFacetPayload {
    query?: PromptSearchQuery;
}

export interface ComputeRunFacetPayload extends ComputeFacetPayload {
    query?: RunSearchQuery;
}

export interface ExportPropertiesPayload {
    objectIds: string[];
    type: string;
    layout?: string;
}

export interface ExportPropertiesResponse {
    type: string;
    name: string;
    data: Blob;
}