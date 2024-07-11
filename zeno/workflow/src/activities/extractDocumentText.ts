import { Blobs, md5 } from '@composableai/zeno-blobs';
import { ContentObject, CreateContentObjectPayload, DSLActivityExecutionPayload, DSLActivitySpec } from '@composableai/common';
import { log } from "@temporalio/activity";
import { manyToMarkdown } from '../conversion/pandoc.js';
import { trasformPdfToMarkdown } from '../conversion/pdf.js';
import { setupActivity } from "../dsl/setup/ActivityContext.js";
import { NoDocumentFound } from '../errors.js';
import { countTokens } from '../utils/tokens.js';

//@ts-ignore
const JSON: DSLActivitySpec = {
    name: 'extractDocumentText',
}

// doesn't have any own param
export type ExtractDocumentTextParams = never;

export interface ExtractDocumentText extends DSLActivitySpec<ExtractDocumentTextParams> {
    name: 'extractDocumentText';
    projection?: never;
}

export async function extractDocumentText(payload: DSLActivityExecutionPayload) {
    const { zeno, objectId } = await setupActivity(payload);

    const r = await zeno.objects.find({
        query: { _id: objectId },
        limit: 1,
        select: "+text"
    })
    const doc = r[0] as ContentObject;
    if (!doc) {
        log.error(`Document ${objectId} not found`);
        throw new NoDocumentFound(`Document ${objectId} not found`, payload.objectIds);
    }

    log.info(`Extracting text for object ${doc.id}`);


    if (!doc.content?.type || !doc.content?.source) {
        if (doc.text) {
            return createResponse(doc, doc.text, 'text-already-extracted');
        } else {
            return createResponse(doc, "", 'text-not-found');
        }
    }

    //skip if text already extracted and proper etag
    if (doc.text && doc.text.length > 0 && doc.text_etag === doc.content.etag) {
        return createResponse(doc, doc.text, 'text-already-extracted');
    }

    let fileBuffer: Buffer;
    try {
        const file = await Blobs.getFile(doc.content.source);
        fileBuffer = await file.readAsBuffer();
    } catch (e: any) {
        log.error(`Error reading file: ${e}`);
        return createResponse(doc, "", 'text-extract-failed', e.message);
    }


    let txt: string;

    switch (doc.content.type) {

        case 'application/pdf':
            txt = await trasformPdfToMarkdown(fileBuffer);
            break;

        case 'text/plain':
            txt = fileBuffer.toString('utf8')
            break;

        //docx
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
            txt = await manyToMarkdown(fileBuffer, 'docx');
            break;

        //html
        case 'text/html':
            txt = await manyToMarkdown(fileBuffer, 'html');
            break;

        //opendocument
        case 'application/vnd.oasis.opendocument.text':
            txt = await manyToMarkdown(fileBuffer, 'odt');
            break;

        //rtf
        case 'application/rtf':
            txt = await manyToMarkdown(fileBuffer, 'rtf');
            break;

        //markdown
        case 'text/markdown':
            txt = fileBuffer.toString('utf8');
            break;

        default:
            return createResponse(doc, "", 'text-extract-failed', `Unsupported mime type: ${doc.content.type}`);
    }

    const tokensData = countTokens(txt);
    const etag = doc.content.etag ?? md5(txt);

    const updateData: CreateContentObjectPayload = {
        text: txt,
        text_etag: etag,
        tokens: {
            ...tokensData,
            etag: etag,
        }
    }

    await zeno.objects.update(doc.id, updateData);

    return createResponse(doc, txt, 'text-extracted');
}

function createResponse(doc: ContentObject, text: string, status: string, error?: string) {
    return {
        status,
        tokens: doc.tokens,
        len: text.length,
        objectId: doc.id,
        hasText: !!text,
        error
    }

}
