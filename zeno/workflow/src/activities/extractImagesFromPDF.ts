import { DSLActivityExecutionPayload, DSLActivitySpec, DocumentPartProperties } from "@composableai/common";
import { StreamSource } from "@composableai/studio-client";
import { Blobs } from "@composableai/zeno-blobs";
import { log } from "@temporalio/activity";
import fs from 'fs';
import { createReadableStreamFromReadable } from "node-web-stream-adapters";
import sharp from "sharp";
import { imageResizer } from "../conversion/image.js";
import { extractImagesFromPdfWithApryse } from "../conversion/pdf.js";
import { setupActivity } from "../dsl/setup/ActivityContext.js";
import { NoDocumentFound } from "../errors.js";

interface ExtractImagesFromPdfParams {

    min_hw: number; //minimum size of the longuest side of the image to be extracted
    max_hw: number; //max size of the extracted image

}


export interface extractImagesFromPdf extends DSLActivitySpec<ExtractImagesFromPdfParams> {

    name: 'extractImagesFromPDF';

}


export async function extractImagesFromPdf(payload: DSLActivityExecutionPayload) {
    const { client, objectId, params } = await setupActivity<ExtractImagesFromPdfParams>(payload);
    const inputObject = await client.objects.retrieve(objectId);
    const docPartType = await client.types.getTypeByName('DocPart');

    if (!docPartType) {
        log.error(`DocPart type type not found`);
        throw new NoDocumentFound(`DocPart type not found`, [objectId]);
    }

    if (!inputObject) {
        log.error(`Document ${objectId} not found`);
        throw new NoDocumentFound(`Document ${objectId} not found`, [objectId]);
    }

    if (!inputObject.content?.source) {
        log.error(`Document ${objectId} has no source`);
        throw new NoDocumentFound(`Document ${objectId} has no source`, [objectId]);
    }

    if (!inputObject.content.type || (!inputObject.content.type?.startsWith('application/pdf'))) {
        log.error(`Document ${objectId} is not an image`);
        throw new NoDocumentFound(`Document ${objectId} is not an image or pdf: ${inputObject.content.type}`, [objectId]);
    }

    const file = await Blobs.getFile(inputObject.content.source);
    if (!file) {
        log.error(`Document ${objectId} source not found`);
        throw new NoDocumentFound(`Document ${objectId} source not found`, [objectId]);
    }

    const pdfBuffer = await file.readAsBuffer();


    //TODO: transform to iterator
    const imagesRef = await extractImagesFromPdfWithApryse(pdfBuffer, params.min_hw);

    const promises = imagesRef.map(async (image, i) => {
        const file = fs.createReadStream(image.path);
        const resized = (await file.read()).pipe(imageResizer(params.max_hw, "png"));
        const stream = createReadableStreamFromReadable(resized);
        const metadata = await sharp(resized).metadata();
        const partName = `[ImagePart] ${inputObject.name}: ${image.page}-${image.imgCount}`;
        const imagePart = await client.objects.create({
            name: partName,
            type: docPartType.id,
            parent: inputObject.id,
            content: new StreamSource(stream, partName, `image/png`),
            properties: {
                source_etag: inputObject.content.source,
                part_number: i,
                type: 'image',
                page_number: image.page,
                height: metadata.height,
                width: metadata.width,
            } satisfies DocumentPartProperties
        });
        return imagePart;
    });

    const parts = await Promise.all(promises);

    return { objectId, status: "success", message: "Images extracted", images: parts.map((p) => p.id) }
}
