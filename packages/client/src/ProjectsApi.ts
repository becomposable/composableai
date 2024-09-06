import { ICreateProjectPayload, Project, ProjectRef } from "@becomposable/common";
import { ApiTopic, ClientBase } from "@becomposable/api-fetch-client";

export default class ProjectsApi extends ApiTopic {
    constructor(parent: ClientBase) {
        super(parent, "/api/v1/projects");
    }

    list(account?: string[]): Promise<ProjectRef[]> {
        return this.get('/', { query: { account } });
    }

    retrieve(projectId: string): Promise<Project> {
        return this.get(`/${projectId}`);
    }

    create(payload: ICreateProjectPayload): Promise<Project> {
        return this.post('/', {
            payload
        });
    }

    update(projectId: string, payload: Partial<Project>): Promise<Project> {
        return this.put(`/${projectId}`, {
            payload
        });
    }


}
