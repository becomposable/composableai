import { MockActivityEnvironment } from '@temporalio/testing';
import { describe, expect, it, vi } from 'vitest';
import { runCrashPronePhase } from './crash-prone-phase.js';

/** Runs the phase in an attempt whose previous attempt left `heartbeatDetails` behind. */
async function runAttempt(attempt: number, heartbeatDetails: unknown, work: () => Promise<string>) {
    const env = new MockActivityEnvironment({ attempt, heartbeatDetails });
    const heartbeats: unknown[] = [];
    env.on('heartbeat', (details: unknown) => heartbeats.push(details));
    const result = await env.run(() => runCrashPronePhase('parse', work, (deaths) => `skipped after ${deaths}`));
    return { result, heartbeats };
}

describe('runCrashPronePhase', () => {
    it('marks the phase in the heartbeat while the work runs, then clears it', async () => {
        const { result, heartbeats } = await runAttempt(1, undefined, async () => 'parsed');

        expect(result).toBe('parsed');
        expect(heartbeats).toEqual([{ crash_prone_phase: 'parse', deaths: 0 }, { deaths: 0 }]);
    });

    it('tolerates one attempt that died in the phase', async () => {
        const work = vi.fn(async () => 'parsed');

        const { result, heartbeats } = await runAttempt(2, { crash_prone_phase: 'parse', deaths: 0 }, work);

        expect(result).toBe('parsed');
        expect(work).toHaveBeenCalledOnce();
        expect(heartbeats).toEqual([{ crash_prone_phase: 'parse', deaths: 1 }, { deaths: 1 }]);
    });

    it('skips the work once two attempts died in the phase', async () => {
        const work = vi.fn(async () => 'parsed');

        const { result, heartbeats } = await runAttempt(3, { crash_prone_phase: 'parse', deaths: 1 }, work);

        expect(result).toBe('skipped after 2');
        expect(work).not.toHaveBeenCalled();
        expect(heartbeats).toEqual([]);
    });

    it('does not count an attempt that left the phase before it failed', async () => {
        const { result } = await runAttempt(3, { deaths: 1 }, async () => 'parsed');

        expect(result).toBe('parsed');
    });

    it('does not count an attempt that died in another phase', async () => {
        const { result } = await runAttempt(3, { crash_prone_phase: 'download', deaths: 1 }, async () => 'parsed');

        expect(result).toBe('parsed');
    });

    it('ignores heartbeat details it did not write', async () => {
        const { result } = await runAttempt(5, { progress: 42 }, async () => 'parsed');

        expect(result).toBe('parsed');
    });

    it('leaves the phase when the work fails, so the retry is not counted as a death', async () => {
        const env = new MockActivityEnvironment({ attempt: 1 });
        const heartbeats: unknown[] = [];
        env.on('heartbeat', (details: unknown) => heartbeats.push(details));

        await expect(
            env.run(() =>
                runCrashPronePhase(
                    'parse',
                    async () => {
                        throw new Error('corrupt file');
                    },
                    () => 'skipped',
                ),
            ),
        ).rejects.toThrow('corrupt file');
        expect(heartbeats.at(-1)).toEqual({ deaths: 0 });
    });
});
