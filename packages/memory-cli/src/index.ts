import { program, Command } from 'commander';
import { BuildOptions } from '@becomposable/memory';
import MemoApp from './MemoApp.js';

program.version("1.0.0")
    .allowUnknownOption()
    .option('-i, --indent <spaces>', 'The number of spaces to indent the JSON result. No identation is done by default.')
    .option('-q, --quiet', 'Do not log anything to the console.')
    .option('-z, --gzip', 'Compress the output file using gzip.')
    .option('-o, --out <file>', 'The output file. Defaults to "memo.json" or "memo.tar" if media files are included.')
    .argument('<recipe>', 'The recipe script to build the memo from.')
    .action((_arg: string, options: Record<string, any>, command: Command) => {
        const { script, vars } = parseArgs(command.args);
        if (options.indent) {
            options.indent = parseInt(options.indent);
        }
        return MemoApp.run(script!, { ...options, vars } as BuildOptions);
    })
program.parse();

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