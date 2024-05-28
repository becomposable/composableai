import { AbstractFetchClient } from "api-fetch-client";
import { StoreApi } from "./StoreApi.js";
import { WorkflowsApi } from "./WorkflowsApi.js";

export interface ZenoClientProps {
    serverUrl?: string;
    apikey?: string;
    onRequest?: (url: string, init: RequestInit) => void;
    onResponse?: (response: Response) => void;
}

export class ZenoClient extends AbstractFetchClient<ZenoClient> {

    constructor(
        opts: ZenoClientProps = {}
    ) {
        super(opts.serverUrl || "https://api.zeno.dot");
        if (opts.apikey) {
            this.withApiKey(opts.apikey);
        }
        this.onRequest = opts.onRequest;
        this.onResponse = opts.onResponse;
    }

    withApiKey(apiKey: string | null) {
        return this.withAuthCallback(
            apiKey ? () => Promise.resolve(`Bearer ${apiKey}`) : undefined
        );
    }

    store = new StoreApi(this);
    workflows = new WorkflowsApi(this);
}
