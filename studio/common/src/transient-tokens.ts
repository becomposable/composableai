import { AccountRef } from "./user.js";


export enum TransientTokenType {
    userInvite = 'user-invite',
    migration = 'migration',
}

export interface TransientToken<T> {
    id: string;
    type: TransientTokenType;
    data: T;
    expires: Date;
    account?: string;
    created_at: Date;
    updated_at: Date;
}


export interface CreateOrUpdateTransientTokenPayload<T> extends Partial<TransientToken<T>> {
}

export interface UserInviteTokenData {
    email: string;
    role: string;
    account: AccountRef;
    invitedBy: { name: string, email: string; };
}