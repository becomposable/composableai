import { ApiTopic, ClientBase } from "api-fetch-client";


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

}
