import { fromBuffer } from 'pdf2pic';
import sharp from "sharp";


/**
 * Resizes an image to a maximum height or width
 * @param max_hw 
 * @param format 
 * @returns 
 */
export function imageResizer(max_hw: number, format: keyof sharp.FormatEnum) {

    return sharp().resize({
        width: max_hw,
        height: max_hw,
        fit: sharp.fit.inside,
        withoutEnlargement: true,

    }).toFormat(format);

}


interface PdfToImageParams {
    pages: number[];
    format: keyof sharp.FormatEnum;
    max_hw: number;
}

export async function pdfToImage(buffer: Buffer, { pages, format }: PdfToImageParams) {


    const images = await  fromBuffer(buffer, {
        density: 200,
        format: format,
        quality: 100,
        preserveAspectRatio: true,
        height: 2048,
        width: 2048,
    }).bulk(pages, 
        { responseType: 'buffer'}
    );

    return images.map(image => image.buffer);


}