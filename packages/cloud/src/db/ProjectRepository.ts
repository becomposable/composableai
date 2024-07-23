import { getTenantId } from "@composableai/common";
import mongoose from "mongoose";
import { VaultClient } from "../vault.js";
import { DbName, MultiTenantDatabase, MultiTenantRepository, MultiTenantRepositoryOptions, RepositoryLogger } from "./MultiTenantRepository.js";

export class ProjectDbName extends DbName {
    constructor(prefix: string, public accountId: string, public projectId: string) {
        super(prefix + '_' + getTenantId(accountId, projectId));
    }
}

export interface ProjectDbModel {
    accountId: string;
    projectId: string;
}

export abstract class ProjectRepository<ModelT extends ProjectDbModel> extends MultiTenantRepository<ModelT, ProjectDbName> {

    constructor(opts: MultiTenantRepositoryOptions, public prefix: string) {
        super(opts);
    }


    useDb(accountId: string, projectId: string): MultiTenantDatabase & ModelT {
        return this.db(new ProjectDbName(this.prefix, accountId, projectId));
    }

    useProjectDb(accountId: string, projectId: string): MultiTenantDatabase & ModelT {
        return this.db(new ProjectDbName(this.prefix, accountId, projectId));
    }

    getDbName(accountId: string, projectId: string) {
        return new ProjectDbName(this.prefix, accountId, projectId);
    }

    createModel(connection: mongoose.Connection, dbName: ProjectDbName): ModelT {
        const model = this.createMongooseModels(connection) as ModelT;
        model.projectId = dbName.projectId;
        model.accountId = dbName.accountId;
        return model;
    }

    abstract createMongooseModels(connection: mongoose.Connection): Omit<ModelT, keyof ProjectDbModel>;
}



export async function getRepositoryConfiguration(connectOptions?: mongoose.ConnectOptions, logger?: RepositoryLogger): Promise<MultiTenantRepositoryOptions> {
    const envType = process.env.ENVIRONMENT;
    if (!envType) {
        throw new Error('Missing required ENVIRONMENT environemnt variable. FAILED TO CONFIGURE DATABASE CONNECTION.');
    }

    const vault = new VaultClient();
    const url = process.env.DB_URL;

    if (!url) {
        throw new Error('Missing required DB_URL environment variable');
    }

    const [username, password] = await Promise.all([
        process.env.DB_USERNAME || vault.getSecret(`${envType}-DB_USERNAME`),
        process.env.DB_PASSWORD || vault.getSecret(`${envType}-DB_PASSWORD`)
    ]);

    if (!username) {
        throw new Error('Missing required DB_USERNAME environment variable');
    }
    if (!password) {
        throw new Error('Missing required DB_PASSWORD environment variable');
    }

    connectOptions = Object.assign(connectOptions || {}, { user: username, pass: password });
    return {
        url, connectOptions, logger
    }
}
