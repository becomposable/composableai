export interface FindPayload {
    query: Record<string, any>;
    limit?: number;
    select?: string;
}
