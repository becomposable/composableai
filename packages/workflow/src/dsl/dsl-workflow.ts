import { DSLActivityExecutionPayload, DSLActivitySpec, DSLWorkflowExecutionPayload, WorkflowExecutionPayload } from "@becomposable/common";
import { ActivityOptions, log, proxyActivities } from "@temporalio/workflow";
import { ActivityParamNotFound, NoDocumentFound, WorkflowParamNotFound } from "../errors.js";
import { Vars } from "./vars.js";
// @ts-ignore
import ms, { StringValue } from "ms";


const activityOptionsRegistry: Record<string, StringValue> = {
    ["guessOrCreateDocumentType"]: "6m",
    ["executeInteraction"]: "5m",
};

interface BaseActivityPayload extends WorkflowExecutionPayload {
    workflow_name: string;
    debug_mode?: boolean;
}

function dslActivityPayload(basePayload: BaseActivityPayload, activity: DSLActivitySpec, params: Record<string, any> = {}) {
    return {
        ...basePayload,
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
    const basePayload: BaseActivityPayload = {
        ...payload,
        workflow_name: definition.name,
        debug_mode: !!definition.debug_mode,
    }
    delete (basePayload as any).workflow;

    const defaultOptions: ActivityOptions = {
        ...definition.options,
        startToCloseTimeout: "5 minute",
        retry: {
            initialInterval: '30s',
            backoffCoefficient: 2,
            maximumAttempts: 20,
            maximumInterval: 100 * 30 * 1000, //ms
            nonRetryableErrorTypes: [
                NoDocumentFound.name,
                ActivityParamNotFound.name,
                WorkflowParamNotFound.name,
            ],
        },
    };
    // merge default vars with the payload vars and add objectIds and obejctId
    const vars = new Vars({
        ...definition.vars,
        ...payload.vars,
        objectIds: payload.objectIds || [],
        objectId: payload.objectIds ? payload.objectIds[0] : undefined
    });

    log.info("Executing workflow", { payload });

    for (const activity of definition.activities) {
        if (basePayload.debug_mode) {
            log.debug(`Workflow vars before executing activity ${activity.name}`, { vars: vars.resolve() });
        }
        if (activity.condition && !vars.match(activity.condition)) {
            log.info("Activity skiped: condition not satisfied", activity.condition);
            continue;
        }
        const importParams = vars.createImportVars(activity.import);
        const executionPayload = dslActivityPayload(basePayload, activity, importParams);

        const options = computeActivityOptions(activity.name, defaultOptions);
        const proxy = proxyActivities(options);

        log.info("Executing activity: " + activity.name, { payload: executionPayload });
        const fn = proxy[activity.name];
        if (activity.parallel) {
            //TODO execute in parallel
            log.info("Parallel execution not yet implemented");
        } else {
            log.info("Executing activity: " + activity.name, { importParams });
            const result = await fn(executionPayload);
            if (activity.output) {
                vars.setValue(activity.output, result);
            }
        }
        if (basePayload.debug_mode) {
            log.debug(`Workflow vars after executing activity ${activity.name}`, { vars: vars.resolve() });
        }

    }
    return vars.getValue(definition.result || 'result');
}


function computeActivityOptions(activityName: string, defaultOptions: ActivityOptions): ActivityOptions {
    const opts: StringValue = activityOptionsRegistry[activityName];

    if (opts) {
        const activityOptions: ActivityOptions = {
            startToCloseTimeout: opts ? ms(opts) : undefined,
            // TODO Convert other fields
        }
        // merge default options with the activity-specific options
        const result = {
            ...defaultOptions,
            ...activityOptions,
            retry: {
                ...defaultOptions.retry,
                // ...opts.retry,
            },
        };
        console.log(`Options exist. Using activity options for "${activityName}"`, { options: result });
        return result;
    } else {
        console.log(`Options do not exist. Using default activity options for "${activityName}"`, { options: defaultOptions });
        return defaultOptions;
    }
}
