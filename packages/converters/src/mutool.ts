import { spawn } from 'node:child_process';
import { readFile, rm, writeFile } from 'node:fs/promises';
import tmp from 'tmp';

tmp.setGracefulCleanup();

export function pdfFileToText(input: string, output: string) {
    return new Promise((resolve, reject) => {
        const command = spawn('mutool', ['convert', '-o', output, input]);

        command.on('exit', (code) => {
            if (code) {
                reject(new Error(`mutool exited with code ${code}`));
            }
        });

        command.on('close', (code) => {
            if (code) {
                reject(new Error(`mutool exited with code ${code}`));
            } else {
                return resolve(output);
            }
        });

        command.on('error', (err) => {
            reject(err);
        });
    });
}
export function pdfToText(buffer: Buffer): Promise<string> {
    return pdfToTextBuffer(buffer).then((buffer) => buffer.toString('utf-8'));
}
export async function pdfToTextBuffer(buffer: Buffer): Promise<Buffer> {
    const inputFile = tmp.tmpNameSync({ postfix: '.pdf' });
    const targetFileName = tmp.tmpNameSync({ postfix: '.txt' });

    try {
        await writeFile(inputFile, buffer, { flag: 'wx', mode: 0o600 });
        await pdfFileToText(inputFile, targetFileName);
        return await readFile(targetFileName);
    } finally {
        // Ignore cleanup failures so they cannot replace the conversion's result or error.
        await Promise.all([inputFile, targetFileName].map((file) => rm(file, { force: true }).catch(() => undefined)));
    }
}
