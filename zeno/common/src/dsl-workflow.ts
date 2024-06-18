import { BaseObject, MultipleObjectsWorkflowParams } from "./index.js";

/**
 * The interface of a function that can be used as a DSL workflow activity.
 */
export interface DSLActivityFn {
    (context: DSLActivityExecutionPayload, params: Record<string, any>): Promise<any>;
}

export interface DSLActivityExecutionPayload extends MultipleObjectsWorkflowParams {
    activity: DSLWorkflowActivity;
    params: Record<string, any>;
}

export interface ActivityFetchSpec {
    /**
     * The data provider name
     */
    provider: "store" | "interaction_runs";
    /**
     * An optinal URI to the data source.
     */
    source?: string;
    /**
     * The query to be executed by the data provider
     */
    query: Record<string, any>;
    /**
     * a string of space separated field names.
     * Prefix a field name with "-" to exclude it from the result.
     */
    select?: string;
    /**
     * A variable name to store the result of the fetch
     */
    as: string;
}

export interface DSLWorkflowActivity {
    /**
     * The name of the activity function
     */
    name: string;
    /**
     * Title of the activity to be displayed in the UI workflow builder
     */
    title?: string;
    /**
     * The description of the activity to e displayed in the UI workflow builder
     */
    description?: string;
    /**
     * Activities parameters. These parameters can be either literals
     * (hardcoded strings, numbers, booleans, obejcts, arrays etc.), either
     * references to the workflow variables.
     * The workflow variables are built from the workflow params (e.g. the workflow configuration)
     * and from the result of the previous activities.
     */
    params?: Record<string, any>;
    /**
     * The name of the workflow variable that will store the result of the activity
     * If not specified the result will not be stored
     */
    output?: string;

    /**
     * A JSON expression which evaluate to true or false similar to mongo matches.
     * We support fow now basic expreion like: $true, $false, $eq, $ne, $gt, $gte, $lt, $lte, $in, $nin, $regexp
     * {$eq: {name: value}},
     * Ex: {$eq: {wfVarName: value}}
     */
    condition?: Record<string, any>;

    /**
     * The fetch phase is used to fetch data from external sources.
     */
    fetch?: ActivityFetchSpec[];

    // ---------- Optional features not implemented in a first step ------------
    /**
     * If true the activity will be executed in parallel with the other activities.
     * (i.e. the workflow will not wait for the activity to finish before starting the next one)
     */
    parallel?: boolean;

    /**
     * Await for a parallel activity execution to return.
     */
    await?: string; //the activity name to await

}


export interface DSLWorkflowDefinition extends BaseObject {
    activities: DSLWorkflowActivity[];
    vars: Record<string, any>;
    // this must be an ActivityOptions from @temporalio/common //TODO: why not type it this way?
    options?: Record<string, any>;
    // the name of the variable that will hold the workflow result
    // if not specified "result" will be assumed
    result?: string;
    debug_mode?: boolean;
}

export interface WorkflowDefinitionRef {
    id: string;
    name: string;
    description?: string;
    tags?: string[];
    created_at: Date;
    updated_at: Date;
}

export const WorkflowDefinitionRefPopulate = "id name description tags created_at updated_at"
