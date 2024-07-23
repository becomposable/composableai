import { ActivityFetchSpec } from "@composableai/common";
import { ComposableClient } from "@composableai/client";
import { DataProvider } from "./DataProvider.js";


const factories: Record<string, ((client: ComposableClient, source?: string) => DataProvider)> = {};


export function registerFetchProviderFactory(name: string, factory: ((client: ComposableClient) => DataProvider)) {
    factories[name] = factory;
}

export function getFetchProvider(client: ComposableClient, fetchSpec: ActivityFetchSpec) {
    const factory = factories[fetchSpec.type];
    if (!factory) {
        throw new Error("Unknown data provider: " + fetchSpec.source);
    }
    return factory(client, fetchSpec.source);
}
