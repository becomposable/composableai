import os from 'node:os';
import path from 'node:path';
import { log } from '@temporalio/activity';
import { MockActivityEnvironment } from '@temporalio/testing';
import { describe, expect, it, vi } from 'vitest';
import { setupActivity } from '../../dsl/setup/ActivityContext.js';
import { saveBlobToTempFile } from '../../utils/blobs.js';
import { execActivityFile } from './exec.js';
import { prepareVideo, resolveVideoPreset, shouldTranscodeVideo } from './prepareVideo.js';

vi.mock('@temporalio/activity', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@temporalio/activity')>()),
    log: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock('../../dsl/setup/ActivityContext.js', () => ({ setupActivity: vi.fn() }));
vi.mock('../../utils/blobs.js', () => ({ saveBlobToTempFile: vi.fn() }));
vi.mock('./exec.js', async (importOriginal) => ({
    ...(await importOriginal<typeof import('./exec.js')>()),
    execActivityFile: vi.fn(),
}));

describe('prepareVideo', () => {
    it('fails an audio-only file with UnusableVideoContent and no error log', async () => {
        vi.mocked(setupActivity).mockResolvedValue({
            client: {
                objects: {
                    retrieve: vi.fn().mockResolvedValue({
                        id: 'obj-1',
                        content: { source: 'gs://bucket/audio-only.mp4', type: 'video/mp4' },
                    }),
                },
            },
            objectId: 'obj-1',
            params: {},
        } as unknown as Awaited<ReturnType<typeof setupActivity>>);
        vi.mocked(saveBlobToTempFile).mockResolvedValue(path.join(os.tmpdir(), 'missing-audio-only.mp4'));
        vi.mocked(execActivityFile).mockResolvedValue({
            stdout: JSON.stringify({ streams: [{ codec_type: 'audio' }], format: { duration: '12' } }),
            stderr: '',
        } as Awaited<ReturnType<typeof execActivityFile>>);

        const failure = await new MockActivityEnvironment()
            .run(prepareVideo, {} as Parameters<typeof prepareVideo>[0])
            .catch((error: unknown) => error);

        expect(failure).toMatchObject({
            message: 'No video stream found in file',
            type: 'UnusableVideoContent',
            nonRetryable: true,
        });
        expect(log.warn).toHaveBeenCalledWith('Failed to get video metadata: No video stream found in file');
        expect(log.error).not.toHaveBeenCalled();
    });
});

describe('shouldTranscodeVideo', () => {
    it('transcodes by default', () => {
        expect(shouldTranscodeVideo()).toBe(true);
        expect(shouldTranscodeVideo(false)).toBe(true);
    });

    it('skips transcoding when explicitly requested', () => {
        expect(shouldTranscodeVideo(true)).toBe(false);
    });
});

describe('resolveVideoPreset', () => {
    it.each([
        { preset: 'medium', attempt: 1, expected: 'medium' },
        { preset: 'medium', attempt: 2, expected: 'fast' },
        { preset: 'medium', attempt: 3, expected: 'veryfast' },
        { preset: 'medium', attempt: 5, expected: 'veryfast' },
        { preset: 'fast', attempt: 1, expected: 'fast' },
        { preset: 'fast', attempt: 2, expected: 'veryfast' },
        { preset: 'ultrafast', attempt: 2, expected: 'ultrafast' },
    ] as const)('uses $expected for $preset on attempt $attempt', ({ preset, attempt, expected }) => {
        expect(resolveVideoPreset(preset, attempt)).toBe(expected);
    });
});
