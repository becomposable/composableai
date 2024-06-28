import { ContentObjectStatus, DSLWorkflowSpec } from "@composableai/zeno-common";
import { ChunkDocument } from "../activities/chunkDocument.js";
import { ExtractDocumentText } from "../activities/extractDocumentText.js";
import { GenerateDocumentProperties } from "../activities/generateDocumentProperties.js";
import { GenerateEmbeddings } from "../activities/generateEmbeddings.js";
import { GuessOrCreateDocumentType } from "../activities/guessOrCreateDocumentType.js";
import { SetDocumentStatus } from "../activities/setDocumentStatus.js";

export default {
    name: "StandardDocumentIntake",
    vars: {},
    activities: [
        {
            name: "setDocumentStatus",
            params: {
                status: ContentObjectStatus.processing,
            },
        } satisfies SetDocumentStatus,
        {
            name: "extractDocumentText",
            output: "extractResult",
        } satisfies ExtractDocumentText,
        {
            title: "Guess or created a document type for the current document",
            name: "guessOrCreateDocumentType",
            condition: {
                "extractResult.hasText": { $eq: true },
            },
        } satisfies GuessOrCreateDocumentType,
        {
            title: "Generate document properties from its text content",
            name: "generateDocumentProperties",
            condition: {
                "extractResult.hasText": { $eq: true },
            },
        } satisfies GenerateDocumentProperties,
        {
            name: "chunkDocument",
            condition: {
                "extractResult.hasText": { $eq: true },
            },
            params: {
                force: false,
            }
        } satisfies ChunkDocument,
        {
            name: "generateEmbeddings",
            params: {
                force: false
            }
        } satisfies GenerateEmbeddings,
        {
            name: "setDocumentStatus",
            params: {
                status: ContentObjectStatus.completed,
            }
        } satisfies SetDocumentStatus,
    ]
} satisfies DSLWorkflowSpec;