import { ContentWorkflow, CreateContentWorkflowPayload, ExecuteWorkflowPayload, ListWorkflowRunsResponse } from "@composableai/zeno-common";
import { ApiTopic, ClientBase } from "api-fetch-client";


export class WorkflowsApi extends ApiTopic {

    constructor(parent: ClientBase) {
        super(parent, "/api/v1/workflows");
    }


    list(): Promise<ContentWorkflow[]> {
        return this.get("/");
    }


    getWorkflow(id: string): Promise<ContentWorkflow> {
        return this.get(`/${id}`);
    }

    updatetWorkflow(id: string, payload: any): Promise<ContentWorkflow> {
        return this.put(`/${id}`, {
            payload
        });
    }

    createWorkflow(payload: CreateContentWorkflowPayload): Promise<ContentWorkflow> {
        return this.post("/", {
            payload
        });
    }

    execute(id: string, objectIds?: string[], config?: Record<string, any>): Promise<{ runIds: string[] }> {

        const payload: ExecuteWorkflowPayload = {
            targetObjectIds: objectIds,
            config
        };
        return this.post(`/${id}/execute`, { payload });
    }

    deleteWorkflow(id: string) {
        return this.del(`/${id}`);
    }


    listRuns(documentId: string, eventName: string, ruleId: string): Promise<ListWorkflowRunsResponse> {
        return this.post(`/runs`, { payload: { documentId, eventName, ruleId } });
    }


}