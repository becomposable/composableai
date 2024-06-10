import { ApiKey } from "./apikey.js";
import { ProjectRoles } from "./project.js";

export interface UserWithAccounts extends User {
    accounts: AccountRef[];
}
export interface User {
    id: string;
    externalId: string;
    email: string;
    name: string;
    username?: string;
    picture?: string;
    language?: string;
    phone?: string;
    sign_in_provider?: string;
    last_selected_account?: string;
}

export interface UserRef {
    id: string;
    name: string;
    email: string;
    picture?: string;
}
export const UserRefPopulate = "id name email picture";

export interface Account {
    id: string;
    name: string;
    owner: string;

    email_domains: string[];
    members: {
        role: ProjectRoles;
        user: UserRef;
    }[];

    onboarding: {
        completed: boolean,
        completed_at: Date,
    };


    created_at: string;
    updated_at: string;
}

export interface UpdateAccountPayload {
    name?: string;
    email_domains?: string[];
}

export interface AccountRef {
    id: string;
    name: string;
}
export const AccountRefPopulate = "id name";


export interface InviteUserRequestPayload {
    email: string;
    role: ProjectRoles;
}

export interface InviteUserResponsePayload {
    action: 'invited' | 'added';
}


type UserOrApiKey<T extends User | ApiKey> = T extends User ? User : ApiKey;
type SessionType<T extends User | ApiKey> = T extends User ? "user" : "apikey";
export interface SessionInfo<T extends User | ApiKey> {
    isNew?: boolean;
    type: SessionType<T>;
    subject: UserOrApiKey<T>;
    //User | ApiKey; // no user if using an apikey
    current_account: Account;
    //role: string; // TODO the role on the selected account
    accounts: AccountRef[];
    intercom_hash?: string; //used for Intercom to authentify the user
}

export interface UserSessionInfo extends SessionInfo<User> { }
export interface ApiKeySessionInfo extends SessionInfo<ApiKey> { }

export interface OnboardingProgress {
    projects: boolean,
    interactions: boolean,
    apikeys: boolean,
    prompts: boolean,
    environments: boolean,
    runs: boolean;
}


/**
 * Data collected at signup
 * used for onboarding and segments
 **/
export interface SignupData {
    accountType: string;
    companyName?: string;
    companySize?: number;
    companyWebsite?: string;
    maturity?: string;
}

/**
 * Signup Payload: used to create a new user
 */
export interface SignupPayload {
    firebaseToken: string;
    signupData: SignupData;
}