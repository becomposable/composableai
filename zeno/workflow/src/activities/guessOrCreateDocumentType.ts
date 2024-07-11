import { CreateContentObjectTypePayload, DSLActivityExecutionPayload, DSLActivitySpec } from "@composableai/common";
import { log } from "@temporalio/activity";
import { ActivityContext, setupActivity } from "../dsl/setup/ActivityContext.js";
import { TruncateSpec, truncByMaxTokens } from "../utils/tokens.js";
import { InteractionExecutionParams, executeInteractionFromActivity } from "./executeInteraction.js";


export interface GuessOrCreateDocumentTypeParams extends InteractionExecutionParams {
    typesHint?: string[];
    /**
     * truncate the input doc text to the specified max_tokens
     */
    truncate?: TruncateSpec;

    /**
     * The name of the interaction to execute
     * @default SelectDocumentType
     */
    interactionName?: string;
}

export interface GuessOrCreateDocumentType extends DSLActivitySpec<GuessOrCreateDocumentTypeParams> {
    name: 'guessOrCreateDocumentType';
}

export async function guessOrCreateDocumentType(payload: DSLActivityExecutionPayload) {
    const context = await setupActivity<GuessOrCreateDocumentTypeParams>(payload);
    const { params, studio, zeno, objectId } = context;


    log.info("SelectDocumentType for object: " + objectId, { payload });

    const object = await zeno.objects.retrieve(objectId, "+text");
    if (object.type) {
        log.warn(`Object ${objectId} has already a type. Skipping type creation.`);
        return null;
    }

    if (!object || (!object.text && !object.content?.type?.startsWith("image/"))) {
        log.info(`Object ${objectId} not found or text is empty and not an image`, { object });
        return null;
    }

    if (object.type) {
        log.warn(`Object ${objectId} has already a type. Skipping type creation.`);
        return {
            id: object.type,
            isNew: false,
            message: "Object already has a type"
        };
    }

    const types = await zeno.types.list();

    //make a list of all existing types, and add hints if any
    const existing_types = types.map(t => t.name);
    if (params.typesHint) {
        const newHints = params.typesHint.filter((t: string) => !existing_types.includes(t));
        existing_types.push(...newHints);
    }

    const content = object.text ? truncByMaxTokens(object.text, params.truncate || 4000) : undefined;

    const getImage = async () => {
        if (!object.content?.type?.startsWith("image/")) {
            return undefined;
        }
        const res = await zeno.objects.getRendition(objectId, { max_hw: 1024, format: "image/jpeg", generate_if_missing: true });
        if (!res.rendition && res.status === "generating") {
            //throw to try again
            throw new Error(`Rendition for object ${objectId} is in progress`);
        } else if (res.rendition) {
            return "store:" + objectId;
        }
    }

    const fileRef = await getImage();

    log.info("Execute SelectDocumentType interaction on content with \nexisting types: " + existing_types.join(","));

    const res = await executeInteractionFromActivity(studio, "SelectDocumentType", params, {
        existing_types, content, file: fileRef
    });

    log.info("Selected Document Type Result: " + JSON.stringify(res.result));

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
    await zeno.objects.update(objectId, {
        type: selectedType.id,
    });

    return {
        id: selectedType.id,
        name: selectedType.name,
        isNew: !types.find(t => t.name === selectedType.name)
    };
}

async function generateNewType(context: ActivityContext, existing_types: string[], content?: string, fileRef?: string) {
    const { studio, zeno, params } = context;

    const project = await context.fetchProject();

    const genTypeRes = await executeInteractionFromActivity(studio, "GenerateMetadataModel", params, {
        existing_types: existing_types,
        content: content,
        human_context: project?.configuration?.human_context ?? undefined,
        files: fileRef ? [fileRef] : []
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

    const type = await zeno.types.create(typeData);

    return type;

}
