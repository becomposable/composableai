import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { log } from '@temporalio/activity';
import tmp from 'tmp';

/**
 * Write `input` to a temporary file, run `tool` with the arguments built by `args(inputFile, outputFile)`, and
 * return the output file's text. Both temporary files are removed whatever the outcome.
 *
 * @param inputExt extension of the input file, with or without the leading dot (e.g. `docx`)
 * @param outputExt extension of the output file, with or without the leading dot (e.g. `md`)
 */
export async function convertWithTool(
    tool: string,
    input: Buffer,
    inputExt: string | undefined,
    outputExt: string,
    args: (inputFile: string, outputFile: string) => string[],
): Promise<string> {
    const inputFile = tmp.tmpNameSync({ postfix: toPostfix(inputExt) });
    const outputFile = tmp.tmpNameSync({ postfix: toPostfix(outputExt) });

    try {
        await fs.promises.writeFile(inputFile, input, { flag: 'wx', mode: 0o600 });
        log.info(`Converting with ${tool}`, { inputFile, outputFile });
        await runTool(tool, args(inputFile, outputFile));
        return await fs.promises.readFile(outputFile, 'utf8');
    } finally {
        await removeTempFiles(inputFile, outputFile);
    }
}

/**
 * Remove temporary files, ignoring ones that are already gone. A failure is logged, never thrown,
 * so cleanup cannot mask the result or error of the conversion that created the files.
 */
export async function removeTempFiles(...files: string[]): Promise<void> {
    await Promise.all(
        files.map((file) =>
            fs.promises.rm(file, { force: true, recursive: true }).catch((err: unknown) => {
                log.warn('Failed to remove temporary file', { file, err });
            }),
        ),
    );
}

function runTool(tool: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
        const command = spawn(tool, args);
        command.on('error', reject);
        command.on('close', (code, signal) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`${tool} exited with code ${code ?? signal}`));
            }
        });
    });
}

function toPostfix(ext: string | undefined): string {
    return ext ? `.${ext.replace(/^\./, '')}` : '';
}
