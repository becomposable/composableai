import { AsyncObjectWalker } from "@becomposable/json";
import { rmSync } from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";
import { copy, CopyOptions } from "./commands/copy.js";
import { exec, ExecOptions } from "./commands/exec.js";
import { ContentObject, DocxObject, JsonObject, MediaObject, MediaOptions, PdfObject } from "./ContentObject.js";
import { AbstractContentSource, ContentSource, SourceSpec, TextSource } from "./ContentSource.js";
import { loadMemoryPack } from "./MemoryPack.js";
import { FromOptions, MemoryPackBuilder } from "./MemoryPackBuilder.js";

export interface BuildOptions {
    indent?: number;
    /**
     * the path to save the output. Defualts to 'memory'
     * The path should not contain the file extension. The extension will be chosen based on the content.
     * It will be either .json or .tar (if media files are present)
     */
    out?: string;
    /**
     * If set, suppress logs. Defaults to false.
     */
    quiet?: boolean;

    /**
     * A temporary directory to use for the build. If not set, the system tmp dir will be used
     */
    tmpdir?: string;

    /**
     * If true, compress the output (tar or json) with gzip. Defaults to false.
     */
    gzip?: boolean;

    /**
     * Vars to be injected into the script context as the vars object
     */
    vars?: Record<string, any>;

    /**
     * Optional publish action
     * @param file
     * @returns the URI of the published memory
     */
    publish?: (file: string, name: string) => Promise<string>
}

export interface Commands {
    exec: (cmd: string, options?: ExecOptions) => Promise<void | string>;
    from: (location: string, options?: FromOptions) => void;
    content: (location: string, encoding?: BufferEncoding) => ContentObject | ContentObject[];
    json: (location: string) => ContentObject | ContentObject[];
    pdf: (location: string) => PdfObject | PdfObject[];
    docx: (location: string) => DocxObject | DocxObject[];
    media: (location: string, options?: MediaOptions) => MediaObject | MediaObject[];
    copy: (location: SourceSpec, path: string, options?: CopyOptions) => void;
    copyText: (text: string, path: string) => void;
}

export class Builder implements Commands {
    static instance?: Builder;

    vars: Record<string, any>;
    tmpdir: string;
    memory: MemoryPackBuilder;

    constructor(public options: BuildOptions = {}) {
        this.tmpdir = options.tmpdir || tmpdir();
        this.memory = new MemoryPackBuilder(this);
        this.vars = options.vars || {};
    }

    from(location: string, options?: FromOptions) {
        return loadMemoryPack(location).then((memory) => {
            return this.memory.load(memory, options);
        });
    }

    addEntry(path: string, source: ContentSource) {
        this.memory.add(path, source);
    }

    copy(location: SourceSpec, path: string, options: CopyOptions = {}) {
        copy(this, location, path, options);
    }

    copyText(text: string, path: string) {
        copy(this, new TextSource(text), path);
    }

    exec(cmd: string, options?: ExecOptions) {
        return exec(cmd, options);
    }

    content(location: string, encoding?: BufferEncoding) {
        const source = AbstractContentSource.resolve(location);
        if (Array.isArray(source)) {
            return source.map(s => new ContentObject(this, s, encoding));
        } else {
            return new ContentObject(this, source, encoding);
        }
    }

    json(location: string) {
        const source = AbstractContentSource.resolve(location);
        if (Array.isArray(source)) {
            return source.map(s => new JsonObject(this, s));
        } else {
            return new JsonObject(this, source);
        }
    }

    pdf(location: string) {
        const source = AbstractContentSource.resolve(location);
        if (Array.isArray(source)) {
            return source.map(s => new PdfObject(this, s));
        } else {
            return new PdfObject(this, source);
        }
    }

    docx(location: string) {
        const source = AbstractContentSource.resolve(location);
        if (Array.isArray(source)) {
            return source.map(s => new DocxObject(this, s));
        } else {
            return new DocxObject(this, source);
        }
    }

    media(location: string, options?: MediaOptions) {
        const source = AbstractContentSource.resolve(location);
        if (Array.isArray(source)) {
            return source.map(s => new MediaObject(this, s, options));
        } else {
            return new MediaObject(this, source, options);
        }
    }

    async build(object: Record<string, any>) {
        const { baseName, publishName } = getOutputNames(this.tmpdir, this.options);
        // resolve all content objects values from the conext object
        object = await resolveContextObject(object);
        // write the memory to a file
        let file = await this.memory.build(baseName, object);
        if (publishName) {
            const tarFile = file;
            try {
                file = await this.options.publish!(tarFile, publishName);
            } finally {
                rmSync(tarFile);
            }
        }
        this.options.quiet || console.log(`Memory saved to ${file}`);
        return file;
    }

}

function resolveContextObject(object: Record<string, any>): Promise<Record<string, any>> {
    return new AsyncObjectWalker().map(object, async (_key, value) => {
        if (value instanceof ContentObject) {
            return await value.getText();
        } else {
            return value;
        }
    });
}

function createTmpBaseName(tmpdir: string) {
    return join(tmpdir, `composable-memory-${Date.now()}`);
}

function getOutputNames(tmpdir: string, options: BuildOptions): { baseName: string, publishName: string | undefined } {
    if (!options.out) {
        options.out = "memory";
    }
    let baseName: string;
    let publishName: string | undefined;
    const out = options.out;
    if (out.startsWith("memory:")) {
        if (!options.publish) {
            throw new Error(`The publish option is required for "${out}" output`);
        }
        // force gzip when publishing
        options.gzip = true;
        // create a temporary path for the output
        baseName = createTmpBaseName(tmpdir);
        publishName = out.substring("memory:".length);
    } else {
        baseName = resolve(out || 'memory');
    }
    return { baseName, publishName };
}