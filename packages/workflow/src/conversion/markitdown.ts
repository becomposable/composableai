import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { log } from '@temporalio/activity';
import tmp from 'tmp';

/**
 * Convert a document to markdown with markitdown
 *
 * @param file the document, or the path of a document file, which avoids holding a large document in memory
 * @param ext the extension of the document, used when it is given as a Buffer
 */
export function markdownWithMarkitdown(file: Buffer | string, ext?: string): Promise<string> {
    let inputFileName: string;
    if (typeof file === 'string') {
        inputFileName = file;
    } else {
        const inputFile = tmp.fileSync({ postfix: ext });
        fs.writeSync(inputFile.fd, file);
        inputFileName = inputFile.name;
    }
    const targetFileName = tmp.tmpNameSync({ postfix: '.md' });

    return new Promise((resolve, reject) => {
        const tool = 'markitdown';
        log.info(`Converting document to markdown with ${tool}`, { inputFile: inputFileName, targetFileName });

        const command = spawn(tool, [inputFileName, '-o', targetFileName]);

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
}
