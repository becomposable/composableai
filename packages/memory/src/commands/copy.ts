import { Builder } from "../Builder.js";
import { MediaObject, MediaOptions } from "../ContentObject.js";
import { AbstractContentSource, ContentSource, SourceSpec } from "../ContentSource.js";

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

async function copyOne(builder: Builder, source: ContentSource, toPath: string, options: CopyOptions) {
    if (options.media) {
        new MediaObject(builder, source, options.media).copyTo(toPath);
    } else if (options.extractText) {
        //TODO
        builder.addEntry(toPath, source);
    } else {
        builder.addEntry(toPath, source);
    }
}
