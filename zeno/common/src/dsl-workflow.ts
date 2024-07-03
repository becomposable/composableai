import { BaseObject, WorkflowExecutionPayload } from "./index.js";

/**
 * The interface of a function that can be used as a DSL workflow activity.
 */
export interface DSLActivityFn {
    (payload: DSLActivityExecutionPayload): Promise<any>;
}


/**
 * The payload sent when starting a workflow from the temporal client to the workflow instance.
 */
export interface DSLWorkflowExecutionPayload extends WorkflowExecutionPayload {
    /**
     * The workflow definition to be used by the DSL workflow.
     * If a dsl workflow is executed and no definition is provided the workflow will fail.
     */
    workflow: DSLWorkflowSpec;
}

/**
 * The payload for a DSL activity execution.
 */
export interface DSLActivityExecutionPayload extends WorkflowExecutionPayload {
    activity: DSLActivitySpec;
    params: Record<string, any>;
    workflow_name: string;
    debug_mode?: boolean;
}


export type ImportSpec = (string | Record<string, string>)[];
export interface ActivityFetchSpec {
    /**
     * The data provider name
     */
    type: "document" | "document_type" | "interaction_run";
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
     * The number of results to return. If the result is limitedto 1 the result will be a single object
     */
    limit?: number;

    /**
     * How to handle not found objects.
     * 1. ignore - Ignore and return an empty array for multi objects query (or undefined for single object query) or empty array for multiple objectthrow an error.
     * 2. throw - Throw an error if the object or no objects are found.
     */
    on_not_found?: "ignore" | "throw";
}

export interface DSLActivitySpec<PARAMS extends Record<string, any> = Record<string, any>> {
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
    params?: PARAMS;
    /**
     * The name of the workflow variable that will store the result of the activity
     * If not specified the result will not be stored
     * The parameters describe how the actual parameters will be obtained from the worlkfow execution vars.
     * since it may contain references to workflow execution vars.
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
     * The import spec is used to import data from workflow variables.
     * The import spec is a list of variable names to import from the workflow context.
     * You can also use objects to rename the imported variables, or to reference an expression.
     * Example:
     * ["runId", {"typeId": "docType.id"}]
     */
    import?: ImportSpec;

    /**
     * The fetch phase is used to fetch data from external sources.
     */
    fetch?: Record<string, ActivityFetchSpec>;

    /**
     * Projection to apply to the result. Not all activities support this.
     */
    projection?: never | Record<string, any>;

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

export interface DSLWorkflowSpec {
    name: string;
    description?: string;
    tags?: string[];

    activities: DSLActivitySpec[];
    // a dictionary of vars to initialize the workflow execution vars
    // Initial vars cannot contains references to other vars
    vars: Record<string, any>;
    // this must be an ActivityOptions from @temporalio/common //TODO: why not type it this way?
    options?: Record<string, any>;
    // the name of the variable that will hold the workflow result
    // if not specified "result" will be assumed
    result?: string;
    debug_mode?: boolean;
}

export interface DSLWorkflowDefinition extends BaseObject, DSLWorkflowSpec {
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
