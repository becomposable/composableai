/**
 * @module access-control
 * @description
 * Access control interfaces
 */

import { ProjectRoles } from "./project.js";


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