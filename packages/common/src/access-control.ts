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
    expires_at?: Date;
    created_at?: Date;
    updated_at?: Date;
}

export interface ACECreatePayload extends
    Omit<AccessControlEntry, "created_at" | "updated_at"> {
}

export interface ACEUpdatePayload extends Partial<ACECreatePayload> {
}