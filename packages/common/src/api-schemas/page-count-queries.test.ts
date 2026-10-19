import { describe, expect, it } from 'vitest';
import { validateApiRequest } from '../api-contract/index.js';

// The list contracts whose `limit`/`offset` reach a Mongo `$skip`/`$limit` stage or a find `skip`, where a
// fraction or a negative count failed as a 500. `PageCountSchema` makes the contract enforcer answer 400.
const PAGED_COMPONENTS = [
    'ListTasksQuery',
    'ListAgentRunsQuery',
    'InteractionEndpointQuery',
    'RunSearchPayload',
    'ComplexCollectionSearchQuery',
    'CollectionMembersQuery',
    'ContentObjectTypeCatalogQuery',
    'ContentObjectTypeListQuery',
] as const;

describe('paged list contracts', () => {
    it.each(PAGED_COMPONENTS)('%s accepts whole, non-negative counts only', (component) => {
        expect(validateApiRequest(component, { limit: 0, offset: 20 }).valid).toBe(true);
        expect(validateApiRequest(component, { limit: 1.2 }).valid).toBe(false);
        expect(validateApiRequest(component, { offset: 1.2 }).valid).toBe(false);
        expect(validateApiRequest(component, { offset: -1 }).valid).toBe(false);
        expect(validateApiRequest(component, { limit: -1 }).valid).toBe(false);
    });
});
