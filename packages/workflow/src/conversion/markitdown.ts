import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { log } from '@temporalio/activity';
import tmp from 'tmp';
import { removeTempFiles } from './temp-files.js';

export async function markdownWithMarkitdown(buffer: Buffer, ext?: string): Promise<string> {
    const inputFile = tmp.tmpNameSync({ postfix: ext });
    const targetFileName = tmp.tmpNameSync({ postfix: '.md' });

    try {
        await fs.promises.writeFile(inputFile, buffer, { flag: 'wx', mode: 0o600 });
        return await new Promise((resolve, reject) => {
            const tool = 'markitdown';
            log.info(`Converting document to markdown with ${tool}`, { inputFile, targetFileName });

            const command = spawn(tool, [inputFile, '-o', targetFileName]);

            command.on('exit', (code) => {
                if (code) {
                    reject(new Error(`${tool} exited with code ${code}`));
                }
            });

            command.on('close', (code) => {
                if (code) {
                    reject(new Error(`${tool} exited with code ${code}`));
                } else {
                    return fs.readFile(targetFileName, 'utf8', (err, data) => {
                        if (err) {
                            reject(err);
                        }
                        return resolve(data);
                    });
                }
            });

            command.on('error', (err) => {
                reject(err);
            });
        });
    } finally {
        await removeTempFiles(inputFile, targetFileName);
    }
}
