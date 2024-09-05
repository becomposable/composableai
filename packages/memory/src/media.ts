import { transformImageFile } from "@becomposable/converters";
import { readFile } from "fs/promises";
import { basename, join } from "path";
import { MemoryFile } from "./tar.js";

export interface MediaOptions {
    max_hw?: number;
    format?: "jpeg" | "png";
}

export class MediaFile implements MemoryFile {
    name: string;
    outdir: string; // working directory (where transforms are saved)
    outfile?: string;
    constructor(
        /**
         * the file path on disk
         */
        public infile: string,
        /**
         * the media options
         */
        public options: MediaOptions & { outdir?: string } = {}
    ) {
        this.name = basename(infile);
        this.outdir = this.options.outdir || process.cwd();
    }

    async transform() {
        if (this.options.max_hw || this.options.format) {
            const input = this.infile;
            const output = join(this.outdir, this.name);
            return applyTransforms(input, output, this.options).then(() => {
                this.outfile = output
            });
        }
        return Promise.resolve();
    }

    get file() {
        return this.outfile || this.infile;
    }

    getContent(): Promise<Buffer> {
        return readFile(this.file);
    }

    toJSON() {
        return "memo:" + this.name;
    }
}


/**
 * Get a media file reference and optionally resize it
 * @param file
 */
export async function applyTransforms(input: string, output: string, options: MediaOptions = {}): Promise<{ width: number, height: number } | undefined> {
    return transformImageFile(input, output, {
        format: options.format,
        max_hw: options.max_hw
    })
}
