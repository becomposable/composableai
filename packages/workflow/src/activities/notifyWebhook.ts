import { DSLActivityExecutionPayload, DSLActivitySpec } from "@becomposable/common";
import { setupActivity } from "../dsl/setup/ActivityContext.js";
import { WorkflowParamNotFound } from "../errors.js";

interface NotifyWebhookParams {
    target_url: string; //URL to send the notification to
    method: 'GET' | 'POST'; //HTTP method to use
    payload: Record<string, any>; //payload to send (if POST then as JSON body, if GET then as query string)
    headers?: Record<string, string>; //additional headers to send
}


export interface NotifyWebhook extends DSLActivitySpec<NotifyWebhookParams> {
    name: 'notifyWebhook';
}


export async function notifyWebhook(payload: DSLActivityExecutionPayload) {

    const { params, } = await setupActivity<NotifyWebhookParams>(payload);
    const { target_url, method, payload: requestPayload, headers } = params

    if (!target_url) throw new WorkflowParamNotFound('target_url');

    const res = await fetch(target_url, {
        body: method === 'POST' ? JSON.stringify(requestPayload) : undefined,
        headers: {
            'Content-Type': 'application/json',
            ...headers
        },
        method,
    });

    if (!res.ok) {
        throw new Error(`Failed to notify webhook ${target_url}: ${res.statusText}`);
    }

    return { status: res.status, message: res.statusText, body: await res.json(), url: res.url }

}