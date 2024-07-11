import { existsSync, mkdirSync } from "fs";
import os from "os";
import { join } from "path";
import { readJsonFile, writeJsonFile } from "../utils/stdio.js";
import { ConfigPayload, ConfigResult, startConfigSession } from "./server/index.js";


export function getConfigFile(path?: string) {
    const dir = join(os.homedir(), '.cpcli');
    if (!path || path === '/') {
        return dir;
    } else {
        return join(dir, path);
    }
}

export type ConfigUrlRef = "local" | "dev" | "staging" | "prod" | string;
export function getConfigUrl(value: ConfigUrlRef) {
    switch (value) {
        case "local":
            return "https://localhost:5173/cli";
        case "dev":
            return "https://console.composableprompts.dev/cli";
        case "staging":
            throw new Error("Staging env. not yet supported");
        case "prod":
            return "https://console.composableprompts.com/cli";
        default:
            if (value.startsWith("http://") || value.startsWith("https://")) {
                return value;
            } else {
                throw new InvalidConfigUrlError("Custom targets must be a valid http or https URL.");
            }
    }
}

export interface Profile {
    name: string;
    config_url: string;
    apikey: string;
    account: string;
    project: string;
    studio_server_url: string;
    zeno_server_url: string;
    session_tags?: string;
}


interface ProfilesData {
    default: string;
    profiles: Profile[];
}

export class ConfigureProfile {
    constructor(public config: Config, public data: Partial<Profile>, public isNew: boolean) {
        this.data = data;
        this.isNew = !data.name;
    }

    getConfigPayload(): ConfigPayload {
        return {
            profile: this.data.name,
            account: this.data.account,
            project: this.data.project,
        }
    }

    applyConfigResult(result: ConfigResult) {
        const oldName = this.data.name!;
        this.data.name = result.profile;
        this.data.account = result.account;
        this.data.project = result.project;
        this.data.studio_server_url = result.studio_server_url;
        this.data.zeno_server_url = result.zeno_server_url;
        this.data.apikey = result.token;
        this.config.remove(oldName);
        this.config.add(this.data as Profile);
        if (this.isNew) {
            this.config.use(this.data.name!);
        }
        this.config.save();
    }

    start() {
        startConfigSession(this.data.config_url!, this.getConfigPayload(), this.applyConfigResult.bind(this));
    }
}

export class Config {
    current?: Profile;
    profiles: Profile[];

    constructor(data?: ProfilesData) {
        this.profiles = data?.profiles || [];
        if (data?.default) {
            this.use(data.default);
        }
    }

    hasProfile(name: string) {
        return !!this.profiles.find(p => p.name === name);
    }

    getProfile(name: string) {
        return this.profiles.find(p => p.name === name);
    }

    use(name: string) {
        this.current = this.profiles.find(p => p.name === name);
        if (!this.current) {
            console.error(`No configuration named ${name} found`);
        }
        return this;
    }

    add(profile: Profile) {
        if (this.profiles.find(p => p.name === profile.name)) {
            console.error(`A configuration named ${profile.name} already exists`);
        } else {
            this.profiles.push(profile);
        }
        this.use(profile.name);
        return this;
    }

    update(profile: Profile) {
        const existingProfile = this.profiles.find(p => p.name === profile.name);
        if (existingProfile) {
            Object.assign(existingProfile, profile);
        } else {
            console.error(`Configuration named ${profile.name} doesn't exists`);
        }
        return this;
    }

    replace(existingProfile: Profile, newProfile: Profile) {
        const index = this.profiles.indexOf(existingProfile);
        if (index > -1) {
            this.profiles[index] = newProfile;
        }
        return this;
    }

    remove(name: string) {
        const i = this.profiles.findIndex(p => p.name === name);
        if (i > -1) {
            this.profiles.splice(i, 1);
            if (this.current?.name === name) {
                this.current = undefined;
            }
        }
        return this;
    }

    createProfile(name: string, target: ConfigUrlRef) {
        let config_url = getConfigUrl(target);
        return new ConfigureProfile(this, { name, config_url }, true);
    }

    updateProfile(name: string) {
        const profile = this.getProfile(name);
        if (!profile) {
            throw new ProfileNotFoundError(`Profile not found: ${name}.`);
        }
        return new ConfigureProfile(this, profile, false);
    }

    createOrUpdateProfile(name: string, target?: ConfigUrlRef): ConfigureProfile {
        let config_url = target && getConfigUrl(target);
        const data = this.getProfile(name);
        if (config_url) { // create a new profile on config_url
            if (data) {
                throw new ProfileAlreadyExistsError(`Profile ${name} already exists.`);
            } else {
                return new ConfigureProfile(this, { name, config_url }, true);
            }
        } else { // update an existing profile
            if (data) {
                return new ConfigureProfile(this, data, false);
            } else {
                throw new ProfileNotFoundError(`Profile not found: ${name}.`);
            }
        }
    }

    save() {
        const dir = getConfigFile();
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
        const file = getConfigFile('profiles.json');
        writeJsonFile(file, {
            default: this.current?.name,
            profiles: this.profiles,
        });
        return this;
    }

    load() {
        try {
            const data = readJsonFile(getConfigFile('profiles.json')) as ProfilesData;
            this.profiles = data.profiles;
            if (data.default) {
                this.use(data.default)
            } else {
                this.current = undefined;
            }
        } catch (err: any) {
            if (err.code !== 'ENOENT') {
                throw err;
            }
        }
        return this;
    }
}

export class ProfileAlreadyExistsError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ProfileAlreadyExistsError';
    }
}

export class ProfileNotFoundError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ProfileNotFoundError';
    }
}

export class InvalidConfigUrlError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'InvalidConfigUrlError';
    }
}

const config = new Config().load();

export { config };
