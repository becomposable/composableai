import { describe, expect, it } from 'vitest';
import { normalizeToolCollection } from '../apps.js';
import { validateApiRequest } from './registry.js';

const collection = {
    type: 'mcp',
    id: 'graph',
    name: 'Graph',
    description: 'Graph',
    namespace: 'graph',
    url: 'https://example.com/{{tenant}}/mcp',
    auth: 'none',
};

describe('MCP connection parameter wire contracts', () => {
    it('accepts public defaults and secret declarations', () => {
        expect(
            validateApiRequest('ToolCollectionObject', {
                ...collection,
                parameters: { tenant: { default: 'common' }, key: { type: 'secret', required: true } },
                headers: { 'X-Key': '{{key}}' },
            }).valid,
        ).toBe(true);
    });
    it('rejects secret defaults and unsupported parameter names in emitted schemas', () => {
        expect(
            validateApiRequest('ToolCollectionObject', {
                ...collection,
                parameters: { key: { type: 'secret', default: 'plaintext' } },
            }).valid,
        ).toBe(false);
        expect(
            validateApiRequest('ToolCollectionObject', { ...collection, parameters: { 'bad-name': { default: 'x' } } })
                .valid,
        ).toBe(false);
    });
    it('accepts omission, replacement and explicit clearing at install/update', () => {
        for (const mcp_parameters of [
            undefined,
            {},
            { graph: { tenant: 'one', key: 'secret' } },
            { graph: { key: null } },
        ]) {
            expect(validateApiRequest('AppInstallationPayload', { app_id: 'app', mcp_parameters }).valid).toBe(true);
        }
        expect(
            validateApiRequest('AppInstallationPayload', { app_id: 'app', mcp_parameters: { graph: { key: 123 } } })
                .valid,
        ).toBe(false);
    });
});

it('preserves declared parameters when their names match platform endpoints', () => {
    const normalized = normalizeToolCollection(
        {
            type: 'mcp',
            id: 'graph',
            name: 'Graph',
            description: 'Graph',
            namespace: 'graph',
            url: 'https://example.com/{{store}}/mcp',
            parameters: { store: { default: 'tenant' } },
        },
        { store: 'https://platform.example.com' },
    );
    expect(normalized.url).toBe('https://example.com/{{store}}/mcp');
});
