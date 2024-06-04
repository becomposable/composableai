import colors from 'ansi-colors';
import enquirer from "enquirer";
import { Profile, config } from "./index.js";

const { prompt } = enquirer;

export function listProfiles() {
    const selected = config.current?.name;
    for (const profile of config.profiles) {
        console.log(profile.name + (selected === profile.name ? " " + colors.symbols.check : ""));
    }
    if (!config.profiles.length) {
        console.log("No profiles are defined");
    }
}

export function useProfile(name: string) {
    config.use(name).save();
}

export function showProfile(name?: string) {
    if (!name) {
        if (config.profiles.length === 0) {
            console.log('No profiles are defined (add -h for help on commands)');
            return;
        } else {
            console.log(JSON.stringify({
                default: config.current?.name,
                profiles: config.profiles,
            }, undefined, 4));
        }
    } else {
        const profile = config.getProfile(name);
        if (profile) {
            console.log(JSON.stringify(profile, undefined, 4));
        } else {
            console.error(`Profile ${name} not found`);
        }
    }
}

export async function updateProfile(name: string) {
    const profile = config.getProfile(name);
    if (!profile) {
        console.error(`Profile ${name} not found`);
        return;
    }
    const newProfile = await readProfile(profile);
    config.replace(profile, newProfile).save();
}

export function deleteProfile(name: string) {
    config.remove(name).save();
}

export async function addProfile() {
    const profile = await readProfile();
    profile && config.add(profile).save();
}

async function readProfile(defaults: Partial<Profile> = {}) {
    const format = (value: string) => value.trim();
    const profile = await prompt([
        {
            type: 'input',
            name: 'name',
            message: "Profile name",
            initial: defaults.name,
            format
        },
        {
            type: 'input',
            name: 'apikey',
            message: "API Key",
            initial: defaults.apikey,
            format
        },
        {
            type: 'input',
            name: 'projectId',
            message: "Project Id",
            initial: defaults.projectId,
            format
        },
        {
            type: 'input',
            name: 'serverUrl',
            message: "Server URL",
            initial: defaults.serverUrl || "default",
            format
        },
        {
            type: 'input',
            name: 'sessionTags',
            message: "Session Tags (comma separated list)",
            initial: "cli",
            format
        },

    ]) as Profile;

    if (profile.serverUrl === "default") {
        delete profile.serverUrl;
    }

    return profile;
}