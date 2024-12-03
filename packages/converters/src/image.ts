import sharp from "sharp";

export interface TransformOptions {
    max_hw?: number,
    format?: keyof sharp.FormatEnum
}

type SharpInputType = Buffer
    | ArrayBuffer
    | Uint8Array
    | Uint8ClampedArray
    | Int8Array
    | Uint16Array
    | Int16Array
    | Uint32Array
    | Int32Array
    | Float32Array
    | Float64Array
    | string
    | NodeJS.ReadableStream
export function createImageTransformer(input: SharpInputType, opts: TransformOptions) {
    const isInputStream = !!(input as NodeJS.ReadableStream).pipe;
    let sh = isInputStream ? (input as NodeJS.ReadableStream).pipe(sharp()) : sharp(input as any);
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
 * @param max_hw
 * @param format
 * @returns
 */
export async function transformImage(input: SharpInputType, output: NodeJS.WritableStream, opts: TransformOptions): Promise<sharp.Sharp> {
    const sh = createImageTransformer(input, opts);
    sh.pipe(output);

    return new Promise((resolve, reject) => {
        const handleError = (err: any) => {
            console.error('Failed to transform', err);
            try {
                if ((input as any).pipe && (input as any).destroy) {
                    (input as any).destroy();
                }
                if ((output as any).destroy) {
                    (output as any).destroy();
                }
                sh.destroy();
            } finally {
                reject(err);
            }
        }
        output.on('error', handleError);
        (input as any).pipe && (input as any).on && (input as any).on('error', handleError);
        output.on("finish", () => {
            resolve(sh);
        });
    });
}

export function transformImageToBuffer(input: SharpInputType, opts: TransformOptions): Promise<Buffer> {
    const sh = createImageTransformer(input, opts);
    return sh.toBuffer();
}

export async function transformImageToFile(input: SharpInputType, output: string, opts: TransformOptions): Promise<void> {
    const sh = createImageTransformer(input, opts);
    await sh.toFile(output);
}
