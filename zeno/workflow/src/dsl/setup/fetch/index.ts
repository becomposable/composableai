import { StudioClient } from "@composableai/studio-client";
import { ZenoClient } from "@composableai/zeno-client";
import { ActivityFetchSpec } from "@composableai/common";
import { DataProvider } from "./DataProvider.js";


const factories: Record<string, ((context: FetchContext, source?: string) => DataProvider)> = {};

export interface FetchContext {
    studio: StudioClient,
    zeno: ZenoClient,
}

export function registerFetchProviderFactory(name: string, factory: ((context: FetchContext) => DataProvider)) {
    factories[name] = factory;
}

export function getFetchProvider(context: FetchContext, fetchSpec: ActivityFetchSpec) {
    const factory = factories[fetchSpec.type];
    if (!factory) {
        throw new Error("Unknown data provider: " + fetchSpec.source);
    }
    return factory(context, fetchSpec.source);
}
