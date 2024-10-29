import { WorkflowExecutionPayload } from "@becomposable/common";
import { parse as parseYaml } from "yaml";
import { getClient } from "../../utils/client.js";
import { buildAndPublishMemoryPack, loadMemoryPack } from "../../utils/memory.js";
import { IterativeGenerationPayload, OutputMemoryMeta, Toc, TocIndex } from "../types.js";
import { tocIndex } from "../utils.js";

/**
 * This activity is called if the toc was provided in the payload. Otherwise
 * the generateToc is called.
 *
 * @param payload
 */
export async function it_gen_extractToc(payload: WorkflowExecutionPayload): Promise<TocIndex | null> {
    const vars = payload.vars as IterativeGenerationPayload;
    const memory = vars.memory;
    const client = getClient(payload);

    const inMemory = await loadMemoryPack(client, `${memory}/input`);
    let tocJson: string | null = null;
    let tocYaml: string | null = null;
    let toc: any;
    tocJson = await inMemory.getEntryText("toc.json");
    if (!tocJson) {
        tocYaml = await inMemory.getEntryText("toc.yaml");
        if (tocYaml) {
            toc = parseYaml(tocYaml) as Toc;
        }
    } else {
        toc = JSON.parse(tocJson) as Toc;
    }
    if (!toc) {
        return null; // no toc found
    }


    await buildAndPublishMemoryPack(client, `${vars.memory}/output`, async () => {
        return {
            toc,
            lastProcessdPart: undefined, // the part index (a number array)
            previouslyGenerated: ""
        } as OutputMemoryMeta
    });

    return tocIndex(toc);
}