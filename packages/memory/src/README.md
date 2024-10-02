# Memory Pack

This is the core of the Composable memory Pack library.
It defines the memory pack commands and provide an API to build and read memory packs.

A memory pack is an indexed tar file containing media or text files and a `metadata.json` file which is defining the properties of a memory pack. The metadata is used to describe the memory and the other files in the tar can be used to hold the additional content you need in order to create a context for the interaction with a target LLM.

To build a memory pack you must use the memory pack API or the `memo` application provided by `@becomposable/memory-cli` package. The tar contains a special file named `.index` which is used to index the tar content so that the tar entries can be quickly extracted from the tar without nneeding to untar the entire content.

## Memory Pack Recipe

A recipe is a typescript file that is used to build a memory pack.
The recipe can contain any javascript code but it must use the builtin commands to create the memory TAR file.

A memory tpack recipe has the following structure:

```js
import { copy, ... other commands ... } from "@becomposable/memory-commands";

// You can optionally extend an existing memory pack
await from("path/to/memory.tar")

/** then you can build the memory tar content using builtin commands
 * You can either use the bult-in commands or `exec` to run a shell command
 */

// ... Your commands here ...

/**
 * At the end of the file you must export the memory pack metadata.
 * This is a JSON object which holds the properties to be used when creating LLM interactions.
 */
export default {
    someProperty: "hello",
    ...
}
```
## Memory Pack Built-in Variables.
There a three built-in variables which you can access in a recipe ts file.

#### env

This is a shortcut to `process.env`. It can be used to access envirnoment properties. To use the `env` variable you need to import it:

`import { env } from "@becomposable/memory-commands"`

#### tmpdir

This is a temporary directory that is created just before processing the recipe. It can be used to write into temporary files. After the memory pack is built the temporary directory is removed. To use the `tmpdir` variable you need to import it:

`import { tmpdir } from "@becomposable/memory-commands"`

#### vars

A javascript object that holds variables specified by the user when invoking the memory pack build. Can be used to parametrize the recipe. When using the `memo` cli application (i.e. `@becomposable/emmory-cli`) ypu can pass vars to the recipe by using command line parameters that starts with a `--var-` prefix. Example: `--var-language fr` will produce a property `language` in the `vars` object whith a value of `'fr'`.
To use the `vars` variable you need to import it:

``import { vars } from "@becomposable/memory-commands"`

## Memory Pack Commands.

The only dependency you need to import in your recipe ts file is the `@becmposable/memory-commands` package. This package contains all the buil-in commands which are grouped in two categories: execution commands and content loading commands:

### Execution commands
1. **from** - Extends an existing memory pack (a tar file)
2. **exec** - Execute a shell command.
3. **copy** - Copy a file to the tar. The file content can be transformed using the built-in transformers. See the [copy command](#copy) for more details.
4. **copyText** - Copy an inline text or string variable as a tar entry.

### Content loading commands

These commands can be used to fetch content from files. The result is returned as a variable which will only fetch the content when used. All these commands supports globs as argument to fretch content from multiple files. When a glob is used the result will alwaysbe an array of variables.
1. **content** - fetch the text content from a text file.
2. **json** - fetch a JSON object from a json file.
3. **pdf** - extract the text content from a PDF file.
4. **docx** - extract the text content from a Docx file.
5. **media** - Load an image with an optional conversion. The image is exported as base64 text, when the variable is referenced in the exported memory metadata.


### from

**Signature:** `from (location: string, options?: FromOptions): void`

The from command load an existing memory pack tar as a source of the current pack being built. You can filter which files and metadata properties will be included from the soruce tar by specifying a `files` filter and a metadata properties `projection`.

The `from` command is an asynchronous operation so you need to `await` for its completion.

The shape of the `FromOptions` is:

```ts
{
    files?: string[];
    projection?: Record<string, boolean | 0 | 1>;
}
```
The `files` filter is an array of globs as supported by the [micromatch](https://www.npmjs.com/package/micromatch) library. You can either include files using globs expressions or fiels by prepending the glob expression with an `!` character.

The `projection` is an object which map keys to a truthy or falsy value. You can either use false or true to exclude or include properties not both.

*Example:*

```js
import { vars, from } from "@becomposable/memory-commands"
await from("./memory-source.tar", {
    files: ["images/*.png"],
    projection: {
        name: true,
        language: true,
    }
})
// export a new metadata object
export default {
    theme: vars.theme || 'dark'
}
```

The memory pack built above will contain all the `images/*.png` files from the source tar and the metadata JSON object will contain the `name` and `language` properties from the source memory pack metadata and will add a new metadata property named `theme`.


### exec

**Signature:** `exec (cmd: string, options?: ExecOptions): Promise<void | string>`

Execute a shell command. You can execute a pipe of shell commands or use stdout redirection at the end of the command:

The `exec` command is asynchronous so you need to use await when incoking it. If no output redirection is specified then the output will be returned as a string from the `exec()` function

**Example:**

```javascript
import { tmpdir, exec } from "@becomposable/memory-commands"
const output = await exec("cat some/file | wc -l")
await exec(`cat some/file | wc -l > ${tmpdir}out.txt`)
```

### copy

**Signature:** `copy (location: SourceSpec, path: string, options?: CopyOptions): void`

This command will copy the content of a file to a tar entry specified by the `path` argument.
The `location` argument specify from source from where the content is copied.
It may be either a `string` or a `ContentSource` object. ContentSource objects are returned by any of the [Content Loading Commands](#content-loading-commands).

If location is a string it will be expected to point to a file path or to a glob expression.
If a glob expression is used the the `copy` operation will copy the content of all the matching files. You can, in that case, specify a path rewrite expression as the `path` argument.

Youn can transform the file content when copying it to the tar by using the `options` argument. The shape of the options is:

```ts
export interface CopyOptions {
    media?: {
        max_hw?: number;
        format?: "jpeg" | "png";
    };
    extractText?: boolean | string;
}
```

You can convert images by specfying a max height or widtth and / or an output image format. For documents like pdf or docx you can specify `extractText: "pdf" | "docx" | boolean`. If true is specified the type of text extraction will be guessed from the file extension.

**Example:**

```js
import { exec, copy } from "@becomposable/memory-commands"
await exec(`cat some/file > ${tmpdir}/out.txt`)
copy(`${tmpdir}/out.txt`, 'out.txt');
copy('./my-project/src/**/*.ts', './my-project/src!sources/*')
```

The rewrite expression in the example above `./my-project/src!sources/*` means: strip the prefix `./my-project/src` fromt he copied file and prefix the remaining od the path with the value `sources/`.

#### Rewrite expressions

TODO


### copyText

**Signature:** `copyText (text: string, path: string): void`

This command will create a new entry in the target memory pack tar using the content you specified through the `text` argument. The tar entry path is specified by the `path` argument.

```js
import { exec, copyText } from "@becomposable/memory-commands"
const content = await exec(`cat some/file`)
copyText(content.trim(), 'content.txt')
```

### content

**Signature:** `content (location: string, encoding?: BufferEncoding): ContentObject | ContentObject[]`

If the location is a glob expression then an arry of `ContentObject` is returned. A `ContentObject` implements `ContentSource` so it can be used as the location argument of the copy operation.
The actual cotnent of a file is only fetched (and trasformed) only when the ContentObject is used: either a method of the object is used, either it is assigned to a value of a metadata property.

The `content` command simply load the content of the given file(s) as a text using an optional encoding. The default encoding is "utf-8".

### json

**Signature:** `json (location: string) => ContentObject | ContentObject[]`

Load a JSON object from a json file. When assigned as a metadata property the content  will by transformed in a JSON object.

### pdf

**Signature:** `pdf (location: string) => PdfObject | PdfObject[]`

Load a PdfObject form a pdf file. When assigned as a metadata property the PdfObject is transformed to the text representation of the PDF.

### docx

Load a DocxObject form a docx file. When assigned as a metadata property the DocxObject is transformed to the text representation of the Docx.

**Signature:** `docx (location: string) => DocxObject | DocxObject[]`

### media

**Signature:** `json (location: string, options?: MediaOptions) => MediaObject | MediaObject[]`


Load a MediaObject form a docx file. When assigned as a metadata property the MediaObject is transformed to text representation of the image which is the base64 encoded image.

The media command accepts an additional argument which has the shape:

```
export interface MediaOptions {
    max_hw?: number;
    format?: "jpeg" | "png";
}
```

You can thus convertt he image before using it.

### Custom commands

To create custom commands you have 2 options. Either you write the command in as a command line application and invoke it through the `exec` command, either you write a javascript function, package it in an external library and the import it in the recipe ts file.

Here is a template of custom command functions:

```js
import { Builder } from "@becomposable/memory";
import fs from "node:fs";

// this is the current instance of the builder being used to build the memory pack.
const builder = Builder.instance;

export myCommand(message:string) {
    // you can add a variable in the build vars:
    builder.vars.greeting = 'hello world!';
    // or write a file named greeting.txt in the current build tmpdir
    fs.writeFileSync(`${builder.tmpdir}/greeting.txt`, "hello world!", "utf-8");
    // or create a tar entry named greeting.txt
    builder.copyText("hello world!", "greeting.txt");
    // refer to Builder API for other operations.
}
```

## Examples

### Release Highlights

This example builds a memory pack with the information on which issues were fixed between to commit SHA.

```js
import { copy, copyText, exec, tmpdir, vars } from "@becomposable/memory-commands";

const { start, end } = vars;
if (!start || !end) {
    console.error("Please provide start and end tags using --var-start and --var-end");
    process.exit(1);
}

console.log(`Retrieving issues between ${start}and ${end}...`)
// Get list of commit logs containing '#' between the two tags and extract unique issue numbers
const issue_numbers = await exec(`git log ${start}..${end} --oneline | grep -o '#[0-9]\\+' | sed 's/#//' | sort -u`) as string;

for (const issue of issue_numbers.trim().split("\n")) {
    console.log(`Processing issue #${issue}`)
    const issue_content = await exec(`gh issue view ${issue}`) as string;
    copyText(issue_content, `issues/${issue}.txt`);
}

console.log("Generating diff");
await exec(`git diff --submodule=diff ${start}...${end} > ${tmpdir}/range_diff.txt`)
copy(`${tmpdir}/range_diff.txt`, "range_diff.txt");

export default {
    from_version: start,
    release_version: end,
}
```