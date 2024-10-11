
/**
 * An iterative generation workflow uses 2 memory packs one for input and the other for output.
 * The input memory packs must be available in the project blobs bucket at `${tenant_id/memories/${memory_name}/input.tar.gz`.
 * The output memory pack will be generated at `${tenant_id/memories/${memory_name}/output.tar.gz`.
 * Each iteration is overwriting the output memory pack with the new generated content.
 * The complete name of the input and output memory packs are: "${name}/input" and "${name}/output" where name is the base memory name.
 */
export interface IterativeGenerationPayload {
    // the interaction to execute
    interaction: string;
    // the environment to use
    environment?: string;
    // the model to use
    model?: string;
    // A custom max tokens
    max_tokens?: number;
    // A custom temperature
    temperature?: number;
    // the memory pack group name
    memory: string;
    // the input memory pack mapping
    input_mapping?: Record<string, string>;
    // custom toc schema if any
    toc_schema?: Record<string, any>
}

export interface TocPart {
    id: string;
    name: string;
    description?: string;
    instructions?: string;
}

export interface TocSection {
    id: string;
    name: string;
    description?: string;
    instructions?: string;
    parts?: TocPart[];
}

export interface Toc {
    sections: TocSection[];
}


export interface SectionIndex extends PartIndex {
    parts?: PartIndex[];
}
export interface PartIndex {
    path: number[];
    name: string;
}
export interface TocIndex {
    sections: SectionIndex[];
}

export interface OutputMemoryMeta {
    toc: Toc;
    previouslyGenerated: string;
    lastProcessdPart?: number[] | undefined;
}