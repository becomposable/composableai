import fs from 'node:fs/promises';
import { log } from '@temporalio/activity';
import type { VertesiaClient } from '@vertesia/client';
import type { ContentObject, DSLActivityExecutionPayload, DSLActivitySpec, WorkflowInputFile } from '@vertesia/common';
import { markdownWithMarkitdown } from '../conversion/markitdown.js';
import { mutoolPdfToText } from '../conversion/mutool.js';
import { markdownWithPandoc } from '../conversion/pandoc.js';
import { setupActivity } from '../dsl/setup/ActivityContext.js';
import { DocumentNotFoundError, FileTooLargeError } from '../errors.js';
import { type TextExtractionResult, TextExtractionStatus } from '../result-types.js';
import { fetchBlobAsBuffer, md5, saveBlobToTempFile } from '../utils/blobs.js';
import { runCrashPronePhase } from '../utils/crash-prone-phase.js';
import { getTextExtractionLimits, type TextExtractionLimits } from '../utils/text-extraction-limits.js';
import { createFileSourceResult, uploadTextPreviewToStorage } from '../utils/text-preview-utils.js';
import { countTokens } from '../utils/tokens.js';

//@ts-expect-error
const _JSON: DSLActivitySpec = {
    name: 'extractDocumentText',
};

export interface ExtractDocumentTextParams {
    output_storage_path?: string;
}
export interface ExtractDocumentText extends DSLActivitySpec<ExtractDocumentTextParams> {
    name: 'extractDocumentText';
    projection?: never;
}

export async function extractDocumentText(
    payload: DSLActivityExecutionPayload<ExtractDocumentTextParams>,
): Promise<TextExtractionResult> {
    const context = await setupActivity(payload);
    const { client, inputType, params } = context;
    const { output_storage_path } = params;

    if (inputType === 'files') {
        // File mode: extract from file source
        if (!output_storage_path) {
            throw new Error('output_storage_path is required when extracting text from file sources');
        }
        return extractFromFileSource(client, context.file, output_storage_path);
    } else {
        // Object mode: fetch from object store
        return extractFromObject(client, context.objectId, context.objectIds || []);
    }
}

async function extractFromObject(
    client: VertesiaClient,
    objectId: string,
    objectIds: string[],
): Promise<TextExtractionResult> {
    // Fetch the exact revision by id rather than `find({_id, revision.head:true})`.
    // `find` filters to HEAD revisions, so if a newer revision is created while this
    // intake is in flight (e.g. an update with `createRevision: true`), the original
    // revision this workflow was queued for becomes non-head and `find` returns empty —
    // failing intake with a spurious "not found" even though the revision still exists.
    // A direct GET by id resolves the specific revision regardless of head.
    let doc: ContentObject;
    try {
        doc = (await client.objects.retrieve(objectId, '+text')) as ContentObject;
    } catch (err: unknown) {
        const status =
            err && typeof err === 'object' && 'status' in err ? (err as { status?: number }).status : undefined;
        if (status === 404) {
            log.error(`Document ${objectId} not found`);
            throw new DocumentNotFoundError(`Document ${objectId} not found`, objectIds);
        }
        throw err;
    }
    if (!doc) {
        log.error(`Document ${objectId} not found`);
        throw new DocumentNotFoundError(`Document ${objectId} not found`, objectIds);
    }

    log.debug(`Extracting text for object ${doc.id}`);

    if (!doc.content?.type || !doc.content?.source) {
        if (doc.text) {
            return createResponse(doc, doc.text, TextExtractionStatus.skipped, 'Text present and no source or type');
        } else {
            return createResponse(doc, '', TextExtractionStatus.error, 'No source or type found');
        }
    }

    //skip if text already extracted and proper etag
    if (doc.text && doc.text.length > 0 && doc.text_etag === doc.content.etag) {
        return createResponse(doc, doc.text, TextExtractionStatus.skipped, 'Text already extracted');
    }

    // Do NOT catch download failures here. Returning a result (rather than throwing) tells
    // Temporal the activity succeeded, so it is never retried: intake carries on and marks the
    // object `completed` with no text at all — a permanently text-less document that looks
    // healthy. A single transient 502 from the signed-URL path was enough to produce one.
    // fetchBlobAsStream already classifies the failure for us: not-found/forbidden become a
    // non-retryable DocumentNotFoundError, and everything else a plain Error the activity's
    // retry policy will retry. Let that classification through. Only a file over the size
    // limits is skipped: retrying reads the same file.
    const { text: txt, skipped } = await extractTextWithinLimits(client, doc.content.source, doc.content.type);
    if (!txt) {
        return createResponse(
            doc,
            doc.text ?? '',
            TextExtractionStatus.skipped,
            skipped ?? `Unsupported mime type: ${doc.content.type}`,
        );
    }

    const tokensData = countTokens(txt);
    const etag = doc.content.etag ?? md5(txt);

    // Persist the extracted text through the dedicated text endpoint which stores it as a text
    // artifact (dual-writing the inline text during the rollout window). Passing the content etag
    // records it as `text_etag` so the skip-if-already-extracted check above keeps working.
    await client.objects.setObjectText(doc.id, { text: txt, etag });

    // Token counts are not part of the text artifact contract — keep updating them on the object.
    await client.objects.update(doc.id, {
        tokens: {
            ...tokensData,
            etag: etag,
        },
    });

    return createResponse(doc, txt, TextExtractionStatus.success);
}

async function extractFromFileSource(
    client: VertesiaClient,
    input_file: WorkflowInputFile,
    output_storage_path: string,
): Promise<TextExtractionResult> {
    log.info(`Extracting text from ${input_file}`);

    // Same reasoning as extractFromObject: swallowing the download failure here is worse still,
    // because createFileSourceResult reports `status: success` — a failed download was
    // indistinguishable from a document that legitimately has no text. Let the error propagate so
    // the retry policy sees it.
    const { text: txt, skipped } = await extractTextWithinLimits(client, input_file.url, input_file.mimetype);
    if (skipped) {
        return {
            ...createFileSourceResult(input_file.url, output_storage_path, null),
            status: TextExtractionStatus.skipped,
            message: skipped,
        };
    }

    // Upload extracted text to storage
    if (txt && output_storage_path) {
        await uploadTextPreviewToStorage(client, txt, output_storage_path, 'Document');
    }

    return createFileSourceResult(input_file.url, output_storage_path, txt);
}

/** A converter that reads the document from a file, so that the worker never holds it in memory. */
interface FileConverter {
    /** Extension of the temporary file, which markitdown uses to recognize the format. */
    ext: string;
    convert: (file: string) => Promise<string>;
}

const FILE_CONVERTERS: Record<string, FileConverter> = {
    'application/pdf': { ext: 'pdf', convert: (file) => mutoolPdfToText(file) },
    //docx
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
        ext: 'docx',
        convert: (file) => markdownWithMarkitdown(file),
    },
    //pptx
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': {
        ext: 'pptx',
        convert: (file) => markdownWithMarkitdown(file),
    },
    //html
    'text/html': { ext: 'html', convert: (file) => markdownWithPandoc(file, 'html') },
    //opendocument
    'application/vnd.oasis.opendocument.text': { ext: 'odt', convert: (file) => markdownWithPandoc(file, 'odt') },
    //rtf
    'application/rtf': { ext: 'rtf', convert: (file) => markdownWithPandoc(file, 'rtf') },
};

/** Types whose file is the text itself. */
const TEXT_MIME_TYPES = new Set([
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/typescript',
    'application/javascript',
    'application/json',
]);

/** A file of any other type is read up to this size to check whether it holds text: larger, it is not used. */
const SNIFF_MAX_BYTES = 500 * 1024;

const MiB = 1024 * 1024;

/**
 * Extracts the text of a file without ever reading more of it than the size limits allow. `text` is null when
 * there is none, and `skipped` then tells why, unless the type holds no text this activity can read.
 */
async function extractTextWithinLimits(
    client: VertesiaClient,
    source: string,
    mimeType: string,
): Promise<{ text: string | null; skipped?: string }> {
    const limits = getTextExtractionLimits();
    return runCrashPronePhase(
        'text extraction',
        async () => {
            try {
                return { text: await extractText(client, source, mimeType, limits) };
            } catch (err: unknown) {
                if (!(err instanceof FileTooLargeError)) {
                    throw err;
                }
                log.warn('Skipping text extraction of a file over the size limit', {
                    source,
                    mime_type: mimeType,
                    max_bytes: err.maxBytes,
                });
                return { text: null, skipped: `File too large for text extraction: over ${err.maxBytes / MiB} MiB` };
            }
        },
        (deaths) => ({ text: null, skipped: `${deaths} earlier attempts died while extracting text from this file` }),
    );
}

/**
 * Picks how to read the file from its MIME type before downloading anything, so that a file this activity
 * cannot read (a video under an unregistered type, for instance) costs at most {@link SNIFF_MAX_BYTES}.
 *
 * @throws FileTooLargeError when the file is over the limit of its type
 */
async function extractText(
    client: VertesiaClient,
    source: string,
    mimeType: string,
    limits: TextExtractionLimits,
): Promise<string | null> {
    const converter = FILE_CONVERTERS[mimeType];
    if (converter) {
        const file = await saveBlobToTempFile(client, source, converter.ext, { maxBytes: limits.maxFileBytes });
        try {
            return await converter.convert(file);
        } finally {
            await fs.rm(file, { force: true });
        }
    }

    if (TEXT_MIME_TYPES.has(mimeType)) {
        const fileBuffer = await fetchBlobAsBuffer(client, source, { maxBytes: limits.maxTextBytes });
        return fileBuffer.toString('utf8');
    }

    let fileBuffer: Buffer;
    try {
        fileBuffer = await fetchBlobAsBuffer(client, source, { maxBytes: SNIFF_MAX_BYTES });
    } catch (err: unknown) {
        if (err instanceof FileTooLargeError) {
            // Too large to be sniffed as text: an unsupported type, not an oversized document.
            return null;
        }
        throw err;
    }
    if (sniffIfText(fileBuffer)) {
        return fileBuffer.toString('utf8'); //TODO: add charset detection
    }
    return null;
}

function createResponse(
    doc: ContentObject,
    text: string,
    status: TextExtractionStatus,
    message?: string,
): TextExtractionResult {
    return {
        status,
        message,
        tokens: getCompleteTokens(doc),
        len: text.length,
        objectId: doc.id,
        hasText: !!text,
    };
}

function getCompleteTokens(doc: ContentObject): TextExtractionResult['tokens'] {
    const tokens = doc.tokens;
    if (tokens?.count === undefined || tokens.encoding === undefined || tokens.etag === undefined) {
        return undefined;
    }
    return {
        count: tokens.count,
        encoding: tokens.encoding,
        etag: tokens.etag,
    };
}

function sniffIfText(buf: Buffer) {
    // If file is too large, don't even try
    if (buf.length > SNIFF_MAX_BYTES) {
        return false;
    }

    // Count binary/control characters
    let binaryCount = 0;
    const sampleSize = Math.min(buf.length, 1000); // Check first 1000 bytes

    for (let i = 0; i < sampleSize; i++) {
        // Count control characters (except common whitespace)
        const byte = buf[i];
        if ((byte < 32 && ![9, 10, 13].includes(byte)) || byte === 0) {
            binaryCount++;
        }
    }

    // If more than 10% binary/control chars, probably not text
    if (binaryCount / sampleSize > 0.1) {
        return false;
    }

    // Additional check for valid UTF-8 encoding
    try {
        const s = buf.toString('utf8');
        return s.length > 0 && !s.includes('\uFFFD'); // Replacement character
    } catch {
        return false;
    }
}
