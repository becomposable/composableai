
export type ObjectKey = string | number | undefined;
export interface ObjectVisitor {
    onStartObject?: (key: ObjectKey, value: any) => void;
    onEndObject?: (key: ObjectKey, value: any) => void;
    onStartIteration?: (key: ObjectKey, value: Iterable<any>) => void;
    onEndIteration?: (key: ObjectKey, value: Iterable<any>) => void;
    onValue?: (key: ObjectKey, value: any) => void;
}

export interface AsyncObjectVisitor {
    onStartObject?: (key: ObjectKey, value: any) => Promise<void>;
    onEndObject?: (key: ObjectKey, value: any) => Promise<void>;
    onStartIteration?: (key: ObjectKey, value: Iterable<any>) => Promise<void>;
    onEndIteration?: (key: ObjectKey, value: Iterable<any>) => Promise<void>;
    onValue?: (key: ObjectKey, value: any) => Promise<void>;
}

export class ObjectWalker {
    supportIterators = false; // only array are supported by default
    constructor(supportIterators = false) {
        this.supportIterators = supportIterators;
    }
    walk(obj: any, visitor: ObjectVisitor) {
        this._walk(undefined, obj, visitor);
    }
    _walk(key: ObjectKey, obj: any, visitor: ObjectVisitor) {
        const type = typeof obj;
        if (!obj || type !== 'object' || obj instanceof Date) {
            visitor.onValue && visitor.onValue(key, obj);
        } else if (Array.isArray(obj)) {
            this._walkIterable(key, obj, visitor);
        } else if (this.supportIterators && obj[Symbol.iterator] === 'function') {
            this._walkIterable(key, obj, visitor);
        } else if (obj.constructor === Object) { // a plain object
            this._walkObject(key, obj, visitor);
        } else { // a random object - we treat it as a value
            visitor.onValue && visitor.onValue(key, obj);
        }
    }

    _walkIterable(key: ObjectKey, obj: any, visitor: ObjectVisitor) {
        visitor.onStartIteration && visitor.onStartIteration(key, obj);
        let i = 0;
        for (const value of obj) {
            this._walk(i++, value, visitor);
        }
        visitor.onEndIteration && visitor.onEndIteration(key, obj);
    }

    _walkObject(key: ObjectKey, obj: any, visitor: ObjectVisitor) {
        visitor.onStartObject && visitor.onStartObject(key, obj);
        for (const k of Object.keys(obj)) {
            this._walk(k, obj[k], visitor);
        }
        visitor.onEndObject && visitor.onEndObject(key, obj);
    }

    map(obj: any, mapFn: (key: ObjectKey, value: any) => any) {
        const visitor = new MapVisitor(mapFn);
        this.walk(obj, visitor);
        return visitor.result;
    }
}


export class AsyncObjectWalker {
    supportIterators = false; // only array are supported by default
    constructor(supportIterators = false) {
        this.supportIterators = supportIterators;
    }
    async walk(obj: any, visitor: AsyncObjectVisitor) {
        await this._walk(undefined, obj, visitor);
    }
    async _walk(key: ObjectKey, obj: any, visitor: AsyncObjectVisitor) {
        const type = typeof obj;
        if (!obj || type !== 'object' || obj instanceof Date) {
            visitor.onValue && (await visitor.onValue(key, obj));
        } else if (Array.isArray(obj)) {
            await this._walkIterable(key, obj, visitor);
        } else if (this.supportIterators && obj[Symbol.iterator] === 'function') {
            await this._walkIterable(key, obj, visitor);
        } else if (obj.constructor === Object) { // a plain object
            await this._walkObject(key, obj, visitor);
        } else { // a random object - we treat it as a value
            visitor.onValue && (await visitor.onValue(key, obj));
        }
    }

    async _walkIterable(key: ObjectKey, obj: any, visitor: AsyncObjectVisitor) {
        visitor.onStartIteration && (await visitor.onStartIteration(key, obj));
        let i = 0;
        for (const value of obj) {
            await this._walk(i++, value, visitor);
        }
        visitor.onEndIteration && (await visitor.onEndIteration(key, obj));
    }

    async _walkObject(key: ObjectKey, obj: any, visitor: AsyncObjectVisitor) {
        visitor.onStartObject && (await visitor.onStartObject(key, obj));
        for (const k of Object.keys(obj)) {
            await this._walk(k, obj[k], visitor);
        }
        visitor.onEndObject && (await visitor.onEndObject(key, obj));
    }

    async map(obj: any, mapFn: (key: ObjectKey, value: any) => Promise<any>) {
        const visitor = new AsyncMapVisitor(mapFn);
        await this.walk(obj, visitor);
        return visitor.result;
    }
}

class MapVisitor implements ObjectVisitor {
    result: any;
    current: any;
    stack: any[] = [];
    constructor(private mapFn: (key: ObjectKey, value: any) => any) { }

    onStartObject(key: ObjectKey) {
        if (key === undefined) {
            this.result = {};
            this.current = this.result;
        } else {
            this.stack.push(this.current);
            const obj = {};
            this.current[key] = obj;
            this.current = obj;
        }
    }
    onEndObject() {
        this.current = this.stack.pop();
    }

    onStartIteration(key: ObjectKey) {
        if (key === undefined) {
            this.result = [];
            this.current = this.result;
        } else {
            this.stack.push(this.current);
            const ar: any[] = [];
            this.current[key] = ar;
            this.current = ar;
        }
    }

    onEndIteration() {
        this.current = this.stack.pop();
    }

    onValue(key: ObjectKey, value: any) {
        const r = this.mapFn(key, value);
        if (key === undefined) {
            this.result = r;
        } else if (r !== undefined) {
            this.current[key] = r;
        }
    }
}

class AsyncMapVisitor implements AsyncObjectVisitor {
    result: any;
    current: any;
    stack: any[] = [];
    constructor(private mapFn: (key: ObjectKey, value: any) => Promise<any>) { }

    async onStartObject(key: ObjectKey) {
        if (key === undefined) {
            this.result = {};
            this.current = this.result;
        } else {
            this.stack.push(this.current);
            const obj = {};
            this.current[key] = obj;
            this.current = obj;
        }
    }
    async onEndObject() {
        this.current = this.stack.pop();
    }

    async onStartIteration(key: ObjectKey) {
        if (key === undefined) {
            this.result = [];
            this.current = this.result;
        } else {
            this.stack.push(this.current);
            const ar: any[] = [];
            this.current[key] = ar;
            this.current = ar;
        }
    }

    async onEndIteration() {
        this.current = this.stack.pop();
    }

    async onValue(key: ObjectKey, value: any) {
        const r = await this.mapFn(key, value);
        if (key === undefined) {
            this.result = r;
        } else if (r !== undefined) {
            this.current[key] = r;
        }
    }
}
