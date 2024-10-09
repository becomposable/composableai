import { StreamSource } from "@becomposable/client";
import { Readable } from "stream";
import { readableToWebStream } from "node-web-stream-adapters"

export class NodeStreamSource extends StreamSource {
    constructor(stream: Readable, name: string, type?: string, id?: string) {
        super(readableToWebStream(stream), name, type, id);
    }
}
