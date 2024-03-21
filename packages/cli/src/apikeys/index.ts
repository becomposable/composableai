import { Command } from "commander";
import { getClient } from "../client.js";


export function requestPublicKey(program: Command, projectId: string | undefined, options: Record<string, any>) {
    getClient(program).apikeys.requestPublicKey({
        name: options.name || undefined,
        ttl: options.ttl ? parseInt(options.ttl) : undefined,
        projectId: projectId || undefined
    }).then((key) => {
        console.log(key);
    });
}
