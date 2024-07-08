import { DSLActivityExecutionPayload, DSLActivitySpec } from "@composableai/zeno-common";
import { log } from "@temporalio/activity";
import { setupActivity } from "../dsl/setup/ActivityContext.js";
import { TruncateSpec } from "../utils/tokens.js";
import { InteractionExecutionParams, executeInteractionFromActivity } from "./executeInteraction.js";

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
    const { params, studio, zeno, objectId} = context;

    const project = await context.fetchProject();
    
    const doc = await zeno.objects.retrieve(objectId, "+text");
    const type = doc.type ? await zeno.types.retrieve(doc.type.id) : undefined;

    if (!doc?.text && !doc?.content?.type?.startsWith("image/")) {
        log.warn(`Object ${objectId} not found or text is empty`, { doc });
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

    const getImageRef = () => {
        if (!doc.content?.type?.startsWith("image/")) {
            return null;
        }

        return "store:" + doc.id;
    }

    log.info(` Extracting information from object ${objectId} with type ${type.name}`, payload.debug_mode ? { params } : undefined);

    const infoRes = await executeInteractionFromActivity(
        studio,
        "ExtractInformation",
        {
            ...params,
            result_schema: type.object_schema,
        },
        {
            content: doc.text ?? undefined,
            file: getImageRef() ?? undefined,
            human_context: project?.configuration?.human_context ?? undefined,
        });

    log.info(`Extracted information from object ${objectId} with type ${type.name}`, { infoRes });
    await zeno.objects.update(doc.id, {
        properties: {
            ...infoRes.result,
            etag: doc.text_etag
        }
    });


    return { status: "completed" };

}