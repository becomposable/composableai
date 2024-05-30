
export enum ContentEventName {
    create = "create",
    update = "update",
    delete = "delete",
    workflow_finished = "workflow_finished",
    workflow_execution_request = "workflow_execution_request",
}


/**
 *  Params for a workflow that require objects to be processed.
 */
export interface WorkflowParams {
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
     * The Unix timestamp when the workflow was started.
     */
    timestamp: number;
    /*
     * The Workflow Rule ID.
     */
    wfRuleName: string;
    /**
     * Workfllow configuration.
     */
    config: Record<string, any>;
}

/**
 * The parameters for a workflow that processes a single object.
 */
export interface SingleObjectWorkflowParams extends WorkflowParams {

    /**
     * The ID of the object processed by the workflow.
     */
    objectId: string;

}



/**
 * Params for a workflow that processes multiple objects.
 
 */
export interface MultipleObjectsWorkflowParams extends WorkflowParams {

    /**
     * The ID of the target objects processed by the workflow.
     */
    objectIds: string[];

}



export interface ExecuteWorkflowPayload {

    targetObjectIds?: string[];
    config?: any;

}



export interface ListWorkflowRunsPayload {
    documentId?: string;
    eventName?: string;
    ruleId?: string;
}

export interface WorkflowRun {
    status?: string,
    type?: string,
    started_at?: number,
    closed_at?: number,
    execution_duration?: number,
    run_id?: string,
}
export interface ListWorkflowRunsResponse {
    runs: WorkflowRun[];
}


export interface MultiDocumentsInteractionParams extends Omit<MultipleObjectsWorkflowParams, 'config'> {
    config: {
        interactionName: string;
        action: DocumentActionConfig;
        resultSchema?: any;
        formatter?: (res: any) => any;
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
