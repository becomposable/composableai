// import { pdfFileToText, pdfToText } from "@becomposable/converters";
// import { ContentSource, FileSource, SourceSpec } from "./source";
// import { Builder } from "./Builder";
// import { basename } from "path";

// export class MemoryEntry {
//     constructor(public name: string, public source?: ContentSource) {
//     }
//     get isDirectory() {
//         return !this.source;
//     }
//     getContent(): Promise<Buffer | null> {
//         return this.source ? this.source.getContent() : Promise.resolve(null);
//     }
// }

// export interface CopyOptions {
//     convert?: boolean;
//     extractText?: boolean;
// }

// export function copyOne(builder: Builder, source: ContentSource, path: string, options: CopyOptions = {}) {

// }
// export function copy(builder: Builder, source: SourceSpec, path: string, options: CopyOptions = {}) {
//     const resolved = ContentSource.resolve(source);
//     if (Array.isArray(resolved)) {
//         for (const cs of resolved) {
//             copyOne(builder, cs, path, options);
//         }
//     } else {
//         return copyOne(builder, resolved, path, options);
//     }
// }


// export async function extractPdfText(builder: Builder, source: ContentSource) {
// }


// if (())
//     if (options.convert) {
//         //
//     } else if (options.extractText) {
//         extractPdfText(builder, cs);
//     }
// return new MemoryEntry(path, cs);
// }

// export async function extractPdfText(builder: Builder, source: ContentSource) {
//     if (source instanceof FileSource) {
//         const out = builder.tempFile(source.name + '.txt');
//         await pdfFileToText(source.file, out);
//         return new FileSource(out);
//     } else {
//         const text = await pdfToText(await source.getContent());
//         return new Text(text);
//     }
// }


// interface ContentCommandOptions extends Record<string, any> {
//     base_path?: string;
// }

// export abstract class LoadCommand<OptionsT extends Record<string, any>> {
//     constructor(
//         public builder: Builder,
//         public source: SourceSpec,
//         public options: OptionsT = {} as OptionsT
//     ) {
//     }

//     async run() {
//         if (Array.isArray(this.source)) {
//             const r = [];
//             for (const s of this.source) {
//                 r.push(await this._run(s));
//             }
//             return r;
//         } else {
//             return this._run(this.source as ContentSource);
//         }
//     }

//     abstract _run(source: ContentSource): Promise<ContentSource>;

// }

// export abstract class ContentCommand<OptionsT extends ContentCommandOptions> {

//     constructor(
//         public builder: Builder,
//         public source: ContentSource | ContentSource[],
//         public to: string | null,
//         public options: OptionsT = {} as OptionsT
//     ) {
//     }

//     get basePath() {
//         return this.options.base_path
//     }

//     resolveTargetPath(source: ContentSource) {
//         if (!this.to) {
//             return undefined;
//         }
//         const parts = this.to.split('*');
//         if (parts.length > 2) {
//             throw new Error(`Invalid 'to' path: ${this.to}. Expecting only one wildcard`);
//         }
//         if (parts.length === 1) {
//             return this.to;
//         } else if ("path" in source) {
//             let path = (source as any).path;
//             if (this.basePath) {
//                 path = path.replace(this.basePath, '');
//                 if (path.startsWith('/')) path = path.substr(1);
//             } else {
//                 path = basename(path);
//             }
//             return parts[0] + path + parts[1];
//         } else {
//             throw new Error("Wildcard in 'to' path is only supported for file or memory image sources");
//         }
//     }

//     async run() {
//         if (Array.isArray(this.source)) {
//             for (const s of this.source) {
//                 await this._run(s);
//             }
//         } else {
//             return this._run(this.source as ContentSource);
//         }
//     }

//     abstract _run(source: ContentSource): Promise<void>;

// }

// class CopyCommand extends ContentCommand<CopyOptions> {
//     async _run(source: ContentSource): Promise<void> {
//         const to = this.resolveTargetPath(source);
//         if (this.to) {
//             if (this.base)
//         } else if (source instanceof FileSource) { // only works for file sources

//         } else {
//             throw new Error("'to' is required for non-file sources");
//         }

//         if (this.basePath) {

//             this.to = join(this.basePath, this.to!);
//         } else {

//         }
//         this.builder.entries.push(new MemoryEntry(this.to!, source));
//     }
// }
