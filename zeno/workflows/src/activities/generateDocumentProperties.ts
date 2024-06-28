import { DSLActivityExecutionPayload, DSLActivitySpec } from "@composableai/zeno-common";
import { TruncateSpec, truncByMaxTokens } from "../utils/tokens.js";
import { InteractionExecutionParams, executeInteractionFromActivity } from "./executeInteraction.js";
import { setupActivity } from "../dsl/setup/ActivityContext.js";
import { log } from "@temporalio/activity";

export interface GenerateDocumentPropertiesParams extends InteractionExecutionParams {
    typesHint?: string[];
    /**
     * truncate the input doc text to the specified max_tokens
     */
    truncate?: TruncateSpec;
}
export interface GenerateDocumentProperties extends DSLActivitySpec<GenerateDocumentPropertiesParams> {
    name: 'generateDocumentProperties';
}

export async function generateDocumentProperties(payload: DSLActivityExecutionPayload) {
    const context = await setupActivity<GenerateDocumentPropertiesParams>(payload);
    const { params, studio, zeno, objectId } = context;


    const doc = await zeno.objects.retrieve(objectId, "+text");
    const type = doc.type ? await zeno.types.retrieve(doc.type.id) : undefined;

    if (!doc?.text) {
        log.warn(`Object ${objectId} not found or text is empty`);
        return { status: "failed", error: "no-text" }
    }

    if (!type || !type.object_schema) {
        log.warn(`Object ${objectId} has no schema`);
        return { status: "failed", error: "no-schema" };
    }

    /*if (!force && doc.properties?.etag === (doc.text_etag ?? md5(doc.text))) {
        log.info("Properties already extracted", { objectId: objectId });
        return { status: "skipped" };
    }*/


    log.info("Extracting information from object", { objectId: objectId, schema: type.object_schema });

    const content = truncByMaxTokens(doc.text, params.truncate || 4000);

    const infoRes = await executeInteractionFromActivity(studio, "ExtractInformation", params, {
        content,
    });

    await zeno.objects.update(doc.id, {
        properties: {
            ...infoRes.result,
            etag: doc.text_etag
        }
    });


    return { status: "completed" };

}