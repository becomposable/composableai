import { describe, expect, it } from 'vitest';
import { type AuthTokenPayload, PrincipalType } from './apikey.js';
import { hasAppInstallationAccess } from './apps.js';

const installation = {
    id: 'eu-install',
    project: 'project',
    instance_key: 'eu',
    manifest: { name: 'salesforce' },
};
function token(overrides: Partial<AuthTokenPayload> = {}): AuthTokenPayload {
    return {
        sub: 'user',
        name: 'User',
        type: PrincipalType.User,
        account: { id: 'account', name: 'Account' },
        accounts: [],
        account_roles: [],
        project: { id: 'project', name: 'Project', account: 'account' },
        apps: ['salesforce'],
        iss: 'issuer',
        aud: 'audience',
        exp: 9999999999,
        ...overrides,
    };
}

describe('installation authorization compatibility', () => {
    it('limits legacy app grants to default installations', () => {
        expect(hasAppInstallationAccess(token(), installation)).toBe(false);
        expect(hasAppInstallationAccess(token(), { ...installation, instance_key: 'default' })).toBe(true);
        expect(hasAppInstallationAccess(token(), { ...installation, instance_key: undefined })).toBe(true);
    });
    it('does not expand a specific installation grant to siblings', () => {
        const principal = token({ app_installations: { version: 1, project_id: 'project', ids: ['eu-install'] } });
        expect(hasAppInstallationAccess(principal, installation)).toBe(true);
        expect(hasAppInstallationAccess(principal, { ...installation, id: 'us-install' })).toBe(false);
        expect(hasAppInstallationAccess(principal, { ...installation, id: 'default', instance_key: 'default' })).toBe(
            false,
        );
    });
    it('treats an explicitly empty claim as authoritative even for default app-name grants', () => {
        const principal = token({ app_installations: { version: 1, project_id: 'project', ids: [] } });
        expect(hasAppInstallationAccess(principal, { ...installation, instance_key: 'default' })).toBe(false);
    });
    it('requires matching token and grant project contexts', () => {
        const principal = token({ app_installations: { version: 1, project_id: 'other', ids: ['eu-install'] } });
        expect(hasAppInstallationAccess(principal, installation)).toBe(false);
        expect(hasAppInstallationAccess(token(), { ...installation, project: 'other', instance_key: 'default' })).toBe(
            false,
        );
    });
    it('separates functional access from UI visibility per installation', () => {
        const principal = token({
            app_installations: {
                version: 1,
                project_id: 'project',
                ids: ['eu-install'],
                ui_restrictions: ['eu-install'],
            },
        });
        expect(hasAppInstallationAccess(principal, installation)).toBe(true);
        expect(hasAppInstallationAccess(principal, installation, true)).toBe(false);
    });
});
