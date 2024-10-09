
/**
 * An iterative generation workflow uses up to 3 memory packs
 * which are located inside the folder: `project_bucket/memories/{memory.name}/`
 * These 3 memory packs have hardocded names:
 * 1. input - this is the input memory pack which contains input files and content
 * 2. context - this is the context memory pack which can be updated by activities. The context memory is usually not containing content files but only metadata.
 * 3. output - this memory pack will conytain the generated files.
 * The input memory pack is named: `input`, the output memory pack is named: `output`
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

export interface Toc {
    sections: {
        id: string;
        name: string;
        description?: string;
        instructions?: string;
        parts?: {
            id: string;
            name: string;
            description?: string;
            instructions?: string;
        }[]
    }[]
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