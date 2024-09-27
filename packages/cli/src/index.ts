import { Command } from 'commander';
import runExport from './codegen/index.js';
import { genTestData } from './datagen/index.js';
import { listEnvirnments } from './envs/index.js';
import { listInteractions } from './interactions/index.js';
import { registerObjectsCommand } from './objects/index.js';
import { getVersion, upgrade } from './package.js';
import { createProfile, deleteProfile, listProfiles, showActiveAuthToken, showProfile, tryRrefreshToken, updateCurrentProfile, updateProfile, useProfile } from './profiles/commands.js';
import { getConfigFile } from './profiles/index.js';
import { listProjects } from './projects/index.js';
import runInteraction from './run/index.js';
import { runHistory } from './runs/index.js';
import { registerWorkflowsCommand } from './workflows/index.js';

//warnIfNotLatest();

const program = new Command();

program.version(getVersion());

program.command("upgrade")
    .description("Upgrade to the latest version of the CLI")
    .action(upgrade)

program.command("projects")
    .description("List the projects you have access to")
    .action(() => {
        listProjects(program);
    })

const authRoot = program.command("auth")
    .description("Manage authentication")

authRoot.command("token")
    .description("Show the auth token used by the current selected profile.")
    .action(() => {
        showActiveAuthToken();
    })

authRoot.command("refresh")
    .description("Refresh the auth token used by the current profile. An alias to 'composable profiles refresh'.")
    .action(() => {
        updateCurrentProfile();
    })

program.command("envs [envId]")
    .description("List the environments you have access to")
    .action((envId: string | undefined, options: Record<string, any>) => {
        listEnvirnments(program, envId, options);
    })
program.command("interactions [interaction]")
    .description("List the interactions available in the current project")
    .action((interactionId: string | undefined, options: Record<string, any>) => {
        listInteractions(program, interactionId, options);
    })
program.command("datagen <interaction>")
    .description("Generate test input data, given an interaction ID")
    .option('-e, --env [envId]', 'The environment ID to use to generating the test data')
    .option('-m, --model [model]', 'The model to use to generating the test data. If the selected environment has a default model then this option is optional.')
    .option('-t, --temperature [value]', 'The temperature used to generating the test data.')
    .option('-o, --output [file]', 'A file to save the generated test data. If not specified the data will be printed to stdout.')
    .option('-c, --count [value]', 'The number of data objects to generate', '1')
    .option('-m, --message [value]', 'An optional message')
    .action((interactionId: string, options: Record<string, any>) => {
        genTestData(program, interactionId, options);
    })
program.command("codegen [interactionName]")
    .description("Generate code given an interaction name of for all the interactions in the project if no interaction is specified.")
    .option('--versions [versions]', 'A comma separated list of version selectors to include. A version selector is either a version number or one of the "draft" or "latest" keywords. The default is "draft, latest"', "draft,latest")
    .option('-a, -all', 'When used, all the interaction versions will be exported')
    .option('-d, --dir [file]', 'The output directory if any. Default to "./interactions" if not specified.', './interactions')
    .option('-x, --export <version>', 'The version to export from index.ts. If not specified, the latest version will be exported or if no version is available, the draft version will be exported')
    .action((interactionName: string | undefined, options) => runExport(program, interactionName, options));
program.command("run <interactionId>")
    .description("Run an interaction by id")
    .option('-i, --input [file]', 'The input data if any. If no file path is specified it will read from stdin')
    .option('-o, --output [file]', 'The output file if any. If not specified it will print to stdout')
    .option('-d, --data [json]', 'Inline data as a JSON string. If specified takes precendence over --input')
    .option('-T, --tags [tags]', 'A comma separated list of tags to add to the execution run')
    .option('-t, --temperature [temperature]', 'The temperature to use')
    .option('-m, --model [model]', 'The model to use. Optional.')
    .option('-e, --env [environmentId]', 'The environment Id to use. Optional.')
    .option('-S, --no-stream', 'When used, the output will be printed only when the execution is complete')
    .option('-c, --count [count]', 'The number of times to run the interaction', '1')
    .option('-v, --verbose', 'Only used in no streaming mode. Instead of printing a progress it will print details about each executed run.')
    .option('--jsonl', 'Write output in jsonl. The default is to write the json. Ignored when only one run is executed')
    .option('--data-only', 'Write down only the data returned by the LLM and not the entire execution run. This mode is forced when streaming', false)
    .action((interactionId: string, options: Record<string, any>) => runInteraction(program, interactionId, options));
program.command("runs [interactionId]")
    .description('Search the run history for specific execution runs')
    .option('-t, --tags [tags]', 'A comma separated list of tags to filter the run history')
    .option('--status [status]', 'A status to filter on')
    .option('-e, --env [environmentId]', 'Filter by environment')
    .option('-m, --model [model]', 'Filter by model')
    .option('-q, --query [query]', 'A lucene query')
    .option('-l, --limit [limit]', 'The maximum number of runs to return in a page', "100")
    .option('-P, --page [page]', 'The page number to return (starting from 0)', "0")
    .option('-f, --format [format]', 'The output format: json, jsonl or csv.', 'json')
    .option("-o, --output [file]", "The output file if any. If not specified it will print to stdout")
    .option("--before [date]", "Filter runs before the given date. The date must be in ISO format")
    .option("--after [date]", "Filter runs after the given date. The date must be in ISO format")
    .action((interactionId: string | undefined, options: Record<string, any>) => {
        runHistory(program, interactionId, options);
    });

const profilesRoot = program.command("profiles")
    .description("Manage configuration profiles")
    .action(() => {
        listProfiles();
    });

profilesRoot.command('show [name]')
    .description("Show the configured profiles or the profile with the given name")
    .action((name?: string) => {
        showProfile(name);
    });
profilesRoot.command('use [name]')
    .description("Switch to another configuration profile")
    .action((name) => {
        useProfile(name);
    });
profilesRoot.command('add [name]')
    .alias('create')
    .option("-t, --target <env>", "The target environment for the profile. Possible values are: local, dev, staging, prod or an URL for custom servers.")
    .description("Create a new configuration profile")
    .action((name?: string, options?: Record<string, any>) => {
        createProfile(name, options?.target);
    });
profilesRoot.command('edit [name]')
    .alias('update')
    .description("Edit an existing configuration profile")
    .action((name: string | undefined) => {
        updateProfile(name);
    });
profilesRoot.command('refresh')
    .description("Refresh token for the current configuration profile")
    .action(() => {
        updateCurrentProfile();
    });
profilesRoot.command('delete <name>')
    .description("delete an existing configuration profile")
    .action((name) => {
        deleteProfile(name);
    });
profilesRoot.command('file')
    .description("print the configuration file path")
    .action(() => {
        console.log(getConfigFile('profiles.json'));
    });

registerObjectsCommand(program);
registerWorkflowsCommand(program);

program.parse(process.argv);

process.on("unhandledRejection", (err: any) => {
    if (err.status === 401) { // token expired?
        tryRrefreshToken();
    }
})
