import { AbstractFetchClient, RequestError } from "api-fetch-client";
import { ObjectsApi } from "./ObjectsApi.js";
import { TypesApi } from "./TypesApi.js";
import { WorkflowsApi } from "./WorkflowsApi.js";
import { ZenoClientNotFoundError } from "./errors.js";

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
        this.errorFactory = (err: RequestError) => {
            if (err.status === 404) {
                return new ZenoClientNotFoundError(err);
            } else {
                return err;
            }
        }
    }

    withApiKey(apiKey: string | null) {
        return this.withAuthCallback(
            apiKey ? () => Promise.resolve(`Bearer ${apiKey}`) : undefined
        );
    }

    objects = new ObjectsApi(this);
    types = new TypesApi(this);
    workflows = new WorkflowsApi(this);
}
