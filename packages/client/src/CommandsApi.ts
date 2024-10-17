import { ApiTopic, ClientBase } from "@becomposable/api-fetch-client";
import { GenericCommandResponse } from "@becomposable/common";


/**
 * Various utility commands
 */

export default class CommandsApi extends ApiTopic {

    constructor(parent: ClientBase) {
        super(parent, "/api/v1/commands")
    }

    async isNamespaceAvailable(name: string): Promise<boolean> {
        return this.get(`/namespaces/${name}/is_available`).then((response) => response.available);
    }

    async initSamples(): Promise<GenericCommandResponse> {
        return this.post("/onboarding/init-samples");
    }

}
