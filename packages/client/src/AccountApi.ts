import { Account, InviteUserRequestPayload, InviteUserResponsePayload, OnboardingProgress, ProjectRef, TransientToken, UpdateAccountPayload, User, UserInviteTokenData } from "@composableai/common";
import { ApiTopic, ClientBase } from "api-fetch-client";

export default class AccountApi extends ApiTopic {

    constructor(parent: ClientBase) {
        super(parent, "/api/v1/account")
    }

    /**
     * Retrieve all account information for current account
     * @returns Account[]
     */
    info(): Promise<Account> {
        return this.get('/');
    }

    /**
     * Update account information
     * @returns Account
     */
    update(payload: UpdateAccountPayload): Promise<Account> {
        return this.put('/', { payload });
    }

    /**
     * Get all projects for account
    */
    projects(): Promise<ProjectRef[]> {
        return this.get('/projects').then(res => res.data);
    }

    members(): Promise<User[]> {
        return this.get('/members')
    }

    /**
     * Invite User to account
     */
    inviteUser(payload: InviteUserRequestPayload): Promise<InviteUserResponsePayload> {
        return this.post('/invites', { payload });
    }

    /**
     * Fetch Invites for account
     * @returns UserInviteTokenData[]
     * */
    listInvites(): Promise<TransientToken<UserInviteTokenData>[]> {
        return this.get('/invites');
    }

    /**
     * Accept Invite for account
     * @returns UserInviteTokenData
     * */
    acceptInvite(id: string): Promise<UserInviteTokenData> {
        return this.put(`/invites/${id}`);
    }

    /**
     * Delete Invite for account
     * @returns UserInviteTokenData
     * */
    rejectInvite(id: string): Promise<UserInviteTokenData> {
        return this.delete(`/invites/${id}`);
    }

    /**
     * Get Onboarding Progress for account
     */
    onboardingProgress(): Promise<OnboardingProgress> {
        return this.get('/onboarding');
    }

}
