import { WorkflowExecutionPayload } from "@becomposable/common";

import { log, proxyActivities } from "@temporalio/workflow";
import * as activities from "./activities/index.js";
import { IterativeGenerationPayload, PartIndex } from "./types.js";

const {
    generateToc,
    generatePart
} = proxyActivities<typeof activities>({
    startToCloseTimeout: "5 minute",
    retry: {
        initialInterval: '30s',
        backoffCoefficient: 2,
        maximumAttempts: 20,
        maximumInterval: 100 * 30 * 1000, //ms
        nonRetryableErrorTypes: [],
    },
});


export async function iterativeGenerationWorkflow(payload: WorkflowExecutionPayload) {
    const activitiesPayload = payload.vars as IterativeGenerationPayload;
    const {
        interaction,
        memory,
        input_mapping
    } = activitiesPayload;

    console.log("interaction to execute : ", interaction);
    console.log("memory pack group: ", memory);
    console.log("input memory pack mapping: ", input_mapping);

    log.info(`Generating TOC`);
    // the generateToc activity is retiurning the toc hierarchy.
    // It doesn't include extra TOC details like description etc.
    // To minimize the payload size only the hierarchy and the section/part names are returned
    const toc = await generateToc(payload);

    log.info(`Generated TOC: ${JSON.stringify(toc, null, 2)}`);

    if (toc.sections.length === 0) {
        //TODO how to handle this case?
        throw new Error("Nothing to generate: TOC is empty");
    }

    for (const section of toc.sections) {
        console.log(section);
        log.info(`Generating section: ${formatPath(section)}`);
        await generatePart(payload, section.path);

        if (section.parts) {
            for (const part of section.parts) {
                log.info(`Generating part: ${formatPath(part)}`);
                await generatePart(payload, part.path);
            }
        }
    }

    return payload;
}

function formatPath(node: PartIndex) {
    // we print 1 based indexes
    return node.path.map(i => i + 1).join('.') + ' ' + node.name;
}