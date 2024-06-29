import { DSLWorkflowSpec } from "@composableai/zeno-common";
import { validateWorkflow as validate } from "@composableai/workflow";
export class ValidationError extends Error {
    constructor(message: string) {
        super("Invalid workflow definition: " + message);
        this.name = "ValidationError";
    }
}

export function validateWorkflow(spec: DSLWorkflowSpec): DSLWorkflowSpec {
    const errors = validate(spec);
    if (errors && errors.length > 0) {
        console.log("The workflow has validation errors:");
        console.log(errors.join("\n"));
        process.exit(2);
    }
    return spec;
}
