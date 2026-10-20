import fs from 'node:fs';
import { rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { VertesiaClient } from '@vertesia/client';
import tmp from 'tmp';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { saveBlobToTempFile } from './blobs.js';

// Pass-through, so a test can make the cleanup of a failed download fail.
vi.mock('node:fs/promises', async (importOriginal) => {
    const actual = await importOriginal<typeof import('node:fs/promises')>();
    return { ...actual, rm: vi.fn(actual.rm) };
});

function clientReturning(content: string): VertesiaClient {
    return {
        files: { downloadFile: vi.fn(async () => new Blob([content]).stream()) },
    } as unknown as VertesiaClient;
}

function openDescriptorCount(): number {
    // /dev/fd lists this process's open descriptors on both Linux and macOS.
    return fs.readdirSync('/dev/fd').length;
}

describe('saveBlobToTempFile', () => {
    let tempDir: string;

    beforeEach(() => {
        tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'blobs-test-')));
        vi.stubEnv('TMPDIR', tempDir);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllEnvs();
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('should write the blob to a new file with the requested extension', async () => {
        const file = await saveBlobToTempFile(clientReturning('blob contents'), 'gs://bucket/source', 'pdf');

        expect(path.dirname(file)).toBe(tempDir);
        expect(path.basename(file)).toMatch(/^vertesia-activity-.*\.pdf$/);
        expect(fs.readFileSync(file, 'utf8')).toBe('blob contents');
    });

    it('should accept an extension given with its leading dot', async () => {
        const file = await saveBlobToTempFile(clientReturning('blob contents'), 'gs://bucket/source', '.pdf');

        expect(path.basename(file)).toMatch(/[^.]\.pdf$/);
    });

    it('should not remove an existing file it failed to create', async () => {
        const existing = path.join(tempDir, 'vertesia-activity-existing.pdf');
        fs.writeFileSync(existing, 'someone else');
        vi.spyOn(tmp, 'tmpNameSync').mockReturnValueOnce(existing);
        const client = clientReturning('blob contents');

        await expect(saveBlobToTempFile(client, 'gs://bucket/source', 'pdf')).rejects.toThrow('EEXIST');

        expect(fs.readFileSync(existing, 'utf8')).toBe('someone else');
        expect(client.files.downloadFile).not.toHaveBeenCalled();
    });

    it('should leave no descriptor open after it returns', async () => {
        const client = clientReturning('blob contents');
        const before = openDescriptorCount();

        const files: string[] = [];
        for (let i = 0; i < 20; i++) {
            files.push(await saveBlobToTempFile(client, 'gs://bucket/source'));
        }

        expect(openDescriptorCount()).toBe(before);
        for (const file of files) {
            fs.rmSync(file);
        }
        expect(fs.readdirSync(tempDir)).toEqual([]);
    });

    it('should leave no file or descriptor behind when the blob download fails', async () => {
        const client = {
            files: { downloadFile: vi.fn().mockRejectedValue(new Error('download failed')) },
        } as unknown as VertesiaClient;
        const before = openDescriptorCount();

        await expect(saveBlobToTempFile(client, 'gs://bucket/source')).rejects.toThrow(
            'Failed to download blob gs://bucket/source: download failed',
        );

        expect(openDescriptorCount()).toBe(before);
        expect(fs.readdirSync(tempDir)).toEqual([]);
    });

    it('should preserve the download failure when removing the file also fails', async () => {
        const client = {
            files: { downloadFile: vi.fn().mockRejectedValue(new Error('download failed')) },
        } as unknown as VertesiaClient;
        vi.mocked(rm).mockRejectedValueOnce(new Error('cleanup failed'));

        await expect(saveBlobToTempFile(client, 'gs://bucket/source')).rejects.toThrow(
            'Failed to download blob gs://bucket/source: download failed',
        );
    });

    it('should remove the partial file when the blob stream fails mid-download', async () => {
        const client = {
            files: {
                downloadFile: vi.fn(
                    async () =>
                        new ReadableStream<Uint8Array>({
                            start(controller) {
                                controller.enqueue(new TextEncoder().encode('partial'));
                                controller.error(new Error('stream broke'));
                            },
                        }),
                ),
            },
        } as unknown as VertesiaClient;
        const before = openDescriptorCount();

        await expect(saveBlobToTempFile(client, 'gs://bucket/source')).rejects.toThrow('stream broke');

        expect(openDescriptorCount()).toBe(before);
        expect(fs.readdirSync(tempDir)).toEqual([]);
    });
});
