/** Largest file, in MiB, that text extraction downloads for a converter (PDF, Office, HTML...). */
export const TEXT_EXTRACTION_MAX_FILE_MB_ENV = 'TEXT_EXTRACTION_MAX_FILE_MB';
/** Largest text file, in MiB, that text extraction reads into memory. */
export const TEXT_EXTRACTION_MAX_TEXT_MB_ENV = 'TEXT_EXTRACTION_MAX_TEXT_MB';

// A converter reads the file from disk, and a worker may have only a few GiB of disk shared by all its
// activities: 512 MiB keeps one document from filling it.
const DEFAULT_MAX_FILE_MB = 512;
// Text is held in memory as a string, then tokenized on the event loop, so it is kept much smaller. The text
// is then saved in one request, and the API accepts request bodies of at most 10 MB: more could not be saved.
const DEFAULT_MAX_TEXT_MB = 10;

const MiB = 1024 * 1024;

/**
 * Size limits of text extraction. A file over its limit is skipped: the object keeps its file, but gets no
 * text. Each limit can be tuned per environment with its environment variable.
 */
export interface TextExtractionLimits {
    /** Largest file downloaded for a converter, in bytes (`TEXT_EXTRACTION_MAX_FILE_MB`). */
    maxFileBytes: number;
    /** Largest text file read into memory, in bytes (`TEXT_EXTRACTION_MAX_TEXT_MB`). */
    maxTextBytes: number;
}

export function getTextExtractionLimits(): TextExtractionLimits {
    return {
        maxFileBytes: parseMegabytes(TEXT_EXTRACTION_MAX_FILE_MB_ENV, DEFAULT_MAX_FILE_MB) * MiB,
        maxTextBytes: parseMegabytes(TEXT_EXTRACTION_MAX_TEXT_MB_ENV, DEFAULT_MAX_TEXT_MB) * MiB,
    };
}

function parseMegabytes(name: string, defaultValue: number): number {
    const raw = typeof process !== 'undefined' ? process.env?.[name]?.trim() : undefined;
    if (!raw) {
        return defaultValue;
    }
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) {
        // Keep the default rather than fail every extraction on a typo.
        console.warn(`${name} must be a positive number of MiB, got "${raw}"; using ${defaultValue}`);
        return defaultValue;
    }
    return value;
}
