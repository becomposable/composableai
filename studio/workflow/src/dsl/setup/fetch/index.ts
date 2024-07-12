import { ActivityFetchSpec } from "@composableai/common";
import { StudioClient } from "@composableai/client";
import { DataProvider } from "./DataProvider.js";


const factories: Record<string, ((client: StudioClient, source?: string) => DataProvider)> = {};


export function registerFetchProviderFactory(name: string, factory: ((client: StudioClient) => DataProvider)) {
    factories[name] = factory;
}

export function getFetchProvider(client: StudioClient, fetchSpec: ActivityFetchSpec) {
    const factory = factories[fetchSpec.type];
    if (!factory) {
        throw new Error("Unknown data provider: " + fetchSpec.source);
    }
    return factory(client, fetchSpec.source);
}
