import mongoose from 'mongoose';


export interface RepositoryLogger {
    info: (...args: any[]) => void;
    debug: (...args: any[]) => void;
    error: (...args: any[]) => void;
}

/**
 * Base class for db name providers
 */
export class DbName {
    constructor(public name: string) {
    }
    toString() {
        return this.name;
    }
}

export interface MultiTenantRepositoryOptions {
    url: string;
    connectOptions?: mongoose.ConnectOptions;
    logger?: RepositoryLogger;
}

export abstract class MultiTenantRepository<ModelT extends Record<string, any>, DbNameT extends DbName | string = string> {
    url: string;
    logger?: RepositoryLogger;

    databases: Record<string, MultiTenantDatabase & ModelT> = {};
    connectOptions: mongoose.ConnectOptions;

    constructor(opts: MultiTenantRepositoryOptions) {
        this.url = opts.url;
        this.logger = opts.logger || console;
        this.connectOptions = {
            retryWrites: true,
            // close connection after 30 seconds of inactivity
            socketTimeoutMS: 30000,
            ignoreUndefined: true,
            writeConcern: {
                w: 'majority',
                wtimeout: 1000
            },
            ...opts.connectOptions
        };
    }

    protected _createConnection(name: string, dbName: DbNameT) {
        const conn = mongoose.createConnection(this.url, {
            ...this.connectOptions,
            dbName: name
        });
        conn.set('strict', false);
        conn.set('strictQuery', false);
        this.logger?.info(`Connected to database: ${name} on ${this.url} as ${this.connectOptions.user}`);

        const db = this.createDatabase(conn, name, dbName);

        this.initDbContent(db).catch((err) => {
            this.logger?.info(`Error initializing database ${name}: ${err}`);
        });

        return db;
    }

    db(dbName: DbNameT) {
        if (!dbName) throw new Error("dbName is required");
        const name = typeof dbName === 'string' ? dbName : dbName.name;
        let db = this.databases[name];
        if (!db) {
            db = this._createConnection(name, dbName);
            this.databases[name] = db;
        }
        return db;
    }

    close(dbName: string) {
        let db = this.databases[dbName];
        if (db) {
            this.logger?.info(`Closing db connection to ${dbName}`);
            db.connection.close();
            delete this.databases[dbName];
            return true;
        }
        return false;
    }

    shutdown() {
        this.logger?.info("Shutting down all db connections ...");
        const dbs = this.databases;
        const promises = [];
        for (const db of Object.values(dbs)) {
            promises.push(db.connection.close());
        }
        this.databases = {};
        return Promise.all(promises);
    }

    createDatabase(connection: mongoose.Connection, name: string, dbName: DbNameT): MultiTenantDatabase & ModelT {
        const db: MultiTenantDatabase & ModelT = new MultiTenantDatabase(this as any, connection, name) as any;
        const model = this.createModel(connection, dbName);
        Object.assign(db, model);
        return db;
    }

    abstract createModel(connection: mongoose.Connection, dbName: DbNameT): ModelT;

    //@ts-ignore
    async initDbContent(db: MultiTenantDatabase & ModelT) {
        // do initialization here
    }

}


export class MultiTenantDatabase {
    logger?: { info: (msg: string) => void };
    constructor(public service: MultiTenantRepository<any>, public connection: mongoose.Connection, public name: string) {
        this.logger = service.logger;
    }

    close() {
        return this.service.close(this.name);
    }

}
