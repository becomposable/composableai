import { ActivityOptions } from "./types.js";
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

export function getOptionalActivityOptions(name: string): ActivityOptions | undefined {
    return activityOptionsRegistry[name];
}