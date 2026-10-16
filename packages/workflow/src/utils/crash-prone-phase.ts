import { setImmediate } from 'node:timers/promises';
import { Context, log } from '@temporalio/activity';

/**
 * How many attempts may die in a crash-prone phase before the next attempt skips it. The first death is
 * tolerated, because a pod scale-down or a node preemption also kills an attempt in the middle of the phase.
 */
export const CRASH_PRONE_PHASE_MAX_DEATHS = 2;

/** Heartbeat details that carry a crash-prone phase from one attempt to the next. */
interface CrashPronePhaseDetails {
    /** The phase the attempt was in at its last heartbeat. Absent once it left the phase. */
    crash_prone_phase?: string;
    /** How many earlier attempts died in the phase. */
    deaths: number;
}

function parseDetails(details: unknown): CrashPronePhaseDetails | undefined {
    if (!details || typeof details !== 'object' || !('deaths' in details) || typeof details.deaths !== 'number') {
        return undefined;
    }
    const phase = 'crash_prone_phase' in details ? details.crash_prone_phase : undefined;
    return { crash_prone_phase: typeof phase === 'string' ? phase : undefined, deaths: details.deaths };
}

/**
 * Runs `work`, a phase of the current activity that can take the whole worker process down with it: an
 * in-memory download, or a parse on the event loop. When the process dies, Temporal sees a heartbeat timeout
 * and retries the activity on another worker, where the same file kills that worker too.
 *
 * The phase is recorded in the heartbeat details, which Temporal hands to the next attempt. An attempt whose
 * last heartbeat still names the phase never left it: it died in it. After
 * {@link CRASH_PRONE_PHASE_MAX_DEATHS} such deaths, this returns `skip(deaths)` instead of running `work`
 * again. An attempt that fails normally leaves the phase first, and the SDK flushes that last heartbeat
 * before reporting the failure, so ordinary retries are not counted.
 *
 * Requires a `heartbeatTimeout` on the activity, so that the details reach Temporal while `work` runs.
 */
export async function runCrashPronePhase<T>(
    phase: string,
    work: () => Promise<T>,
    skip: (deaths: number) => T,
): Promise<T> {
    const context = Context.current();
    const { attempt, activityType } = context.info;
    const previous = parseDetails(context.info.heartbeatDetails);
    const diedInPhase = attempt > 1 && previous?.crash_prone_phase === phase;
    const deaths = (previous?.deaths ?? 0) + (diedInPhase ? 1 : 0);

    if (deaths >= CRASH_PRONE_PHASE_MAX_DEATHS) {
        log.warn(`Skipping ${phase}: ${deaths} earlier attempts died in it`, {
            activity_type: activityType,
            attempt,
            phase,
            deaths,
        });
        return skip(deaths);
    }

    context.heartbeat({ crash_prone_phase: phase, deaths } satisfies CrashPronePhaseDetails);
    // Let the heartbeat leave before `work` starts synchronous work that would hold it back.
    await setImmediate();
    try {
        return await work();
    } finally {
        context.heartbeat({ deaths } satisfies CrashPronePhaseDetails);
    }
}
