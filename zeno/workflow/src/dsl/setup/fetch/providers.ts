import { StudioClient } from "@composableai/studio-client";
import { ZenoClient } from "@composableai/zeno-client";
import { FindPayload } from "@composableai/zeno-common";
import { DataProvider } from "./DataProvider.js";
import { FetchContext } from "./index.js";

function useMongoId(query: Record<string, any>) {
    if (query.id) {
        const result = { ...query, _id: query.id }
        delete (result as any).id;
        return result;
    }
    return query;
}

export class DocumentProvider extends DataProvider {
    static ID = "document";
    constructor(public client: ZenoClient) {
        super(DocumentProvider.ID, true);
    }

    doFetch(payload: FindPayload): Promise<Record<string, any>[]> {
        const query = useMongoId(payload.query);
        return this.client.objects.find({
            query, select: payload.select, limit: payload.limit
        });
    }

    static factory(context: FetchContext) {
        return new DocumentProvider(context.zeno);
    }
}

export class DocumentTypeProvider extends DataProvider {
    static ID = "document_type";
    constructor(public client: ZenoClient) {
        super(DocumentTypeProvider.ID, true);
    }

    doFetch(payload: FindPayload): Promise<Record<string, any>[]> {
        const query = useMongoId(payload.query);
        return this.client.types.find({
            query, select: payload.select, limit: payload.limit
        });
    }

    static factory(context: FetchContext) {
        return new DocumentTypeProvider(context.zeno);
    }
}

export class InteractionRunProvider extends DataProvider {
    static ID = "interaction_run";
    constructor(public client: StudioClient) {
        super(DocumentProvider.ID, true);
    }

    doFetch(payload: FindPayload): Promise<Record<string, any>[]> {
        const query = useMongoId(payload.query);
        return this.client.runs.find({
            query, select: payload.select, limit: payload.limit
        });
    }

    static factory(context: FetchContext) {
        return new InteractionRunProvider(context.studio);
    }

}