import { DSLActivityExecutionPayload, DSLActivitySpec, DSLWorkflowExecutionPayload, WorkflowExecutionPayload } from "@composableai/zeno-common";
import { ActivityOptions, log, proxyActivities } from "@temporalio/workflow";
import { Vars } from "./vars.js";
import { WorkflowParamNotFound } from "../errors.js";

export function dslActivityPayload(workflowPayload: WorkflowExecutionPayload, activity: DSLActivitySpec, params: Record<string, any> = {}) {
    return {
        ...workflowPayload,
        activity,
        params,
    } as DSLActivityExecutionPayload
}

export async function dslWorkflow(payload: DSLWorkflowExecutionPayload) {

    const definition = payload.workflow;
    if (!definition) {
        throw new WorkflowParamNotFound("workflow");
    }
    // the base payload wiull be used to create the activities payload
    const basePayload: WorkflowExecutionPayload = {
        ...payload
    }
    delete (basePayload as any).workflow;

    const options: ActivityOptions = {
        ...definition.options,
        startToCloseTimeout: "5 minute",
        retry: {
            initialInterval: '30s',
            backoffCoefficient: 2,
            maximumAttempts: 20,
            maximumInterval: 100 * 30 * 1000, //ms
            nonRetryableErrorTypes: [],
        },
    };
    const proxy = proxyActivities(options as any);
    // merge default vars with the payload vars and add objectIds and obejctId
    const vars = new Vars({
        ...definition.vars,
        ...payload.vars,
        objectIds: payload.objectIds || [],
        objectId: payload.objectIds ? payload.objectIds[0] : undefined
    });

    log.info("Executing workflow", { definition, params: payload });

    for (const activity of definition.activities) {
        if (activity.condition && !vars.match(activity.condition)) {
            log.info("Activity skiped: condition not satisfied", activity.condition);
            continue;
        }
        log.info("Executing activity: " + activity.name, { params: payload });
        const importParams = vars.createImportVars(activity.import);
        const executionPayload = dslActivityPayload(basePayload, activity, importParams);
        const fn = proxy[activity.name];
        if (activity.parallel) {
            //TODO execute in parallel
            log.info("Parallel execution not yet implemented");
        } else {
            log.info("Executing activity: " + activity.name, { importParams });
            const result = await fn(executionPayload);
            if (activity.output) {
                vars.set(activity.output, result);
            }
        }
    }
    return vars.get(definition.result || 'result');
}
