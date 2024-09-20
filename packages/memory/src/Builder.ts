import { tmpdir } from "os";
import { resolve } from "path";
import { copy, CopyOptions } from "./commands/copy.js";
import { exec, ExecOptions } from "./commands/exec.js";
import { ContentRef, DocxOptions, DocxRef, JsonRef, PdfOptions, PdfRef, RefConstructor, TextOptions, TextRef } from "./content.js";
import { ContentSource, SourceSpec } from "./ContentSource.js";
import { resolveLocation } from "./location.js";
import { loadMemoryPack } from "./MemoryPack.js";
import { FromOptions, MemoryPackBuilder } from "./MemoryPackBuilder.js";
//import { MediaOptions } from "./ContentObject.js";


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

    /**
     * A te,porary directory to use for the build. If not set, the system tmp dir will be used
     */
    tmpdir?: string;
}

export interface Commands {
    exec: (cmd: string, options?: ExecOptions) => void;
    from: (location: string, options?: FromOptions) => void;
    text: (location: string, options?: TextOptions) => TextRef | TextRef[];
    json: (location: string, options?: TextOptions) => JsonRef | JsonRef[];
    pdf: (location: string, options?: PdfOptions) => PdfRef | PdfRef[];
    docx: (location: string, options?: DocxOptions) => DocxRef | DocxRef[];
    //media: (location: string, options?: MediaOptions) => MediaFile | MediaFile[];
}

export class Builder implements Commands {
    tmpdir: string;
    // async tasks preparing the build context
    preTasks: Promise<void>[] = [];
    // async tasks building the content
    tasks: Promise<void>[] = [];
    memory: MemoryPackBuilder;

    constructor(public options: BuildOptions = {}) {
        this.tmpdir = options.tmpdir || tmpdir();
        this.memory = new MemoryPackBuilder(this);
    }

    from(location: string, options?: FromOptions) {
        const promise = loadMemoryPack(location).then((memory) => {
            return this.memory.load(memory, options);
        });
        this.tasks.push(promise);
    }

    addEntry(path: string, source: ContentSource) {
        this.memory.add(path, source);
    }

    copy(location: SourceSpec, path: string, options: CopyOptions = {}) {
        copy(this, location, path, options);
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

    // media(location: string, options: MediaOptions = {}) {
    //     const file = resolveLocation(location);
    //     if (Array.isArray(file)) {
    //         const mediaFiles: MediaFile[] = [];
    //         for (const f of file) {
    //             const media = new MediaFile(f, options)
    //             mediaFiles.push(media);
    //             this.files.push(media);
    //             this.tasks.push(media.transform());
    //         }
    //         return mediaFiles;
    //     } else {
    //         const media = new MediaFile(file, options);
    //         this.files.push(media);
    //         this.tasks.push(media.transform());
    //         return media;
    //     }
    // }

    async build(object: Record<string, any>) {
        const baseName = resolve(this.options.out || 'memory');
        // wait for the preparation to finish
        await Promise.all(this.preTasks);
        // wait for the content to be built
        await Promise.all(this.tasks);
        // write the memory to a file
        const file = await this.memory.build(baseName, object);
        this.options.quiet || console.log(`Memory saved to ${file}`);
    }

}
