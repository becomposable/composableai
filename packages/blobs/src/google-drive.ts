import { Auth, drive_v3 } from 'googleapis';
import { basename } from "path";
import { Readable } from 'stream';
import { UnsupportedBlobOperationError } from './UnsupportedOperationError.js';
import { AbstractReadableBlob, Blob, FileStorage } from "./storage.js";

export const defaultTargetServiceAccount = 'google-drive-reader@dengenlabs.iam.gserviceaccount.com';
const defaultScopes = ['https://www.googleapis.com/auth/drive.readonly'];

export async function getImpersonatedGoogleAuth(
    targetServiceAccount = defaultTargetServiceAccount,
    scopes = defaultScopes
) {
    const auth = new Auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });

    const { credential } = await auth.getApplicationDefault();

    return new Auth.Impersonated({
        sourceClient: credential,
        delegates: [],
        targetPrincipal: targetServiceAccount,
        targetScopes: scopes,
        lifetime: 500,
    })

}

export class GoogleDriveFileStorage implements FileStorage {
    readonly name: string = "GoogleDrive";

    drive: drive_v3.Drive;
    constructor(driveOrAuth?: drive_v3.Drive | string | Auth.BaseExternalAccountClient | Auth.OAuth2Client | Auth.GoogleAuth | undefined) {
        if (driveOrAuth instanceof drive_v3.Drive) {
            this.drive = driveOrAuth;
        } else {
            this.drive = new drive_v3.Drive({
                auth: driveOrAuth
            });
        }
    }

    static async connectImpersonated(
        targetServiceAccount = 'google-drive-reader@dengenlabs.iam.gserviceaccount.com',
        scopes = ['https://www.googleapis.com/auth/drive.readonly']) {
        console.log("Connecting to google drive as", targetServiceAccount);
        const auth = await getImpersonatedGoogleAuth(targetServiceAccount, scopes);
        return new GoogleDriveFileStorage(auth);
    }

    validateUri(uri: string): boolean {
        return uri.startsWith("gdrive://");
    }

    async resolve(uri: string): Promise<Blob> {
        if (!this.validateUri(uri)) {
            throw new Error(`Invalid file URI for ${this.name}: ${uri}`);
        }
        const fileId = uri.substring(9);
        if (!fileId) {
            throw new Error("Invalid google drive URI: " + uri);
        }
        try {
            const resp = await this.drive.files.get({
                supportsAllDrives: true,
                fileId,
                fields: 'id, name, mimeType, version, webContentLink, createdTime, modifiedTime, description, md5Checksum, originalFilename',
            });
            return new GoogleDriveBlob(this, resp.data);
        } catch (err: any) {
            console.log("Error fetching file", err);
            if (err.code === 404) {
                return new GoogleDriveMissingBlob(this, fileId, uri);
            } else {
                throw err;
            }
        }
    }

    async getByPath(path: string): Promise<Blob> {
        let url;
        if (path.startsWith('/')) {
            url = "https://drive.google.com" + path;
        } else {
            url = "https://drive.google.com/" + path
        }
        return this.resolve(url);
    }
}

export class GoogleDriveBlob extends AbstractReadableBlob {

    constructor(public storage: GoogleDriveFileStorage, public file: drive_v3.Schema$File) {
        super();
    }

    get id() {
        return this.file.id!;
    }

    get name() {
        return this.file.name!;
    }

    get contentDisposition() {
        return undefined; // not supported
    }

    get mimeType() {
        //if document, we are going to download a word representation, set the mimetype
        if (this.file.mimeType === 'application/vnd.google-apps.document') {
            return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        }
        return this.file.mimeType!;
    }

    get md5Hash() {
        return this.file.md5Checksum ?? undefined;
    }

    get metadata() {
        return {
            kind: this.file.kind,
            etag: this.file.version,
            mimeType: this.file.mimeType,
            createdTime: this.file.createdTime,
            modifiedTime: this.file.modifiedTime,
            description: this.file.description,
            md5Checksum: this.file.md5Checksum,
            originalFilename: this.file.originalFilename
        };
    }

    async getDownloadUrl(): Promise<string> {
        return this.file.webContentLink!;
    }
    async getPublicUrl(): Promise<string> {
        return this.file.webContentLink!;
    }
    async exists(): Promise<boolean> {
        return true;
    }

    async read(): Promise<Readable> {

        //if document, we are going to download a word representation
        if (this.file.mimeType === 'application/vnd.google-apps.document') {
            const r = await this.storage.drive.files.export({
                fileId: this.id,
                mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            }, {
                responseType: 'stream'
            });
            return r.data;
        }

        const r = await this.storage.drive.files.get({
            supportsAllDrives: true,
            fileId: this.id,
            alt: 'media'
        }, {
            responseType: 'stream'
        });
        return r.data;
    }

}


export class GoogleDriveMissingBlob extends AbstractReadableBlob {
    constructor(public storage: GoogleDriveFileStorage, public id: string, public uri: string) {
        super();
    }

    get name() {
        return basename(this.uri);
    }
    get metadata() {
        return {};
    }

    get contentDisposition() {
        return undefined;
    }

    get md5Hash() {
        return undefined;
    }

    getDownloadUrl(): Promise<string> {
        throw new UnsupportedBlobOperationError(`File ${this.uri} doesn't exists.`);
    }
    getPublicUrl(): Promise<string> {
        throw new UnsupportedBlobOperationError(`File ${this.uri} doesn't exists.`);
    }
    async exists(): Promise<boolean> {
        return false;
    }
    read(): Promise<Readable> {
        throw new UnsupportedBlobOperationError(`File ${this.uri} doesn't exists.`);
    }

}
