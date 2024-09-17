import pdf2md from "@opendocsg/pdf2md";

const pdf2mdFn = pdf2md as unknown as (buffer: Uint8Array) => Promise<string>;

export function trasformPdfToMarkdown(buffer: Buffer) {
    const arr = new Uint8Array(buffer);
    return pdf2mdFn(arr);
}