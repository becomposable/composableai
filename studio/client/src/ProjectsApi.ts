import { ClientBase, ApiTopic } from "api-fetch-client";
import { ICreateProjectPayload, Project } from "@composableai/studio-common";

export default class ProjectsApi extends ApiTopic {
    constructor(parent: ClientBase) {
        super(parent, "/api/v1/projects");
    }

    list(): Promise<Project[]> {
        return this.get('/');
    }

    retrieve(projectId: string): Promise<Project> {
        return this.get(`/${projectId}`);
    }

    create(payload: ICreateProjectPayload): Promise<Project> {
        return this.post('/', {
            payload
        });
    }
}
