import { AccountRef } from "./user";

export interface ICreateProjectPayload {
    name: string;
    namespace: string;
    description?: string;
}
export enum ProjectRoles {
    owner = "owner", // all permissions
    admin = "admin", // all permissions
    project_admin = "project_admin", // all permissions but manage_account, manage_billing
    developer = "developer", // all permissions but manage_account, manage_billing, manage_roles, delete
    application = "application", // executor + request_pk
    executor = "executor", // can only read and execute interactions
    reader = "reader", // can only read (browse)
    billing = "billing", // can only manage billings
    member = "member", // can only access, but no specific permissions
}

export function isRoleIncludedIn(role: string, includingRole: string) {
    switch (includingRole) {
        case ProjectRoles.owner:
            return true; // includes billing to?
        case ProjectRoles.admin:
            return role !== ProjectRoles.billing && role !== ProjectRoles.owner;
        case ProjectRoles.developer:
            return role === ProjectRoles.developer;
        case ProjectRoles.billing:
            return role === ProjectRoles.billing;
        default:
            return false;
    }
}


export interface PopulatedProjectRef {
    id: string;
    name: string;
    account: AccountRef
}
export interface ProjectRef {
    id: string;
    name: string;
    account: string;
}

export enum ResourceVisibility {
    public = "public",
    account = "account",
    project = "project"
}


export interface ProjectConfiguration {

    human_context: string;

    default_environment?: string;
    default_model?: string;

    generate_embeddings: boolean;
    embeddings?: ProjectConfigurationEmbeddings

    datacenter?: string;
    storage_bucket?: string;

}

export interface ProjectConfigurationEmbeddings {
    environment: string;
    max_tokens: number;
    dimensions: number;
    model?: string;
}

export interface Project {
    id: string;
    name: string;
    namespace: string;
    description?: string;
    account: string;
    configuration: ProjectConfiguration;
    created_by: string,
    updated_by: string,
    created_at: Date;
    updated_at: Date;
}

export interface ProjectCreatePayload {
    name: string;
    description?: string;
}

export interface ProjectUpdatePayload extends Partial<Project> { }


export const ProjectRefPopulate = "id name account";


export interface EmbeddingsStatusResponse {
    status: string;
    embeddingRunsInProgress: number;
    totalRunsInProgress: number;
    totalIndexableObjects: number;
    embeddingsModels: string[];
    objectsWithEmbeddings: number;
    [string: string]: any;
}
