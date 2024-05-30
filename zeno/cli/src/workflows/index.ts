import { WorkflowRuleInputType } from "@composableai/zeno-common";
import { Command } from "commander";
import { getClient } from "../client.js";


export async function createWorkflow(program: Command, options: Record<string, any>) {
    const { name, on, run, inputType } = options;
    if (!name) {
        console.log('A name for the worklow is required. Use --name argument');
        process.exit(1);
    }
    if (!on) {
        console.log('An event to trigger the workflow is required. Use --on argument');
        process.exit(1);
    }
    if (!run) {
        console.log('A workflow to run is required. Use --run argument');
        process.exit(1);
    }
    const [event_name, object_type] = on.split(':');
    const workflow = await getClient(program).workflows.createRule({
        name,
        endpoint: run,
        input_type: inputType ?? WorkflowRuleInputType.single,
        match: {
            event_name,
            object_type
        }
    });
    console.log("Created workflow", workflow.id);
}

export async function deleteWorkflow(program: Command, objectId: string, _options: Record<string, any>) {
    const res = await getClient(program).store.delete(objectId);
    console.log(res);
}

export async function getWorkflow(program: Command, objectId: string, _options: Record<string, any>) {
    const res = await getClient(program).workflows.getRule(objectId);
    console.log(res);

}

export async function executeWorkflow(program: Command, workflowId: string, options: Record<string, any>) {
    console.log("Executing workflow", workflowId, options);
    const { objectId, config } = options;
    const res = await getClient(program).workflows.execute(workflowId, objectId, config);
    console.log(res);
}

export async function listWorkflows(program: Command, _options: Record<string, any>) {
    const res = await getClient(program).workflows.listRules();
    console.log(res);
}
