import { EmbeddingsStatusResponse, GenericCommandResponse, ProjectConfigurationEmbeddings } from "@becomposable/common";
import { ApiTopic, ClientBase } from "@becomposable/api-fetch-client";


export class CommandsApi extends ApiTopic {

    constructor(parent: ClientBase) {
        super(parent, "/api/v1/commands");
    }

    embeddings = new EmbeddingsApi(this);

}

export class EmbeddingsApi extends ApiTopic {

    constructor(parent: ClientBase) {
        super(parent, "/embeddings");
    }

    async status(): Promise<EmbeddingsStatusResponse> {
        return this.get("/status");
    }

    async activate(config: Partial<ProjectConfigurationEmbeddings>): Promise<GenericCommandResponse> {

        if (!config.environment) {
            throw new Error("Invalid configuration: select environment");
        }

        return this.post("/enable", { payload: config });
    }

    async disable(): Promise<GenericCommandResponse> {
        return this.post("/disable");
    }

    async recalculate(): Promise<GenericCommandResponse> {
        return this.post("/recalculate");
    }

}