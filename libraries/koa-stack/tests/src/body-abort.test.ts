import type { AddressInfo } from 'node:net';
import { LazyBody } from '@koa-stack/body';
import Koa from 'koa';
import { describe, expect, test } from 'vitest';

describe('Request body read after the client hung up', () => {
    test('answers 499 instead of a 500 "stream is not readable"', async () => {
        const app = new Koa();
        LazyBody.install(app);
        const failure = new Promise<{ status?: number; message: string }>((resolve) => {
            app.use(async (ctx) => {
                // The client is gone before the body is read.
                ctx.req.destroy();
                try {
                    await ctx.payload;
                    resolve({ message: 'body was read' });
                } catch (err: unknown) {
                    const error = err as Error & { status?: number };
                    resolve({ status: error.status, message: error.message });
                }
            });
        });
        const server = app.listen(0);
        try {
            const { port } = server.address() as AddressInfo;
            await fetch(`http://127.0.0.1:${port}/`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: '{"a":1}',
            }).catch(() => undefined);

            expect(await failure).toEqual({
                status: 499,
                message: 'Client closed the request before its body was read',
            });
        } finally {
            server.close();
        }
    });
});
