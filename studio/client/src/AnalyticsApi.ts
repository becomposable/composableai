import { RunAnalyticsQuery, RunAnalyticsResult } from "@composableai/studio-common";
import { ApiTopic, ClientBase } from "api-fetch-client";




export default class AnalyticsApi extends ApiTopic {

    constructor(parent: ClientBase) {
        super(parent, "/api/v1/analytics")
    }

    runs(params: RunAnalyticsQuery): Promise<RunAnalyticsResult[]> {

        return this.post('/runs', { payload: params });

    }


}
