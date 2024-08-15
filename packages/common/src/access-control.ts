/**
 * @module access-control
 * @description
 * Access control interfaces
 */

import { ProjectRoles } from "./project.js";

export enum Permission {
    read = "read",
    execute = "execute",
    create = "create",
    update = "update",
    delete = "delete",
    invite = "invite",
    request_pk = "request_pk",
    manage_billing = "manage_billing",
    manage_account = "manage_account",
    manage_roles = "manage_roles",
    manage_apikeys = "manage_apikeys",
    access_protected = "access_protected", // can access protected endpoints like apikeys, account data, user info (i.e. emails) etc
}

export enum AccessControlledResource {
    project = "project",
    environment = "environment",
    account = "account",
    interaction = "interaction",
}


export interface AccessControlEntry {
    role: ProjectRoles;
    resource: string; //objectId
    principal: string; //objectId
    type: AccessControlledResource;
    tags?: string[];
    expires_at?: string;
    created_at?: string;
    updated_at?: string;
    id: string;
}

export interface ACECreatePayload extends
    Omit<AccessControlEntry, "created_at" | "updated_at" | "id" > {
}

export interface ACEUpdatePayload extends Partial<ACECreatePayload> {
}


export interface AcesQueryOptions {

    level?: 'resource' | 'project' | 'account'
    resource?: string
    principal?: string
    role?: string
    type?: AccessControlledResource
    
}