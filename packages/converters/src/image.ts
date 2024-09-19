import { fromBuffer } from 'pdf2pic';
import sharp from "sharp";

export interface TransformOptions {
    max_hw?: number,
    format?: keyof sharp.FormatEnum
}

export function createImageTransformer(opts: TransformOptions, file?: string) {
    let sh = sharp(file);
    if (opts.max_hw) {
        sh = sh.resize({
            width: opts.max_hw,
            height: opts.max_hw,
            fit: sharp.fit.inside,
            withoutEnlargement: true,
        });
    }
    if (opts.format) {
        sh = sh.toFormat(opts.format);
    }
    return sh;
}

/**
 * Return a duplex stream that resizes the image to fit within the max_hw and convert it to the target format.
 * @param max_hw
 * @param format
 * @returns
 */
export function transformImage(input: NodeJS.ReadableStream, opts: TransformOptions): Promise<sharp.Sharp> {
    const sh = createImageTransformer(opts);
    input.pipe(sh);
    return new Promise((resolve, reject) => {
        const handleError = (err: any) => {
            console.error('Failed to transform', err);
            try {
                sh.destroy();
            } finally {
                reject(err);
            }
        }
        sh.on('error', handleError);
        input.on('error', handleError);
        sh.on("finish", () => {
            resolve(sh);
        });
    });
}

export function transformImageFile(source: string, dest: string, opts: TransformOptions): Promise<{ width: number, height: number } | undefined> {
    return new Promise((resolve, reject) => {
        let result: { width: number, height: number } | undefined;
        const sh = createImageTransformer(opts, source);
        sh.on('info', (info) => {
            result = info;
        });
        sh.toFile(dest, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}

export interface PdfToImageParams {
    pages: number[];
    format: keyof sharp.FormatEnum;
    max_hw: number;
}

export async function pdfToImage(buffer: Buffer, { pages, format }: PdfToImageParams) {


    const images = await fromBuffer(buffer, {
        density: 200,
        format: format,
        quality: 100,
        preserveAspectRatio: true,
        height: 2048,
        width: 2048,
    }).bulk(pages,
        { responseType: 'buffer' }
    );

    return images.map(image => image.buffer);


}