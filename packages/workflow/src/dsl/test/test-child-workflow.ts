import { WorkflowExecutionPayload } from "@becomposable/common";
export { dslWorkflow } from "../dsl-workflow.js";

export async function testChildWorkflow(payload: WorkflowExecutionPayload) {
    return `Child: Hello, ${payload.vars.name}!`;
}
