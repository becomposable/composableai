import { DSLActivityExecutionPayload, DSLActivitySpec } from "@composableai/zeno-common";
import { log } from "@temporalio/activity";
import { setupActivity } from "../dsl/setup/ActivityContext.js";
import { InteractionExecutionParams, executeInteractionFromActivity } from "./executeInteraction.js";


interface DocPart {

    line_number_start: number
    line_number_end: number
    name: string
    type: string

}

export interface ChunkDocumentResult {
    id: string
    status: "completed" | "failed" | "skipped"
    parts?: string[]
    message?: string
}

export interface ChunkDocumentParams extends InteractionExecutionParams {
    force?: boolean;
}

export interface ChunkDocument extends DSLActivitySpec<ChunkDocumentParams> {
    name: 'chunkDocument';
}


export async function chunkDocument(payload: DSLActivityExecutionPayload): Promise<ChunkDocumentResult> {
    const { params, studio, zeno, objectId } = await setupActivity<ChunkDocumentParams>(payload);

    const { force } = params;
    log.info(`Object ${objectId} chunking started`);

    const document = await zeno.objects.retrieve(objectId, "+text");

    const type = document.type ? await zeno.types.retrieve(document.type.id) : undefined;

    if (!type?.is_chunkable) {
        log.warn('Type is not chunkable for object ID: ' + objectId);
        return { id: objectId, status: "skipped", message: "type not chunkable" }
    }

    //check if text is present
    if (!document.text) {
        log.warn('No text found for object ID: ' + objectId);
        return { id: objectId, status: "failed", message: "no text found" }
    }

    if (!force && document.parts && document.parts.length > 0 && document.parts_etag === document.text_etag) {
        log.info('Document already chunked for object ID: ' + objectId);
        return { id: objectId, status: "skipped", message: "document already chunked with correct etag" }
    }

    //instrument the text with line numbers
    const lines = document.text.split('\n')
    const instrumented = lines.map((l, i) => `{%${i}%}${l}`).join('\n')

    const res = await executeInteractionFromActivity(studio, "ChunkDocument", params, {
        objectId: objectId,
        content: instrumented
    });

    const parts = res.result.parts as DocPart[];
    if (!parts || parts.length === 0) {
        log.warn('No parts found for object ID: ' + objectId, res);
        return { id: objectId, status: "failed", parts: [], message: "no parts found" }
    }

    const partDocs = await Promise.all(parts.map(async (part, i) => {

        const text = lines.filter((_l, i) => i >= part.line_number_start && i <= part.line_number_end).join('\n');

        const location = () => {
            let location = document.location;
            if (location.endsWith('/')) {
                location += document.name + "/" + part.type
            }
            location += '/' + document.name + "/" + part.type;
            return location;
        }

        const docPart = await zeno.objects.create({
            name: part.name,
            parent: objectId,
            text: text,
            location: location(),
            properties: {
                part_number: i + 1,
                etag: document.text_etag
            }
        });
        return docPart;
    }));

    //delete previous parts
    if (document.parts && document.parts.length > 0) {
        log.info('Deleting previous parts for object ID: ' + objectId, { parts: document.parts });
        await Promise.all(document.parts.map(async (partId) => {
            await zeno.objects.delete(partId);
        }));
    }

    await zeno.objects.update(objectId, {
        parts: partDocs.map(p => p.id),
        parts_etag: document.text_etag
    });

    log.info(`Object ${objectId} chunking completed`, { parts: document.parts });

    return { id: objectId, status: "completed", parts: document.parts }

}