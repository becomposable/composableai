import { ApiTopic, type ClientBase } from '@vertesia/api-fetch-client';
import type { InviteAcceptanceResponse, InviteDeclineResponse, UserInviteToken } from '@vertesia/common';

/** Authenticate the parent client with a Firebase ID token, before account membership exists. */
export default class OnboardingInvitesApi extends ApiTopic {
    constructor(parent: ClientBase) {
        super(parent, '/auth/invites');
    }
    list(): Promise<UserInviteToken[]> {
        return this.get('/');
    }
    accept(id: string): Promise<InviteAcceptanceResponse> {
        return this.put(`/${encodeURIComponent(id)}`);
    }
    decline(id: string): Promise<InviteDeclineResponse> {
        return this.del(`/${encodeURIComponent(id)}`);
    }
}
