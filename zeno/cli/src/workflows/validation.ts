import { DSLWorkflowSpec } from "@composableai/zeno-common";

export class ValidationError extends Error {
    constructor(message: string) {
        super("Invalid workflow definition: " + message);
        this.name = "ValidationError";
    }
}

export function validateWorkflow(spec: DSLWorkflowSpec): DSLWorkflowSpec {
    if (!spec.name) {
        throw new ValidationError("name is required");
    }
    if (!spec.activities || !Array.isArray(spec.activities) || spec.activities.length === 0) {
        throw new ValidationError("activities is required and should be an array with at least one element");
    }
    return spec;
}
