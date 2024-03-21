import ansiColors from "ansi-colors";
import ansiEscapes from "ansi-escapes";
import { WriteStream } from "node:tty";
import { onExit } from "signal-exit";
/**
 * See https://github.com/sindresorhus/cli-spinners/blob/HEAD/spinners.json for more spinners
 */

interface SpinnerData {
    interval: number;
    frames: string[];
}

const spinners: Record<string, SpinnerData> = {
    "dots": {
        "interval": 200,
        "frames": [
            ".  ",
            ".. ",
            "...",
            " ..",
            "  .",
            "   "
        ]
    },
    "bar": {
        "interval": 80,
        "frames": [
            "[    ]",
            "[=   ]",
            "[==  ]",
            "[=== ]",
            "[====]",
            "[ ===]",
            "[  ==]",
            "[   =]",
        ]
    },
}

export class Spinner {

    data: SpinnerData;
    log: LogUpdate;
    timer?: NodeJS.Timeout;

    style?: (spinner: string) => string;
    _prefix = '';
    _suffix = '';
    _restoreCursor = false;

    constructor(name: 'dots' | 'bar' = 'dots', stream?: WriteStream) {
        this.data = spinners[name];
        this.log = new LogUpdate(stream);
    }

    withStyle(style: (spinner: string) => string) {
        this.style = style;
        return this;
    }

    set prefix(value: string) {
        this._prefix = value;
    }
    get prefix() {
        return this._prefix;
    }
    set suffix(value: string) {
        this._suffix = value;
    }
    get suffix() {
        return this._suffix;
    }

    start(shodHideCursor = true) {
        if (shodHideCursor) {
            hideCursor(this.log.stream);
            this._restoreCursor = true;
        }
        let i = 0;
        this.timer = setInterval(() => {
            const frames = this.data.frames;
            this.log.print(this.prefix + frames[++i % frames.length] + this.suffix);
        }, this.data.interval);
        return this;
    }

    done(replacement: boolean | string = '') {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = undefined;
        }
        this.log.clear();
        if (this._prefix) {
            this.log.stream.write(this._prefix);
        }
        if (replacement === true) {
            this.log.stream.write(ansiColors.green(ansiColors.symbols.check));
        } else if (replacement === false) {
            this.log.stream.write(ansiColors.red(ansiColors.symbols.cross));
        } else {
            this.log.stream.write(replacement);
        }
        if (this._suffix) {
            this.log.stream.write(this._suffix);
        }
        console.log(); // print a new line
        if (this._restoreCursor) {
            showCursor(this.log.stream);
            this._restoreCursor = false;
        }
        return this;
    }

}

export class LogUpdate {

    stream: WriteStream;

    last?: string;

    constructor(stream?: WriteStream) {
        this.stream = stream || process.stdout;
    }

    clear() {
        if (this.last) {
            this.stream.clearLine(0);
            this.stream.cursorTo(0);
        }
        return this;
    }

    print(text: string) {
        this.clear();
        this.last = text;
        this.stream.write(text);
        return this;
    }

}

const streamsToRestore: WriteStream[] = [];
let restoreCursorIsRegistered = false;

export function toggleCursor(show: boolean, stream: WriteStream = process.stdout) {
    show ? showCursor(stream) : hideCursor(stream);
}

export function showCursor(stream: WriteStream = process.stdout) {
    const i = streamsToRestore.findIndex((s) => s === stream);
    if (i > -1) {
        streamsToRestore.splice(i, 1);
    }
    stream.write(ansiEscapes.cursorShow);
}

export function hideCursor(stream: WriteStream = process.stdout) {
    if (!streamsToRestore.includes(stream)) {
        restoreCursotOnExit();
        streamsToRestore.push(stream);
    }
    stream.write(ansiEscapes.cursorHide);
}

export function restoreCursotOnExit() {
    if (!restoreCursorIsRegistered) {
        restoreCursorIsRegistered = true;
        onExit(() => {
            streamsToRestore.forEach(stream => showCursor(stream));
        });
    }
}
