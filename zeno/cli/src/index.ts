import { program } from 'commander';
import { addProfile, deleteProfile, listProfiles, showProfile, updateProfile, useProfile } from './config/commands.js';
import { getVersion, upgrade } from './package.js';
import { createObject, deleteObject, getObject, listObjects } from './store/index.js';
import { createWorkflow, executeWorkflow, listWorkflows } from './workflows/index.js';


program.version(getVersion())
    .option('-k, --apikey <API_KEY>', 'API Key to authenticate with Zenos server')
    .option('-s, --server [URL]', 'Server URL if necessary');

program.command("upgrade")
    .description("Upgrade to the latest version of the CLI")
    .action(upgrade)

const configRoot = program.command("config")
    .description("Manage configuration profiles")
    .action(() => {
        listProfiles();
    });
configRoot.command('show [name]')
    .description("Show the configured profiles or the profile with the given name")
    .action((name?: string) => {
        showProfile(name);
    });
configRoot.command('use <name>')
    .description("Switch to another configuration profile")
    .action((name) => {
        useProfile(name);
    });
configRoot.command('add')
    .description("Add a new configuration profile")
    .action(() => {
        addProfile();
    });
configRoot.command('edit <name>')
    .description("Edit an existing configuration profile")
    .action((name) => {
        updateProfile(name);
    });
configRoot.command('delete <name>')
    .description("delete an existing configuration profile")
    .action((name) => {
        deleteProfile(name);
    });

const store = program.command("store");

store.command("post <file...>")
    .description("Post a new object to the store")
    .option('--name [name]', 'The name of the object to create. If not specified the file name will be used.')
    .option('--type [type]', 'The type of the object to create. If not specified the type will be inferred from the file content.')
    .option('--mime [mime]', 'The mime-type of the file content. If not specified the mime type will be inferred from the file name extension.')
    .option('--path [parentPath]', 'The path of the parent folder where the object is created. If not specified the object will be created in the root of the store.')
    .option('-r,--recursive', 'Recurse directory if the file argument is a directory. The defualt is to not recurse.')
    .action((files: string[], options: Record<string, any>) => {
        createObject(program, files, options);
    });
store.command('delete <objectId>')
    .description("Delete an existing object given its ID")
    .action((objectId: string, options: Record<string, any>) => {
        deleteObject(program, objectId, options);
    });
store.command('get <objectId>')
    .description("Get an existing object given its ID")
    .action((objectId: string, options: Record<string, any>) => {
        getObject(program, objectId, options);
    });
store.command('list [folderPath]')
    .description("List the objects inside a folder. If no folder is specified all the obejcts are listed.")
    .option('-l,--limit [limit]', 'Limit the number of objects returned. The default limit is 100. Usefull for pagination.')
    .option('-s,--skip [skip]', 'Skip the number of objects to skip. Default is 0. Usefull for pagination.')
    .action((folderPath: string | undefined, options: Record<string, any>) => {
        listObjects(program, folderPath, options);
    });

const workflows = program.command("workflows");

workflows.command("create")
    .description("Create a new workflow definition.")
    .option('--name [name]', 'The name of the workflow definition to create.')
    .option('--on [event]', 'The event which trigger this workflow. Format: "eventName[:objectType]" where objectType is optional.')
    .option('--run [endpoint]', 'The workflow to run.')
    .action((options: Record<string, any>) => {
        createWorkflow(program, options);
    });

workflows.command("list")
    .description("List all workflows")
    .action((options: Record<string, any>) => {
        listWorkflows(program, options);
    });

workflows.command("execute <workflowId>")
    .description("Execute a workflow")
    .option('-o, --objectId [objectIds...]', 'The object to execute the workflow on.')
    .action((workflowId: string, options: Record<string, any>) => {
        executeWorkflow(program, workflowId, options);
    });


program.parse();