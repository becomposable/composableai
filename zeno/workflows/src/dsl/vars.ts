import { ImportSpec } from "@composableai/zeno-common";
import { matchCondition } from "./conditions.js";

const FALLBACK_VALUE_SEP = "??";

function decodeLiteralValue(value: string) {
    if (value.startsWith("'") && value.endsWith("'")) {
        value = '"' + value.slice(1, -1).replace(/(?<!\\)"/g, '\\"') + '"'
    }
    return JSON.parse(value);
}

interface Value<T = any> {
    value: T;
}
class LiteralValue<T = any> implements Value<T> {
    constructor(public value: T) {
    }
}

export function splitPath(path: string) {
    if (path.indexOf('[') > -1) { // support array like paths
        path = path.replace(/\[(\d+)\]/g, '.$1');
    }
    return path.split('.');
}

/**
 * Get the property named by "name" of the given object
 * If an array is idnexed using a string key then a map is done and an array with the content of the properties with that name are returned
 * Ex: docs.text => will return an array of text properties of the docs array
 * @param object the obejct
 * @param name the name of the property.
 * @returns the property value
 */
function _prop(object: any, name: string) {
    if (object === undefined) {
        return undefined;
    }
    if (Array.isArray(object)) {
        const index = +name;
        if (isNaN(index)) {
            // map array to property
            return object.map(item => item[name]);
        } else {
            return object[index];
        }
    } else {
        return object[name];
    }

}

export function resolveField(object: any, path: string[]) {
    let p = object as any;
    if (!p) return p;
    if (!path.length) return p;
    const last = path.length - 1;
    for (let i = 0; i < last; i++) {
        p = _prop(p, path[i])
        if (!p) {
            return undefined;
        }
    }
    return _prop(p, path[last]);
}

class RefValue implements Value {
    constructor(public vars: Vars, public ref: string, public defaultValue?: any) {
    }
    get value() {
        if (this.vars.preserveRefs && this.vars.preserveRefs.has(this.ref)) {
            // return the stringified version of this ref expression
            return this.stringify();
        }
        const v = this.vars.get(this.ref);
        return v !== undefined ? v : this.defaultValue;
    }

    stringify() {
        return "${" + this.ref + "}";
    }
}
class PathRefValue implements Value {
    ref: string;
    path: string[];
    constructor(public vars: Vars, path: string[], public defaultValue?: any) {
        this.ref = path[0];
        this.path = path.slice(1);
        if (!path.length) {
            throw new Error("Invalid path reference: " + path.join('.'));
        }
    }
    get value() {
        if (this.vars.preserveRefs && this.vars.preserveRefs.has(this.ref)) {
            // return the stringified version of this ref expression
            return this.stringify();
        }
        const obj = this.vars.get(this.ref);
        const v = resolveField(obj, this.path)
        return v !== undefined ? v : this.defaultValue;
    }
    stringify() {
        return "${" + this.ref + '.' + this.path.join('.') + "}";
    }
}

class ExprValue implements Value {
    constructor(public vars: Vars, public parts: Value[]) {
    }
    get value() {
        const out: string[] = [];
        for (const seg of this.parts) {
            const v = seg.value;
            if (v !== undefined) {
                out.push(String(seg.value));
            }
        }
        return out.join('');
    }
    set() {
        throw new Error('Cannot set an expression value');
    }
}


export class Vars {
    map: Record<string, Value> = {};
    /**
     * This property is used when resolving params. It contains the list of references that should not be resolved to their value
     * but instead they need to return the string representation of the expression to eb able to regenrate another Vars instance with the same expression
     */
    //TODO this feature is no more used - it was replaced by importVars so we can now delete `preserveRefs`
    preserveRefs: Set<string> | undefined;

    constructor(vars?: Record<string, any>) {
        if (vars) {
            this.load(vars);
        }
    }

    load(vars: Record<string, any>) {
        for (const key of Object.keys(vars)) {
            const value = vars[key];
            this.map[key] = this.createValue(this, value);
        }
    }

    set(name: string, value: any) {
        this.map[name] = this.createValue(this, value);
    }

    get(name: string) {
        const value = this.map[name];
        if (value === undefined) {
            return undefined;
        }
        return value.value;
    }

    has(name: string) {
        return this.map[name] !== undefined;
    }

    isDefined(name: string) {
        const value = this.map[name];
        if (value === undefined) {
            return false;
        }
        return value.value !== undefined;
    }

    match(match: Record<string, any>) {
        for (const name of Object.keys(match)) {
            const value = this.resolveParamValue(name);
            if (!matchCondition(value, match[name])) {
                return false;
            }
        }
        return true;
    }

    resolveParamValue(path: string) {
        return this.createRefValue(path).value;
    }

    /**
     * Resolve all parameters in the given object.
     * @param params
     */
    resolveParams(params: Record<string, any>, preserveRefs?: Set<string>) {
        this.preserveRefs = preserveRefs;
        const out: Record<string, any> = {};
        try {
            for (const key of Object.keys(params)) {
                const value = params[key];
                const v = this.createValue(this, value);
                out[key] = v.value;
            }
        } finally {
            this.preserveRefs = undefined;
        }
        return out;
    }

    resolveParamsDeep(params: Record<string, any>, preserveRefs?: Set<string>) {
        const out: Record<string, any> = {};
        this.preserveRefs = preserveRefs;
        try {
            for (const key of Object.keys(params)) {
                const value = params[key];
                let v: any;
                if (!value) {
                    v = value;
                } else if (Array.isArray(value)) {
                    //TODO only one dimmensional arrays are supported for now
                    v = value.map(v => {
                        if (typeof v === 'object') {
                            return this.resolveParamsDeep(v);
                        } else {
                            return this.createValue(this, v).value;
                        }
                    });
                } else if (typeof value === 'object') {
                    v = this.resolveParamsDeep(value);
                } else {
                    v = this.createValue(this, value).value;
                }
                out[key] = v;
            }
        } finally {
            this.preserveRefs = undefined;
        }
        return out;
    }

    resolve(preserveRefs?: Set<string>): Record<string, any> {
        this.preserveRefs = preserveRefs;
        const out: Record<string, any> = {};
        try {
            for (const key of Object.keys(this.map)) {
                out[key] = this.map[key].value;
            }
        } finally {
            this.preserveRefs = undefined;
        }
        return out;
    }

    createRefValue(ref: string) {
        const index = ref.indexOf(FALLBACK_VALUE_SEP);
        let defaultValue: any;
        if (index > -1) {
            defaultValue = decodeLiteralValue(ref.substring(index + FALLBACK_VALUE_SEP.length).trim());
            ref = ref.substring(0, index).trim();
        }
        if (ref.indexOf('.') < 0 && ref.indexOf('[') < 0) {
            return new RefValue(this, ref, defaultValue);
        } else if (ref === '.' || ref.indexOf('..') > -1) {
            throw new Error("Invalid variable reference: " + ref)
        } else {
            return new PathRefValue(this, splitPath(ref), defaultValue);
        }
    }

    createValue(vars: Vars, obj: any) {
        if (!obj) {
            return new LiteralValue(obj);
        }
        if (typeof obj === 'string') {
            if (obj.indexOf('${') > -1) {
                const segments = obj.split(/(\${[^}]+})/);
                if (segments.length === 1) {
                    const seg = segments[0];
                    return this.createRefValue(seg.substring(2, seg.length - 1));
                }
                const parts: Value[] = [];
                for (const seg of segments) {
                    if (seg === '') continue;
                    if (seg.startsWith('${') && seg.endsWith('}')) {
                        parts.push(this.createRefValue(seg.substring(2, seg.length - 1)));
                    } else {
                        parts.push(new LiteralValue(seg));
                    }
                }
                if (parts.length === 1) {
                    return parts[0];
                } else {
                    return new ExprValue(vars, parts);
                }
            } else {
                return new LiteralValue(obj);
            }
        } else {
            return new LiteralValue(obj);
        }
    }

    createImportVars(importSpec: ImportSpec | undefined) {
        if (!importSpec || importSpec.length === 0) {
            return {};
        }
        const result: Record<string, any> = {};

        for (const importVar of importSpec) {
            if (typeof importVar === "string") {
                addImportVar(importVar, undefined, this, result);
            } else {
                for (const key of Object.keys(importVar)) {
                    addImportVar(importVar[key], key, this, result);
                }
            }
        }
        return result;
    }
}

function addImportVar(varPath: string, asName: string | undefined, vars: Vars, result: Record<string, any>) {
    let isRequired = false;
    if (varPath.endsWith("!")) {
        isRequired = true;
        varPath = varPath.slice(0, -1);
    }
    let value = vars.resolveParamValue(varPath);
    if (value === undefined && isRequired) {
        throw new Error(`Import variable ${varPath} is required but not found`);
    }
    result[asName || varPath] = value;
}