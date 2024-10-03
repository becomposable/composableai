import { BuildOptions } from '@becomposable/memory';
import { build } from '@becomposable/memory-commands';
import { Command } from 'commander';

export function setupMemoCommand(command: Command, publish?: (file: string, name: string) => Promise<string>) {
    return command.allowUnknownOption()
        .option('-i, --indent <spaces>', 'The number of spaces to indent the JSON result. No identation is done by default.')
        .option('-q, --quiet', 'Do not log anything to the console.')
        .option('-z, --gzip', 'Compress the output file using gzip.')
        .option('-o, --out <file>', 'The output file. Defaults to "memo.json" or "memo.tar" if media files are included.')
        .argument('<recipe>', 'The recipe script to build the memo from.')
        .action((_arg: string, options: Record<string, any>, command: Command) => {
            memoAction(command, { ...options, publish });
        })
}

function memoAction(command: Command, options: Record<string, any>) {
    const { script, vars } = parseArgs(command.args);
    if (options.indent) {
        options.indent = parseInt(options.indent);
    }
    return build(script!, { ...options, vars } as BuildOptions);
}

/**
 * We take all --var-xxx options and return them as an object to be passed as the `vars` variable to the script
 * @param args
 */
function parseArgs(args: string[]) {
    if (!args.length) {
        console.error("No recipe script was provided.");
        process.exit(1);
    }
    let script: string | undefined;
    const vars: Record<string, any> = {};
    let lastKey: string | undefined;
    let lastCommitedOption: string | undefined;
    for (const arg of args) {
        if (arg.startsWith('--var-')) {
            if (lastKey) {
                vars[lastKey] = true;
            }
            lastKey = arg.substring(6);
        } else if (lastKey) {
            vars[lastKey] = arg;
            lastCommitedOption = lastKey;
            lastKey = undefined;
        } else if (script) {
            console.error(`Ambigous command line arguments. Multiple recipe scripts found: ${script}, ${arg}`);
            process.exit(1);
        } else {
            script = arg;
        }
    }
    if (!script) {
        if (!lastCommitedOption) {
            console.error("Ambigous command line arguments. No recipe script was found.");
            process.exit(1);
        } else {
            script = vars[lastCommitedOption];
            vars[lastCommitedOption] = true;
        }
    }
    return { script, vars };
}