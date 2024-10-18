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
    /**
     * @deprecated Use api_key_create (since 0.38.4)
     */
    project_key_create = "project:key:create",
    /**
     * @deprecated Use api_key_read (since 0.38.4)
     */
    project_key_read = "project:key:read",

    api_key_create = "api_key:create",
    api_key_read = "api_key:read",

    account_read = "account:read",
    account_manage = "account:manage",
    manage_billing = "account:billing",
    account_member = "account:member",


    content_read = "content:read",
    content_create = "content:create",
    content_update = "content:update",
    content_delete = "content:delete",

    content_admin = "content:admin", //manage schemas, workflows, rules

    workflow_run = "workflow:run",

    /**
     * @deprecated Use account_member (since 0.38.4)
     */
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