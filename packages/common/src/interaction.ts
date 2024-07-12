import type { JSONObject } from "@llumiverse/core";
import { ExecutionTokenUsage } from "@llumiverse/core";
import { JSONSchema4 } from "json-schema";
import { ExecutionEnvironmentRef } from "./environment.js";
import { ProjectRef } from "./project.js";
import {
    PopulatedPromptSegmentDef,
    PromptSegmentDef,
    PromptTemplateRef,
    PromptTemplateRefWithSchema,
} from "./prompt.js";
import { AccountRef } from "./user.js";

export interface InteractionExecutionError {
    code: string;
    message: string;
    data?: any;
}

export interface InteractionRef {
    id: string;
    name: string;
    description?: string;
    status: InteractionStatus;
    version: number;
    latest?: boolean;
    tags: string[];
    prompts?: PromptSegmentDef<PromptTemplateRef>[];
    updated_at: Date;
}
export const InteractionRefPopulate = "id name description status version latest tags updated_at prompts";

export interface InteractionRefWithSchema
    extends Omit<InteractionRef, "prompts"> {
    result_schema?: JSONSchema4;
    prompts?: PromptSegmentDef<PromptTemplateRefWithSchema>[];
}

export interface InteractionsExportPayload {
    /**
     * The name of the interaction. If not spcified all the interactions in the current project will be exported
     */
    name?: string;
    /*
     * tags to filter the exported interactions
     */
    tags?: string[];
    /*
     * if not specified, all versions will be exported
     */
    versions?: (number | 'draft' | 'latest')[];
}

export enum InteractionStatus {
    draft = "draft",
    published = "published",
    archived = "archived",
}

export enum ExecutionRunStatus {
    created = "created",
    processing = "processing",
    completed = "completed",
    failed = "failed",
}

export interface CachePolicy {
    type: "cache" | "no_cache" | "cache_and_refresh";
    refresh_probability: number;
    varies_on: string[];
    ttl: number;
}
export type InteractionVisibility = 'public' | 'private';
export interface Interaction {
    readonly id: string;
    name: string;
    endpoint: string;
    description?: string;
    status: InteractionStatus;
    parent?: string;
    // only used for versions (status === "published")
    latest?: boolean;
    // only used for versions (status === "published")
    visibility: InteractionVisibility;
    version: number;
    tags: string[];
    test_data?: JSONObject;
    result_schema?: JSONSchema4;
    cache_policy?: CachePolicy;
    model: string;
    temperature?: number;
    prompts: PromptSegmentDef[];
    max_tokens?: number;
    environment: string | ExecutionEnvironmentRef;
    project: string | ProjectRef;
    // only for drafts - when it was last published
    last_published_at?: Date;
    created_at: Date;
    updated_at: Date;
}

export interface PopulatedInteraction
    extends Omit<Interaction, "prompts"> {
    prompts: PopulatedPromptSegmentDef[];
}

export interface InteractionCreatePayload
    extends Omit<
        Interaction,
        "id" | "created_at" | "updated_at" | "project" | "formatter" | "tags" | "parent" | "version" | "visibility" | "endpoint"
    > {
    visibility?: InteractionVisibility;
}

export interface InteractionUpdatePayload
    extends Partial<
        Omit<
            Interaction,
            "result_schema" | "id" | "created_at" | "updated_at" | "project"
        >
    > {
    result_schema?: JSONSchema4 | null;
}

export interface InteractionPublishPayload {
    visibility?: InteractionVisibility;
    tags?: string[];
}

export interface InteractionForkPayload {
    keepTags?: boolean;
    forkPrompts?: boolean;
    targetProject?: string;
}

export interface InteractionExecutionPayload<Input = any> {
    data?: Input;
    config?: InteractionExecutionConfiguration;
    result_schema?: JSONSchema4;
    stream?: boolean;
    do_validate?: boolean;
    tags?: string | string[]; // tags to be added to the execution run
}

export interface NamedInteractionExecutionPayload<Input = any> extends InteractionExecutionPayload<Input> {
    /**
     * The interaction name and suffixed by an optional tag or version separated from the name using a @ character
     * If no version/tag part is specified then the latest version is used.
     * Example: ReviewContract, ReviewContract@draft, ReviewContract@1, ReviewContract@some-tag
     */
    interaction: string;
}

export enum RunSourceTypes {
    api = "api",
    cli = "cli",
    ui = "ui",
    webhook = "webhook",
    test = "test-data",
    system = "system",
}

export interface RunSource {
    type: RunSourceTypes;
    label: string;
    principal_type: 'user' | 'apikey';
    principal_id: string;
    client_ip: string;
}

export interface ExecutionRun<P = any, R = any> {
    readonly id: string;
    /**
     * Only used by runs that were created by a virtual run to point toward the virtual run parent
     */
    parent?: string | ExecutionRun;
    evaluation?: {
        score?: number,
        selected?: boolean,
        scores?: Record<string, number>
    }
    result: R;
    parameters: P; //params used to create the interaction, only in varies on?
    tags?: string[];
    //TODO a string is returned when executing not the interaction object
    interaction: Interaction;
    //TODO a string is returned when execution not the env object
    environment: ExecutionEnvironmentRef;
    modelId: string;
    result_schema: JSONSchema4;
    ttl: number;
    status: ExecutionRunStatus;
    prompt: any;
    token_use?: ExecutionTokenUsage;
    execution_time?: number; //s
    created_at: Date;
    updated_at: Date;
    account: AccountRef;
    project: ProjectRef;
    config: InteractionExecutionConfiguration;
    error?: InteractionExecutionError;
    source: RunSource;
}

export interface ExecutionRunRef
    extends Omit<ExecutionRun, "result" | "parameters" | "interaction"> {
    interaction: InteractionRef;
}

export const ExecutionRunRefSelect = "-result -parameters -result_schema";

export interface InteractionExecutionConfiguration {
    environment?: string;
    model?: string;
    temperature?: number;
    max_tokens?: number;
    do_validate?: boolean;
}

export interface GenerateTestDataPayload {
    message?: string;
    count?: number;
    config: InteractionExecutionConfiguration;
}

export interface ImprovePromptPayload {
    config: InteractionExecutionConfiguration;
}