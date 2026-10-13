import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { UserInviteToken } from '@vertesia/common';
import type { ButtonHTMLAttributes } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ list: vi.fn(), accept: vi.fn(), decline: vi.fn() }));
vi.mock('@vertesia/client', () => ({
    VertesiaClient: class {
        withAuthCallback() {
            return this;
        }
    },
    OnboardingInvitesApi: class {
        list = mocks.list;
        accept = mocks.accept;
        decline = mocks.decline;
    },
}));
vi.mock('@vertesia/ui/core', () => ({
    Button: ({
        isDisabled,
        variant: _variant,
        ...props
    }: ButtonHTMLAttributes<HTMLButtonElement> & {
        isDisabled?: boolean;
        variant?: string;
    }) => <button type="button" disabled={isDisabled} {...props} />,
}));
vi.mock('@vertesia/ui/i18n', () => ({
    useUITranslation: () => ({
        t: (key: string, params?: { role?: string; name?: string }) => params?.role ?? params?.name ?? key,
    }),
}));
const { InvitationReview } = await import('./InvitationReview');
const invitation = {
    id: 'invite-1',
    data: {
        account: { id: 'account-1', name: 'Account to join' },
        project: { id: 'project-1', name: 'Project to join' },
        role: 'developer',
        invited_by: { name: 'Inviter' },
    },
} as UserInviteToken;

describe('InvitationReview', () => {
    beforeEach(() => {
        mocks.list.mockReset().mockResolvedValue([invitation]);
        mocks.accept.mockReset().mockResolvedValue({ status: 'added' });
        mocks.decline.mockReset().mockResolvedValue({ status: 'deleted' });
    });
    afterEach(cleanup);
    const props = () => ({
        studioUrl: 'https://api.example.test',
        getIdToken: async () => 'provider-token',
        onAccepted: vi.fn(),
        onBack: vi.fn(),
    });

    it('shows destination, role and inviter and grants nothing until Accept is clicked', async () => {
        const callbacks = props();
        render(<InvitationReview {...callbacks} />);
        expect(await screen.findByText('Project to join')).toBeTruthy();
        expect(screen.getByText('Account to join')).toBeTruthy();
        expect(screen.getByText('developer')).toBeTruthy();
        expect(screen.getByText('Inviter')).toBeTruthy();
        expect(mocks.accept).not.toHaveBeenCalled();
        fireEvent.click(screen.getByText('login.accept'));
        await waitFor(() => expect(callbacks.onAccepted).toHaveBeenCalledOnce());
        expect(mocks.accept).toHaveBeenCalledExactlyOnceWith('invite-1');
    });

    it('declining removes the invitation without granting membership or continuing login', async () => {
        const callbacks = props();
        render(<InvitationReview {...callbacks} />);
        fireEvent.click(await screen.findByText('login.reject'));
        expect(await screen.findByText('login.inviteEmpty')).toBeTruthy();
        expect(mocks.decline).toHaveBeenCalledExactlyOnceWith('invite-1');
        expect(mocks.accept).not.toHaveBeenCalled();
        expect(callbacks.onAccepted).not.toHaveBeenCalled();
    });

    it('retains the pending invitation and shows an error when acceptance is refused', async () => {
        mocks.accept.mockRejectedValueOnce(new Error('Provider not trusted'));
        const callbacks = props();
        render(<InvitationReview {...callbacks} />);
        fireEvent.click(await screen.findByText('login.accept'));
        expect(await screen.findByRole('alert')).toBeTruthy();
        expect(screen.getByText('Project to join')).toBeTruthy();
        expect(callbacks.onAccepted).not.toHaveBeenCalled();
    });
});
