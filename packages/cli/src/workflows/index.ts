import { Command } from "commander";
import { createOrUpdateWorkflowDefinition, createOrUpdateWorkflowRule, createWorkflowRule, deleteWorkflowDefinition, deleteWorkflowRule, executeWorkflowRule, getWorkflowDefinition, getWorkflowRule, listWorkflowsDefinition, listWorkflowsRule, transpileWorkflow } from "./commands.js";

export function registerWorkflowsCommand(program: Command) {
    const workflows = program.command("workflows");
    const rules = workflows.command("rules");

    rules.command("create")
        .description("Create a new workflow definition.")
        .option('--name [name]', 'The name of the workflow definition to create.')
        .option('--on [event]', 'The event which trigger this workflow. Format: "eventName[:objectType]" where objectType is optional.')
        .option('--run [endpoint]', 'The workflow to run.')
        .action((options: Record<string, any>) => {
            createWorkflowRule(program, options);
        });

    rules.command("get <workflowId>")
        .description("Get a workflow given its ID")
        .option('-f, --file [file]', 'The file to save the workflow definition to.')
        .action((workflowId: string, options: Record<string, any>) => {
            getWorkflowRule(program, workflowId, options);
        });

    rules.command("apply")
        .description("Update a workflow a workflow given its ID")
        .option('-f, --file <file>', 'The file to save the workflow definition to.')
        .action((options: Record<string, any>) => {
            createOrUpdateWorkflowRule(program, options);
        });

    rules.command("list")
        .description("List all workflows")
        .action((options: Record<string, any>) => {
            listWorkflowsRule(program, options);
        });

    rules.command("execute <workflowId>")
        .description("Execute a workflow")
        .option('-o, --objectId [objectIds...]', 'The object to execute the workflow on.')
        .option('-f, --file [file]', 'The file containing workflow execution payload.')
        .action((workflowId: string, options: Record<string, any>) => {
            executeWorkflowRule(program, workflowId, options);
        });

    rules.command("delete <objectId>")
        .description("Delete a workflow given its ID")
        .action((objectId: string, options: Record<string, any>) => {
            deleteWorkflowRule(program, objectId, options);
        });

    const definitions = workflows.command("definitions");

    definitions.command("transpile <files...>")
        .description("Transpile a typescript workflow definition to JSON.")
        .option('-o, --out [file]', 'An output file or directory. When multiple files are specified it must be a directory. If not specified the transpiled files are printed to stdoud.')
        .action((files: string[], options: Record<string, any>) => {
            transpileWorkflow(program, files, options);
        });

    definitions.command("create")
        .description("Create a new workflow definition.")
        .option('-f, --file <file>', 'The file containing the workflow definition.')
        .action((options: Record<string, any>) => {
            createOrUpdateWorkflowDefinition(program, undefined, options);
        });

    definitions.command("apply [workflowId]")
        .description("Create or update a workflow definition using a file.")
        .option('-f, --file <file>', 'The file containing the workflow definition.')
        .option('--skip-validation', 'Skip the validation of the workflow definition.')
        .action((workflowId, options: Record<string, any>) => {
            createOrUpdateWorkflowDefinition(program, workflowId, options);
        });

    definitions.command("list")
        .description("List all workflow definitions.")
        .action((options: Record<string, any>) => {
            listWorkflowsDefinition(program, options);
        });

    definitions.command("get <objectId>")
        .description("Get a workflow definition given its ID.")
        .option('-f, --file [file]', 'The file to save the workflow definition to.')
        .action((objectId: string, options: Record<string, any>) => {
            getWorkflowDefinition(program, objectId, options);
        });

    definitions.command("delete <objectId>")
        .description("Delete a workflow definition given its ID.")
        .action((objectId: string, options: Record<string, any>) => {
            deleteWorkflowDefinition(program, objectId, options);
        });
}
