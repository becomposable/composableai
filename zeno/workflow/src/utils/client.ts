/**
 * get a zeno client for a given token
 */

import { WorkflowExecutionPayload } from "@composableai/common";
import { StudioClient } from "@composableai/studio-client";


export function getClient(payload: WorkflowExecutionPayload) {

    if (!payload.auth_token) {
        throw new Error("Authentication Token is missing from WorkflowExecutionPayload.authToken");
    }

    if (!payload.config?.studio_url) {
        throw new Error("Content Store URL is missing from WorkflowExecutionPayload.servers.storeUrl");
    }

    if (!payload.config?.store_url) {
        throw new Error("Content Store URL is missing from WorkflowExecutionPayload.servers.storeUrl");
    }

    console.log(`Connecting to studio at ${payload.config.studio_url}`);
    const client = new StudioClient({
        serverUrl: payload.config.studio_url,
        storeUrl: payload.config.store_url,
        apikey: payload.auth_token
    });

    return client;

}