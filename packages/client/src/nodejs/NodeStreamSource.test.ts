import { Readable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { NodeStreamSource } from './NodeStreamSource.js';

describe('NodeStreamSource', () => {
    it('reads the whole Node.js stream', async () => {
        const source = new NodeStreamSource(Readable.from([Buffer.from('he'), Buffer.from('llo')]), 'a.txt');
        expect(await new Response(source.stream).text()).toBe('hello');
    });

    it('destroys the Node.js stream when cancelled before reading', async () => {
        const stream = Readable.from(['unread']);
        const source = new NodeStreamSource(stream, 'a.txt');
        await source.stream.cancel();
        expect(stream.destroyed).toBe(true);
    });
});
