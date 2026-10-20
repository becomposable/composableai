import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@temporalio/activity', () => ({
    log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const toolExitCode = vi.hoisted(() => ({ value: 0 }));

// Stand-in for mutool and markitdown: write the `-o` target, then exit with the configured code.
vi.mock('node:child_process', () => ({
    spawn: vi.fn((_tool: string, args: string[]) => {
        const child = new EventEmitter() as EventEmitter & { stderr: EventEmitter };
        child.stderr = new EventEmitter();
        setImmediate(() => {
            if (toolExitCode.value === 0) {
                fs.writeFileSync(args[args.indexOf('-o') + 1], 'converted text');
            }
            child.emit('exit', toolExitCode.value);
            child.emit('close', toolExitCode.value);
        });
        return child;
    }),
}));

import { markdownWithMarkitdown } from './markitdown.js';
import { mutoolPdfToText, pdfExtractPages } from './mutool.js';

function openDescriptorCount(): number {
    // /dev/fd lists this process's open descriptors on both Linux and macOS.
    return fs.readdirSync('/dev/fd').length;
}

describe.each([
    { name: 'mutoolPdfToText', convert: (buffer: Buffer) => mutoolPdfToText(buffer) },
    { name: 'markdownWithMarkitdown', convert: (buffer: Buffer) => markdownWithMarkitdown(buffer, 'docx') },
])('$name temporary files', ({ convert }) => {
    let tempDir: string;

    beforeEach(() => {
        toolExitCode.value = 0;
        tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'conversion-test-')));
        vi.stubEnv('TMPDIR', tempDir);
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('should return the converted text and leave no file or descriptor behind', async () => {
        const before = openDescriptorCount();

        for (let i = 0; i < 10; i++) {
            await expect(convert(Buffer.from('input'))).resolves.toBe('converted text');
        }

        expect(openDescriptorCount()).toBe(before);
        expect(fs.readdirSync(tempDir)).toEqual([]);
    });

    it('should leave no file or descriptor behind when the tool fails', async () => {
        toolExitCode.value = 1;
        const before = openDescriptorCount();

        await expect(convert(Buffer.from('input'))).rejects.toThrow('exited with code 1');

        expect(openDescriptorCount()).toBe(before);
        expect(fs.readdirSync(tempDir)).toEqual([]);
    });
});

describe('conversion temporary files', () => {
    let tempDir: string;

    beforeEach(() => {
        toolExitCode.value = 0;
        tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'conversion-test-')));
        vi.stubEnv('TMPDIR', tempDir);
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('should give markitdown an input file with a dotted extension', async () => {
        await markdownWithMarkitdown(Buffer.from('input'), 'docx');

        const [, args] = vi.mocked(spawn).mock.calls.at(-1) ?? [];
        expect(args?.[0]).toMatch(/[^.]\.docx$/);
    });

    it('should remove the pdfExtractPages work directory when mutool fails', async () => {
        toolExitCode.value = 1;

        await expect(pdfExtractPages(Buffer.from('%PDF'), [1])).rejects.toThrow('exited with code 1');

        expect(fs.readdirSync(tempDir)).toEqual([]);
    });
});
