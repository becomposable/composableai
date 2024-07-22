export interface FindPayload {
    query: Record<string, any>;
    limit?: number;
    select?: string;
}


export interface GenericCommandResponse {
    status: string;
    message: string;
    err?: any;
    details?: any;
}