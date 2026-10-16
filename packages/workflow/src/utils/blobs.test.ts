import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { VertesiaClient } from '@vertesia/client';
import tmp from 'tmp';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FileTooLargeError } from '../errors.js';
import { fetchBlobAsBuffer, saveBlobToTempFile } from './blobs.js';

vi.mock('tmp', () => ({
    default: {
        fileSync: vi.fn(),
        setGracefulCleanup: vi.fn(),
    },
}));

describe('saveBlobToTempFile', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should remove the temporary file when the blob download fails', async () => {
        const removeCallback = vi.fn();
        vi.mocked(tmp.fileSync).mockReturnValue({
            name: '/tmp/failed-download',
            fd: 1,
            removeCallback,
        });
        const downloadError = new Error('download failed');
        const client = {
            files: { downloadFile: vi.fn().mockRejectedValue(downloadError) },
        } as unknown as VertesiaClient;

        await expect(saveBlobToTempFile(client, 'gs://bucket/source')).rejects.toThrow('download failed');

        expect(removeCallback).toHaveBeenCalledOnce();
    });

    it('should preserve the download failure when temporary-file cleanup also fails', async () => {
        const downloadError = new Error('download failed');
        vi.mocked(tmp.fileSync).mockReturnValue({
            name: '/tmp/failed-download',
            fd: 1,
            removeCallback: vi.fn(() => {
                throw new Error('cleanup failed');
            }),
        });
        const client = {
            files: { downloadFile: vi.fn().mockRejectedValue(downloadError) },
        } as unknown as VertesiaClient;

        await expect(saveBlobToTempFile(client, 'gs://bucket/source')).rejects.toThrow(
            'Failed to download blob gs://bucket/source: download failed',
        );
    });
});

/** A blob download that yields `chunks`, and records whether the reader cancelled it. */
function blobClient(chunks: string[]) {
    const cancel = vi.fn();
    let next = 0;
    const stream = new ReadableStream<Uint8Array>({
        pull(controller) {
            if (next < chunks.length) {
                controller.enqueue(Buffer.from(chunks[next++]));
            } else {
                controller.close();
            }
        },
        cancel,
    });
    const client = { files: { downloadFile: vi.fn().mockResolvedValue(stream) } } as unknown as VertesiaClient;
    return { client, cancel };
}

describe('fetchBlobAsBuffer', () => {
    it('reads a blob within maxBytes', async () => {
        const { client } = blobClient(['hello ', 'world']);

        await expect(fetchBlobAsBuffer(client, 'gs://bucket/source', { maxBytes: 11 })).resolves.toEqual(
            Buffer.from('hello world'),
        );
    });

    it('stops the download of a blob larger than maxBytes', async () => {
        // Far more than the reader buffers ahead, so the download is still running when it goes over.
        const { client, cancel } = blobClient(Array(1000).fill('0123456789'));

        await expect(fetchBlobAsBuffer(client, 'gs://bucket/source', { maxBytes: 10 })).rejects.toBeInstanceOf(
            FileTooLargeError,
        );
        expect(cancel).toHaveBeenCalledOnce();
    });
});

describe('saveBlobToTempFile with maxBytes', () => {
    let dir: string;

    beforeEach(() => {
        vi.clearAllMocks();
        dir = fs.mkdtempSync(path.join(os.tmpdir(), 'blobs-test-'));
        const name = path.join(dir, 'download');
        vi.mocked(tmp.fileSync).mockReturnValue({
            name,
            fd: 1,
            removeCallback: () => fs.rmSync(name, { force: true }),
        });
    });

    afterEach(() => {
        fs.rmSync(dir, { recursive: true, force: true });
    });

    it('saves a blob within maxBytes', async () => {
        const { client } = blobClient(['hello ', 'world']);

        const file = await saveBlobToTempFile(client, 'gs://bucket/source', undefined, { maxBytes: 11 });

        expect(fs.readFileSync(file, 'utf8')).toBe('hello world');
    });

    it('stops the download of a blob larger than maxBytes and removes the partial file', async () => {
        // Far more than the reader buffers ahead, so the download is still running when it goes over.
        const { client, cancel } = blobClient(Array(1000).fill('0123456789'));

        await expect(
            saveBlobToTempFile(client, 'gs://bucket/source', undefined, { maxBytes: 10 }),
        ).rejects.toMatchObject({ type: 'FileTooLargeError', nonRetryable: true });
        await vi.waitFor(() => expect(cancel).toHaveBeenCalledOnce());
        expect(fs.readdirSync(dir)).toEqual([]);
    });
});
