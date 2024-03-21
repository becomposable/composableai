import { Command } from "commander";
import { resolve } from "path";
import { getClient } from "../client.js";
import { Spinner, restoreCursotOnExit } from "../utils/console.js";
import { writeJsonFile } from "../utils/stdio.js";

export function genTestData(program: Command, interactionId: string, options: Record<string, any>) {
    const count = options.count ? parseInt(options.count) : 1;
    const message = options.message || undefined;
    const output = options.output || undefined;
    const temperature = options.temperature ? parseFloat(options.temperature) : undefined;
    const spinner = new Spinner('dots');
    spinner.prefix = "Generating data. Please be patient ";
    spinner.start();

    getClient(program).interactions.generateTestData(interactionId, {
        count,
        message,
        config: {
            environment: options.env,
            model: options.model || undefined,
            temperature,
        }
    }).then((result) => {
        spinner.done();
        if (output) {
            const file = resolve(output);
            writeJsonFile(file, result);
            console.log('Data saved in: ', output);
        }
        console.log();
        console.log(result);
    }).catch(err => {
        spinner.done(false);
        console.log('Failed to generate data:', err.message);
    });
}

restoreCursotOnExit();
