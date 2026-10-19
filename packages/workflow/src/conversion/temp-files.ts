import fs from 'node:fs';
import { log } from '@temporalio/activity';

/**
 * Remove temporary files, ignoring ones that are already gone. A failure is logged, never thrown,
 * so cleanup cannot mask the result or error of the conversion that created the files.
 */
export async function removeTempFiles(...files: string[]): Promise<void> {
    await Promise.all(
        files.map((file) =>
            fs.promises.rm(file, { force: true }).catch((err: unknown) => {
                log.warn('Failed to remove temporary file', { file, err });
            }),
        ),
    );
}
