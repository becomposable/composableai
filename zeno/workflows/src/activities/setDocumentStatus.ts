import { ContentObjectStatus, DSLActivityExecutionPayload, DSLActivitySpec } from "@composableai/zeno-common";
import { setupActivity } from "../dsl/setup/ActivityContext.js";

//@ts-ignore
const JSON: DSLActivitySpec = {
    name: 'setDocumentStatus',
    params: {
        status: "${status}"
    }
}

export interface SetDocumentStatusParams {
    status: ContentObjectStatus;
}

export interface SetDocumentStatus extends DSLActivitySpec<SetDocumentStatusParams> {
    name: 'setDocumentStatus';
    projection?: never;
}

/**
 * We are using a union type for the status parameter since typescript enumbs breaks the workflow code generation
 * @param objectId
 * @param status
 */
export async function setDocumentStatus(payload: DSLActivityExecutionPayload) {
    const { zeno, params, objectId } = await setupActivity<SetDocumentStatusParams>(payload);

    const res = await zeno.objects.update(objectId, { status: params.status });

    return res.status;

}