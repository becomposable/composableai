import { WorkflowExecutionPayload } from "@becomposable/common";
import { MemoryPack } from "@becomposable/memory";
import { ApplicationFailure } from "@temporalio/workflow";
import { getClient } from "../../utils/client.js";
import { buildAndPublishMemoryPack, loadMemoryPack } from "../../utils/memory.js";
import { IterativeGenerationPayload, OutputMemoryMeta, Section, TocPart, TocSection } from "../types.js";
import { executeWithVars, expectMemoryIsConsistent } from "../utils.js";

export async function generatePart(payload: WorkflowExecutionPayload, path: number[]) {
    const vars = payload.vars as IterativeGenerationPayload;
    const client = getClient(payload);
    const memory = vars.memory;

    const [sectionIndex, partIndex] = path;
    const outMemory = await loadMemoryPack(client, `${memory}/output`);
    const meta = await outMemory.getMetadata() as OutputMemoryMeta;

    // the section we build is the section at the given index
    const section: TocSection = meta.toc.sections[sectionIndex];
    if (!section) {
        throw ApplicationFailure.nonRetryable('Section not found in the TOC', 'SectionNotFound', { memory, path });
    }
    let part: TocPart | undefined;
    if (partIndex !== undefined) {
        part = section.parts?.[partIndex];
        if (!part) {
            throw ApplicationFailure.nonRetryable('Part not found in the TOC section', 'PartNotFound', { memory, path });
        }
    }

    expectMemoryIsConsistent(meta, path);

    const content = await loadGeneratedContent(outMemory);

    const previously_generated = content.map((section: Section) => section.content || '').join('\n\n');

    if (!part) { // a new section
        content.push({
            id: section.id,
            name: section.name,
            description: section.description,
            content: ''
        })
    } else if (!content.length) {
        throw ApplicationFailure.nonRetryable('content.json is empty while generating a part', 'InvalidIterationState', { memory, path });
    }

    const interaction = vars.iterative_interaction || vars.interaction;
    const r = await executeWithVars(client, interaction, vars, {
        iteration: {
            toc: meta.toc,
            previously_generated,
            section: section.name,
            part: part?.name,
            path: path,
        }
    });

    const result = r.result as string;
    content[content.length - 1].content += result;
    meta.lastProcessdPart = path;
    await buildAndPublishMemoryPack(client, `${memory}/output`, async ({ copyText }) => {
        copyText(JSON.stringify(content, null, 2), "content.json");
        return meta;
    });
}

async function loadGeneratedContent(memory: MemoryPack): Promise<Section[]> {
    const content = await memory.getEntryText('content.json');
    return content ? JSON.parse(content) : [];
}
