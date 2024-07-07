import pdf2md from "@opendocsg/pdf2md";
import { PDFNet } from '@pdftron/pdfnet-node';
import fs from 'fs';
import os from 'os';


const pdf2mdFn = pdf2md as unknown as (buffer: Uint8Array) => Promise<string>;

export function trasformPdfToMarkdown(buffer: Buffer) {
    const arr = new Uint8Array(buffer);
    return pdf2mdFn(arr);
}



async function extractImages(buffer: Buffer, minHw: number = 300) {
    const doc = await PDFNet.PDFDoc.createFromBuffer(buffer);
    const reader = await PDFNet.ElementReader.create();
    const tmpDir = os.tmpdir()
    const workingDir = fs.mkdtempSync(`${tmpDir}/pdfextract_`);
    console.log(`Extracting images to ${workingDir}`);

    // Read page content on every page in the document
    const itr = await doc.getPageIterator();
    for (itr; await itr.hasNext(); itr.next()) {
        // Read the page
        const page = await itr.current();
        const pageNumber = await page.getIndex();
        reader.beginOnPage(page);
        await ProcessElements(reader, pageNumber);
        reader.end();
    }

    return { workingDir };

    async function ProcessElements(reader: PDFNet.ElementReader, pageNumber: number) {
        // Traverse the page display list
        let imgCount = 1;

        for (let element = await reader.next(); element !== null; element = await reader.next()) {
            const elementType = await element.getType();
            switch (elementType) {
                case PDFNet.Element.Type.e_image:
                    {
                        const image = await PDFNet.Image.createFromObj(await element.getXObject());
                        const h = await image.getImageHeight();
                        const w = await image.getImageWidth();
                        //console.log(`Image: width=${w}, height=${h}`);
                        //do not extract if image is too small, likely not relevant
                        //TODO: use LLM to decide if it matters?
                        if (w < minHw && h < minHw ) {
                            console.log(`Skipping small image: width=${w}, height=${h} on page ${pageNumber}`);
                            break;
                        }
                        const imgName = `${workingDir}/img_${pageNumber}_${imgCount++}.png`;
                        image.exportAsPng(imgName);
                        break;
                    }
                case PDFNet.Element.Type.e_form:
                    {
                        reader.formBegin();
                        ProcessElements(reader, pageNumber);
                        reader.end();
                        break;
                    }
            }
        }
    }
}

export async function extractImagesFromPdfWithApryse(buffer: Buffer, minHw: number = 300) {
    const APRYSE_KEY = process.env.VITE_APRYSE_KEY;

    const extractImagesWrapper = async () => {
        return await extractImages(buffer, minHw); 
    };

    const res = await PDFNet.runWithCleanup(extractImagesWrapper, APRYSE_KEY).then((res) => {
        return res;
    }).finally(() => PDFNet.shutdown() );


    //read all images in the directory
    const files = fs.readdirSync(res.workingDir);
    
    const images = files.map((file) => {
        const [pageNumber, imgCount] = file.split('.')[0].split('_').slice(1);
        return { page: parseInt(pageNumber), imgCount: parseInt(imgCount), path: file };
    });

    return images;
}