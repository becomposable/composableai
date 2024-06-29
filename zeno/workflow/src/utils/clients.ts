/**
 * get a zeno client for a given token
 */

import { StudioClient } from "@composableai/studio-client";
import { ZenoClient } from "@composableai/zeno-client";
import { WorkflowExecutionPayload } from "@composableai/zeno-common";


export function getContentStore(payload: WorkflowExecutionPayload) {

    if (!payload.authToken) {
        throw new Error("Authentication Token is missing from WorkflowExecutionPayload.authToken");
    }

    if (!payload.config?.storeUrl) {
        throw new Error("Content Store URL is missing from WorkflowExecutionPayload.servers.storeUrl");
    }

    //TODO: handle token check and refresh?
    //TODO: handle client caching?
    return new ZenoClient({
        serverUrl: payload.config.storeUrl,
        apikey: payload.authToken
    });
}


export function getStudioClient(payload: WorkflowExecutionPayload) {

    if (!payload.authToken) {
        throw new Error("Authentication Token is missing from WorkflowExecutionPayload.authToken");
    }

    if (!payload.config?.studioUrl) {
        throw new Error("Content Store URL is missing from WorkflowExecutionPayload.servers.storeUrl");
    }

    console.log(`Connecting to studio at ${payload.config.studioUrl}`);
    const client = new StudioClient({
        serverUrl: payload.config.studioUrl,
        apikey: payload.authToken
    });

    return client;

}