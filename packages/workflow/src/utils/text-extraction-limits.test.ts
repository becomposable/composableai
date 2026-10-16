import { afterEach, describe, expect, it, vi } from 'vitest';
import { getTextExtractionLimits } from './text-extraction-limits.js';

const MiB = 1024 * 1024;

describe('getTextExtractionLimits', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.restoreAllMocks();
    });

    it('defaults to 512 MiB per file and 10 MiB per text file', () => {
        vi.stubEnv('TEXT_EXTRACTION_MAX_FILE_MB', '');
        vi.stubEnv('TEXT_EXTRACTION_MAX_TEXT_MB', '');

        expect(getTextExtractionLimits()).toEqual({ maxFileBytes: 512 * MiB, maxTextBytes: 10 * MiB });
    });

    it('reads the limits from the environment', () => {
        vi.stubEnv('TEXT_EXTRACTION_MAX_FILE_MB', '1024');
        vi.stubEnv('TEXT_EXTRACTION_MAX_TEXT_MB', '0.5');

        expect(getTextExtractionLimits()).toEqual({ maxFileBytes: 1024 * MiB, maxTextBytes: 0.5 * MiB });
    });

    it.each(['0', '-1', '10MB', 'none'])('keeps the default for an invalid value %s', (value) => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        vi.stubEnv('TEXT_EXTRACTION_MAX_FILE_MB', value);

        expect(getTextExtractionLimits().maxFileBytes).toBe(512 * MiB);
        expect(warn).toHaveBeenCalledOnce();
    });
});
