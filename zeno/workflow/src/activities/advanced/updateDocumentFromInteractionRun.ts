import { ExecutionRun } from "@composableai/studio-common";
import { DSLActivityExecutionPayload, DSLActivitySpec } from "@composableai/common";
import { setupActivity } from "../../dsl/setup/ActivityContext.js";
import { ActivityParamNotFound } from "../../errors.js";


export interface UpdateDocumentFromInteractionRunParams {
    /**
     * The execution run object to use. Required.
     * Not required in params since it is usually fetched
     */
    run?: ExecutionRun,
}

export interface UpdateDocumentFromInteractionRun extends DSLActivitySpec<UpdateDocumentFromInteractionRunParams> {
    name: 'updateDocumentFromInteractionRun';
}

export async function updateDocumentFromInteractionRun(payload: DSLActivityExecutionPayload) {
    const { params, zeno, objectId } = await setupActivity<UpdateDocumentFromInteractionRunParams>(payload);

    if (!params.run) {
        throw new ActivityParamNotFound("run", payload.activity);
    }

    const docProps = params.run.result;

    if (!docProps) {
        return { status: "failed", error: "no-props" };
    }

    await zeno.objects.update(objectId, docProps);

    return { status: "success" };
}