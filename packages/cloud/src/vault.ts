import { logger } from '@dglabs/logger';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

export class VaultClient {


    async getSecret(secretName: string) {
        
        const client = new SecretManagerServiceClient();
            
        logger.info('Getting secret from vault: ' + secretName);
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