
export enum ContentEventName {
    create = "create",
    update = "update",
    delete = "delete",
    workflow_finished = "workflow_finished",
    workflow_execution_request = "workflow_execution_request",
}


export interface WorkflowExecutionPayload {
    /**
 * The event which started the workflow who created the activity.
 */
    event: ContentEventName;

    /**
     * The account ID of the user who created the activity.
     * This is usefull to select the right database to work on.
     */
    accountId: string;

    /**
     * The project ID of the account who created the activity.
     */
    projectId: string;

    /**
     * The Unix timestamp when the workflow was started.
     */
    timestamp: number;

    /*
     * The Workflow Rule ID if any. If the workflow was started by a rule this field will contain the rule ID
     * otherwise if the workflow was started on demand the property will be undefined.
     */
    wfRuleName: string;

    /**
     * The vars field is mainly used to pass the user input to the workflow.
     * The user input ar custom user options that can be used to configure the workflow.
     * You can see the user input as the arguments for a command line app.
     *
     * In the case of workflows started by events (e.g. using a a workflow rule) the user input vars will be initialized with the workflow rule configuration field.
     *
     * In case of dsl workflows the worflow execution payload vars will be applied over the default vars values stored in the DSL vars field.
     */
    vars: Record<string, any>;

    /**
     * Auth Token to access Zeno and Composable from the workers
     */
    authToken: string;

    /**
     * The ID of the target objects processed by the workflow.
     */
    objectIds: string[];
}


export interface ExecuteWorkflowPayload {
    objectIds?: string[];
    vars?: Record<string, any>;
}



export interface ListWorkflowRunsPayload {
    documentId?: string;
    eventName?: string;
    ruleId?: string;
}


interface WorkflowRunEvent {

    eventId: number;
    eventTime: number;
    eventType: string;
    taskId: string;
    attempt: number;

    activity?: {
        name: string;
        id: string;
        input?: any;
    }

    error?: {
        message: string;
        source: string;
        stackTrace: string;
        type?: string;
    };

    result?: any

}

export interface WorkflowRun {
    status?: WorkflowExecutionStatus | string,
    type?: string,
    startedAt?: number,
    closedAt?: number,
    execution_duration?: number,
    runId?: string,
    workflowId?: string,
    raw?: any
}


export interface WorkflowRunWithDetails extends WorkflowRun {
    history?: WorkflowRunEvent[];
}
export interface ListWorkflowRunsResponse {
    runs: WorkflowRun[];
}


export interface MultiDocumentsInteractionParams extends Omit<WorkflowExecutionPayload, 'config'> {
    config: {
        interactionName: string;
        action: DocumentActionConfig;
        data: Record<string, any>;
    }
}

export interface DocumentActionConfig {
    contentTypeName?: string; //content type to use
    setAsProperties: boolean; //set result as properties
    setAsText: string; //set result as text, if result set the whole result as text
    setNameFrom: string; //result property to use as name
    upsert: boolean; //wether to upsert or update only
    documentId?: string; //doc Id to update
    parentId?: string; //parentId for the created doc
}




export enum WorkflowExecutionStatus {
    UNKNOWN = 0,
    RUNNING = 1,
    COMPLETED = 2,
    FAILED = 3,
    CANCELED = 4,
    TERMINATED = 5,
    CONTINUED_AS_NEW = 6,
    TIMED_OUT = 7,
}