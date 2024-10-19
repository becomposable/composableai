import { Blobs } from "@becomposable/blobs";
import { DSLActivityExecutionPayload, DSLActivitySpec } from "@becomposable/common";
import { activityInfo, CompleteAsyncError, log } from "@temporalio/activity";
import { FetchClient } from "api-fetch-client";
import { setupActivity } from "../../dsl/setup/ActivityContext.js";
import { NoDocumentFound } from "../../errors.js";


export interface TranscriptMediaParams {
    environmentId?: string;
    force?: boolean;   
}

export interface TranscriptMedia extends DSLActivitySpec<TranscriptMediaParams> {
    name: 'TranscribeMedia';
}

export interface TranscriptMediaResult {
    id: string;
    status: "completed" | "failed" | "skipped";
    message?: string;

}

const GLADIA_KEY = process.env.GLADIA_API_KEY;
const GLADIA_URL = "https://api.gladia.io/v2";

export async function transcribeMedia(payload: DSLActivityExecutionPayload): Promise<TranscriptMediaResult> {

    const { params, client, objectId } = await setupActivity<TranscriptMediaParams>(payload);
    const object = await client.objects.retrieve(objectId, "+text");

    if (object.text && !params.force) {
        return { id: objectId, status: "skipped", message: "text already present" }
    }

    if (!object.content?.source) {
        throw new NoDocumentFound(`No source found for object ${objectId}`);
    }


    const source = await Blobs.getFile(object.content.source);
    const mediaUrl = await source.getDownloadUrl();

    if (!mediaUrl) {
        throw new NoDocumentFound(`Error fetching source ${object.content.source}`);
    }

    const taskToken = Buffer.from(activityInfo().taskToken).toString('base64url');
    const callbackUrl = generateCallbackUrlForGladia(client.store.baseUrl, payload.auth_token, taskToken, objectId);

    log.info(`Transcribing media ${mediaUrl} with Gladia`, { objectId, callbackUrl });
    const req = await sendTranscribeRequestToGladia(mediaUrl, callbackUrl);

    log.info(`Transcription request sent to Gladia`, { objectId, req, callbackUrl });    
    throw new CompleteAsyncError();

}


function generateCallbackUrlForGladia(baseUrl: string, authToken: string, taskToken: string, objectId: string) {
    return `${baseUrl}/api/v1/webhooks/gladia/${objectId}?auth_token=${authToken}&task_token=${taskToken}`;
}

export async function sendTranscribeRequestToGladia(mediaUrl: string, callbackUrl: string) {


    if (!GLADIA_KEY) {
        throw new Error("GLADIA_KEY is required");
    }    

    const gladia = new FetchClient(GLADIA_URL);

    gladia.withHeaders({ "x-gladia-key": GLADIA_KEY });

    const req = await gladia.post("/transcription", { payload: { 
        audio_url: mediaUrl,
        callback_url: callbackUrl,
        name_consistency: true,
        chapterization: false,
        diarization_enhanced: false,
        enable_code_switching: true,
    } }) as GladiaTranscriptRequestResponse;

    return req;

}


interface GladiaTranscriptRequestResponse {
    id: string;
    result_url: string;
}
