import { program } from 'commander';
import { BuildOptions } from '@becomposable/memory';
import MemoApp from './MemoApp.js';

program.version("1.0.0")
    .option('-i, --indent <spaces>', 'The number of spaces to indent the JSON result. No identation is done by default.')
    .option('-q, --quiet', 'Do not log anything to the console.')
    .option('-o, --out <file>', 'The output file. Defaults to "memo.json" or "memo.tar" if media files are included.')
    .argument('<recipe>', 'The recipe script to build the memo from.')
    .action((arg: string, options: Record<string, any>) => {
        if (options.indent) {
            options.indent = parseInt(options.indent);
        }
        return MemoApp.run(arg, options as BuildOptions);
    })
program.parse();
