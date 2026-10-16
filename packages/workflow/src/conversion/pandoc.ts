import { spawn } from 'node:child_process';
import { PassThrough } from 'node:stream';
import { log } from '@temporalio/activity';

/**
 * Convert a document to markdown with pandoc
 *
 * @param file the document, or the path of a document file, which avoids holding a large document in memory
 * @param fromFormat the pandoc input format of the document
 */
export function markdownWithPandoc(file: Buffer | string, fromFormat: string): Promise<string> {
    return new Promise((resolve, reject) => {
        log.info(`Converting ${fromFormat} to markdown`);

        const result: string[] = [];

        const args = ['-t', 'markdown', '-f', fromFormat];
        if (typeof file === 'string') {
            args.push(file);
        }
        const command = spawn('pandoc', args, {
            stdio: 'pipe',
        });
        if (typeof file === 'string') {
            command.stdin.end();
        } else {
            const input = new PassThrough();
            input.end(file);
            input.pipe(command.stdin);
        }

        command.stdout.on('data', (data: string) => {
            result.push(data.toString());
        });
        command.on('exit', (code) => {
            if (code) {
                reject(new Error(`pandoc exited with code ${code}`));
            }
        });
        command.on('close', (code) => {
            if (code) {
                reject(new Error(`pandoc exited with code ${code}`));
            } else {
                resolve(result.join(''));
            }
        });

        command.on('error', (err) => {
            reject(err);
        });
    });
}
