import { ProjectRef, ProjectRoles } from "./project.js";
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
    created_by: string,
    updated_by: string,
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

export interface AuthTokenResponse {
    token: string;
}

export interface AuthTokenPayload {
    sub: string
    name: string;
    email?: string;
    picture?: string;

    type: PrincipalType
    account: AccountRef;
    accounts: AccountRef[];
    project?: ProjectRef;
    projects: ProjectRef[];
    role?: string;

    iss: string; //issuer
    aud: string; //audience
    exp: number; //expires in (EPOC seconds)
}


export enum PrincipalType {
    User = "user",
    ApiKey = "apikey",
    ServiceAcount = "service_account",
}