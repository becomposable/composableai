import * as mupdf from "mupdf";
import fs from "fs";

async function test() {

    const doc = mupdf.Document.openDocument(fs.readFileSync("./fixtures/test-pdf1.pdf"), "application/pdf");

    //const count = doc.countPages();
    for (let i = 0; i < 5; i++) {
        const page = doc.loadPage(i);
        const stext = page.toStructuredText();
        console.log("Page ================= ", i);
        console.log("=================!!!!!!", stext.asText());
        //console.log(JSON.stringify(JSON.parse(stext.asJSON()), undefined, 2));
        //console.log("=================!!!!!!", stext);
    }
}

test();
