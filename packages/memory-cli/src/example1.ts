//@ts-ignore
import { tmpdir, text, json, docx, media, pdf, exec, from } from "@becomposable/memory-commands";

exec("ls -al", { quiet: true });

console.log("Temporary dir is: ", tmpdir);

export default {
    msg: "hello",
    //images: media('./images/*.jpg'),
    code: text('./src/example1.ts'),
};
