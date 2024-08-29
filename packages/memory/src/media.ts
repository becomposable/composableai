import { readFile } from "fs/promises";
import { basename, join } from "path";
import { MemoryFile } from "./tar.js";

export interface MediaOptions {
    /**
     * The directory to save the output if transformations are made. Defaults to the cwd.
     */
    out?: string;
    scale?: number;
    quality?: number;
    format?: "jpeg" | "png" | "webp";
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
        public options: MediaOptions = {}
    ) {
        this.name = basename(infile);
        this.outdir = this.options.out || process.cwd();
    }

    async transform() {
        if (this.options.quality || this.options.format || this.options.scale) {
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
//@ts-ignore
export async function applyTransforms(input: string, output: string, options: MediaOptions = {}): Promise<void> {
    //TODO not implemented
}
