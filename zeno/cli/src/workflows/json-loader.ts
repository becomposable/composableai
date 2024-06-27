import { DSLWorkflowSpec } from "@composableai/zeno-common";
import { readFile } from "fs/promises";
import { ValidationError, validateWorkflow } from "./validation.js";

function parseJSON(content: string): DSLWorkflowSpec {
    try {
        return JSON.parse(content);
    } catch (err: any) {
        throw new ValidationError("Invalid JSON: " + err.message);
    }
}

export function loadJSONWorkflowDefinition(file: string): Promise<DSLWorkflowSpec> {
    return readFile(file, 'utf-8').then(content => {
        return validateWorkflow(parseJSON(content));
    });
}