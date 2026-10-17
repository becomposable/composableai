import { VertesiaClient } from '@vertesia/client';
import type { OidcFederationConnection } from '@vertesia/common';
import { validateApiRequest } from '@vertesia/common/api-contract';
import type { Command } from 'commander';
import { getClient } from '../client.js';
import { readFile, readStdin } from '../utils/stdio.js';

function print(value: unknown) {
    console.log(JSON.stringify(value, null, 2));
}

async function configuration(file: string) {
    const input: unknown = JSON.parse(file === '-' ? await readStdin() : readFile(file));
    const result = validateApiRequest('OidcFederationConnectionPayload', input);
    if (!result.valid) throw new Error('Invalid federation connection configuration');
    return result.data;
}

function replacement(connection: OidcFederationConnection, enabled: boolean) {
    const { id: _id, account_id: _account, ...payload } = connection;
    return { ...payload, enabled };
}

export function registerOidcFederationCommand(program: Command) {
    const command = program
        .command('oidc-federation')
        .description('Manage account-owned OIDC trust policies for existing SCIM users. All output is JSON.');
    command.command('list').action(async () => print(await (await getClient(program)).oidcFederation.list()));
    command
        .command('get <id>')
        .action(async (id: string) => print(await (await getClient(program)).oidcFederation.retrieve(id)));
    command
        .command('create')
        .requiredOption('--file <path>', 'Complete JSON configuration; - reads stdin')
        .action(async (options: { file: string }) => {
            const payload = await configuration(options.file);
            print(await (await getClient(program)).oidcFederation.create(payload));
        });
    command
        .command('update <id>')
        .description('Replace the complete trust policy; issuer is immutable.')
        .requiredOption('--file <path>', 'Complete JSON configuration; - reads stdin')
        .action(async (id: string, options: { file: string }) => {
            const payload = await configuration(options.file);
            print(await (await getClient(program)).oidcFederation.update(id, payload));
        });
    for (const [action, enabled] of [
        ['enable', true],
        ['disable', false],
    ] as const) {
        command.command(`${action} <id>`).action(async (id: string) => {
            const api = (await getClient(program)).oidcFederation;
            print(await api.update(id, replacement(await api.retrieve(id), enabled)));
        });
    }
    command
        .command('delete <id>')
        .option('-y, --yes', 'Confirm deletion of the trust policy')
        .action(async (id: string, options: { yes?: boolean }) => {
            if (!options.yes) throw new Error('Use --yes to confirm deletion. Disabling also blocks new exchanges.');
            print(await (await getClient(program)).oidcFederation.remove(id));
        });
    command
        .command('exchange')
        .description('Exchange an IdP JWT without a Vertesia login. Prints the short-lived credential to stdout.')
        .requiredOption('--sts-url <url>', 'Vertesia STS base URL')
        .requiredOption('--connection <id>', 'Federation connection ID')
        .requiredOption('--project <id>', 'Target project ID')
        .requiredOption('--resource <uri>', 'Target Vertesia API audience')
        .option(
            '--scope <scopes>',
            'Optional permission subset; defaults to the user’s current permissions within the trust policy',
        )
        .requiredOption(
            '--subject-token-file <path>',
            'IdP JWT file; - reads stdin (token is never a command argument)',
        )
        .option('--subject-token-type <type>', 'Configured subject token type', 'urn:ietf:params:oauth:token-type:jwt')
        .action(
            async (options: {
                stsUrl: string;
                connection: string;
                project: string;
                resource: string;
                scope?: string;
                subjectTokenFile: string;
                subjectTokenType: string;
            }) => {
                const url = new URL(options.stsUrl);
                if (
                    url.username ||
                    url.password ||
                    url.search ||
                    url.hash ||
                    url.pathname !== '/' ||
                    (url.protocol !== 'https:' &&
                        !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))
                ) {
                    throw new Error('STS URL must be an HTTPS origin (HTTP is allowed for localhost).');
                }
                const subjectToken = (
                    options.subjectTokenFile === '-' ? await readStdin() : readFile(options.subjectTokenFile)
                ).trim();
                const result = validateApiRequest('OAuthTokenExchangeRequest', {
                    grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
                    subject_token: subjectToken,
                    subject_token_type: options.subjectTokenType,
                    federation_connection_id: options.connection,
                    project_id: options.project,
                    resource: options.resource,
                    scope: options.scope,
                });
                if (!result.valid) throw new Error('Invalid exchange options or empty IdP token');
                const client = new VertesiaClient({
                    serverUrl: url.origin,
                    storeUrl: url.origin,
                    tokenServerUrl: url.origin,
                });
                print(await client.oauthServer.exchangeToken(result.data));
            },
        );
}
