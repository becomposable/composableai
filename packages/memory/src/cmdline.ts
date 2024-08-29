
function readWord(text: string, index: number): [string, number] {
    let i = index, len = text.length;
    while (i < len && (text[i] !== ' ' || text[i] !== '\t')) {
        const c = text[i];
        if (c === ' ' || c === '\t') {
            return [text.substring(index, i), i];
        }
        i++;
    }
    return [text.substring(index), len];
}

function readQuotedArg(text: string, index: number, quote: string): [string, number] {
    let i = index, len = text.length;
    while (i < len) {
        const c = text[i];
        if (c === '\\') {
            i += 2;
            continue;
        } else if (c === quote) {
            return [text.substring(index, i), i + 1];
        } else {
            i++;
        }
    }
    return [text.substring(index), len];
}

export function splitCommandLine(text: string) {
    const args = [];
    let i = 0, len = text.length;
    while (i < len) {
        let c = text[i];
        if (c === ' ' || c === '\t') {
            i++; // skip whitespace
        } else if (c === '"' || c === "'") {
            const [word, offset] = readQuotedArg(text, i + 1, c);
            i = offset;
            args.push(word);
        } else {
            const [word, offset] = readWord(text, i);
            i = offset;
            args.push(word);
        }
    }
    return args;
}
