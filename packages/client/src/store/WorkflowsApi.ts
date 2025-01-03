import { ApiTopic, ClientBase } from '@vertesia/api-fetch-client';
import { ActivityCatalog, CreateWorkflowRulePayload, DSLWorkflowDefinition, DSLWorkflowSpec, ExecuteWorkflowPayload, ListWorkflowRunsPayload, ListWorkflowRunsResponse, WorkflowDefinitionRef, WorkflowRule, WorkflowRuleItem, WorkflowRunWithDetails } from '@vertesia/common';

export class WorkflowsApi extends ApiTopic {

    constructor(parent: ClientBase) {
        super(parent, "/api/v1/workflows");
    }

    getActivityCatalog(): Promise<ActivityCatalog> {
        return this.get("/activity-catalog");
    }

    listRuns(documentId: string, eventName: string, ruleId: string): Promise<ListWorkflowRunsResponse> {
        return this.post(`/runs`, { payload: { documentId, eventName, ruleId } });
    }

    searchRuns(payload: ListWorkflowRunsPayload): Promise<ListWorkflowRunsResponse> {
        return this.post(`/runs`, { payload: payload });
    }

    getRunDetails(runId: string, workflowId: string): Promise<WorkflowRunWithDetails> {
        return this.get(`/runs/${workflowId}/${runId}`, { query: { workflowId } });
    }

    terminate(workflowId: string, runId: string, reason?: string): Promise<{ message: string }> {
        return this.post(`/runs/${workflowId}/${runId}/terminate`, { payload: { reason } });
    }

    cancel(workflowId: string, runId: string, reason?: string): Promise<{ message: string }> {
        return this.post(`/runs/${workflowId}/${runId}/cancel`, { payload: { reason } });
    }

    execute(name: string, payload: ExecuteWorkflowPayload = {}): Promise<{ runIds: string[] }> {
        return this.post(`/execute/${name}`, { payload });
    }

    rules = new WorkflowsRulesApi(this);
    definitions = new WorkflowsDefinitionApi(this);

}


export class WorkflowsRulesApi extends ApiTopic {

    constructor(parent: WorkflowsApi) {
        super(parent, "/rules");
    }


    list(): Promise<WorkflowRuleItem[]> {
        return this.get("/");
    }


    retrieve(id: string): Promise<WorkflowRule> {
        return this.get(`/${id}`);
    }

    update(id: string, payload: any): Promise<WorkflowRule> {
        return this.put(`/${id}`, {
            payload
        });
    }

    create(payload: CreateWorkflowRulePayload): Promise<WorkflowRule> {
        return this.post("/", {
            payload
        });
    }

    delete(id: string) {
        return this.del(`/${id}`);
    }


    execute(id: string, objectIds?: string[], vars?: Record<string, any>): Promise<{ runIds: string[] }> {
        const payload: ExecuteWorkflowPayload = {
            objectIds,
            vars
        };
        return this.post(`/${id}/execute`, { payload });
    }

}

export class WorkflowsDefinitionApi extends ApiTopic {

    //model: DSLWorkflowDefinition;

    constructor(parent: WorkflowsApi) {
        super(parent, "/definitions");
    }

    list(): Promise<WorkflowDefinitionRef[]> {
        return this.get("/");
    }


    retrieve(id: string): Promise<DSLWorkflowDefinition> {
        return this.get(`/${id}`);
    }

    update(id: string, payload: any): Promise<DSLWorkflowDefinition> {
        return this.put(`/${id}`, {
            payload
        });
    }

    create(payload: DSLWorkflowSpec): Promise<DSLWorkflowDefinition> {
        return this.post("/", {
            payload
        });
    }

    delete(id: string) {
        return this.del(`/${id}`);
    }


}