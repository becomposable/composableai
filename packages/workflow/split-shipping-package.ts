import { DSLWorkflowSpec } from '@becomposable/common';
import { CreateOrUpdateObjectFromInteractionRun, ExecuteInteraction } from '@becomposable/workflow';
import { CreatePdfDocumentFromSource } from './src/activities/createDocumentFromOther.js';

export default {
    name: 'ValidateAndPreparePackage',
    description: 'Validate and prepare package for shipping',
    debug_mode: true,

    vars: {
    },

    activities: [
        {
            title: "Validate and Prepare Package",
            name: "executeInteraction",
            import: ["objectId"],
            output: "validation_result",
            params: {
                interactionName: "AnalyzeBOL",
                prompt_data: {
                    package: "store:${objectId}",
                },
            }
        } as ExecuteInteraction,
        {
            title: "Update Shipping Package",
            name: "createOrUpdateDocumentFromInteractionRun",
            import: ["validation_result", "objectId"],
            params: {
                updateExistingId: '${objectId}',
                run_id: '${validation_result.runId}',
            }
        } as CreateOrUpdateObjectFromInteractionRun,
        {
            name: "createPdfDocumentFromSource",
            import: ["objectId"],
            fetch: {
                package: {
                    query: { _id: "${objectId}" },
                    type: "document",
                    on_not_found: 'throw'
                }
            },
            title: "Create Bill Of Lading",
            condition: { "package.properties.bill_of_lading.present": { $eq: true } },
            params: {
                title: "Bill of Lading",
                pages: "${package.properties.bill_of_lading.page_numbers}" as any as number[],
                target_object_type: "Bill of Lading",
                parent: "${package.id}",
            },
            output: "bill_of_lading",
        } as CreatePdfDocumentFromSource,
        {
            name: "createPdfDocumentFromSource",
            import: ["objectId"],
            fetch: {
                package: {
                    query: { _id: "${objectId}" },
                    type: "document",
                    on_not_found: 'throw'
                }
            },
            title: "Create Commercial Invoice",
            condition: { "package.properties.bill_of_lading.present": { $eq: true } },
            params: {
                title: "Commercial Invoice",
                pages: "${package.properties.commercial_invoice.page_numbers}" as any as number[],
                target_object_type: "Commercial Invoice",
                parent: "${package.id}",
            },
            output: "commercial_invoice",
        } as CreatePdfDocumentFromSource,
        {
            name: "createPdfDocumentFromSource",
            import: ["objectId"],
            fetch: {
                package: {
                    query: { _id: "${objectId}" },
                    type: "document",
                    on_not_found: 'throw'
                }
            },
            title: "Create Customs Declaration",
            condition: { "package.properties.bill_of_lading.present": { $eq: true } },
            params: {
                title: "Customs Declaration",
                pages: "${package.properties.customs_declaration.page_numbers}" as any as number[],
                target_object_type: "Customs Declaration",
                parent: "${package.id}",
            },
            output: "customs_declaration",
        } as CreatePdfDocumentFromSource
    ]

} satisfies DSLWorkflowSpec;
