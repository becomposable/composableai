
export interface AnalyticsAxis {
    environment?: string;
    project?: string;
    interactions?: string[];
    models?: string[];
    status?: string[];
    tags?: string[];
    selectedOnly?: boolean;
}

export interface RunAnalyticsQuery {

    /** filters to apply to the query */
    filterBy: AnalyticsAxis;

    /** The field to group by */
    groupBy?: RunAnalyticsGroupBy

    /** The start date of the query in EPOCH format */
    from?: number;
    /** The end date of the query in EPOCH format */
    to?: number;

    /** The time resolution of the analytics query */
    resolution?: TimeResolution;

    /** The field to sort by */
    virtual?: boolean;

}


export type RunAnalyticsGroupBy = "interaction" | "modelId" | "project" | "status" | "tags" | "environment";

export type TimeResolution = "hour" | "day" | "week" | "month" | "year";


export interface RunAnalyticsResult {
    date: string,
    timestamp: string,
    group: string
    count: number,
    execution_time: {
        avg: number,
        min: number,
        max: number
    },
}
