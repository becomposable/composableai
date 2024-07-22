import { AbstractFetchClient, RequestError } from "api-fetch-client";
import { CommandsApi } from "./CommandsApi.js";
import { ZenoClientNotFoundError } from "./errors.js";
import { ObjectsApi } from "./ObjectsApi.js";
import { TypesApi } from "./TypesApi.js";
import { WorkflowsApi } from "./WorkflowsApi.js";

export interface ZenoClientProps {
    serverUrl?: string;
    apikey?: string;
    onRequest?: (request: Request) => void;
    onResponse?: (response: Response) => void;
}

function ensureDefined(serverUrl: string | undefined) {
    if (!serverUrl) {
        throw new Error("zeno client serverUrl is required");
    }
    return serverUrl;
}

export class ZenoClient extends AbstractFetchClient<ZenoClient> {

    constructor(
        opts: ZenoClientProps = {}
    ) {
        super(ensureDefined(opts.serverUrl));
        if (opts.apikey) {
            this.withApiKey(opts.apikey);
        }
        this.onRequest = opts.onRequest;
        this.onResponse = opts.onResponse;
        this.errorFactory = (err: RequestError) => {
            if (err.status === 404) {
                return new ZenoClientNotFoundError(err.request, err);
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
    commands = new CommandsApi(this);
}
