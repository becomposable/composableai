import { AuthTokenPayload } from '@composableai/common';
import jwt from 'jsonwebtoken';
import { VaultClient } from './vault.js';

let CERTIFICATE: string | undefined | null = undefined;
let SIGNING_KEY: string | undefined | null = undefined;

/**
 * Manage token signing and verification
 */

export async function signToken(payload: AuthTokenPayload): Promise<string> {
    const key = await getSigningKey();
    return jwt.sign(payload, key, { algorithm: 'RS256' });
}

export async function verifyAuthToken(token: string): Promise<AuthTokenPayload> {
    return getCertificate().then(key => jwt.verify(token, key, { algorithms: ['RS256'] }) as AuthTokenPayload);
}


export async function getSigningKey() {

    if (!SIGNING_KEY) {
        const vault = new VaultClient();
        const key = await vault.getSecret('auth-signing-key');
        SIGNING_KEY = key?.toString();
    }
    return SIGNING_KEY;
}

export async function getCertificate() {

    if (!CERTIFICATE) {
        const vault = new VaultClient();
        const cert = await vault.getSecret('auth-signing-cert');
        CERTIFICATE = cert?.toString();
    }

    if (!CERTIFICATE) {
        throw new Error('No auth certificate found');
    }

    return CERTIFICATE;
}
