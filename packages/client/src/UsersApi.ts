import { User } from "@becomposable/common";
import { ApiTopic, ClientBase } from "api-fetch-client";




export default class UsersApi extends ApiTopic {

    constructor(parent: ClientBase) {
        super(parent, "/api/v1/users")
    }

    retrieve(userId: string): Promise<User> {
        return this.get('/' + userId);
    }


}
