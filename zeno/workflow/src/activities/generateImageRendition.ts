import { Blobs } from "@composableai/zeno-blobs";
import { StreamSource } from "@composableai/zeno-client";
import { DSLActivityExecutionPayload, DSLActivitySpec, RenditionProperties } from "@composableai/zeno-common";
import { log } from "@temporalio/activity";
import { createReadableStreamFromReadable } from "node-web-stream-adapters";
import sharp from "sharp";
import { setupActivity } from "../dsl/setup/ActivityContext.js";
import { NoDocumentFound, WorkflowParamNotFound } from "../errors.js";



interface GenerateImageRenditionParams {
    max_hw: number; //maximum size of the longuest side of the image
    format: keyof sharp.FormatEnum; //format of the output image
}


export interface GenerateImageRendition extends DSLActivitySpec<GenerateImageRenditionParams> {

    name: 'generateImageRendition';

}


export async function generateImageRendition(payload: DSLActivityExecutionPayload) {
    const { zeno, objectId, params } = await setupActivity<GenerateImageRenditionParams>(payload);

    const supportedNonImageInputTypes = ['application/pdf']   
    const inputObject = await zeno.objects.retrieve(objectId);
    const renditionType = await zeno.types.getTypeByName('Rendition');

    if (!params.format) {
        log.error(`Format not found`);
        throw new WorkflowParamNotFound(`format`);
    }

    if (!renditionType) {
        log.error(`Rendition type not found`);
        throw new NoDocumentFound(`Rendition type not found`, [objectId]);
    }

    if (!inputObject) {
        log.error(`Document ${objectId} not found`);
        throw new NoDocumentFound(`Document ${objectId} not found`, [objectId]);
    }

    if (!inputObject.content?.source) {
        log.error(`Document ${objectId} has no source`);
        throw new NoDocumentFound(`Document ${objectId} has no source`, [objectId]);
    }

    if (!inputObject.content.type || (!inputObject.content.type?.startsWith('image/') && !supportedNonImageInputTypes.includes(inputObject.content.type))) {
        log.error(`Document ${objectId} is not an image`);
        throw new NoDocumentFound(`Document ${objectId} is not an image or pdf: ${inputObject.content.type}`, [objectId]);
    }
    
    const file = await Blobs.getFile(inputObject.content.source);
    if (!file) {
        log.error(`Document ${objectId} source not found`);
        throw new NoDocumentFound(`Document ${objectId} source not found`, [objectId]);
    }

    const resizer = sharp().resize({
        width: params.max_hw,
        height: params.max_hw,
        fit: sharp.fit.inside,
        withoutEnlargement: true
    }).toFormat(params.format);


    const resized = (await file.read()).pipe(resizer);

    const getRenditionName = () => {
        const name = objectId + `_rendition_${params.max_hw}` + '.jpg';
        return name;
    }

    console.log(`Creating rendition for ${objectId} with max_hw: ${params.max_hw} and format: ${params.format}`);
    const rendition = await zeno.objects.create({
        name: inputObject.name + `[Rendition ${params.max_hw}]`,
        type: renditionType.id,
        parent: inputObject.id,
        content: new StreamSource(createReadableStreamFromReadable(resized), getRenditionName()),
        properties: {
            mime_type: 'image/' + params.format,
            source_etag: inputObject.content.source,
            height: params.max_hw,
            width: params.max_hw
        } satisfies RenditionProperties
    });

    return { id: rendition.id, format: "image/jpeg", status: "success" };

}


