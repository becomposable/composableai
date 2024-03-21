import { JSONSchema4 } from "json-schema";
import { InteractionRefWithSchema, PopulatedInteraction } from "../interaction.js";
import { PromptSegmentDefType } from "../prompt.js";
import { PromptRole } from "@llumiverse/core";

export function mergePromptsSchema(interaction: InteractionRefWithSchema | PopulatedInteraction) {
    const props: Record<string, JSONSchema4> = {};
    let required: string[] = [];
    if (!interaction.prompts) return null;
    for (const prompt of interaction.prompts) {
        if (prompt.template?.inputSchema?.properties) {
            const schema = prompt.template?.inputSchema;
            if (schema.required) {
                for (const prop of schema.required as string[]) {
                    if (!required.includes(prop)) required.push(prop);
                }
            }
            Object.assign(props, schema.properties);
        } else if (prompt.type === PromptSegmentDefType.chat) {
            Object.assign(props, {
                chat: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            role: {
                                type: 'string',
                                enum: [PromptRole.assistant, PromptRole.user]
                            },
                            content: { type: 'string' },
                        },
                        required: ['role', 'content']
                    }
                }
            });
            required.push('chat');
        }
    }
    return Object.keys(props).length > 0 ? { properties: props, required } as JSONSchema4 : null;
}
