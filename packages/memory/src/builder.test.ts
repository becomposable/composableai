import { mkdtempSync, rmSync, statSync } from "fs";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { Builder } from "./Builder";
import { loadTarIndex } from "./utils/tar";
import { loadMemoryPack, MEMORY_METADATA_ENTRY } from "./MemoryPack";

const memoryBaseName = "test-base-memory";
const memoryBaseFile = memoryBaseName + '.tar';
const memoryName = "test-memory"
const memoryFile = memoryName + '.tar';
const tmpdir = mkdtempSync("composable-memory-pack-test-");

afterAll(() => {
    rmSync(memoryBaseFile);
    rmSync(memoryFile);
    rmSync(tmpdir, { recursive: true });
})

describe("Builder", () => {
    test("create base memory pack", async () => {
        const builder = new Builder({
            out: memoryBaseName,
        });
        builder.tmpdir = tmpdir;

        await builder.exec(`printf 'file1 from base memory' > ${tmpdir}/file1.txt`);
        const file2 = await builder.exec('printf "file2 from base memory"', { quiet: true });
        builder.copy(`${tmpdir}/file1.txt`, "file1.txt");
        builder.copyText(file2 || '', "file2.txt");
        builder.copyText("file3 from base memory", "file3.txt");

        await builder.build({
            baseProp1: "baseProp1",
            baseProp2: "baseProp2",
            baseProp3: "baseProp3",
        });

        const stats = statSync(memoryBaseFile);
        expect(stats.isFile()).toBeTruthy();
    });

    test("create memory pack override", async () => {
        const builder = new Builder({
            out: memoryName,
        });
        builder.tmpdir = tmpdir;

        await builder.from(memoryBaseFile, {
            files: ["!file1.txt"], // remove file1
            projection: {
                baseProp1: false, // remove baseProp1
            }
        })
        // override file2
        builder.copyText(`file2 from new memory`, "file2.txt");
        builder.copyText(`file4 from new memory`, "file4.txt");

        await builder.build({
            baseProp2: "baseProp2", // override baseProp2
            prop4: "prop4",
        });

        const stats = statSync(memoryFile);
        expect(stats.isFile()).toBeTruthy();

        // check the content of the tar

        const memory = await loadMemoryPack(memoryFile);
        const entries = memory.getEntries();
        expect(entries.length).toBe(4);
        expect(entries.map(e => e.name).sort()).toStrictEqual(["file2.txt", "file3.txt", "file4.txt", MEMORY_METADATA_ENTRY].sort());

        const entry1 = memory.getEntry("file1.txt");
        expect(entry1).toBeNull();
        const entry2 = memory.getEntry("file2.txt");
        expect(entry2).not.toBeNull();
        const entry3 = memory.getEntry("file3.txt");
        expect(entry3).not.toBeNull();
        const entry4 = memory.getEntry("file4.txt");
        expect(entry4).not.toBeNull();

        const content2 = (await entry2?.getContent())?.toString("utf-8");
        const content3 = (await entry3?.getContent())?.toString("utf-8");
        const content4 = (await entry4?.getContent())?.toString("utf-8");

        expect(content2).toBe("file2 from new memory");
        expect(content3).toBe("file3 from base memory");
        expect(content4).toBe("file4 from new memory");

        const context = await memory.getMetadata();
        expect(context).toStrictEqual({
            baseProp2: "baseProp2",
            baseProp3: "baseProp3",
            prop4: "prop4",
        });
    })
});