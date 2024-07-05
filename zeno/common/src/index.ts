export * from "./api.js";
export * from "./dsl-workflow.js";
export * from "./object-types.js";
export * from "./store.js";
export * from "./workflow.js";

export interface BaseObject {
    id: string;
    name: string;
    description?: string;
    tags?: string[]; 
    created_at: Date;
    updated_at: Date;
}