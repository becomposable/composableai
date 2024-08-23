import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { Auth } from 'googleapis';

export class VaultClient {


    async getSecret(secretName: string) {
        
        console.log(`Getting secret ${secretName} from vault`);
        const auth = new Auth.GoogleAuth();

        console.log('Creating secret manager client');
        const client = new SecretManagerServiceClient({
            auth: auth
        });
            
        console.log('Getting secret version');
        const [version] = await client.accessSecretVersion({
            name: `projects/${process.env.GOOGLE_PROJECT_ID}/secrets/${secretName}/versions/latest`,
        });
        const secret = version.payload?.data

        if (!secret) {
            throw new Error(`Failed to get secret ${secretName} from vault`);
        }

        if (typeof secret !== 'string') {
            return (secret as Buffer).toString('utf-8')
        } else {
            return secret
        }

    }

}