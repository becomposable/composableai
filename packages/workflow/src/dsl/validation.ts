import { DSLActivitySpec, DSLWorkflowSpec } from "@becomposable/common";
import { Vars, splitPath } from "./vars.js";

export function validateWorkflow(workflow: DSLWorkflowSpec, vars: string[] = []) {
    const errors: string[] = [];
    const workflowVars = new Set(vars);
    workflowVars.add("objectId");
    workflowVars.add("objectIds");
    if (workflow.vars) {
        for (const v of Object.keys(workflow.vars)) {
            workflowVars.add(v);
        }
    }
    if (!workflow.name) {
        errors.push("Workflow 'name' property is required");
    }
    const activities = workflow.activities;
    if (!activities || !Array.isArray(activities)) {
        errors.push("Workflow 'activities' property is required");
        return errors;
    }
    if (!activities || !Array.isArray(activities)) {
        errors.push("Workflow 'activities' should be an array");
        return errors;
    }
    if (!activities.length) {
        errors.push("Workflow should have at least one activity");
    }

    for (const activity of activities) {
        const activityErrors = validateActivity(activity, workflowVars);
        if (activityErrors.length > 0) {
            for (const err of activityErrors) {
                errors.push(`Activity "${activity.name}": ${err}`);
            }
        }
        if (activity.output) {
            workflowVars.add(activity.output);
        }
    }

    return errors;
}

export function validateActivity(activity: DSLActivitySpec, workflowVars: Set<string>): string[] {
    const errors: string[] = [];
    if (!activity.name) {
        errors.push("Activity name is required");
    }
    const importedVars = activity.import;
    const localVars: Record<string, boolean> = {};
    if (importedVars && importedVars.length > 0) {
        for (const entry of importedVars) {
            if (typeof entry === 'string') {
                pushLocalVar(entry, localVars, errors);
                if (!workflowVars.has(entry)) {
                    errors.push(`Unknown workflow variable "${entry}" in import declaration`);
                }
            } else {
                for (const key of Object.keys(entry)) {
                    pushLocalVar(key, localVars, errors);
                    const wfExpr = entry[key];
                    const wfVar = splitPath(wfExpr)[0];
                    if (!workflowVars.has(wfVar)) {
                        errors.push(`Unknown workflow variable "${wfExpr}" in import declaration`);
                    }
                }
            }
        }
    }

    // collect fetch vars and check expressions in fetch declarations
    const fetch = activity.fetch;
    if (fetch) {
        const keys = Object.keys(fetch);
        for (const key of keys) {
            const query = fetch[key].query;
            // check expressions in query
            validateExpressions(query, localVars, errors);
        }
        for (const key of keys) {
            pushLocalVar(key, localVars, errors);
        }
    }
    // check expressions in params
    if (activity.params) {
        validateExpressions(activity.params, localVars, errors);
    }
    return errors;
}


function validateExpressions(target: Record<string, any>, localVars: Record<string, boolean>, errors: string[]) {
    const vars = new Vars(localVars);
    const refs = vars.getUnknownReferences(target);
    for (const ref of refs) {
        errors.push(`Unknown variable "${ref.name}" in expression "${ref.expression}"`)
    }
}

function pushLocalVar(v: string, localVars: Record<string, boolean>, errors: string[]) {
    if (localVars[v] === true) {
        errors.push(`Duplicate variable "${v}"`);
    }
    localVars[v] = true;
}
