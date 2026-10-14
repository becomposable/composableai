import { describe, expect, it } from 'vitest';
import { validateApiRequest } from '../api-contract/index.js';

describe('AppInstallationPayload.oauth_client contract', () => {
    it.each([
        { mode: 'create', redirect_uris: ['https://example.vercel.app/app'] },
        { mode: 'reuse', client_id: 'vts_existing' },
        { mode: 'none' },
    ])('accepts configuration %j', (oauth_client) => {
        expect(validateApiRequest('AppInstallationPayload', { app_id: 'app', oauth_client }).valid).toBe(true);
    });
    it.each([
        { mode: 'create', redirect_uris: [] },
        { mode: 'reuse', client_id: '' },
        { mode: 'reuse', client_id: 'vts_existing', app_id: 'forged' },
        { mode: 'unknown' },
    ])('rejects incomplete or forged configuration %j', (oauth_client) => {
        expect(validateApiRequest('AppInstallationPayload', { app_id: 'app', oauth_client }).valid).toBe(false);
    });
});
