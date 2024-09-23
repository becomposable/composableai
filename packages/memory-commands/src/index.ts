import type { Commands } from "@becomposable/memory";
const MemoApp = (globalThis as any).__becomposable_memo_builder_app__;

if (!MemoApp.builder) {
    throw new Error("No builder app was instantiated!");
}

const builder = MemoApp.builder as Commands & { tmpdir: string };

const env = process.env;
const tmpdir = builder.tmpdir;
const content = builder.content.bind(builder);
const json = builder.json.bind(builder);
const pdf = builder.pdf.bind(builder);
const docx = builder.docx.bind(builder);
const media = builder.media.bind(builder);
const from = builder.from.bind(builder);
const exec = builder.exec.bind(builder);
const copy = builder.copy.bind(builder);
const copyText = builder.copyText.bind(builder);

export {
    env,
    tmpdir,
    content,
    json,
    pdf,
    docx,
    media,
    from,
    exec,
    copy,
    copyText
}