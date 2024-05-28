import { ZenoClient } from "@composableai/zeno-client";
import { Command } from "commander";
import { config } from "./config/index.js";


let _client: ZenoClient | undefined;
export function getClient(program: Command) {
    if (!_client) {
        _client = createClient(program);
    }
    return _client;
}

function createClient(program: Command) {
    const profile = config.current;
    const env = {
        apikey: profile?.apikey || process.env.ZENO_APIKEY,
        serverUrl: profile?.serverUrl || process.env.ZENO_SERVER_URL || 'https://api.zeno.dot',
    }

    const serverUrl = program.getOptionValue('server');
    if (serverUrl) {
        env.serverUrl = serverUrl;
    }
    const apikey = program.getOptionValue('apikey');
    if (apikey) {
        env.apikey = apikey;
    }

    if (apikey) {
        env.apikey = apikey;
    }
    if (serverUrl) {
        env.serverUrl = serverUrl;
    }

    return new ZenoClient(env)
}