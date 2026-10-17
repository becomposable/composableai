import { describe, expect, it } from 'vitest';
import { validateApiRequest } from '../api-contract/index.js';

const request = {
    grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
    subject_token: 'signed-jwt',
    subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
    federation_connection_id: '012345678901234567890123',
    project_id: '012345678901234567890124',
    resource: 'https://api.example.com/',
    scope: 'content:read',
};
describe('OIDC federation wire contracts', () => {
    it('accepts secretless exchanges and rejects missing selectors and unsupported token requests', () => {
        expect(validateApiRequest('OAuthTokenExchangeRequest', request).valid).toBe(true);
        for (const credentials of [{ client_id: 'integration' }, { client_secret: 'secret' }]) {
            expect(validateApiRequest('OAuthTokenExchangeRequest', { ...request, ...credentials }).valid).toBe(false);
        }
        expect(validateApiRequest('OAuthTokenExchangeRequest', { ...request, project_id: undefined }).valid).toBe(
            false,
        );
        expect(
            validateApiRequest('OAuthTokenExchangeRequest', { ...request, requested_token_type: 'refresh_token' })
                .valid,
        ).toBe(false);
        expect(validateApiRequest('OAuthTokenExchangeRequest', { ...request, actor_token: 'unsupported' }).valid).toBe(
            false,
        );
    });
    it('rejects excessive output lifetimes and symmetric signing algorithms', () => {
        const connection = {
            name: 'Customer',
            issuer: 'https://identity.example.com',
            external_id_claim: 'oid',
            allowed_audiences: ['backend'],
            allowed_algorithms: ['RS256'],
            subject_token_type: request.subject_token_type,
            allowed_project_ids: [request.project_id],
            allowed_scopes: ['content:read'],
            max_token_ttl_seconds: 300,
            enabled: true,
        };
        expect(validateApiRequest('OidcFederationConnectionPayload', connection).valid).toBe(true);
        for (const external_id_claim of [undefined, '', '   ', 42]) {
            expect(
                validateApiRequest('OidcFederationConnectionPayload', { ...connection, external_id_claim }).valid,
            ).toBe(false);
        }
        expect(
            validateApiRequest('OidcFederationConnectionPayload', { ...connection, max_token_ttl_seconds: 3600 }).valid,
        ).toBe(false);
        expect(
            validateApiRequest('OidcFederationConnectionPayload', { ...connection, allowed_algorithms: ['HS256'] })
                .valid,
        ).toBe(false);
    });
});
