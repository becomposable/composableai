/**
 * IMPORTANT: DO NOT RUN IN VITEST, VITEST DOESN'T WORK WITH APRYSE
 */



import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { extractImagesFromPdfWithApryse } from "./pdf.js";

const main = async () => {

    const pdfPath = path.resolve(__dirname, '../../../fixtures', 'test-pdf2.pdf');
    const pdfBuffer = fs.readFileSync(pdfPath);
    
    console.log('start extracting images from pdf');
    const result: any = await extractImagesFromPdfWithApryse(pdfBuffer);

    console.log('result: ', result);

}   

dotenv.config();
main();