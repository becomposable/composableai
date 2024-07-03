import { ExecutionRunRef, ExecutionRunStatus, NamedInteractionExecutionPayload } from "./interaction.js";
/**
 * Interaction execution payload for creating a new run
 * It uses interaction field (from NamedInteractionExecutionPayload) to pass the intercation ID to run
 */
export interface RunCreatePayload extends NamedInteractionExecutionPayload {
}

export interface StringFacet {
    type: "string",
    path: string,
    num_buckets?: number,
}

export interface NumericFacet {
    type: "number",
    path: string,
    boundaries: number[],
    default?: string
}

export interface DateFacet<T extends (Date | string) = string> {
    type: "date",
    path: string,
    boundaries: T[], // array of dates
    default?: string
}

export type Facet<DateT extends (Date | string) = string> = StringFacet | NumericFacet | DateFacet<DateT>;

/**
 * To be used as a value for a numeric or date filters
 */
export interface RangeValue {
    gt?: number | string,
    gte?: number | string,
    lt?: number | string,
    lte?: number | string,
}

export interface FacetBucket<T extends (string | number) = string> {
    _id: T,
    count: number,
}

export interface FacetResult<T extends (string | number) = string> {
    buckets: FacetBucket<T>[]
}

export interface RunSearchMetaRepsonse {
    count: {
        lower_bound?: number,
        total?: number,
    },
    facet: Record<string, FacetResult>
}

export interface RunSearchResponse {
    meta?: RunSearchMetaRepsonse,
    results?: ExecutionRunRef[];
}

export interface RunSearchPayload {
    /**
     * A limit for the number of results to return.
     * Defualts to 100
     */
    limit?: number,

    /**
     * The offset to start from. Defaults to 0
     */
    offset?: number,

    /**
     * An ISO date string to use as an anchor for the search.
     * If no anchor date is provided then the latest runs will be returned and the anchorDateDirection is ignored.
     */
    anchor_date?: string,

    /**
     * The direction to use when using an anchor date. Defaults to after. d the anchorDate is undefiend then this parameter is ignored.
     */
    anchor_date_direction?: 'before' | 'after',

    /**
     * Perform only meta search. If true facets must be defined.
     */
    only_meta?: boolean,

    /**
     * A facet name to facet definition map. If defined then performs a faceted search.
     * If onlyMeta the actual search will not be performed but only the meta search
     */
    facets?: Record<string, Facet>,

    /**
     * The filters for the search
     */
    filters?: {
        interaction?: string,
        environment?: string,
        model?: string,
        updated_at?: RangeValue,
        status?: ExecutionRunStatus,
        tags?: string[],
    },

    /**
     * An optional lucene query
     */
    query?: string,

    default_query_path?: string;

    /**
     * If false then only top level runs are returned, if a string array then only child runs within the given parent ids are returned.
     * If not specified no parent filter is done (both parent and child runs are returned.)
     */
    parent?: string[] | false;
}

//TODO move to a common place with zeno since it is used by both
export interface FindPayload {
    query: Record<string, any>;
    limit?: number;
    select?: string;
}
