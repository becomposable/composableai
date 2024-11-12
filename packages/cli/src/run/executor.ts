import { ComposableClient } from "@becomposable/client";
import { ExecutionRun, RunDataStorageLevel } from "@becomposable/common";

export class ExecutionQueue {
    requests: ExecutionRequest[] = [];

    constructor(public size = 4) {
    }

    add(request: ExecutionRequest) {
        this.requests.push(request);
    }

    async run(onBatch: (completed: ExecutionRun[]) => void, onChunk?: ((chunk: any) => void)) {
        const chunkSize = this.size;
        const out: ExecutionRun[] = [];
        const requests = this.requests;
        for (let i = 0; i < requests.length; i += chunkSize) {
            const chunk = requests.slice(i, i + chunkSize);
            const res = await Promise.all(chunk.map(request => request.run(onChunk)));
            out.push(...res);
            onBatch(out);
        }
        return out;
    }

}

function convertRunData(raw_run_data: any): RunDataStorageLevel | undefined {
    const levelStr: string =  typeof raw_run_data === 'string' ? raw_run_data.toUpperCase() : "";
    return Object.values(RunDataStorageLevel).includes(levelStr as RunDataStorageLevel) ? levelStr as RunDataStorageLevel : undefined;
}

export class ExecutionRequest {

    runNumber?: number;

    constructor(
        public readonly client: ComposableClient,
        public interactionSpec: string, // namespace:name@version
        public data: any,
        public options: Record<string, any>) {
    }

    async run(onChunk?: ((chunk: any) => void)): Promise<ExecutionRun> {
        const options = this.options;


        const run = await this.client.interactions.executeByName(this.interactionSpec, {
            data: this.data,
            config: {
                environment: typeof options.env === 'string' ? options.env : undefined,
                model: typeof options.model === 'string' ? options.model : undefined,
                temperature: typeof options.temperature === 'string' ? parseFloat(options.temperature) : undefined,
                run_data: convertRunData(options.runData),
            },
            tags: options.tags ? options.tags.trim().split(/\s,*\s*/) : undefined
        }, onChunk);

        // add count number in the run
        if (this.runNumber != null) {
            (run as any).runNumber = this.runNumber;
        }
        return run;
    }
}
