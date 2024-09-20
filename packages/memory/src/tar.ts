import fs from "fs";
import { FileHandle, open } from "fs/promises";
import tar from "tar-stream";

export interface TarEntry {
    name: string;
    getContent(): Promise<Buffer>;
}

/**
 * @deprecated use TarBuilder instead
 * @param file
 * @param inputFiles
 */
export async function buildTar(file: string, inputFiles: TarEntry[]) {
    const pack = tar.pack(); // Create a new tar stream
    const indexData = [];
    let currentOffset = 0;

    // Open the output file as a write stream
    const outputStream = fs.createWriteStream(file);
    pack.pipe(outputStream);

    for (const memoFile of inputFiles) {
        const name = memoFile.name;
        const content = await memoFile.getContent();

        // Calculate header size, 512 bytes for tar headers
        const headerSize = 512;
        const contentSize = Buffer.byteLength(content);
        const entryHeaderOffset = currentOffset;

        // Store the index entry
        // entry data offset is always at header offset + 512 bytes
        indexData.push(`${name}:${entryHeaderOffset},${contentSize}`);

        // Add the file entry to the tar stream
        pack.entry({ name, size: contentSize }, content);

        // Update the offset
        currentOffset += headerSize + contentSize;
        // Tar files are padded to 512-byte boundaries
        if (contentSize % 512 !== 0) {
            currentOffset += 512 - (contentSize % 512);
        }
    }

    // Convert index data to string and calculate its size
    const indexContent = indexData.join('\n') + '\n';
    const indexContentSize = Buffer.byteLength(indexContent);

    // Add the .index entry to the tar
    pack.entry({ name: '.index', size: indexContentSize }, indexContent);

    pack.finalize(); // Finalize the tar stream

    // Wait for the stream to finish
    await new Promise((resolve) => outputStream.on('finish', resolve));
}

export class TarBuilder {
    dirs: Set<string> = new Set<string>();
    pack: tar.Pack;
    indexData: string[] = [];
    currentOffset = 0;
    tarPromise: Promise<unknown>;

    constructor(file: string) {
        const pack = tar.pack(); // Create a new tar stream
        this.pack = pack;
        // Open the output file as a write stream
        const outputStream = fs.createWriteStream(file);
        pack.pipe(outputStream);
        // Wait for the stream to finish
        this.tarPromise = new Promise((resolve, reject) => {
            outputStream.on('finish', resolve)
            outputStream.on('error', (err: any) => {
                pack.destroy();
                outputStream.close();
                reject(err);
            })
            pack.on('error', (err: any) => {
                pack.destroy();
                outputStream.close();
                reject(err);
            })
        });
    }

    private _addDirs(dir: string) {
        if (this.dirs.has(dir)) {
            return false;
        }
        const i = dir.lastIndexOf('/');
        if (i > 0) {
            this._addDirs(dir.slice(0, i));
        }
        this.add(dir);
        this.dirs.add(dir);
        return true;
    }

    async add(name: string, content?: Buffer) {
        const [dir, path] = getEntryDir(name);
        if (dir) {
            this._addDirs(dir);
        }
        // Calculate header size, 512 bytes for tar headers
        const headerSize = 512;
        const contentSize = content ? Buffer.byteLength(content) : 0;
        const entryHeaderOffset = this.currentOffset;

        // Store the index entry
        // entry data offset is always at header offset + 512 bytes
        if (contentSize > 0) { // do not index directories
            this.indexData.push(`${path}:${entryHeaderOffset},${contentSize}`);
        }

        // Add the file entry to the tar stream
        this.pack.entry({ name: path, size: contentSize }, content);

        // Update the offset
        this.currentOffset += headerSize + contentSize;
        // Tar files are padded to 512-byte boundaries
        if (contentSize % 512 !== 0) {
            this.currentOffset += 512 - (contentSize % 512);
        }
    }

    async build() {
        const pack = this.pack;
        // Convert index data to string and calculate its size
        const indexContent = this.indexData.join('\n') + '\n';
        const indexContentSize = Buffer.byteLength(indexContent);

        // Add the .index entry to the tar
        pack.entry({ name: '.index', size: indexContentSize }, indexContent);

        pack.finalize(); // Finalize the tar stream

        await this.tarPromise;
    }

    destroy() {
        this.pack.destroy();
    }

}

export async function loadTarIndex(tarFile: string) {
    const fd = await open(tarFile, 'r');
    try {
        return await readTarIndex(fd);
    } catch (err) {
        await fd.close();
        throw err;
    }
}

async function readTarIndex(fd: FileHandle) {
    const stats = await fd.stat();
    const size = stats.size;
    // we want to find the index header.
    // we read the last chunks of 512 until we find the file name followed by a 0 char.
    // the tar file ends with a segment of 1024 bytes of 0 so we need to skip that.
    // we pick a size for the buffer to also include the file size entry from the header. So the buffer should be
    // of 100 + 8 + 8 + 8 + 12 bytes = 124 + 12 bytes = 136 bytes
    // the file size will be located at offset 124 and is 12 bytes long
    // skip 1024 0 bytes then skip another 1024 bytes to find the first possible location of the index header (512 bytes for content and 512 bytes for the header)
    let offset = size - 1024 - 1024;
    const buffer = Buffer.alloc(512);
    while (offset >= 0) {
        await fd.read(buffer, 0, 512, offset);
        // remove the 0 byte padding
        const fileName = buffer.toString('utf-8', 0, 100);
        if (fileName.startsWith('.index\0')) {
            // we found the index header
            const indexSize = getHeaderFileSize(buffer);
            const indexDataOffset = offset + 512;
            const indexDataEnd = indexDataOffset + indexSize;
            if (indexDataEnd > size - 1024) {
                throw new Error('Invalid index data offsets: [' + indexDataOffset + ':' + indexDataEnd + ']');
            }
            const dataBbuffer = Buffer.alloc(indexSize);
            await fd.read(dataBbuffer, 0, indexSize, indexDataOffset);
            const indexContent = dataBbuffer.toString('utf-8');
            return new TarIndex(fd, indexContent);
        }
        offset -= 512;
    }
    return null;
}

export interface TarEntryIndex {
    offset: number,
    size: number
}
export class TarIndex {
    entries: Record<string, TarEntryIndex> = {};
    headerBuffer = Buffer.alloc(512);
    /**
     * @param fd the tar file descriptor
     * @param content the index content
     */
    constructor(public fd: FileHandle, content: string) {
        const lines = content.split('\n');
        for (const line of lines) {
            if (line) {
                const [name, value] = line.split(':');
                const [offsetStr, sizeStr] = value.split(',');
                const offset = parseInt(offsetStr);
                const size = parseInt(sizeStr);
                this.entries[name] = { offset, size };
            }
        }
    }

    getPaths() {
        return Object.keys(this.entries);
    }

    getSortedPaths() {
        return Object.keys(this.entries).sort();
    }

    get(name: string) {
        return this.entries[name];
    }

    async getContentAt(offset: number, size: number) {
        const buffer = Buffer.alloc(size);
        await this.fd.read(buffer, 0, size, offset + 512);
        return buffer;
    }
    async getContent(name: string) {
        const entry = this.entries[name];
        if (entry) {
            return this.getContentAt(entry.offset, entry.size);
        } else {
            return null;
        }
    }

    getReadStream(name: string, encoding?: BufferEncoding) {
        const entry = this.entries[name];
        if (entry) {
            const offset = entry.offset + 512;
            return this.fd.createReadStream({
                encoding,
                start: entry.offset,
                end: offset + entry.size
            })
        } else {
            return null;
        }
    }

    async close() {
        await this.fd.close();
    }

}


function getHeaderFileSize(buffer: Buffer) {
    const octalSize = buffer.toString('ascii', 124, 136).trim();
    return parseInt(octalSize, 8);
}

export function normalizePath(path: string) {
    if (path.startsWith('/')) {
        path = path.slice(1);
    }
    if (path.endsWith('/')) {
        path = path.slice(-1);
    }
    return path;
}

function getEntryDir(path: string): [string | null, string] {
    path = normalizePath(path);
    const i = path.lastIndexOf('/');
    if (i > -1 && i < path.length - 1) {
        return [path.slice(0, i), path];
    }
    return [null, path];
}

// async function test() {
//     const index = await loadTarIndex('../memory-cli/memo.tar');
//     if (!index) {
//         throw new Error('Index not found');
//     }
//     try {
//         const buffer = await index.getContent("L1009972.jpg")
//         if (!buffer) {
//             throw new Error('Entry not found');
//         }
//         fs.writeFileSync('extracted_L1009972.jpg', buffer);
//     } finally {
//         index.close();
//     }
// }
// test();