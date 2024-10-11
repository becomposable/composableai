import { WorkflowExecutionPayload } from "@becomposable/common";
import { ApplicationFailure } from "@temporalio/workflow";
import { getClient } from "../../utils/client.js";
import { buildAndPublishMemoryPack, loadMemoryPack } from "../../utils/memory.js";
import { IterativeGenerationPayload, OutputMemoryMeta, TocPart, TocSection } from "../types.js";
import { executeWithVars, expectMemoryIsConsistent, sectionWithoutParts } from "../utils.js";

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

    const r = await executeWithVars(client, vars, {
        context: {
            previouslyGenerated: meta.previouslyGenerated,
            section: sectionWithoutParts(section),
            part: part,
            path: path
        }
    });

    const result = r.result as string;
    if (!meta.previouslyGenerated) {
        meta.previouslyGenerated = '';
    }
    meta.previouslyGenerated += result;
    meta.lastProcessdPart = path;
    await buildAndPublishMemoryPack(client, `${memory}/output`, async () => {
        return meta;
    });
}
