import { AuthTokenResponse } from "@becomposable/common";
import { AbstractFetchClient } from "@becomposable/api-fetch-client";
import AccountApi from "./AccountApi.js";
import AccountsApi from "./AccountsApi.js";
import AnalyticsApi from "./AnalyticsApi.js";
import { ApiKeysApi } from "./ApiKeysApi.js";
import CommandsApi from "./CommandsApi.js";
import EnvironmentsApi from "./EnvironmentsApi.js";
import { IamApi } from "./IamApi.js";
import InteractionsApi from "./InteractionsApi.js";
import ProjectsApi from "./ProjectsApi.js";
import PromptsApi from "./PromptsApi.js";
import { RefsApi } from "./RefsApi.js";
import { RunsApi } from "./RunsApi.js";
import { ZenoClient } from "./store/client.js";
import TrainingApi from "./TrainingApi.js";
import UsersApi from "./UsersApi.js";

/**
 * 1 min threshold constant in ms
 */
const EXPIRATION_THRESHOLD = 60000;

export interface ComposableClientProps {
    serverUrl: string;
    storeUrl: string;
    apikey?: string;
    projectId?: string;
    sessionTags?: string | string[];
    onRequest?: (request: Request) => void;
    onResponse?: (response: Response) => void;
}

export class ComposableClient extends AbstractFetchClient<ComposableClient> {

    /**
     * The JWT token linked to the API KEY (sk or pk)
     */
    _jwt: string | null = null;

    /**
     * The store client
     */
    store: ZenoClient;

    /**
     * The session name will be sent when executing an interaction as a tag
     */
    sessionTags?: string | string[];

    constructor(
        opts: ComposableClientProps = {} as any
    ) {
        super(opts.serverUrl);
        if (!opts.serverUrl) {
            throw new Error("storeUrl is required for ComposableClient");
        }
        if (!opts.storeUrl) {
            throw new Error("storeUrl is required for ComposableClient");
        }
        this.store = new ZenoClient({
            serverUrl: opts.storeUrl,
            apikey: opts.apikey,
            onRequest: opts.onRequest,
            onResponse: opts.onResponse
        });

        if (opts.apikey) {
            this.withApiKey(opts.apikey);
        }
        if (opts.projectId) {
            this.headers["x-project-id"] = opts.projectId;
        }
        this.onRequest = opts.onRequest;
        this.onResponse = opts.onResponse;
        this.sessionTags = opts.sessionTags;
    }


    /**
     * Overwrite to keep store and composable clients synchronized on the auth callback
     * @param authCb
     * @returns
     */
    withAuthCallback(authCb?: (() => Promise<string>) | null) {
        this.store.withAuthCallback(authCb);
        return super.withAuthCallback(authCb);
    }

    async withApiKey(apiKey: string | null) {
        return this.withAuthCallback(
            apiKey ? async () => {
                if (!isApiKey(apiKey)) {
                    return `Bearer ${apiKey}`
                }

                if (isTokenExpired(this._jwt)) {
                    const jwt = await this.getAuthToken(apiKey);
                    this._jwt = jwt.token;
                }
                return `Bearer ${this._jwt}`
            } : undefined
        );
    }

    /**
     * Alias for store.workflows
     */
    get workflows() {
        return this.store.workflows;
    }

    /**
     * Alias for store.objects
     */
    get objects() {
        return this.store.objects;
    }

    /**
     * Alias for store.types
     */
    get types() {
        return this.store.types;
    }


    set project(projectId: string | null) {
        if (projectId) {
            this.headers["x-project-id"] = projectId;
        } else {
            delete this.headers["x-project-id"];
        }
    }

    get project() {
        return this.headers["x-project-id"] || null;
    }

    /**
     *
     * Generate a token for use with other Composable's services
     *
     * @param accountId: selected account to generate the token for
     * @returns AuthTokenResponse
     */
    async getAuthToken(token?: string, accountId?: string): Promise<AuthTokenResponse> {
        const query = {
            accountId,
            token
        };

        return this.get('/auth/token', { query: query, headers: { "authorization": undefined } as any });
    }

    projects = new ProjectsApi(this);
    environments = new EnvironmentsApi(this);
    interactions = new InteractionsApi(this);
    prompts = new PromptsApi(this);
    runs = new RunsApi(this);
    account = new AccountApi(this);
    accounts = new AccountsApi(this);
    apikeys = new ApiKeysApi(this);
    analytics = new AnalyticsApi(this);
    training = new TrainingApi(this);
    users = new UsersApi(this);
    iam = new IamApi(this);
    refs = new RefsApi(this);
    commands = new CommandsApi(this);

}

function isApiKey(apiKey: string) {
    return (apiKey.startsWith('pk-') || apiKey.startsWith('sk-'));
}

function isTokenExpired(token: string | null) {
    if (!token) {
        return true;
    }

    const payloadBase64 = token.split('.')[1];
    const decodedJson = Buffer.from(payloadBase64, 'base64').toString();
    const decoded = JSON.parse(decodedJson)
    const exp = decoded.exp;
    const currentTime = Date.now();
    return (currentTime <= exp * 1000 - EXPIRATION_THRESHOLD);
}
