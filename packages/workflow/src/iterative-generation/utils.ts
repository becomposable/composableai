import { ComposableClient } from "@becomposable/client";
import { ExecutionRun } from "@becomposable/common";
import { ApplicationFailure } from "@temporalio/workflow";
import { OutputMemoryMeta, Toc, TocSection } from "./types.js";


export interface ExecuteOptions {
    interaction: string;
    memory: string;
    memory_mapping?: Record<string, string>;
    environment?: string;
    model?: string;
    max_tokens?: number;
    temperature?: number;
    result_schema?: Record<string, any>;
}

export async function execute<T = any>(client: ComposableClient, options: ExecuteOptions): Promise<ExecutionRun<any, T>> {
    return client.interactions.executeByName(options.interaction, {
        data: `memory:$[options.memory}`,
        memory_mapping: options.memory_mapping,
        result_schema: options.result_schema,
        config: {
            environment: options.environment,
            model: options.model,
            max_tokens: options.max_tokens,
            temperature: options.temperature,
        }
    });
}

export function executeWithVars<T = any>(client: ComposableClient, interaction: string, vars: Record<string, any>, mapping?: Record<string, any>, result_schema?: Record<string, any>): Promise<ExecutionRun<any, T>> {
    if (mapping) {
        mapping = { ...vars.input_mapping, mapping };
    } else {
        mapping = vars.input_mapping;
    }
    return execute(client, {
        interaction: interaction,
        memory: `${vars.memory}/input`,
        memory_mapping: mapping,
        environment: vars.environment,
        model: vars.model,
        max_tokens: vars.max_tokens,
        temperature: vars.temperature,
        result_schema: result_schema
    });
}

export function isSamePartIndex(part1: number[], part2: number[]) {
    return part1 && part2 && part1.length === part2.length && part1.every((v, i) => v === part2[i]);
}

export function getPreviousPathIndex(toc: Toc, pathIndex: number[]): number[] | null {
    let [sectionIdx, partIdx] = pathIndex;
    if (partIdx === undefined) {
        let prevSectionIdx = sectionIdx - 1;
        if (prevSectionIdx < 0) {
            return null;
        } else {
            const prevParts = toc.sections[prevSectionIdx].parts;
            if (prevParts && prevParts.length > 0) { // return the last part of the previous section
                return [prevSectionIdx, prevParts.length - 1];
            } else { // if no parts return the section itself
                return [prevSectionIdx];
            }
        }
    } else if (partIdx > 0) { // return the previous part in the same section
        return [sectionIdx, partIdx - 1];
    } else { // if the first part return the section itself
        return [sectionIdx];
    }
}


export function expectMemoryIsConsistent(meta: OutputMemoryMeta, pathIndex: number[]) {
    const metaLastProcessedPart = meta.lastProcessdPart;
    if (!metaLastProcessedPart) {
        if (pathIndex.length > 1 && pathIndex[0] !== 0) {
            throw ApplicationFailure.nonRetryable('Memory last processed part is not consitent with the workflow.', 'MemoryPackNotConsistent', { currentIndex: pathIndex, expectedPreviousIndex: [pathIndex[0], pathIndex[1] - 1], previousIndex: metaLastProcessedPart });
        } else {
            return;
        }
    }
    const prevPathIndex = getPreviousPathIndex(meta.toc, pathIndex);
    if (!prevPathIndex) {
        throw ApplicationFailure.nonRetryable('Memory last processed part is not consitent with the workflow', 'MemoryPackNotConsistent', { currentIndex: pathIndex, expectedPreviousIndex: prevPathIndex, previousIndex: metaLastProcessedPart });
    } else if (!isSamePartIndex(prevPathIndex, metaLastProcessedPart)) {
        throw ApplicationFailure.nonRetryable('Memory last processed part is not consitent with the workflow', 'MemoryPackNotConsistent', { currentIndex: pathIndex, expectedPreviousIndex: prevPathIndex, previousIndex: meta.lastProcessdPart });
    }
}

export function sectionWithoutParts(section: TocSection) {
    const clone = { ...section };
    delete clone.parts;
    return clone;
}