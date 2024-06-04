import { ContentObjectType, ContentObjectTypeItem, ContentObjectTypeLayout, CreateContentObjectTypePayload } from "@composableai/zeno-common";
import { ApiTopic, ClientBase } from "api-fetch-client";


export class TypesApi extends ApiTopic {

    constructor(parent: ClientBase) {
        super(parent, "/api/v1/store/types");
    }

    list(): Promise<ContentObjectTypeItem[]> {
        return this.get('/');
    }

    layouts(): Promise<ContentObjectTypeLayout[]> {
        return this.get('/', {
            query: { layout: true }
        });
    }

    retrieve(typeId: string): Promise<ContentObjectType> {
        return this.get(`/${typeId}`);
    }

    getTypeByName(typeName: string): Promise<ContentObjectType> {
        return this.get("/", {
            query: { name: typeName }
        });
    }

    update(typeId: string, payload: Partial<CreateContentObjectTypePayload>): Promise<ContentObjectType> {
        return this.put(`/${typeId}`, {
            payload
        });
    }

    create(payload: CreateContentObjectTypePayload): Promise<ContentObjectType> {
        return this.post(`/`, {
            payload
        });
    }

    delete(id: string) {
        return this.del(`/${id}`);
    }

}