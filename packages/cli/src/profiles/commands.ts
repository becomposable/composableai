import colors from 'ansi-colors';
import enquirer from "enquirer";
import { config } from "./index.js";
const { prompt } = enquirer;

export async function listProfiles() {
    const selected = config.current?.name;
    for (const profile of config.profiles) {
        console.log(profile.name + (selected === profile.name ? " " + colors.symbols.check : ""));
    }
    if (!config.profiles.length) {
        console.log("No profiles are defined. Run `cpcli config create` to add a new profile.");
        console.log();
        const r: any = await prompt({
            type: "confirm",
            name: 'create',
            message: "Do you want to create a profile now?",
        })
        if (r.create) {
            return createProfile();
        }
    }
}

export async function useProfile(name?: string) {
    if (!name) {
        name = await selectProfile("Select the profile to use");
    }
    config.use(name).save();
}

export function showProfile(name?: string) {
    if (!name) {
        if (config.profiles.length === 0) {
            console.log('No profiles are defined. Run `cpcli config create` to add a new profile.');
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


export function deleteProfile(name: string) {
    config.remove(name).save();
}

export async function createProfile(name?: string, target?: string) {
    const format = (value: string) => value.trim();
    const questions: any[] = [];
    if (!name) {
        questions.push({
            type: 'input',
            name: 'name',
            message: "Profile name",
            format,
            validate: (value: string) => {
                const v = value.trim();
                if (!v) {
                    return "Profile name cannot be empty";
                }
                if (config.hasProfile(v)) {
                    return `A profile named "${v}" already exists`;
                }
                return true;
            }
        });
    }
    if (!target) {
        questions.push({
            type: 'select',
            name: 'target',
            message: "Target environment",
            choices: ['local', 'dev', 'staging (not yet impl)', 'prod', 'custom'],
            initial: 'dev',
        });
    }

    if (questions.length > 0) {
        const response: any = await prompt(questions)
        if (!name) {
            name = response.name;
        }
        if (!target) {
            target = response.target;
        }
    }

    config.createProfile(name!, target!).start();
}

export async function updateProfile(name?: string) {
    if (!name) {
        name = await selectProfile("Select the profile to update");
    }
    const profile = config.getProfile(name!);
    if (!profile) {
        console.error(`Profile ${name} not found`);
        return;
    }
    config.updateProfile(name).start();
}

export function updateCurrentProfile() {
    if (!config.current) {
        console.log("No profile is selected. Run `cpcli config use <name>` to select a profile");
        process.exit(1);
    }
    config.updateProfile(config.current.name).start();
}


async function selectProfile(message = "Select the profile") {
    const response: any = await prompt({
        type: 'select',
        name: 'name',
        message,
        choices: config.profiles.map(p => p.name)
    })
    return response.name as string;
}