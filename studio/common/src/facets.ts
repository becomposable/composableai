
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


export interface FacetSpec {
    name: string;
    field: string;
}

export interface FacetBucket {
    _id: string,
    count: number,
}

export interface FacetResult {
    buckets: FacetBucket[]
}
