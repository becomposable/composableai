import { WorkflowExecutionPayload } from "@becomposable/common";
import { getClient } from "../../utils/client.js";
import { expandVars } from "../../utils/expand-vars.js";
import { buildAndPublishMemoryPack, loadMemoryPack } from "../../utils/memory.js";
import { IterativeGenerationPayload, SECTION_ID_PLACEHOLDER, TocSection } from "../types.js";
import { log } from "@temporalio/activity";

export async function it_gen_finalizeOutput(payload: WorkflowExecutionPayload): Promise<void> {
    const vars = payload.vars as IterativeGenerationPayload;

    const memory = vars.memory;
    const client = getClient(payload);
    const inMemory = await loadMemoryPack(client, `${memory}/input`);
    const outMemory = await loadMemoryPack(client, `${memory}/output`);


    const content = await outMemory.getEntryText("content.json");
    if (!content) {
        log.info(`Nothing to do. No content.json file found`);
        return;
    }

    log.info(`Creating the final output memory pack.`);

    const inMeta = await inMemory.getMetadata();
    let tocName = "toc.json";
    let toc = await inMemory.getEntryText(tocName);
    if (!toc) {
        tocName = "toc.yaml";
        toc = await inMemory.getEntryText(tocName);
    }
    if (!toc) {
        const outMeta = await outMemory.getMetadata();
        tocName = "toc.json";
        toc = JSON.stringify(outMeta.toc);
    }
    const sections = JSON.parse(content) as (TocSection & { content: string })[];

    await buildAndPublishMemoryPack(client, `${memory}/output`, async ({ copyText }) => {
        // copy the input toc file if any
        if (toc) {
            copyText(toc, tocName);
        }
        // copy the raw JSON content
        copyText(content, "content.json");
        if (vars.section_file_pattern) {
            log.info(`Saving sections to files using pattern: ${vars.section_file_pattern}`);
            // save sections to files
            for (const section of sections) {
                let content = section.content;
                if (vars.section_file_header) {
                    content = getSectionFileHeader(section, vars.section_file_header) + '\n\n' + content;
                }
                copyText(content, getSectionFileName(section, vars.section_file_pattern));
            }
        }
        return inMeta;
    });

}



function getSectionFileHeader(section: TocSection, header: string): string {
    const date = new Date().toISOString();
    return expandVars(header, {
        section,
        date
    });
}

function getSectionFileName(section: TocSection, pattern: string): string {
    return pattern.replace(SECTION_ID_PLACEHOLDER, section.id);
}