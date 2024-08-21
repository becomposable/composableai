# Composable Workflow DSL

The Zeno Workflow DSL is a domain-specific language (DSL) used to define workflows that are executed by the Zeno platform. The DSL is based on JSON and is designed to be easy to read and write.

A Zeno workflow is a sequence of activities that are executed in a specific order. Activities are individual units of work that can be executed by the Zeno platform. Activities can be anything from simple tasks, such as sending an email, to more complex tasks, such as generating a report.

### Workflow Definition

A Zeno workflow is defined by a JSON object that contains the following properties:

* **name**: The name of the workflow.
* **vars**: A map of variables that can be used in the workflow.
* **activities**: An array of activities that will be executed in the workflow.
* **result**: The name of the variable that will contain the result of the workflow.

### Activity Definition

An activity is defined by a JSON object that contains the following properties:

* **name**: The name of the activity.
* **import**: An array of variables that will be imported into the activity.
* **params**: A map of parameters that will be passed to the activity.
* **fetch**: A map of data that will be fetched from the Zeno platform before the activity is executed.
* **condition**: A condition that must be met before the activity is executed.
* **parallel**: A boolean value that indicates whether the activity should be executed in parallel with other activities.
* **output**: The name of the variable that will contain the result of the activity.

### Variables

Variables can be used in the workflow to store data and to pass data between activities. Variables can be defined in the `vars` property of the workflow definition. Variables can also be imported into activities using the `import` property of the activity definition.

Variables can be referenced in the workflow using the `${}` syntax. For example, the following expression references the `objectId` variable:

```
${objectId}
```

Variables can also be referenced using dot notation. For example, the following expression references the `name` property of the `config` variable:

```
${config.name}
```

### Data Fetching

The `fetch` property of an activity definition can be used to fetch data from the Zeno platform before the activity is executed. The `fetch` property is a map of data sources. Each data source is defined by a JSON object that contains the following properties:

* **type**: The type of data source.
* **query**: A query that will be used to fetch the data.
* **limit**: The maximum number of records to fetch.
* **select**: A list of fields to select.

The following example shows how to fetch a document from the Zeno platform:

```json
{
  "name": "fetchDocument",
  "fetch": {
    "document": {
      "type": "document",
      "query": {
        "_id": "${objectId}"
      },
      "limit": 1
    }
  }
}
```

The `document` data source will fetch a document from the Zeno platform that has an `_id` property that matches the value of the `objectId` variable. The `limit` property specifies that only one document should be fetched.

### Conditions

The `condition` property of an activity definition can be used to specify a condition that must be met before the activity is executed. The `condition` property is a JSON object that contains a set of conditions. Each condition is defined by a key-value pair, where the key is the name of a variable and the value is a condition that must be met by the variable.

The following example shows how to specify a condition that checks if the `objectId` variable is not null:

```json
{
  "name": "processDocument",
  "condition": {
    "objectId": {
      "$null": false
    }
  }
}
```

The `processDocument` activity will only be executed if the `objectId` variable is not null.

### Parallel Execution

The `parallel` property of an activity definition can be used to specify whether the activity should be executed in parallel with other activities. The `parallel` property is a boolean value. If the `parallel` property is set to `true`, the activity will be executed in parallel with other activities. If the `parallel` property is set to `false`, the activity will be executed sequentially.

The following example shows how to specify that the `processDocument` activity should be executed in parallel with the `sendEmail` activity:

```json
{
  "name": "processDocument",
  "parallel": true
},
{
  "name": "sendEmail",
  "parallel": true
}
```

The `processDocument` and `sendEmail` activities will be executed in parallel.

### Output

The `output` property of an activity definition can be used to specify the name of the variable that will contain the result of the activity. The `output` property is a string value.

The following example shows how to specify that the result of the `processDocument` activity should be stored in the `result` variable:

```json
{
  "name": "processDocument",
  "output": "result"
}
```

The result of the `processDocument` activity will be stored in the `result` variable.

### Example Workflow

The following example shows a complete Zeno workflow definition:

```json
{
  "name": "processDocument",
  "vars": {
    "objectId": null
  },
  "activities": [
    {
      "name": "fetchDocument",
      "fetch": {
        "document": {
          "type": "document",
          "query": {
            "_id": "${objectId}"
          },
          "limit": 1
        }
      },
      "output": "document"
    },
    {
      "name": "processDocument",
      "condition": {
        "document": {
          "$null": false
        }
      },
      "import": [
        "document"
      ],
      "params": {
        "document": "${document}"
      },
      "output": "result"
    },
    {
      "name": "sendEmail",
      "import": [
        "result"
      ],
      "params": {
        "result": "${result}"
      }
    }
  ],
  "result": "result"
}
```

This workflow will fetch a document from the Zeno platform, process the document, and then send an email with the result of the processing.

### Creating New Activities

New activities can be created by writing a TypeScript function that implements the `DSLActivity` interface. The `DSLActivity` interface defines a single method, `execute`, that takes a `DSLActivityExecutionPayload` object as its parameter. The `DSLActivityExecutionPayload` object contains all of the information that the activity needs to execute.

The following example shows a simple activity that logs a message to the console:

```typescript
import { DSLActivity, DSLActivityExecutionPayload } from "@becomposable/common";

export class LogMessageActivity implements DSLActivity {
  async execute(payload: DSLActivityExecutionPayload): Promise<void> {
    console.log(payload.params.message);
  }
}
```

This activity can be registered with the Zeno platform and then used in a workflow.

### Business Use Cases

The Zeno Workflow DSL can be used to automate a wide variety of business processes. Some common use cases include:

* **Document processing**: Automating the processing of documents, such as invoices, contracts, and reports.
* **Data analysis**: Automating the analysis of data, such as customer data, sales data, and financial data.
* **Customer service**: Automating customer service tasks, such as responding to inquiries, resolving issues, and providing support.
* **Marketing**: Automating marketing tasks, such as sending emails, creating landing pages, and running social media campaigns.

### Conclusion

The Zeno Workflow DSL is a powerful tool that can be used to automate a wide variety of business processes. The DSL is easy to use and can be used to create complex workflows that can be executed by the Zeno platform.


## Build Content Workflow Definition

This workflow is responsible for extracting the text content from the object content source if any.

Here is an example of a workflow definition that you can use to extract the text content from a document:

```JSON
{
  "name": "ExtractText",
  "vars": {},
  "activities": [
    {
      "name": "extractDocumentText",
      "output": "extractTextResult"
    },
    {
      "name": "setDocumentStatus",
      "params": {
        "status": "text_extracted"
      },
      "condition": {
        "extractTextResult.hasText": {
          "$eq": true
        }
      }
    },
    {
      "name": "setDocumentStatus",
      "params": {
        "status": "no_text"
      },
      "condition": {
        "extractTextResult.hasText": {
          "$eq": false
        }
      }
    }
  ]
}
```

**Workflow Variables**

This workflow doesn't define any specific variables. It uses the default `objectId` and `objectIds` variables.

**Activities**

This workflow uses the following activities:

* `extractDocumentText`: This activity extracts the text content from the document. It takes no parameters and returns an object with the following properties:
    * `status`: The status of the extraction.
    * `tokens`: The number of tokens in the extracted text.
    * `len`: The length of the extracted text.
    * `objectId`: The ID of the object.
    * `hasText`: A boolean indicating whether the text was extracted successfully.
    * `error`: An error message if the extraction failed.
* `setDocumentStatus`: This activity sets the status of the document. It takes a `status` parameter, which is the new status of the document.

**Conditions**

This workflow uses conditions to determine which activities to execute. The `setDocumentStatus` activity is only executed if the `extractDocumentText` activity was successful.

**Result**

This workflow doesn't have a `result` property, so it doesn't return any value.

**How to Deploy this Workflow**

1. Create a new workflow in the Composable Studio.
2. Paste the workflow definition above into the workflow editor.
3. Save the workflow.

**How to Trigger this Workflow**

This workflow can be triggered manually from the Composable Studio or by a workflow rule.


## Creating a New Activity

To create a new activity, you need to create a new TypeScript file in the `zeno/workflow/src/activities` directory. The file should export a function that takes a `DSLActivityExecutionPayload` object as a parameter and returns a Promise.

The `DSLActivityExecutionPayload` object contains the following properties:

* `event`: The event that triggered the workflow.
* `objectIds`: The IDs of the objects that the workflow is operating on.
* `vars`: The variables that are available to the workflow.
* `accountId`: The ID of the account that the workflow is running in.
* `projectId`: The ID of the project that the workflow is running in.
* `timestamp`: The timestamp when the workflow was triggered.
* `wfRuleName`: The name of the workflow rule that triggered the workflow.
* `authToken`: The authentication token that can be used to access the Composable API.
* `config`: The configuration of the Composable platform.
* `workflow_name`: The name of the workflow.
* `activity`: The definition of the activity.
* `params`: The parameters that were passed to the activity.
* `debug_mode`: A boolean indicating whether the workflow is running in debug mode.

The function should use the properties of the `DSLActivityExecutionPayload` object to perform the desired action. For example, the `extractDocumentText` activity uses the `objectId` property to retrieve the document from the Composable API and the `client` property to update the document with the extracted text.

Here is an example of a new activity that resizes an image:

```typescript
import { DSLActivityExecutionPayload, DSLActivitySpec } from "@becomposable/common";
import { setupActivity } from "../dsl/setup/ActivityContext.js";
import { WorkflowParamNotFound } from "../errors.js";
import { imageResizer } from "../conversion/image.js";
import { StreamSource } from "@becomposable/client";
import { createReadableStreamFromReadable } from "node-web-stream-adapters";
import sharp from "sharp";

interface ResizeImageParams {
    max_hw: number; //maximum size of the longuest side of the image
    format: keyof sharp.FormatEnum; //format of the output image
}

export interface ResizeImage extends DSLActivitySpec<ResizeImageParams> {
    name: 'resizeImage';
}

export async function resizeImage(payload: DSLActivityExecutionPayload) {
    const { client, objectId, params } = await setupActivity<ResizeImageParams>(payload);
    const inputObject = await client.objects.retrieve(objectId);

    if (!params.format) {
        throw new WorkflowParamNotFound(`format`);
    }

    if (!inputObject) {
        throw new Error(`Document ${objectId} not found`);
    }

    if (!inputObject.content?.source) {
        throw new Error(`Document ${objectId} has no source`);
    }

    if (!inputObject.content.type || !inputObject.content.type?.startsWith('image/')) {
        throw new Error(`Document ${objectId} is not an image`);
    }

    const file = await client.store.getFile(inputObject.content.source);
    if (!file) {
        throw new Error(`Document ${objectId} source not found`);
    }

    const resized = (await file.read()).pipe(imageResizer(params.max_hw, params.format));
    const stream = createReadableStreamFromReadable(resized);

    log.info(`Creating resized image for ${objectId} with max_hw: ${params.max_hw} and format: ${params.format}`);
    const resizedImage = await client.objects.create({
        name: inputObject.name + ` [Resized ${params.max_hw}]`,
        parent: inputObject.id,
        content: new StreamSource(stream, `${objectId}_resized_${params.max_hw}.${params.format}`, `image/${params.format}`),
    });

    log.info(`Resized image ${resizedImage.id} created for ${objectId}`, { resizedImage });

    return { id: resizedImage.id, format: params.format, status: "success" };
}
```

This activity takes two parameters:

* `max_hw`: The maximum height or width of the resized image.
* `format`: The format of the output image.

The activity uses the `imageResizer` function from the `zeno/workflow/src/conversion/image.js` file to resize the image. The `imageResizer` function takes the maximum height or width of the resized image and the format of the output image as parameters.

The activity then uses the `client.objects.create` method to create a new object in the Composable API. The new object is a resized version of the original image. The activity returns an object with the ID of the new object, the format of the output image, and the status of the operation.

To use this activity in a workflow, you need to add it to the `activities` array of the workflow definition. For example, the following workflow definition uses the `resizeImage` activity to resize an image to a maximum height or width of 1024 pixels and save it as a JPEG file:

```JSON
{
  "name": "ResizeImage",
  "vars": {},
  "activities": [
    {
      "name": "resizeImage",
      "params": {
        "max_hw": 1024,
        "format": "jpeg"
      },
      "output": "resizeImageResult"
    }
  ]
}
```

This workflow definition takes no parameters and returns an object with the ID of the resized image, the format of the output image, and the status of the operation.




## Build Properties

This task is generating metadata properties or the `object` field. It will do nothing for object types that don't need to generate extra properties.

It uses the `generateDocumentProperties` activity to execute an interaction to generate properties from the document text.

**Example:**

```json
{
  "name": "Extract Information",
  "activities": [
    {
      "name": "generateDocumentProperties",
      "condition": {
        "text": {
          "$exists": true
        },
        "type.object_schema": {
          "$exists": true
        }
      },
      "params": {
        "interactionName": "sys:ExtractInformation",
        "model": "gpt-4",
        "environment": "${environmentId}"
      }
    }
  ]
}
```

This workflow will execute the `sys:ExtractInformation` interaction with the `gpt-4` model in the environment specified by the `environmentId` variable. The interaction will be executed only if the document has text and the document type has a schema.

**Available Activities:**

* `generateDocumentProperties`: Executes an interaction to generate properties from the document text.
* `executeInteraction`: Executes an interaction.

**Creating a new activity:**

To create a new activity, you need to create a new TypeScript file in the `activities` folder. The file should export a function that takes a `DSLActivityExecutionPayload` object as argument and returns a Promise.

**Example:**

```typescript
import { DSLActivityExecutionPayload, DSLActivitySpec } from "@becomposable/common";
import { setupActivity } from "../dsl/setup/ActivityContext.js";

export interface MyActivityParams {
  message: string;
}

export interface MyActivity extends DSLActivitySpec<MyActivityParams> {
  name: 'myActivity';
}

export async function myActivity(payload: DSLActivityExecutionPayload): Promise<string> {
  const { params } = await setupActivity<MyActivityParams>(payload);
  return `Hello ${params.message}`;
}
```

This activity takes a `message` parameter and returns a string that says "Hello" followed by the message.

**Registering the activity:**

To register the activity, you need to add it to the `activities` object in the `workflow.test.ts` file.

**Example:**

```typescript
const activities = {
  sayHello,
  sayName,
  sayGreeting,
  myActivity, // Add the new activity here
};
```

**Using the activity in a workflow:**

To use the activity in a workflow, you need to add it to the `activities` array in the workflow definition.

**Example:**

```json
{
  "name": "My Workflow",
  "activities": [
    {
      "name": "myActivity",
      "params": {
        "message": "World"
      }
    }
  ]
}
```

This workflow will execute the `myActivity` activity with the message "World".




## Build Tree
This task is generating the sub-objects if any. 

This task is implemented by a DSL workflow that is then deployed in Temporal. 

The DSL format is a JSON object that defines the workflow. It has the following properties:

* `name`: The name of the workflow.
* `vars`: A map of variables that can be used in the workflow. 
* `activities`: An array of activities that will be executed in the workflow.

### Activities

Each activity is a JSON object that has the following properties:

* `name`: The name of the activity.
* `import`: An array of variables that will be imported from the workflow context.
* `params`: A map of parameters that will be passed to the activity.
* `fetch`: A map of data providers that will be used to fetch data for the activity.
* `condition`: A condition that must be met for the activity to be executed.
* `output`: The name of the variable that will be set with the result of the activity.
* `parallel`: A boolean indicating whether the activity should be executed in parallel with other activities.

#### Import

The `import` property is used to import variables from the workflow context. It can be an array of strings or a map of strings to strings. If it is an array of strings, the variables will be imported with the same name. If it is a map of strings to strings, the variables will be imported with the name specified in the map.

The variables can be referenced in the `params`, `fetch`, and `condition` properties using the `${}` syntax. For example, the following activity will import the `lang` variable from the workflow context and pass it to the `sayHello` activity:

```json
{
    "name": 'sayHello',
    "output": 'hello',
    "import": ["lang"],
}
```

#### Params

The `params` property is used to pass parameters to the activity. It is a map of strings to any value. The values can be literals or expressions. Expressions are evaluated using the workflow context. For example, the following activity will pass the `lang` variable from the workflow context to the `sayHello` activity:

```json
{
    "name": 'sayHello',
    "output": 'hello',
    "params": {
        "lang": "${lang}"
    }
}
```

#### Fetch

The `fetch` property is used to fetch data for the activity. It is a map of strings to data provider specifications. Each data provider specification is a JSON object that has the following properties:

* `type`: The type of the data provider.
* `query`: A query object that will be passed to the data provider.
* `limit`: The maximum number of records to fetch.
* `select`: A string indicating which fields to select.

The data providers are registered with the Temporal worker. For example, the following activity will fetch a document from the `document` data provider:

```json
{
    "name": 'sayHello',
    "output": 'hello',
    "fetch": {
        "document": {
            "type": "document",
            "query": {
                "lang": "${lang}"
            }
        }
    }
}
```

#### Condition

The `condition` property is used to specify a condition that must be met for the activity to be executed. It is a JSON object that contains a set of conditions. The conditions are evaluated using the workflow context. For example, the following activity will only be executed if the `lang` variable is equal to `fr`:

```json
{
    "name": 'sayHello',
    "output": 'hello',
    "condition": {
        "lang": {
            "$eq": "fr"
        }
    }
}
```

#### Output

The `output` property is used to specify the name of the variable that will be set with the result of the activity. For example, the following activity will set the `hello` variable with the result of the `sayHello` activity:

```json
{
    "name": 'sayHello',
    "output": 'hello'
}
```

#### Parallel

The `parallel` property is used to specify whether the activity should be executed in parallel with other activities. If it is set to `true`, the activity will be executed in parallel with other activities. If it is set to `false`, the activity will be executed sequentially. For example, the following activity will be executed in parallel with other activities:

```json
{
    "name": 'sayHello',
    "output": 'hello',
    "parallel": true
}
```

### Example Workflow

The following is an example workflow that will generate a greeting message:

```json
{
    "name": "generateGreeting",
    "vars": {
        "lang": "en"
    },
    "activities": [
        {
            "name": "sayHello",
            "output": "hello",
            "import": ["lang"]
        },
        {
            "name": "sayName",
            "output": "name",
            "import": ["lang"]
        },
        {
            "name": "sayGreeting",
            "import": ["hello", "name"],
            "output": "result"
        }
    ]
}
```

This workflow will execute the following activities:

1. `sayHello`: This activity will return "Hello" if the `lang` variable is equal to `en` and "Bonjour" if the `lang` variable is equal to `fr`. The result of this activity will be stored in the `hello` variable.
2. `sayName`: This activity will return "World" if the `lang` variable is equal to `en` and "Monde" if the `lang` variable is equal to `fr`. The result of this activity will be stored in the `name` variable.
3. `sayGreeting`: This activity will concatenate the `hello` and `name` variables and return the result. The result of this activity will be stored in the `result` variable.

### Creating a New Activity

To create a new activity, you need to create a new TypeScript file in the `activities` directory. The file should export a function that takes a `DSLActivityExecutionPayload` object as its parameter and returns a promise.

The `DSLActivityExecutionPayload` object contains the following properties:

* `event`: The event that triggered the workflow.
* `objectIds`: An array of object IDs that are being processed by the workflow.
* `vars`: A map of variables that are available to the workflow.
* `accountId`: The ID of the account that owns the objects.
* `projectId`: The ID of the project that owns the objects.
* `timestamp`: The timestamp of the event that triggered the workflow.
* `wfRuleName`: The name of the workflow rule that triggered the workflow.
* `authToken`: The authentication token that should be used to access the Composable API.
* `config`: A map of configuration settings.
* `activity`: The activity specification.
* `params`: A map of parameters that were passed to the activity.

The function should use the `getClient()` function from the `client.ts` file to get a Composable client. The client can be used to access the Composable API.

For example, the following activity will create a new document:

```typescript
import { DSLActivityExecutionPayload } from "@becomposable/common";
import { getClient } from "../client.js";

export async function createDocument(payload: DSLActivityExecutionPayload) {
  const client = getClient(payload);
  const document = await client.objects.create({
    name: "My Document",
    text: "This is my document.",
  });
  return document.id;
}
```

### Business Applicable Use Case

The Build Tree task can be used to generate a tree of sub-objects from a parent object. For example, you could use it to generate a tree of chapters from a book, or a tree of sections from a document.

To do this, you would create a workflow that executes the following activities:

1. `chunkDocument`: This activity will chunk the parent object into a set of sub-objects.
2. `generateDocumentProperties`: This activity will generate metadata properties for each sub-object.
3. `generateEmbeddings`: This activity will generate embeddings for each sub-object.

The following is an example workflow that will generate a tree of chapters from a book:

```json
{
    "name": "generateChapters",
    "vars": {
        "bookId": "${objectId}"
    },
    "activities": [
        {
            "name": "chunkDocument",
            "import": ["bookId"],
            "params": {
                "objectId": "${bookId}"
            }
        },
        {
            "name": "generateDocumentProperties",
            "import": ["bookId"],
            "params": {
                "objectId": "${bookId}"
            }
        },
        {
            "name": "generateEmbeddings",
            "import": ["bookId"],
            "params": {
                "objectId": "${bookId}"
            }
        }
    ]
}
```

This workflow will execute the following activities:

1. `chunkDocument`: This activity will chunk the book into a set of chapters.
2. `generateDocumentProperties`: This activity will generate metadata properties for each chapter.
3. `generateEmbeddings`: This activity will generate embeddings for each chapter.

Once the workflow has completed, the book will have a tree of chapters that can be used for navigation and search.


