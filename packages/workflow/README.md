# Zeno Workflows

This package implements the workflow tasks shared by all content object types.

There are 3 main sequential tasks:

1. Build Content
2. Build Properties
3. Build Tree

## Build Content

This task is generating the text content from the object content source if any.

If no content source was provided, e.g. the object text field is already filled by the client or the object type doesn't support generating text content, this task will do nothing

## Build Properties
This task is generating metadata properties or the `object` field.

It will do nothing for object types that doesn't need to generate extra properties.

## Build Tree
This task is generating the sub-objects if any. 

