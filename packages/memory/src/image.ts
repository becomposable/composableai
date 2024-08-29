import { readFile } from "fs/promises";

export async function fetchMemoryImage(location: string): Promise<any> {
    let content: string;
    if (location.startsWith('file:')) {
        content = await readFile(location, "utf-8");
    } else { // fetch the image from the image store
        throw new Error("Not yet implemented");
    }
    return JSON.parse(content);
}
