import { CreateContentObjectTypePayload, DSLActivityExecutionPayload, DSLActivitySpec } from "@vertesia/common";
import { log } from "@temporalio/activity";
import { ActivityContext, setupActivity } from "../dsl/setup/ActivityContext.js";
import { TruncateSpec, truncByMaxTokens } from "../utils/tokens.js";
import { InteractionExecutionParams, executeInteractionFromActivity } from "./executeInteraction.js";

const INT_SELECT_DOCUMENT_TYPE = "sys:SelectDocumentType"
const INT_GENERATE_METADATA_MODEL = "sys:GenerateMetadataModel"

export interface GenerateOrAssignContentTypeParams extends InteractionExecutionParams {
    typesHint?: string[];
    /**
     * truncate the input doc text to the specified max_tokens
     */
    truncate?: TruncateSpec;

    /**
     * The name of the interaction to execute
     * @default SelectDocumentType
     */
    interactionNames?: {
        selectDocumentType?: string;
        generateMetadataModel?: string;
    }
}

export interface GenerateOrAssignContentType extends DSLActivitySpec<GenerateOrAssignContentTypeParams> {
    name: 'generateOrAssignContentType';
}

export async function generateOrAssignContentType(payload: DSLActivityExecutionPayload) {
    const context = await setupActivity<GenerateOrAssignContentTypeParams>(payload);
    const { params, client, objectId } = context;

    const interactionName = params.interactionNames?.selectDocumentType ?? INT_SELECT_DOCUMENT_TYPE;


    log.info("SelectDocumentType for object: " + objectId, { payload });

    const object = await client.objects.retrieve(objectId, "+text");

    //Expects object.type to be null on first ingestion of content
    //User initiated Content Type change via the Composable UI,
    //sets object.type to null when they let Composable choose for them.
    //sets object.type to chosen type (thus non-null) when user picks a type.
    if (object.type) {
        log.warn(`Object ${objectId} has already a type. Skipping type creation.`);
        return { status: "skipped", message: "Object already has a type: " + object.type.name };
    }

    if (!object || (!object.text && !object.content?.type?.startsWith("image/") && !object.content?.type?.startsWith("application/pdf"))) {
        log.info(`Object ${objectId} not found or text is empty and not an image`, { object });
        return { status: "failed", error: "no-text" };
    }

    const types = await client.types.list();

    //make a list of all existing types, and add hints if any
    const existing_types = types.map(t => t.name).filter(n => !["DocumentPart", "Rendition"].includes(n));
    if (params.typesHint) {
        const newHints = params.typesHint.filter((t: string) => !existing_types.includes(t));
        existing_types.push(...newHints);
    }

    const content = object.text ? truncByMaxTokens(object.text, params.truncate || 4000) : undefined;

    const getImage = async () => {
        if (object.content?.type?.includes("pdf") && object.text?.length && object.text?.length < 100) {
            return "store:" + objectId
        }
        if (!object.content?.type?.startsWith("image/")) {
            return undefined;
        }
        const res = await client.objects.getRendition(objectId, { max_hw: 1024, format: "image/png", generate_if_missing: true });
        if (!res.rendition && res.status === "generating") {
            //throw to try again
            throw new Error(`Rendition for object ${objectId} is in progress`);
        } else if (res.rendition) {
            return "store:" + objectId;
        }
    }

    const fileRef = await getImage();

    log.info("Execute SelectDocumentType interaction on content with \nexisting types: " + existing_types.join(","));

    const res = await executeInteractionFromActivity(client, interactionName, params, {
        existing_types, content, image: fileRef
    });

    log.info("Selected Content Type Result: " + JSON.stringify(res.result));

    //if type is not identified or not present in the database, generate a new type
    let selectedType: { id: string, name: string } | undefined = undefined;

    selectedType = types.find(t => t.name === res.result.document_type);

    if (!selectedType) {
        log.warn("Document type not idenfified: starting type generation");
        const newType = await generateNewType(context, existing_types, content, fileRef);

        selectedType = { id: newType.id, name: newType.name };
    }

    if (!selectedType) {
        log.error("Type not found: ", res.result);
        throw new Error("Type not found: " + res.result.document_type);
    }

    //update object with selected type
    await client.objects.update(objectId, {
        type: selectedType.id,
    });

    return {
        id: selectedType.id,
        name: selectedType.name,
        isNew: !types.find(t => t.name === selectedType.name)
    };
}

async function generateNewType(context: ActivityContext, existing_types: string[], content?: string, fileRef?: string) {
    const { client, params } = context;

    const project = await context.fetchProject();
    const interactionName = params.interactionNames?.generateMetadataModel ?? INT_GENERATE_METADATA_MODEL;

    const genTypeRes = await executeInteractionFromActivity(client, interactionName, params, {
        existing_types: existing_types,
        content: content,
        human_context: project?.configuration?.human_context ?? undefined,
        image: fileRef ? fileRef : undefined
    });


    if (!genTypeRes.result.document_type) {
        log.error("No name generated for type", genTypeRes);
        throw new Error("No name generated for type");
    }

    log.info("Generated schema for type", genTypeRes.result.metadata_schema);
    const typeData: CreateContentObjectTypePayload = {
        name: genTypeRes.result.document_type,
        object_schema: genTypeRes.result.metadata_schema,
        is_chunkable: genTypeRes.result.is_chunkable,
    }

    const type = await client.types.create(typeData);

    return type;

}
