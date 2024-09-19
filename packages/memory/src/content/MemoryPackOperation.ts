import { Builder } from "../Builder";
import { ContentObject } from "./ContentObject";

interface MemoryOperation {
    run: () => void;
}

class Copy implements MemoryOperation {
    constructor(public content: ContentObject, public path: string) { }
    run() {

    }
}

class Delete implements MemoryOperation {

}

class Mkdir implements MemoryOperation {

}