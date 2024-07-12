export interface BaseObject {
    id: string;
    name: string;
    description?: string;
    tags?: string[];
    created_at: Date;
    updated_at: Date;
}
