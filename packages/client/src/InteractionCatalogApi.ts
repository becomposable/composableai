import { ApiTopic, type ClientBase } from '@vertesia/api-fetch-client';
import type {
    CatalogAgentSearchQuery,
    CatalogCallSearchQuery,
    CatalogInteractionRef,
    CatalogSearchResult,
    InteractionStatus,
    ResolvedCatalogInteraction,
} from '@vertesia/common';

export class InteractionCatalogApi extends ApiTopic {
    constructor(parent: ClientBase) {
        super(parent, '/api/v1/interactions/catalog');
    }

    /**
     * List all project interactions
     */
    list(query: { status?: InteractionStatus; tag?: string } = {}): Promise<CatalogInteractionRef[]> {
        return this.get('/', {
            query,
        });
    }

    /**
     * List all stored interactions
     */
    listStoredInteractions(query: { status?: InteractionStatus; tag?: string } = {}): Promise<CatalogInteractionRef[]> {
        return this.get('/stored', {
            query,
        });
    }

    /**
     * List sys interactions
     */
    listSysInteractions(tag?: string): Promise<CatalogInteractionRef[]> {
        return this.get(`/sys`, {
            query: {
                tag,
            },
        });
    }

    /**
     * Search the system and stored project interactions configured as agents
     * (`agent_runner_options.is_agent`). Returns the matching agents with their tag counts and total.
     * App-provided interactions are not included.
     */
    listAgents(query: CatalogAgentSearchQuery = {}): Promise<CatalogSearchResult> {
        return this.get('/agents', { query });
    }

    /**
     * Search the system and stored project interactions that are not agents: basic, tool and skill calls.
     * Returns the matching calls with their tag counts and total. App-provided interactions are not included.
     */
    listCalls(query: CatalogCallSearchQuery = {}): Promise<CatalogSearchResult> {
        return this.get('/calls', { query });
    }

    /**
     * List sys interactions
     */
    listAppInteractions(appName: string, tag?: string): Promise<CatalogInteractionRef[]> {
        return this.get(`/apps/${appName}`, {
            query: {
                tag,
            },
        });
    }

    /**
     * List all app interactions
     */
    listAllAppInteractions(tag?: string): Promise<CatalogInteractionRef[]> {
        return this.get(`/apps`, {
            query: {
                tag,
            },
        });
    }

    /**
     * Resolve an interaction by ID to its complete executable definition.
     * @param id Interaction id
     */
    resolve(id: string): Promise<ResolvedCatalogInteraction> {
        return this.get(`/resolve/${id}`);
    }
}
