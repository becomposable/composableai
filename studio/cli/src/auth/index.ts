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


export function requestJWT(program: Command, apiKey: string | undefined) {
    if (apiKey) {
        getClient(program).apikeys.getAuthToken(apiKey).then((token) => {
            console.log(token);
        });
    } else {
        getClient(program).getAuthToken().then((token) => {
            console.log(token);
        });
    }
}
