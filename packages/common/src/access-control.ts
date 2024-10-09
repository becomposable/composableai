/**
 * @module access-control
 * @description
 * Access control interfaces
 */

import { ProjectRoles } from "./project.js";

export enum Permission {
    int_read = "interaction:read",
    int_write = "interaction:write",
    int_delete = "interaction:delete",

    int_execute = "interaction:execute",
    run_read = "run:read",
    run_write = "run:write",

    env_manage = "environment:manage",

    project_manage = "project:manage",
    project_key_create = "project:key:create",
    project_key_read = "project:key:read",

    account_read = "account:read",
    account_manage = "account:manage",
    manage_billing = "account:billing",


    content_read = "content:read",
    content_create = "content:create",
    content_update = "content:update",
    content_delete = "content:delete",

    content_admin = "content:admin", //manage schemas, workflows, rules

    workflow_run = "workflow:run",

    access_protected = "access_protected",

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
    Omit<AccessControlEntry, "created_at" | "updated_at" | "id"> {
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