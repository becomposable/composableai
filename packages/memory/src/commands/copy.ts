import { Builder } from "../Builder.js";
import { DocxObject, MediaObject, MediaOptions, PdfObject } from "../ContentObject.js";
import { AbstractContentSource, ContentSource, FileSource, SourceSpec } from "../ContentSource.js";

export interface CopyOptions {
    media?: MediaOptions;
    extractText?: boolean | string;
}
export function copy(builder: Builder, source: SourceSpec, toPath: string, options: CopyOptions = {}) {
    const resolved = AbstractContentSource.resolve(source);
    if (Array.isArray(resolved)) {
        for (const cs of resolved) {
            copyOne(builder, cs, toPath, options);
        }
    } else {
        return copyOne(builder, resolved, toPath, options);
    }
}

function copyOne(builder: Builder, source: ContentSource, toPath: string, options: CopyOptions) {
    if (options.media) {
        new MediaObject(builder, source, options.media).copyTo(toPath);
    } else if (options.extractText) {
        let type = options.extractText;
        if (typeof type === "boolean") {
            if (source instanceof FileSource) {
                type = source.extname ? source.extname.slice(1) : source.extname;
            } else {
                throw new Error("source type for extractText must be spefcified");
            }
        }
        switch (type) {
            case "pdf":
                new PdfObject(builder, source).copyTo(toPath);
                break;
            case "docx":
                new DocxObject(builder, source).copyTo(toPath);
                break;
            default:
                throw new Error("Unsupported extractText type: " + type);
        }
    } else {
        builder.addEntry(toPath, source);
    }
}
