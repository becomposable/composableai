import { ProjectRoles } from "./project.js";
import { AccountRef } from "./user.js";


export enum ApiKeyTypes {
    public = 'pk',
    secret = 'sk'
}
export interface ApiKey {
    id: string;
    name: string;
    type: ApiKeyTypes;
    role: ProjectRoles;
    maskedValue?: string; //masked value
    account: string; // the account id
    project: string; // the project id if any
    enabled: boolean;
    created_at: Date;
    updated_at: Date;
    expires_at?: Date; // in case of public key only
}


export interface CreateOrUpdateApiKeyPayload extends Partial<ApiKey> {

}

export interface ApiKeyWithValue extends Omit<ApiKey, 'maskedValue'> {
    value: string;
}


export interface CreatePublicKeyPayload {
    name?: string,
    projectId?: string,
    ttl?: number,
}

export interface AuthTokenPayload {
    subject: string;
    name: string;
    email?: string;

    type: 'user' | 'apikey';
    account: string;
    accounts: AccountRef[];
    project?: string;
    role?: string;

    iss: string; //issuer
    aud: string; //audience
    exp: number; //expires in (EPOC seconds)
}