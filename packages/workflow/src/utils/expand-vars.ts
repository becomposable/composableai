
const VARS_RX = /\${\s*([^}]+)\s*}/g;

/**
 * Given an expression containing ${name} variables, replace them with the properties from the vars object.
 * Nested property paths are also supported, e.g. ${section.name}
 * @param expr
 * @param vars
 */
export function expandVars(expr: string, vars: Record<string, any>) {
    return expr.replace(VARS_RX, (_: string, name: string) => {
        const path = name.split('.');
        const value = resolveProp(vars, path);
        if (value === undefined) {
            return `${name}`; // return back the expression
        } else {
            return String(value);
        }
    });
}

function resolveProp(object: object, path: string[]) {
    let value: any = object;
    for (const part of path) {
        if (value === undefined) {
            return undefined;
        }
        value = value[part];
    }
    return value;
}