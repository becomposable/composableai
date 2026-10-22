import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { log } from '@temporalio/activity';
import { MockActivityEnvironment } from '@temporalio/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupActivity } from '../../dsl/setup/ActivityContext.js';
import { saveBlobToTempFile } from '../../utils/blobs.js';
import { execActivityFile, execActivityFileWithProgress } from './exec.js';
import {
    buildWebRenditionArgs,
    type PrepareVideoResult,
    prepareVideo,
    resolveVideoPreset,
    shouldTranscodeVideo,
} from './prepareVideo.js';
import {
    buildAudioCopyArgs,
    isAudioCopyEligible,
    isAudioDurationComplete,
    resolvePlaybackDuration,
    type VideoMetadataExtended,
} from './video.js';
import { HTTP_INPUT_OPTIONS } from './videoSource.js';

vi.mock('@temporalio/activity', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@temporalio/activity')>()),
    log: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock('../../dsl/setup/ActivityContext.js', () => ({ setupActivity: vi.fn() }));
vi.mock('../../utils/blobs.js', () => ({ saveBlobToTempFile: vi.fn() }));
vi.mock('./exec.js', async (importOriginal) => ({
    ...(await importOriginal<typeof import('./exec.js')>()),
    execActivityFile: vi.fn(),
    execActivityFileWithProgress: vi.fn(),
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

describe('buildWebRenditionArgs', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('sizes decoding before the input and the libx264 encoder after it', () => {
        vi.spyOn(os, 'availableParallelism').mockReturnValue(4);

        const args = buildWebRenditionArgs('in.mov', 'out.mp4', { width: 1920, height: 1080 }, 'medium');

        const inputIndex = args.indexOf('-i');
        expect(args.slice(1, inputIndex)).toEqual(['-filter_threads', '4', '-threads', '4']);
        const encoderIndex = args.indexOf('libx264');
        expect(args.slice(encoderIndex + 1, encoderIndex + 3)).toEqual(['-threads', '6']);
        expect(args.at(-1)).toBe('out.mp4');
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
    it('defaults to veryfast', () => {
        expect(resolveVideoPreset()).toBe('veryfast');
    });

    it.each(['medium', 'fast', 'veryfast', 'ultrafast'] as const)('keeps the requested %s preset', (preset) => {
        expect(resolveVideoPreset(preset)).toBe(preset);
    });

    it('rejects an unknown preset without retrying', () => {
        expect(() => resolveVideoPreset('slow')).toThrow(
            expect.objectContaining({ type: 'InvalidVideoPreset', nonRetryable: true }),
        );
    });
});

describe('prepareVideo audio rendition', () => {
    const SIGNED_URL = 'https://storage.example.com/bucket/video.mp4?X-Signature=secret';
    const downloaded = path.join(os.tmpdir(), 'prepare-video-test-source.mp4');

    function sourceProbe(audio: { codec_name: string; channels: number }) {
        return JSON.stringify({
            streams: [
                { codec_type: 'video', codec_name: 'h264', width: 1920, height: 1080, r_frame_rate: '30/1' },
                { codec_type: 'audio', duration: '300.0', ...audio },
            ],
            format: { duration: '300.0', bit_rate: '6000000', format_name: 'mov,mp4,m4a,3gp,3g2,mj2' },
        });
    }

    /** Fake ffprobe and ffmpeg: probes return `probe` or `copiedDuration`, and ffmpeg writes its output file. */
    /** Fake ffmpeg: write the output file named by the last argument. */
    const writeOutput = (args: string[]) => {
        fs.writeFileSync(args[args.length - 1], 'media');
        return Promise.resolve({ stdout: '', stderr: '' });
    };

    function setup(probe: string, copiedDuration = '300.0', skipTranscode = true, renditionAudioDuration = '300.0') {
        vi.mocked(setupActivity).mockResolvedValue({
            client: {
                files: {
                    getDownloadUrl: vi.fn().mockResolvedValue({ url: SIGNED_URL }),
                    uploadFile: vi.fn().mockResolvedValue('gs://bucket/rendition'),
                },
                objects: {
                    retrieve: vi.fn().mockResolvedValue({
                        id: 'obj-1',
                        content: { source: 'gs://bucket/video.mp4', type: 'video/mp4', etag: 'etag-1' },
                    }),
                    update: vi.fn().mockResolvedValue({}),
                },
            },
            objectId: 'obj-1',
            params: { skipTranscode },
        } as unknown as Awaited<ReturnType<typeof setupActivity>>);
        vi.mocked(saveBlobToTempFile).mockResolvedValue(downloaded);
        vi.mocked(execActivityFile).mockImplementation((command, args) => {
            if (command === 'ffprobe') {
                return Promise.resolve({
                    stdout: args.includes('format=duration')
                        ? copiedDuration
                        : args.includes('stream=duration')
                          ? renditionAudioDuration
                          : probe,
                    stderr: '',
                });
            }
            return writeOutput(args);
        });
        vi.mocked(execActivityFileWithProgress).mockImplementation((_command, args) => writeOutput(args));
    }

    const run = (): Promise<PrepareVideoResult> =>
        new MockActivityEnvironment().run(prepareVideo, {} as Parameters<typeof prepareVideo>[0]);
    const audioCommands = () => vi.mocked(execActivityFileWithProgress).mock.calls.map(([, args]) => args);
    const successLog = () =>
        vi
            .mocked(log.info)
            .mock.calls.find(([message]) => String(message).startsWith('Successfully prepared video'))?.[1];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('copies an AAC track over the signed URL without downloading or encoding', async () => {
        setup(sourceProbe({ codec_name: 'aac', channels: 2 }));

        const result = await run();

        expect(result.renditions.map((rendition) => rendition.name)).toContain('Audio');
        expect(saveBlobToTempFile).not.toHaveBeenCalled();
        expect(audioCommands()).toHaveLength(1);
        expect(audioCommands()[0]).toEqual(expect.arrayContaining(['-xerror', '-c:a', 'copy', SIGNED_URL]));
        expect(successLog()).toMatchObject({
            audioRendition: 'copy',
            audioCodec: 'aac',
            audioChannels: 2,
            audioStreams: 1,
            container: 'mov,mp4,m4a,3gp,3g2,mj2',
        });
        expect(JSON.stringify(vi.mocked(log.debug).mock.calls)).not.toContain('secret');
    });

    it.each(['aac', 'pcm_s16le'])('copies audio from the video rendition for a %s source', async (codec) => {
        setup(sourceProbe({ codec_name: codec, channels: 2 }), '300.0', false);

        const result = await run();
        const [transcode, copy] = audioCommands();

        expect(result.renditions.map((rendition) => rendition.name)).toContain('Audio');
        expect(audioCommands()).toHaveLength(2);
        expect(transcode).toEqual(expect.arrayContaining(['-i', downloaded, '-c:a', 'aac']));
        expect(copy).toEqual(expect.arrayContaining(['-i', transcode.at(-1), '-c:a', 'copy']));
        expect(copy).not.toContain(downloaded);
        expect(copy).not.toContain(SIGNED_URL);
        expect(saveBlobToTempFile).toHaveBeenCalledTimes(1);
        expect(successLog()).toMatchObject({ audioRendition: 'copy' });
    });

    it('uses the original source when the video transcode fails', async () => {
        setup(sourceProbe({ codec_name: 'aac', channels: 2 }), '300.0', false);
        vi.mocked(execActivityFileWithProgress).mockImplementation((_command, args) => {
            if (args.includes('libx264')) {
                return Promise.reject(new Error('Video encoder failed'));
            }
            return writeOutput(args);
        });

        const result = await run();

        expect(result.renditions.map((rendition) => rendition.name)).toContain('Audio');
        expect(audioCommands()).toHaveLength(2);
        expect(audioCommands()[1]).toEqual(expect.arrayContaining(['-i', downloaded, '-c:a', 'copy']));
        expect(saveBlobToTempFile).toHaveBeenCalledTimes(1);
    });

    it.each(['failed', 'truncated'])('encodes the source when the rendition audio copy is %s', async (failure) => {
        setup(sourceProbe({ codec_name: 'pcm_s16le', channels: 2 }), failure === 'truncated' ? '78.3' : '300', false);
        vi.mocked(execActivityFileWithProgress).mockImplementation((_command, args) => {
            if (failure === 'failed' && args.includes('copy')) {
                return Promise.reject(new Error('Audio copy failed'));
            }
            return writeOutput(args);
        });

        await run();

        const [transcode, copy, encode] = audioCommands();
        expect(audioCommands()).toHaveLength(3);
        expect(copy).toEqual(expect.arrayContaining(['-i', transcode.at(-1), '-c:a', 'copy']));
        expect(encode).toEqual(expect.arrayContaining(['-i', downloaded, '-c:a', 'aac']));
        expect(saveBlobToTempFile).toHaveBeenCalledTimes(1);
        expect(successLog()).toMatchObject({ audioRendition: 'encode' });
    });

    it('propagates a stopped rendition audio copy without encoding the source', async () => {
        setup(sourceProbe({ codec_name: 'aac', channels: 2 }), '300.0', false);
        const stopped = Object.assign(new Error('Audio copy stopped'), { killed: true });
        vi.mocked(execActivityFileWithProgress).mockImplementation((_command, args) => {
            if (args.includes('copy')) {
                return Promise.reject(stopped);
            }
            return writeOutput(args);
        });

        await expect(run()).rejects.toBe(stopped);

        expect(audioCommands()).toHaveLength(2);
    });

    it.each([
        { case: 'duration', streams: [{ codec_type: 'video' }] },
        { case: 'video stream', streams: [] },
    ])('retries locally when the URL probe omits the $case', async ({ streams }) => {
        setup(sourceProbe({ codec_name: 'aac', channels: 2 }));
        vi.mocked(execActivityFile).mockResolvedValueOnce({
            stdout: JSON.stringify({ streams, format: {} }),
            stderr: '',
        });

        const result = await run();

        expect(result.metadata.duration).toBe(300);
        expect(saveBlobToTempFile).toHaveBeenCalledTimes(1);
        const probes = vi.mocked(execActivityFile).mock.calls.filter(([command]) => command === 'ffprobe');
        expect(probes[0][1].at(-1)).toBe(SIGNED_URL);
        expect(probes[1][1].at(-1)).toBe(downloaded);
    });

    it('encodes from a download when the copy comes out truncated', async () => {
        setup(sourceProbe({ codec_name: 'aac', channels: 2 }), '78.3');

        await run();

        expect(saveBlobToTempFile).toHaveBeenCalledTimes(1);
        expect(audioCommands()[1]).toEqual(expect.arrayContaining(['-i', downloaded, '-c:a', 'aac']));
        expect(log.warn).toHaveBeenCalledWith('Copied audio track is incomplete; encoding it from a download instead', {
            actual: 78.3,
            expected: 300,
        });
        expect(successLog()).toMatchObject({ audioRendition: 'encode' });
        expect(log.error).not.toHaveBeenCalled();
    });

    it('encodes from a download when the copy fails', async () => {
        setup(sourceProbe({ codec_name: 'aac', channels: 2 }));
        vi.mocked(execActivityFileWithProgress).mockImplementation((_command, args) => {
            if (args.includes(SIGNED_URL)) {
                return Promise.reject(new Error(`Error during demuxing: Input/output error for ${SIGNED_URL}`));
            }
            return writeOutput(args);
        });

        await run();

        expect(saveBlobToTempFile).toHaveBeenCalledTimes(1);
        expect(successLog()).toMatchObject({ audioRendition: 'encode' });
        expect(JSON.stringify(vi.mocked(log.warn).mock.calls)).not.toContain('secret');
    });

    it('encodes from a download without trying a copy when the track is not AAC', async () => {
        setup(sourceProbe({ codec_name: 'pcm_s16le', channels: 2 }));

        await run();

        expect(audioCommands()).toEqual([expect.arrayContaining(['-i', downloaded, '-c:a', 'aac'])]);
        expect(successLog()).toMatchObject({ audioRendition: 'encode', audioCodec: 'pcm_s16le' });
    });

    describe('reference duration for a copy from the rendition', () => {
        // Two tracks: the transcode may pick the 6-channel 120 s one, not the first, 300 s one.
        const multiTrackProbe = JSON.stringify({
            streams: [
                { codec_type: 'video', codec_name: 'h264', width: 1920, height: 1080, r_frame_rate: '30/1' },
                { codec_type: 'audio', codec_name: 'aac', channels: 2, duration: '300.0' },
                { codec_type: 'audio', codec_name: 'aac', channels: 6, duration: '120.0' },
            ],
            format: { duration: '300.0', format_name: 'mov,mp4,m4a,3gp,3g2,mj2' },
        });

        it('accepts a complete copy of the track the transcode chose, though shorter than the first source track', async () => {
            setup(multiTrackProbe, '120.0', false, '120.0');

            await run();

            expect(successLog()).toMatchObject({ audioRendition: 'copy' });
        });

        it('rejects a copy shorter than the rendition track', async () => {
            setup(multiTrackProbe, '60.0', false, '120.0');

            await run();

            expect(successLog()).toMatchObject({ audioRendition: 'encode' });
        });
    });
});

describe('isAudioCopyEligible', () => {
    const base: VideoMetadataExtended = {
        duration: 300,
        width: 1920,
        height: 1080,
        codec: 'h264',
        bitrate: 0,
        fps: 30,
        hasAudio: true,
        formatName: 'mov,mp4,m4a,3gp,3g2,mj2',
        audioStreams: 1,
        audioCodec: 'aac',
        audioChannels: 2,
    };

    it.each([
        { case: 'a single mono or stereo AAC track', overrides: {}, expected: true },
        { case: 'mono AAC', overrides: { audioChannels: 1 }, expected: true },
        { case: 'another codec', overrides: { audioCodec: 'mp3' }, expected: false },
        { case: 'surround AAC', overrides: { audioChannels: 6 }, expected: false },
        { case: 'several audio tracks', overrides: { audioStreams: 2 }, expected: false },
        { case: 'an unknown channel count', overrides: { audioChannels: undefined }, expected: false },
    ])('is $expected for $case', ({ overrides, expected }) => {
        expect(isAudioCopyEligible({ ...base, ...overrides })).toBe(expected);
    });
});

describe('isAudioDurationComplete', () => {
    it('accepts a copy within one second or 1% of the source track', () => {
        expect(isAudioDurationComplete(299.98, 300)).toBe(true);
        expect(isAudioDurationComplete(297.5, 300)).toBe(true);
        expect(isAudioDurationComplete(9.2, 10)).toBe(true);
    });

    it('rejects a truncated copy', () => {
        expect(isAudioDurationComplete(78.3, 300)).toBe(false);
        expect(isAudioDurationComplete(296, 300)).toBe(false);
    });
});

describe('buildAudioCopyArgs', () => {
    it('fails on input errors and puts the reconnect options before the URL', () => {
        const url = 'https://storage.example.com/video.mp4?sig=1';
        const args = buildAudioCopyArgs({ kind: 'url', url }, '/out/audio.m4a');

        expect(args).toContain('-xerror');
        expect(args.slice(args.indexOf('-i') - HTTP_INPUT_OPTIONS.length, args.indexOf('-i'))).toEqual([
            ...HTTP_INPUT_OPTIONS,
        ]);
        expect(args.slice(args.indexOf('-i'))).toEqual(['-i', url, '-vn', '-c:a', 'copy', '/out/audio.m4a']);
    });
});

describe('resolvePlaybackDuration', () => {
    const video = { codec_type: 'video' };

    it('prefers the container duration over a shorter stream duration', () => {
        expect(resolvePlaybackDuration({ duration: '11.971' }, { ...video, duration: '11.9' })).toBe(11.971);
    });

    it('falls back to the video stream duration when the container has none', () => {
        expect(resolvePlaybackDuration({}, { ...video, duration: '12.5' })).toBe(12.5);
        expect(resolvePlaybackDuration({ duration: 'N/A' }, { ...video, duration: '12.5' })).toBe(12.5);
    });

    it('reads the Matroska DURATION tag when the stream has no duration field', () => {
        expect(resolvePlaybackDuration({}, { ...video, tags: { DURATION: '01:02:03.500000000' } })).toBe(3723.5);
    });

    it('returns 0 when no duration is usable', () => {
        expect(resolvePlaybackDuration({ duration: '0' }, { ...video, duration: 'NaN', tags: { DURATION: 'x' } })).toBe(
            0,
        );
    });
});
