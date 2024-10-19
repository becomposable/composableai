
import { DSLWorkflowExecutionPayload } from "@becomposable/common";
import { proxyActivities } from "@temporalio/workflow";
import { GetObject } from "../activities/getObjectFromStore.js";
import * as activities from "../activities/index.js";
import { NoDocumentFound } from "../errors.js";

const {
    getObjectFromStore,
    transcribeMedia,
    extractDocumentText
} = proxyActivities<typeof activities>({
    startToCloseTimeout: "5 minute",
    retry: {
        initialInterval: '5s',
        backoffCoefficient: 2,
        maximumAttempts: 5,
        maximumInterval: 100 * 30 * 1000, //ms
        nonRetryableErrorTypes: [],
    },
});



export async function generateObjectText(payload: DSLWorkflowExecutionPayload) {

    const { objectIds } = payload;
    const objectId = objectIds[0];

    const object = await getObjectFromStore({
        ...payload,
        activity: {
            name: "getObject",
        } satisfies GetObject,
        params: {},
        workflow_name: "Generate Text",
    });

    if (!object.content?.source) {
        throw new NoDocumentFound(`No source or mimetype found for object ${objectId}`, objectIds);
    }
    const mimetype = object.content.type;
    if (!mimetype) {
        throw new NoDocumentFound(`No mimetype found for object ${objectId}`, objectIds);
    }

    const converter = ConverterActivity.find(({ type }) => type.test(mimetype));
    const res = await converter?.activity({
        ...payload,
        activity: {
            name: converter.name,
        },
        params: converter.params,
        workflow_name: "Generate Text",
    })

    return { res, content: object.content }

} 


const ConverterActivity = [
    {
        type: /audio\/.+/,
        activity: transcribeMedia,
        name: "TranscribeMedia",
        params: {},
    },
    {
        type: /video\/.+/,
        activity: transcribeMedia,
        name: "TranscribeMedia",
        params: {},
    },
    {
        type: /.+/,
        activity: extractDocumentText,
        name: "extractText",
        params: {},
    }
]