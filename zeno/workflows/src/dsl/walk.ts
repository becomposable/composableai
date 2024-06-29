
export function walkObject(obj: any, visit: (key: string | number | undefined, value: any) => void) {
    _walkObject(undefined, obj, visit);
}

function _walkObject(key: string | number | undefined, obj: any, visit: (key: string | number | undefined, value: any) => void) {
    const type = typeof obj;
    if (!obj || type !== 'object' || obj instanceof Date) {
        visit(key, obj);
    } else if (Array.isArray(obj)) {
        for (let i = 0, l = obj.length; i < l; i++) {
            _walkObject(i, obj[i], visit);
        }
        visit(key, obj);
    } else if (obj[Symbol.iterator] === 'function') {
        let i = 0;
        for (const value of obj) {
            _walkObject(i++, value, visit);
        }
        visit(key, obj);
    } else {
        for (const key of Object.keys(obj)) {
            _walkObject(key, obj[key], visit);
        }
        visit(key, obj);
    }
}