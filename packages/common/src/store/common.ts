export interface BaseObject {
    id: string;
    name: string;
    description?: string;
    tags?: string[];
    updated_by: string;
    created_by: string;
    created_at: string;
    updated_at: string;
}
