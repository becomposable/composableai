import { describe, test, expect } from "vitest";
import { Vars } from "./vars.ts";
import { walkObject } from "./walk.ts";

describe('walk object', () => {

    test('find string values', () => {
        const obj = {
            name: "foo",
            age: 42,
            children: [{
                name: "bar",
                age: 12,
            },
            {
                name: "baz",
                age: 15,
            }],
            folder: {
                subfolder: {
                    name: "file",
                }
            }
        }
        const values = ["foo", "bar", "baz", "file"].sort().join(',');
        const found: string[] = [];
        walkObject(obj, (key, value) => {
            if (typeof value === "string") {
                found.push(value);
            }
        })
        expect(found.sort().join(',')).toBe(values);
    })

})