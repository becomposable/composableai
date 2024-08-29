import { spawnSync } from 'child_process'
import { splitCommandLine } from './cmdline.js';

export interface ExecOptions {
    sync?: boolean;
    quiet?: boolean;
}

export function exec(command: string, options: ExecOptions = {}) {
    const verbose = !options.quiet;
    command = command.trim();
    const args = splitCommandLine(command);
    command = args.shift() as string;
    if (!command) {
        throw new Error('Invalid command line. No command: ' + command);
    }


    verbose && console.log(`Running: ${command} ${args?.join(' ')}`);

    const r = spawnSync(command, args, {
        stdio: ['inherit', 'inherit', 'inherit'],
    })
    if (r.status) {
        verbose && console.log(`Command: ${command} ${args?.join(' ')} exited with status ${r.status}`);
        process.exit(r.status);
    }
}
