import { describe, expect, it, vi } from 'vitest';
import { VertesiaClient } from './client.js';
import OnboardingInvitesApi from './OnboardingInvitesApi.js';

describe('OnboardingInvitesApi', () => {
    it('uses only the provider credential on pre-membership routes', async () => {
        let request: Request | undefined;
        const fetcher = vi.fn(async (input: RequestInfo, init?: RequestInit) => {
            request = new Request(input, init);
            return Response.json({ status: 'added' });
        });
        const client = new VertesiaClient({
            serverUrl: 'https://api.example.test',
            storeUrl: 'https://api.example.test',
            fetch: fetcher,
        }).withAuthCallback(async () => 'Bearer provider-token');
        const api = new OnboardingInvitesApi(client);
        await api.accept('invite-id');
        expect(request?.url).toBe('https://api.example.test/auth/invites/invite-id');
        expect(request?.method).toBe('PUT');
        expect(request?.headers.get('authorization')).toBe('Bearer provider-token');
    });
});
