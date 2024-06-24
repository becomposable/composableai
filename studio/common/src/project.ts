export interface ICreateProjectPayload {
    name: string;
    description?: string;
}
export enum ProjectRoles {
    owner = "owner", // all permissions
    admin = "admin", // all permissions but manage_account
    developer = "developer", // all permissions but manage_account, manage_billing, manage_roles, delete
    application = "application", // executor + request_pk
    executor = "executor", // can only read and execute interactions
    reader = "reader", // can only read (browse)
    billing = "billing", // can only manage billings  
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

    default_environment?: string;
    default_model?: string;
    default_visibility: ResourceVisibility;

}

export interface Project {
    id: string;
    name: string;
    description?: string;
    account: string;
    configuration: ProjectConfiguration;
    created_at: Date;
    updated_at: Date;
}

export interface ProjectCreatePayload {
    name: string;
    description?: string;
}

export interface ProjectUpdatePayload {
    name?: string;
    description?: string;
}

export const ProjectRefPopulate = "id name account";