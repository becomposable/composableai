import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { MockActivityEnvironment } from '@temporalio/testing';
import type { VertesiaClient } from '@vertesia/client';
import { ContentEventName, type ContentObject, type DSLActivityExecutionPayload } from '@vertesia/common';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { mutoolPdfToText } from '../conversion/mutool.js';
import type { ActivityContext } from '../dsl/setup/ActivityContext.js';
import { DocumentNotFoundError, FileTooLargeError } from '../errors.js';
import { TextExtractionStatus } from '../result-types.js';
import { fetchBlobAsBuffer, saveBlobToTempFile } from '../utils/blobs.js';
import { type ExtractDocumentTextParams, extractDocumentText } from './extractDocumentText.js';

vi.mock('../dsl/setup/ActivityContext.js', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../dsl/setup/ActivityContext.js')>();
    return { ...actual, setupActivity: vi.fn() };
});

vi.mock('../utils/blobs.js', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../utils/blobs.js')>();
    return { ...actual, fetchBlobAsBuffer: vi.fn(), saveBlobToTempFile: vi.fn() };
});

vi.mock('../conversion/mutool.js', () => ({ mutoolPdfToText: vi.fn() }));

let testEnv: MockActivityEnvironment;

beforeAll(() => {
    testEnv = new MockActivityEnvironment();
});

const retrieve = vi.fn();
const setObjectText = vi.fn();
const update = vi.fn();

const SOURCE = 'gs://bucket/doc.txt';

beforeEach(async () => {
    vi.clearAllMocks();
    const { setupActivity } = await import('../dsl/setup/ActivityContext.js');
    const client = {
        objects: {
            retrieve,
            setObjectText,
            update,
        },
    } as unknown as VertesiaClient;
    vi.mocked(setupActivity).mockResolvedValue({
        client,
        inputType: 'objectIds',
        objectId: 'object-1',
        objectIds: ['object-1'],
        params: {},
    } as unknown as ActivityContext<ExtractDocumentTextParams>);
    vi.mocked(fetchBlobAsBuffer).mockResolvedValue(Buffer.from('hello world', 'utf8'));
});

function createDoc(overrides: Partial<ContentObject> = {}): ContentObject {
    return {
        id: 'object-1',
        content: {
            type: 'text/plain',
            source: SOURCE,
            etag: 'etag-1',
        },
        ...overrides,
    } as ContentObject;
}

function createPayload(): DSLActivityExecutionPayload<ExtractDocumentTextParams> {
    return {
        auth_token: 'test-token',
        account_id: 'test-account',
        project_id: 'test-project',
        params: {},
        config: { studio_url: 'http://test-studio', store_url: 'http://test-store' },
        workflow_name: 'StandardIntake',
        event: ContentEventName.create,
        objectIds: ['object-1'],
        vars: {},
        activity: { name: 'extractDocumentText', params: {} },
    };
}

describe('extractDocumentText', () => {
    it('stores extracted text through setObjectText and keeps tokens on the object', async () => {
        retrieve.mockResolvedValue(createDoc());
        setObjectText.mockResolvedValue({ text: 'hello world' });
        update.mockResolvedValue({});

        await expect(testEnv.run(extractDocumentText, createPayload())).resolves.toMatchObject({
            status: TextExtractionStatus.success,
            objectId: 'object-1',
            hasText: true,
            len: 'hello world'.length,
        });

        expect(setObjectText).toHaveBeenCalledExactlyOnceWith('object-1', {
            text: 'hello world',
            etag: 'etag-1',
        });
        // The object update no longer carries text/text_etag — only token counts.
        expect(update).toHaveBeenCalledExactlyOnceWith('object-1', {
            tokens: expect.objectContaining({ etag: 'etag-1' }),
        });
    });

    it('skips extraction when the text is current for the content etag', async () => {
        retrieve.mockResolvedValue(createDoc({ text: 'already there', text_etag: 'etag-1' }));

        await expect(testEnv.run(extractDocumentText, createPayload())).resolves.toMatchObject({
            status: TextExtractionStatus.skipped,
            message: 'Text already extracted',
        });

        expect(setObjectText).not.toHaveBeenCalled();
        expect(update).not.toHaveBeenCalled();
    });

    it('fails the activity when setObjectText fails', async () => {
        retrieve.mockResolvedValue(createDoc());
        setObjectText.mockRejectedValue(new Error('PUT /objects/object-1/text failed'));

        await expect(testEnv.run(extractDocumentText, createPayload())).rejects.toMatchObject({
            message: expect.stringContaining('PUT /objects/object-1/text failed'),
        });
        expect(update).not.toHaveBeenCalled();
    });

    // Regression: a transient blob-download failure used to be caught and returned as
    // `status: error`. Because the activity *resolved*, Temporal never retried it, intake
    // continued, and the object was marked `completed` with no text — permanently text-less
    // but indistinguishable from a healthy document. It must reject so the retry policy applies.
    it('rejects on a transient download failure instead of resolving with status error', async () => {
        retrieve.mockResolvedValue(createDoc());
        vi.mocked(fetchBlobAsBuffer).mockRejectedValue(new Error(`Failed to download blob ${SOURCE}: Bad Gateway`));

        await expect(testEnv.run(extractDocumentText, createPayload())).rejects.toThrow(/Bad Gateway/);

        // The defining symptom of the old behaviour: the object was still written/completed.
        expect(setObjectText).not.toHaveBeenCalled();
        expect(update).not.toHaveBeenCalled();
    });

    // Not-found/forbidden are classified as non-retryable by fetchBlobAsStream. That
    // classification must survive too — retrying a deleted blob five times helps nobody.
    it('propagates a non-retryable DocumentNotFoundError unchanged', async () => {
        retrieve.mockResolvedValue(createDoc());
        vi.mocked(fetchBlobAsBuffer).mockRejectedValue(
            new DocumentNotFoundError(`Not found at ${SOURCE}: not found`, []),
        );

        await expect(testEnv.run(extractDocumentText, createPayload())).rejects.toMatchObject({
            nonRetryable: true,
        });
        expect(setObjectText).not.toHaveBeenCalled();
        expect(update).not.toHaveBeenCalled();
    });

    describe('size limits', () => {
        it('reads at most 10 MiB of a text file', async () => {
            retrieve.mockResolvedValue(createDoc());
            setObjectText.mockResolvedValue({ text: 'hello world' });
            update.mockResolvedValue({});

            await testEnv.run(extractDocumentText, createPayload());

            expect(fetchBlobAsBuffer).toHaveBeenCalledWith(expect.anything(), SOURCE, { maxBytes: 10 * 1024 * 1024 });
        });

        it('skips a text file over the limit instead of failing the intake', async () => {
            retrieve.mockResolvedValue(createDoc());
            vi.mocked(fetchBlobAsBuffer).mockRejectedValue(new FileTooLargeError(SOURCE, 10 * 1024 * 1024));

            await expect(testEnv.run(extractDocumentText, createPayload())).resolves.toMatchObject({
                status: TextExtractionStatus.skipped,
                message: 'File too large for text extraction: over 10 MiB',
                hasText: false,
            });
            expect(setObjectText).not.toHaveBeenCalled();
        });

        // A multi-GB video under an unregistered type used to be downloaded whole into the worker's memory,
        // only to be skipped as an unsupported type.
        it('reads only the first 500 KiB of a file of unknown type', async () => {
            retrieve.mockResolvedValue(createDoc({ content: { type: 'application/mxf', source: SOURCE } }));
            vi.mocked(fetchBlobAsBuffer).mockRejectedValue(new FileTooLargeError(SOURCE, 500 * 1024));

            await expect(testEnv.run(extractDocumentText, createPayload())).resolves.toMatchObject({
                status: TextExtractionStatus.skipped,
                message: 'Unsupported mime type: application/mxf',
            });
            expect(fetchBlobAsBuffer).toHaveBeenCalledExactlyOnceWith(expect.anything(), SOURCE, {
                maxBytes: 500 * 1024,
            });
        });

        it('still extracts a small text file of unknown type', async () => {
            retrieve.mockResolvedValue(createDoc({ content: { type: 'application/x-log', source: SOURCE } }));
            setObjectText.mockResolvedValue({ text: 'hello world' });
            update.mockResolvedValue({});

            await expect(testEnv.run(extractDocumentText, createPayload())).resolves.toMatchObject({
                status: TextExtractionStatus.success,
                hasText: true,
            });
        });

        it('converts a PDF from a temporary file, then removes it', async () => {
            const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'extract-text-test-'));
            const file = path.join(dir, 'doc.pdf');
            fs.writeFileSync(file, '%PDF');
            retrieve.mockResolvedValue(createDoc({ content: { type: 'application/pdf', source: SOURCE } }));
            vi.mocked(saveBlobToTempFile).mockResolvedValue(file);
            vi.mocked(mutoolPdfToText).mockResolvedValue('pdf text');
            setObjectText.mockResolvedValue({ text: 'pdf text' });
            update.mockResolvedValue({});

            try {
                await expect(testEnv.run(extractDocumentText, createPayload())).resolves.toMatchObject({
                    status: TextExtractionStatus.success,
                });
                expect(saveBlobToTempFile).toHaveBeenCalledWith(expect.anything(), SOURCE, 'pdf', {
                    maxBytes: 512 * 1024 * 1024,
                });
                expect(mutoolPdfToText).toHaveBeenCalledWith(file);
                expect(fetchBlobAsBuffer).not.toHaveBeenCalled();
                expect(fs.existsSync(file)).toBe(false);
            } finally {
                fs.rmSync(dir, { recursive: true, force: true });
            }
        });

        it('skips a PDF over the limit', async () => {
            retrieve.mockResolvedValue(createDoc({ content: { type: 'application/pdf', source: SOURCE } }));
            vi.mocked(saveBlobToTempFile).mockRejectedValue(new FileTooLargeError(SOURCE, 512 * 1024 * 1024));

            await expect(testEnv.run(extractDocumentText, createPayload())).resolves.toMatchObject({
                status: TextExtractionStatus.skipped,
                message: 'File too large for text extraction: over 512 MiB',
            });
            expect(mutoolPdfToText).not.toHaveBeenCalled();
        });
    });

    // Each retry used to hand the same file to the next worker, which died the same way.
    it('skips the file once two attempts died extracting it', async () => {
        retrieve.mockResolvedValue(createDoc());
        const retryEnv = new MockActivityEnvironment({
            attempt: 3,
            heartbeatDetails: { crash_prone_phase: 'text extraction', deaths: 1 },
        });

        await expect(retryEnv.run(extractDocumentText, createPayload())).resolves.toMatchObject({
            status: TextExtractionStatus.skipped,
            message: '2 earlier attempts died while extracting text from this file',
        });
        expect(fetchBlobAsBuffer).not.toHaveBeenCalled();
        expect(setObjectText).not.toHaveBeenCalled();
    });
});
