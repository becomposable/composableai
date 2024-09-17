import equal from 'fast-deep-equal';

function $exists(value: any, arg: boolean) {
    return (value !== undefined) === arg;
}
function $null(value: any, arg: boolean) {
    return (value == null) === arg;
}

function $eq(value: any, arg: any) {
    if (Array.isArray(arg)) {
        return equal(value, arg);
    } else if (typeof arg === 'object') {
        return equal(value, arg);
    } else {
        return value === arg;
    }
}
function $ne(value: any, arg: any) {
    return !$eq(value, arg);
}
function $or(value: any, arg: any[]) {
    return arg.some(c => matchCondition(value, c));
}
function $in(value: any, arg: any[]) {
    return arg.includes(value);
}
function $nin(value: any, arg: any[]) {
    return !$in(value, arg);
}
function $regexp(value: string, arg: string) {
    return new RegExp(arg).test(value);
}
function $endsWith(value: string, arg: string) {
    return value.endsWith(arg);
}
function $startsWith(value: string, arg: string) {
    return value.startsWith(arg);
}
function $contains(value: string, arg: string) {
    return value.includes(arg);
}
function $lt(value: number, arg: number) {
    return value < arg;
}
function $gt(value: number, arg: number) {
    return value > arg;
}
function $lte(value: number, arg: number) {
    return value <= arg;
}
function $gte(value: number, arg: number) {
    return value >= arg;
}

const conditionFns: Record<string, any> = {
    $exists, $null,
    $eq, $ne,
    $in, $nin,
    $regexp, $startsWith, $endsWith, $contains,
    $lt, $gt, $lte, $gte,
    $or,
}

export function matchCondition(value: any, conditions: Record<string, any>) {
    for (const key of Object.keys(conditions)) {
        const cond = conditionFns[key];
        if (!cond) {
            throw new Error(`Unknown condition: ${key}`);
        }
        if (!cond(value, conditions[key])) {
            return false;
        }
    }
    return true;
}