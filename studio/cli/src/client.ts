import { StudioClient } from "@composableai/studio-client";
import { Command } from "commander";
import { config } from "./config/index.js";


let _client: StudioClient | undefined;
export function getClient(program: Command) {
    if (!_client) {
        _client = createClient(program);
    }
    return _client;
}

function createClient(program: Command) {
    const profile = config.current;
    const options = program.opts();

    const env = {
        apikey: options.apikey || profile?.apikey || process.env.COMPOSABLE_PROMPTS_APIKEY,
        serverUrl: options.server || profile?.serverUrl || process.env.COMPOSABLE_PROMPTS_SERVER_URL || 'https://api.composableprompts.com',
        projectId: options.project || profile?.projectId || process.env.COMPOSABLE_PROMPTS_PROJECT_ID || undefined,
        sessionTags: profile?.sessionTags ? profile.sessionTags.split(/\s*,\s*/) : 'cli',
    }

    return new StudioClient(env)

}