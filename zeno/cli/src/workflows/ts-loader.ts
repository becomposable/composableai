import { DSLWorkflowSpec } from "@composableai/zeno-common";
import { rmSync } from "fs";
import { resolve } from "path";
import * as ts from "typescript";
import { ValidationError, validateWorkflow } from "./validation.js";

function compile(fileNames: string[], options: ts.CompilerOptions): string[] | undefined {
    let program = ts.createProgram(fileNames, {
        ...options,
        listEmittedFiles: true,
    } satisfies ts.CompilerOptions);
    let emitResult = program.emit();

    let allDiagnostics = ts
        .getPreEmitDiagnostics(program)
        .concat(emitResult.diagnostics);

    allDiagnostics.forEach(diagnostic => {
        if (diagnostic.file) {
            let { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start!);
            let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
            console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
        } else {
            console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
        }
    });

    return emitResult.emittedFiles;
}


function tryDeleteFile(file: string) {
    try {
        rmSync(file)
    } catch (_er: any) {
        // ignore
    }
}

export function loadTsWorkflowDefinition(file: string): Promise<DSLWorkflowSpec> {
    if (!file.endsWith('.ts')) {
        throw new Error("Not a type script file: " + file);
    }
    file = resolve(file);
    const emittedFiles = compile([file], {
        skipLibCheck: true,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ESNext,
        strict: true,
        noEmitOnError: true,
    });
    if (!emittedFiles || emittedFiles.length === 0) {
        process.exit(1);
    }
    const emittedFile = emittedFiles[0];
    return import(emittedFile).then(module => {
        if (!module.default || typeof module.default !== "object") {
            throw new ValidationError("Workflow module does not export a default object");
        }
        return validateWorkflow(module.default);
    }).finally(() => tryDeleteFile(emittedFile));
}
