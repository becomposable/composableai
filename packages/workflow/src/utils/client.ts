/**
 * get a zeno client for a given token
 */

import { ComposableClient } from "@becomposable/client";
import { WorkflowExecutionPayload } from "@becomposable/common";
import { logger } from "@dglabs/logger";


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

    logger.info(`Connecting to studio at ${payload.config.studio_url}`);
    const client = new ComposableClient({
        serverUrl: payload.config.studio_url,
        storeUrl: payload.config.store_url,
        apikey: payload.auth_token
    });

    return client;

}