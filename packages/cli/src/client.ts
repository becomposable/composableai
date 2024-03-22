import { StudioClient } from "@composableai/client";
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
    const env = {
        apikey: profile?.apikey || process.env.COMPOSABLE_PROMPTS_APIKEY,
        serverUrl: profile?.serverUrl || process.env.COMPOSABLE_PROMPTS_SERVER_URL || 'https://api.composableprompts.com',
        projectId: profile?.projectId || process.env.COMPOSABLE_PROMPTS_PROJECT_ID,
        sessionTags: profile?.sessionTags ? profile.sessionTags.split(/\s*,\s*/) : 'cli',
    }

    const serverUrl = program.getOptionValue('server');
    if (serverUrl) {
        env.serverUrl = serverUrl;
    }
    const apikey = program.getOptionValue('apikey');
    if (apikey) {
        env.apikey = apikey;
    }
    const projectId = program.getOptionValue('project');
    if (projectId) {
        env.projectId = projectId;
    }

    if (apikey) {
        env.apikey = apikey;
    }
    if (serverUrl) {
        env.serverUrl = serverUrl;
    }
    if (projectId) {
        env.projectId = projectId;
    }

    return new StudioClient(env)
}