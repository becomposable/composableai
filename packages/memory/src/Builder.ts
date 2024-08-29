import { mkdtempSync, rmSync } from "fs";
import { writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join, resolve } from "path";
import { ContentRef, DocxOptions, DocxRef, JsonRef, PdfOptions, PdfRef, RefConstructor, TextOptions, TextRef } from "./content.js";
import { exec, ExecOptions } from "./exec.js";
import { fetchMemoryImage } from "./image.js";
import { resolveLocation } from "./location.js";
import { MediaFile, MediaOptions } from "./media.js";
import { buildTar, MemoryFile } from "./tar.js";

export interface ProjectionProperties {
    [key: string]: boolean | 0 | 1;
}

function getProjection(base: Record<string, any>, projection: ProjectionProperties): Record<string, any> {
    const keys = Object.keys(projection);
    if (keys.length > 0) {
        if (!projection[keys[0]]) { // exclude keys
            const baseProjection = { ...base };
            for (const key of keys) {
                if (!projection[key]) {
                    delete baseProjection[key];
                }
            }
            return baseProjection;
        } else { // include keys
            const baseProjection: Record<string, any> = {};
            for (const key of keys) {
                if (projection[key]) {
                    baseProjection[key] = base[key];
                }
            }
            return baseProjection;
        }
    }
    return base;
}

export interface BuildOptions {
    indent?: number;
    /**
     * the path to save the output. Defualts to memo.json or memo.tar
     * The path should not contain the file extension. The extension will be chosen based on the content.
     * It will be either .json or .tar (if media files are present)
     */
    out?: string;
    /**
     * If set, suppress logs. Defaults to false.
     */
    quiet?: boolean;
}

export interface Commands {
    exec: (cmd: string, options?: ExecOptions) => void;
    from: (location: string, projection?: ProjectionProperties) => void;
    text: (location: string, options?: TextOptions) => TextRef | TextRef[];
    json: (location: string, options?: TextOptions) => JsonRef | JsonRef[];
    pdf: (location: string, options?: PdfOptions) => PdfRef | PdfRef[];
    docx: (location: string, options?: DocxOptions) => DocxRef | DocxRef[];
    media: (location: string, options?: MediaOptions) => MediaFile | MediaFile[];
}

export class Builder implements Commands {
    tmpdir: string;
    // async tasks preparing the build context
    preTasks: Promise<void>[] = [];
    // async tasks building the content
    tasks: Promise<void>[] = [];
    baseObject?: Record<string, any>;
    object?: Record<string, any>;
    files: MediaFile[] = [];

    constructor(public options: BuildOptions = {}) {
        this.tmpdir = join(tmpdir(), 'becomposable-memo-')
    }
    extends(base: Record<string, any>, projection?: ProjectionProperties) {
        this.baseObject = projection ? getProjection(base, projection) : base;
    }

    from(location: string, projection?: ProjectionProperties) {
        const promise = fetchMemoryImage(location);
        this.tasks.push(promise.then(object => {
            this.extends(object, projection);
        }));
    }

    exec(cmd: string, options?: ExecOptions) {
        exec(cmd, options);
    }

    protected loadFileContent<ValueT, OptionsT extends Record<string, any>, RefT extends ContentRef<ValueT, OptionsT>>(file: string, RefClass: RefConstructor<ValueT, OptionsT, RefT>, options: OptionsT): RefT {
        const ref = new RefClass();
        this.tasks.push(ref.load(file, options));
        return ref;
    }

    protected loadContent<ValueT, OptionsT extends Record<string, any>, RefT extends ContentRef<ValueT, OptionsT>>(location: string, RefClass: RefConstructor<ValueT, OptionsT, RefT>, options: OptionsT): RefT | RefT[] {
        const file = resolveLocation(location);
        if (Array.isArray(file)) {
            const refs: RefT[] = [];
            for (const f of file) {
                refs.push(this.loadFileContent(f, RefClass, options));
            }
            return refs;
        } else {
            return this.loadFileContent(file, RefClass, options);
        }
    }

    text(location: string, options: TextOptions = {}) {
        return this.loadContent(location, TextRef, options);
    }

    json(location: string, options: TextOptions = {}) {
        return this.loadContent(location, JsonRef, options);
    }

    pdf(location: string, options: PdfOptions = {}) {
        return this.loadContent(location, PdfRef, options);
    }

    docx(location: string, options: DocxOptions = {}) {
        return this.loadContent(location, DocxRef, options);
    }

    media(location: string, options: MediaOptions = {}) {
        const file = resolveLocation(location);
        if (Array.isArray(file)) {
            const mediaFiles: MediaFile[] = [];
            for (const f of file) {
                const media = new MediaFile(f, options)
                mediaFiles.push(media);
                this.files.push(media);
                this.tasks.push(media.transform());
            }
            return mediaFiles;
        } else {
            const media = new MediaFile(file, options);
            this.files.push(media);
            this.tasks.push(media.transform());
            return media;
        }
    }

    async build(object: Record<string, any>) {
        const hasFiles = this.files.length > 0;
        const out = resolve((this.options.out || 'memo') + (hasFiles ? '.tar' : '.json'));
        await mkdtempSync(this.tmpdir);
        try {
            // wait for the preparation to finish
            await Promise.all(this.preTasks);
            // wait for the content to be built
            await Promise.all(this.tasks);
            // merge the object with the base object if any
            if (this.baseObject) {
                object = Object.assign({}, this.baseObject, object);
            }
            // save the object
            const json = JSON.stringify(object, undefined, this.options.indent || undefined);
            const content = new JsonContextFile(json);
            if (this.files.length > 0) {
                // build a tar
                await buildTar(out, [content as MemoryFile].concat(this.files));
            } else {
                // save the content to a file
                await content.writeToFile(out);
            }
            this.options.quiet || console.log(`Memory saved to ${out}`);
        } finally {
            rmSync(this.tmpdir, { recursive: true });
        }
    }

}


class JsonContextFile implements MemoryFile {
    name = "context.json";
    content: Buffer;
    constructor(json: string) {
        this.content = Buffer.from(json, 'utf-8');
    }

    getContent() {
        return Promise.resolve(this.content);
    }

    writeToFile(file: string) {
        return writeFile(file, this.content);
    }
}