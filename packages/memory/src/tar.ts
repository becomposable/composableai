import fs from "fs";
import tar from "tar-stream";

export interface MemoryFile {
    name: string;
    getContent(): Promise<Buffer>;
}

export async function buildTar(file: string, inputFiles: MemoryFile[]) {
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
        indexData.push(`${name}:${entryHeaderOffset}`);

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
