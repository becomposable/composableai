import { readFileSync } from 'fs';
import { packageDir } from '../package.js';

const EXPR_RX = /\{\{\s*[a-zA-Z_][a-zA-Z_0-9]*\s*\}\}/g

const TEMPLATES: Record<string, string> = {};

export function expandVariables(template: string, vars: Record<string, string>) {
    return template.replace(EXPR_RX, (match) => {
        const key = match.substring(2, match.length - 2).trim()
        if (key in vars) {
            return vars[key] || ''
        } else {
            return match;
        }
    })
}

function loadTemplate(name: string) {
    let content = TEMPLATES[name];
    if (!content) {
        content = readFileSync(`${packageDir}/templates/${name}.tpl`, 'utf8')
        TEMPLATES[name] = content;
    }
    return content;
}

export function processTemplate(name: string, vars: Record<string, string>) {
    const content = loadTemplate(name);
    return expandVariables(content, vars);
}

