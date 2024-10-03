import { Builder, BuildOptions } from "@becomposable/memory";
import { mkdtempSync, rmSync } from "fs";
import { resolve } from "path";
import { importTsFile } from "./ts-loader.js";
import { AsyncLocalStorage } from "node:async_hooks";

const als = new AsyncLocalStorage<Builder>();

export function getBuilder() {
    const builder = als.getStore();
    if (!builder) {
        throw new Error("No builder found in the current context.");
    }
    return builder;
}

export function build(script: string, options: BuildOptions = {}): Promise<void> {
    const builder = new Builder(options);
    return als.run(builder, async () => {
        return _build(builder, script);
    });
}

async function _build(builder: Builder, script: string): Promise<void> {
    const tmpdir = mkdtempSync('becomposable-memo-');
    try {
        const resolvedScript = resolve(script);
        let module: any;
        if (resolvedScript.endsWith('.ts')) {
            try {
                module = await importTsFile(resolvedScript);
            } catch (er: any) {
                console.error(er);
                process.exit(1);
            }
        } else {
            module = await import(resolvedScript);
        }
        const output = module?.default;
        if (!output) {
            throw new Error("No default export found in the script.");
        }
        await builder.build(output);
    } finally {
        rmSync(tmpdir, { recursive: true });
    }
}
/*
class MemoApp {
    builder?: Builder;

    static getBuilder() {
        const builder = als.getStore();
        if (!builder) {
            throw new Error("No builder found in the current context.");
        }
        return builder;
    }

    async run(script: string, options: BuildOptions): Promise<void> {
        const tmpdir = mkdtempSync('becomposable-memo-');
        const builder = new Builder({ ...options, tmpdir: tmpdir });
        return als.run(builder, async () => {
            return this._run(script, options);
        });
    }

    async _run(script: string, options: BuildOptions): Promise<void> {
        const tmpdir = mkdtempSync('becomposable-memo-');
        try {
            this.builder = new Builder({ ...options, tmpdir: tmpdir });
            const resolvedScript = resolve(script);
            let module: any;
            if (resolvedScript.endsWith('.ts')) {
                try {
                    module = await importTsFile(resolvedScript);
                } catch (er: any) {
                    console.error(er);
                    process.exit(1);
                }
            } else {
                module = await import(resolvedScript);
            }
            const output = module?.default;
            if (!output) {
                throw new Error("No default export found in the script.");
            }
            await this.builder.build(output);
        } finally {
            this.builder = undefined;
            Builder.instance = undefined;
            rmSync(tmpdir, { recursive: true });
        }
    }
}


// we expose the instance through the global context so that it can be accessed from the memory-commands module
//(globalThis as any).__becomposable_memo_builder_app__ = MemoApp;

export default MemoApp;
*/