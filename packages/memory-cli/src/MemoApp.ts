import { resolve } from "path";
import { Builder, BuildOptions } from "@becomposable/memory";
import { mkdtempSync, rmSync } from "fs";
import { importTsFile } from "./ts-loader.js";

class App {
    builder?: Builder;

    async run(script: string, options: BuildOptions): Promise<void> {
        const tmpdir = mkdtempSync('becomposable-memo-');
        try {
            this.builder = new Builder({ ...options, tmpdir: tmpdir });
            const resolvedScript = resolve(script);
            let module: any;
            if (resolvedScript.endsWith('.ts')) {
                module = await importTsFile(resolvedScript);
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
            rmSync(tmpdir, { recursive: true });
        }
    }
}


// singleton instance
const MemoApp = new App();

// we expose the instance through the global context so that it can be accessed from the memory-commands module
(globalThis as any).__becomposable_memo_builder_app__ = MemoApp;

export default MemoApp;
