import { proxyActivities } from "@temporalio/workflow";

import { DSLActivitySpec, DSLWorkflowExecutionPayload } from "@composableai/common";
import * as activities from "../activities/index.js";

const {
    generateEmbeddings,
} = proxyActivities<typeof activities>({
    startToCloseTimeout: "5 minute",
    retry: {
        initialInterval: '30s',
        backoffCoefficient: 2,
        maximumAttempts: 20,
        maximumInterval: 100 * 30 * 1000, //ms
        nonRetryableErrorTypes: [],
    },
});

export async function recalculateEmbeddingsWorkflow(payload: DSLWorkflowExecutionPayload) {

    const activityConfig: DSLActivitySpec = {
        name: 'generateEmbeddings',
        params: {
            force: true,
        },
    };
    
    const res = generateEmbeddings({
        ...payload,
        params: {},
        workflow_name: 'recalculateEmbeddingsWorkflow',
        activity: activityConfig,
    });

    return res;

}