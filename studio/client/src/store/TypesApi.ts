import { ContentObjectType, ContentObjectTypeItem, ContentObjectTypeLayout, CreateContentObjectTypePayload, FindPayload } from "@composableai/common";
import { ApiTopic, ClientBase } from "api-fetch-client";


export class TypesApi extends ApiTopic {

    constructor(parent: ClientBase) {
        super(parent, "/api/v1/types");
    }

    list(): Promise<ContentObjectTypeItem[]> {
        return this.get('/');
    }

    find(payload: FindPayload): Promise<ContentObjectType[]> {
        return this.post("/find", {
            payload
        });
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