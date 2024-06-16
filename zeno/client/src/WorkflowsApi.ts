import { CreateWorkflowRulePayload, ExecuteWorkflowPayload, ListWorkflowRunsResponse, WorkflowRule, WorkflowRuleItem, WorkflowRunWithDetails } from "@composableai/zeno-common";
import { ApiTopic, ClientBase } from "api-fetch-client";

export class WorkflowsApi extends ApiTopic {

    constructor(parent: ClientBase) {
        super(parent, "/api/v1/workflows");
    }


    listRules(): Promise<WorkflowRuleItem[]> {
        return this.get("/");
    }


    getRule(id: string): Promise<WorkflowRule> {
        return this.get(`/${id}`);
    }

    updateRule(id: string, payload: any): Promise<WorkflowRule> {
        return this.put(`/${id}`, {
            payload
        });
    }

    createRule(payload: CreateWorkflowRulePayload): Promise<WorkflowRule> {
        return this.post("/", {
            payload
        });
    }

    deleteRule(id: string) {
        return this.del(`/${id}`);
    }

    execute(id: string, objectIds?: string[], config?: Record<string, any>): Promise<{ runIds: string[] }> {
        const payload: ExecuteWorkflowPayload = {
            targetObjectIds: objectIds,
            config
        };
        return this.post(`/${id}/execute`, { payload });
    }

    listRuns(documentId: string, eventName: string, ruleId: string): Promise<ListWorkflowRunsResponse> {
        return this.post(`/runs`, { payload: { documentId, eventName, ruleId } });
    }

    getRunDetails(runId: string, workflowId: string): Promise<WorkflowRunWithDetails> {
        return this.get(`/runs/${workflowId}/${runId}`, { query: { workflowId } });
    }

    terminate(workflowId: string, runId: string, reason?: string): Promise<{ message: string }> {
        return this.post(`/runs/${workflowId}/${runId}/terminate`, { payload: { reason } });
    }


}