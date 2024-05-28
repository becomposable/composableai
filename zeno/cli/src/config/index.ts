import { existsSync, mkdirSync } from "fs";
import os from "os";
import { join } from "path";
import { readJsonFile, writeJsonFile } from "../utils/stdio.js";


function getConfigFile(path?: string) {
    const dir = join(os.homedir(), '.zeno');
    if (!path || path === '/') {
        return dir;
    } else {
        return join(dir, path);
    }
}

export interface Profile {
    name: string;
    apikey: string;
    projectId?: string;
    serverUrl?: string;
    sessionTags?: string;
}

interface ProfilesData {
    default: string;
    profiles: Profile[];
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



const config = new Config().load();

export { config };
