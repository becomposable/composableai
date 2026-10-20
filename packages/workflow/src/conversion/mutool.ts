import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { log } from '@temporalio/activity';
import tmp from 'tmp';
import { convertWithTool, removeTempFiles } from './convert-with-tool.js';

/**
 * Convert a pdf file to text
 * TODO: pass file reference instead of Buffer
 */
export function mutoolPdfToText(buffer: Buffer): Promise<string> {
    return convertWithTool('mutool', buffer, 'pdf', 'txt', (inputFile, outputFile) => [
        'convert',
        '-o',
        outputFile,
        inputFile,
    ]);
}

/**
 *
 * Convert a pdf files to images (one image per page), as PNG format
 *
 * @param file
 * @param pages
 * @returns
 */
export async function pdfToImages(file: Buffer | string, pages?: number[]): Promise<string[]> {
    const workDir = tmp.dirSync();
    try {
        log.info(`Converting pdf to images`, { workDir: workDir.name, input_type: typeof file, pages });

        if (file instanceof Buffer) {
            fs.writeFileSync(`${workDir.name}/input.pdf`, file);
        }
        const filename = typeof file === 'string' ? file : `${workDir.name}/input.pdf`;

        const args = ['draw', '-o', `${workDir.name}/page-%d.png`, filename];

        if (pages) {
            args.push(pages.join(','));
        }

        return await new Promise((resolve, reject) => {
            const command = spawn('mutool', args);
            log.info(`Executing mutool command`, { workDir: workDir.name, filename, command: command.spawnargs });

            let errors = '';

            command.stderr.on('data', (data) => {
                errors += data;
            });

            command.on('exit', (code) => {
                if (code) {
                    log.error(`mutool exited with code ${code}`, { errors });
                    reject(new Error(`mutool exited with code ${code}`));
                }
            });

            command.on('close', (code) => {
                if (code) {
                    reject(new Error(`mutool finished with code ${code}`));
                } else {
                    const files = fs.readdirSync(workDir.name);
                    const images = files.filter((f) => f.endsWith('.png')).map((f) => `${workDir.name}/${f}`);
                    log.info(`Converted pdf to ${images.length} images`, files);
                    return resolve(images);
                }
            });

            command.on('error', (err) => {
                reject(err);
            });
        });
    } catch (err: unknown) {
        // On success the caller owns the work directory and the files returned from it.
        await removeTempFiles(workDir.name);
        throw err;
    }
}

/**
 * Get some pages from a PDF to create a new one
 */

export async function pdfExtractPages(file: Buffer | string, pages: number[]): Promise<string> {
    const workDir = tmp.dirSync();
    try {
        log.info(`Getting pages from pdf`, { workDir: workDir.name, input_type: typeof file, pages });

        if (file instanceof Buffer) {
            fs.writeFileSync(`${workDir.name}/input.pdf`, file);
        }
        const filename = typeof file === 'string' ? file : `${workDir.name}/input.pdf`;

        const args = [
            'merge',
            '-o',
            `${workDir.name}/output.pdf`,
            '-O',
            'garbage=compact,sanitize',
            filename,
            pages.join(','),
        ];

        return await new Promise((resolve, reject) => {
            const command = spawn('mutool', args);
            log.info(`Executing mutool command`, { workDir: workDir.name, filename, command: command.spawnargs });

            let errors = '';

            command.stderr.on('data', (data) => {
                errors += data;
            });

            command.on('exit', (code) => {
                if (code) {
                    log.error(`mutool exited with code ${code}`, { errors });
                    reject(new Error(`mutool exited with code ${code}`));
                }
            });

            command.on('close', (code) => {
                if (code) {
                    reject(new Error(`mutool finished with code ${code}`));
                } else {
                    const file = `${workDir.name}/output.pdf`;
                    log.info(`Extracted pages from pdf`, { pages, file });
                    return resolve(file);
                }
            });

            command.on('error', (err) => {
                reject(err);
            });
        });
    } catch (err: unknown) {
        // On success the caller owns the work directory and the files returned from it.
        await removeTempFiles(workDir.name);
        throw err;
    }
}
