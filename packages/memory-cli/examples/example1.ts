//@ts-ignore
import { text, json, docx, media, pdf, exec, from } from "@becomposable/memory-commands";

exec("ls -al", { quiet: true });

export default {
    msg: "hello",
    images: media('/Users/bogdan/work/js/memory/images/*.jpg'),
    code: text('./examples/example1.ts'),
};
