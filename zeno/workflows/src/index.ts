/**
 * 1. Activities are exported through the '/activities' named export in package.json.
 * Modify the `./activities/index.ts` if you want to modify activity exports
 * 2. Workflows are exported through the '/workflows' named export in package.json.
 * Modify the `./workflows.ts` file if you want to modify workflow exports
 * 3. Here we export the API to be used to validate workflows and the types reuired to create workflow TS definitions.
 */

//TODO may be export vars as a named export vars ?
export * from "./dsl/vars.js";

export * from "./activities/chunkDocument.js";
export * from "./activities/executeInteraction.js";
export * from "./activities/extractDocumentText.js";
export * from "./activities/generateDocumentProperties.js";
export * from "./activities/generateEmbeddings.js";
export * from "./activities/guessOrCreateDocumentType.js";
export * from "./activities/setDocumentStatus.js";

export * from "./activities/advanced/createDocumentTypeFromInteractionRun.js";
export * from "./activities/advanced/createOrUpdateDocumentFromInteractionRun.js";
export * from "./activities/advanced/updateDocumentFromInteractionRun.js";
