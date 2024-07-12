import { Command } from "commander";
import { getClient } from "../client.js";


export function requestPublicKey(program: Command, projectId: string | undefined, options: Record<string, any>) {
    getClient(program).apikeys.requestPublicKey({
        name: options.name || undefined,
        ttl: options.ttl ? parseInt(options.ttl) : undefined,
        projectId: projectId
    }).then((key) => {
        console.log(key);
    });
}


export function requestJWT(program: Command) {
        getClient(program).getAuthToken().then((res) => {
            console.log(res.token);
        });
}
