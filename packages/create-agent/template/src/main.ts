/**
 * This is a generated file. Do not modify.
 */
import { resolveScriptFile, run } from "@dglabs/agent-runner";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { resolve } from 'path';

const pkg = readPackageJson();

const workflowBundle = await resolveScriptFile("./workflows-bundle.js", import.meta.url);
const activities = await import("./activities.js");

await run({
    workflowBundle,
    activities,
    domain: `org/${pkg.name}`
}).catch((err: any) => {
    console.error(err);
}).finally(() => {
    process.exit(0);
});


function readPackageJson() {
    const scriptPath = fileURLToPath(import.meta.url);
    const pkgFile = resolve(scriptPath, '../package.json')
    const content = readFileSync(pkgFile, "utf8");
    return JSON.parse(content);
}
