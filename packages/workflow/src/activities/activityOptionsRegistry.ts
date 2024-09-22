import { ActivityOptions } from "@temporalio/workflow";
import { executeInteractionActivityOptions } from "./executeInteraction.js";
import { guessOrCreateDocumentTypeActivityOptions } from "./guessOrCreateDocumentType.js";

// TODO don't use registerActivityOptions
console.log(`Loading activity options registry`);

// key: activity name
// value: activity options
export const activityOptionsRegistry: Record<string, ActivityOptions> = {
    [guessOrCreateDocumentTypeActivityOptions.name]: guessOrCreateDocumentTypeActivityOptions.options,
    [executeInteractionActivityOptions.name]: executeInteractionActivityOptions.options,
};

export function getActivityOptionsOrDefault(name: string, defaultOptions: ActivityOptions): ActivityOptions {
    const opts = activityOptionsRegistry[name];
    if (opts) {
        // merge default options with the activity-specific options
        const result = {
            ...defaultOptions,
            ...opts,
            retry: {
                ...defaultOptions.retry,
                ...opts.retry,
            },
        };
        console.log(`Options exist. Using activity options for "${name}"`, { options: result });
        return result;
    }
    console.log(`Options do not exist. Using default activity options for "${name}"`, { options: defaultOptions });
    return defaultOptions;
}