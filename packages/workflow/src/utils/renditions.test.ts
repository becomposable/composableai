import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { log } from '@temporalio/activity';
import type { VertesiaClient } from '@vertesia/client';
import { ImageRenditionFormat } from '@vertesia/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { imageResizer } from '../conversion/image.js';
import { ImageConversionError } from '../errors.js';
import { uploadRenditionPages } from './renditions.js';

const activityState = vi.hoisted(() => ({ aborted: false }));

vi.mock('@temporalio/activity', () => ({
    Context: {
        current: () => ({ cancellationSignal: { aborted: activityState.aborted } }),
    },
    log: {
        debug: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
    },
}));

vi.mock('../conversion/image.js', () => ({ imageResizer: vi.fn() }));

describe('uploadRenditionPages', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        activityState.aborted = false;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should preserve a non-retryable image conversion failure', async () => {
        const conversionError = new ImageConversionError('invalid image data');
        vi.mocked(imageResizer).mockRejectedValue(conversionError);
        const client = { files: { uploadFile: vi.fn() } } as unknown as VertesiaClient;

        await expect(
            uploadRenditionPages(client, 'etag', ['/tmp/input'], {
                format: ImageRenditionFormat.jpeg,
                max_hw: 256,
            }),
        ).rejects.toBe(conversionError);

        expect(client.files.uploadFile).not.toHaveBeenCalled();
    });

    it('should preserve an upload failure and clean the resized image', async () => {
        const resizedImagePath = fileURLToPath(import.meta.url);
        const uploadError = new Error('upload failed');
        const unlinkSpy = vi.spyOn(fs, 'unlinkSync').mockImplementation(() => undefined);
        vi.mocked(imageResizer).mockResolvedValue(resizedImagePath);
        const client = {
            files: { uploadFile: vi.fn().mockRejectedValue(uploadError) },
        } as unknown as VertesiaClient;

        await expect(
            uploadRenditionPages(client, 'etag', ['/tmp/input'], {
                format: ImageRenditionFormat.jpeg,
                max_hw: 256,
            }),
        ).rejects.toBe(uploadError);

        expect(unlinkSpy).toHaveBeenCalledWith(resizedImagePath);
        expect(log.error).toHaveBeenCalledWith('Failed to upload rendition for etag page 0', { error: uploadError });
    });

    it('should log an upload aborted by a stopping activity at info, not error', async () => {
        activityState.aborted = true;
        const shutdownError = new Error('Failed to connect to server: WORKER_SHUTDOWN');
        vi.spyOn(fs, 'unlinkSync').mockImplementation(() => undefined);
        vi.mocked(imageResizer).mockResolvedValue(fileURLToPath(import.meta.url));
        const client = {
            files: { uploadFile: vi.fn().mockRejectedValue(shutdownError) },
        } as unknown as VertesiaClient;

        await expect(
            uploadRenditionPages(client, 'etag', ['/tmp/input'], {
                format: ImageRenditionFormat.jpeg,
                max_hw: 256,
            }),
        ).rejects.toBe(shutdownError);

        expect(log.error).not.toHaveBeenCalled();
        expect(log.info).toHaveBeenCalledWith(
            'Rendition upload for etag page 0 interrupted: the activity is stopping',
            { error: shutdownError },
        );
    });
});
