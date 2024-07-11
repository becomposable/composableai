/**
 * get a zeno client for a given token
 */

import { StudioClient } from "@composableai/studio-client";
import { ZenoClient } from "@composableai/zeno-client";
import { WorkflowExecutionPayload } from "@composableai/common";


export function getContentStore(payload: WorkflowExecutionPayload) {

    if (!payload.auth_token) {
        throw new Error("Authentication Token is missing from WorkflowExecutionPayload.authToken");
    }

    if (!payload.config?.store_url) {
        throw new Error("Content Store URL is missing from WorkflowExecutionPayload.servers.storeUrl");
    }

    //TODO: handle token check and refresh?
    //TODO: handle client caching?
    return new ZenoClient({
        serverUrl: payload.config.store_url,
        apikey: payload.auth_token
    });
}


export function getStudioClient(payload: WorkflowExecutionPayload) {

    if (!payload.auth_token) {
        throw new Error("Authentication Token is missing from WorkflowExecutionPayload.authToken");
    }

    if (!payload.config?.studio_url) {
        throw new Error("Content Store URL is missing from WorkflowExecutionPayload.servers.storeUrl");
    }

    console.log(`Connecting to studio at ${payload.config.studio_url}`);
    const client = new StudioClient({
        serverUrl: payload.config.studio_url,
        apikey: payload.auth_token
    });

    return client;

}