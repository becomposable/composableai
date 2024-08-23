import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { GoogleAuth } from 'google-auth-library';


export class VaultClient {


    async getSecret(secretName: string) {
        0
        console.log(`Getting secret ${secretName} from vault`);
        const auth = new GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });
        const authClient = await auth.getClient();
        console.log('Credential type:', authClient.constructor.name);
        console.log('Credential token:', authClient.credentials.id_token);

        const client = new SecretManagerServiceClient();

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