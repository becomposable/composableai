import { ComposableClient } from "@becomposable/client";
import { ExecutionRun } from "@becomposable/common";


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