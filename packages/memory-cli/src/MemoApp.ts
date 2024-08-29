import { resolve } from "path";
import { Builder, BuildOptions } from "@becomposable/memory";

class App {
    builder?: Builder;

    async run(script: string, options: BuildOptions): Promise<void> {
        try {
            this.builder = new Builder(options);
            const module = await import(resolve(script));
            const output = module.default;
            if (!output) {
                throw new Error("No default export found in the script.");
            }
            await this.builder.build(output);
        } finally {
            this.builder = undefined;
        }
    }
}


// singleton instance
const MemoApp = new App();

// we expose the instance through the global context so that it can be accessed from the memory-commands module
(globalThis as any).__becomposable_memo_builder_app__ = MemoApp;

export default MemoApp;
