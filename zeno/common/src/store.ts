
export enum ContentObjectStatus {
    created = 'created',
    processing = 'processing', // the was created and still processing
    completed = 'completed',
    failed = 'failed',
    archived = 'archived',
}

export interface ContentObject extends ContentObjectItem {
    text?: string; // the text representation of the object
    text_etag?: string;
    tokens?: {
        count: number; // the number of tokens in the text
        encoding: string; // the encoding used to calculate the tokens
        etag: string; //the etag of the text used for the token count
    };
    embedding?: {
        model?: string;
        content: number[];
        etag: string; // the etag of the text used for the embedding
    },
    parts?: string[]; // the list of objectId of the parts of the object
    parts_etag?: string; // the etag of the text used for the parts list
}

/**
 * The content object item is a simplified version of the ContentObject that is returned by the store API when listing objects.
 */
export interface ContentObjectItem {
    id: string;
    root?: string; // the ID of the root parent object. The root object doesn't have the root field set.
    parent: string; // the id of the direct parent object. The root object doesn't have the parent field set.
    location: string; // the path of the parent object
    status: ContentObjectStatus;
    created_at: string;
    updated_at: string;
    owner: string;
    // A ref to the object type
    type?: ContentObjectTypeRef;
    content: { // the content source URL and type
        // the URI of the content source. Usually an URL to the uploaded file inside a cloud file storage like s3.
        source?: string;
        // the mime type of the content source.
        type?: string;
        // the original name of the input file if any
        name?: string;
        // the etag of the content source if any
        etag?: string;
    };
    external_id?: string;
    name: string;
    summary?: string;
    tags?: string[];
    properties: Record<string, any>; // a JSON object that describes the object
}

/**
 * When creating from an uploaded file the content shouild be an URL to the uploaded file
 */
export interface CreateContentObjectPayload extends Partial<Omit<ContentObject,
    'id' | 'root' | 'parent' | 'created_at' | 'updated_at' | 'type'
    | 'status' | 'owner' | 'embedding' | 'name'>> {
    id?: string; // An optional existing object ID to be replaced by the new one
    name?: string; // the name will be computed from the content URL if any, otherwise an 400 error will be returned
    parent?: string; // the parent object ID
    type?: string; // the object type ID
}

export interface ContentObjectTypeRef {
    id: string;
    name: string;
}

export interface SimpleSearchQuery {
    location?: string;
    status?: string;
    type?: string;
    parent?: string;
    similarTo?: string;
}

export interface SearchPayload {
    query?: SimpleSearchQuery;
    limit?: number;
    offset?: number;
}

export interface ComplexSearchQuery {
    location?: string;
    status?: string;
    type?: string;
    parent?: string;
    vector?: {
        objectId?: string;
        values?: number[];
        text?: string;
        threshold?: number;
    }
}

export interface ComplexSearchPayload extends Omit<SearchPayload, 'query'> {
    query?: ComplexSearchQuery;
}

export interface ComputeFacetPayload {
    facets: FacetSpec[];
    query?: SimpleSearchQuery;
}
export interface FacetSpec {
    name: string;
    field: string;
}
export interface FacetBucket {
    _id: string;
    count: number;
}

export interface ColumnLayout {
    /**
     * The path of the field to use (e.g. "properties.title")
     */
    field: string;
    /**
     * The name to display in the table column
     */
    name: string;
    /**
     * The type of the field specifies how the rendering will be done. If not specified the string type will be used.
     * The type may contain additional parameters prepended using a web-like query string syntax: date?LLL
     */
    type?: string;
    /*
     * a fallback field to use if the field is not present in the object
     */
    fallback?: string;
    /**
     * A default value to be used if the field is not present in the object
     */
    default?: any;
}
export interface ContentObjectType extends ContentObjectTypeItem {
    object_schema?: Record<string, any>; // an optional JSON schema for the object properties.
    table_layout?: ColumnLayout[]; // an optional table layout for the object properties.
}
export interface ContentObjectTypeItem {
    id: string;
    name: string;
    description?: string;
    owner: string;
    is_chunkable?: boolean;
    created_at: string;
    updated_at: string;
}
/**
 * Used to list types with their table layout if any
 */
export interface ContentObjectTypeLayout {
    id: string;
    name: string;
    description?: string;
    table_layout?: ColumnLayout[];
}

export interface CreateContentObjectTypePayload extends Omit<ContentObjectType, 'id' | 'created_at' | 'updated_at' | 'owner'> {
}

export enum WorkflowRuleInputType {
    single = 'single',
    multiple = 'multiple',
    none = 'none'
}
export interface WorkflowRuleItem {
    // the workflow ID
    id: string;
    // the workflow name
    name: string;
    // the name of the workflow function
    endpoint: string;
    description?: string;
    owner: string;
    created_at: string;
    updated_at: string;
    input_type: WorkflowRuleInputType;
}
export interface WorkflowRule extends WorkflowRuleItem {
    // matching rules for the workflow
    match: {
        object_type?: string,
        event_name?: string,
        rules?: Record<string, any>
    }

    /**
     * Activities configuration if any.
     */
    config?: Record<string, any>;
}


export interface CreateWorkflowRulePayload extends UploadWorkflowRulePayload {
    name: string; // required
    endpoint: string; // required
}
export interface UploadWorkflowRulePayload extends Partial<Omit<WorkflowRule, 'id' | 'created_at' | 'updated_at' | 'owner'>> {
}