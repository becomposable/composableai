import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { UserInviteToken } from '@vertesia/common';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { InviteAcceptModal } from './InviteAcceptModal';

const session = vi.hoisted(() => ({
    client: {
        account: {
            listInvites: vi.fn(),
            acceptInvite: vi.fn(),
            rejectInvite: vi.fn(),
        },
    },
    refreshAuthToken: vi.fn(),
    fetchAccounts: vi.fn(),
    fetchProjects: vi.fn(),
}));

vi.mock('@vertesia/ui/session', () => ({ useUserSession: () => session }));
vi.mock('@vertesia/ui/i18n', () => ({ useUITranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@vertesia/ui/core', () => ({
    Button: ({
        children,
        onClick,
        isDisabled,
        isLoading,
    }: {
        children: ReactNode;
        onClick: () => void;
        isDisabled?: boolean;
        isLoading?: boolean;
    }) => (
        <button type="button" onClick={onClick} disabled={isDisabled || isLoading}>
            {children}
        </button>
    ),
    Modal: ({ isOpen, children }: { isOpen: boolean; children: ReactNode }) =>
        isOpen ? <div role="dialog">{children}</div> : null,
    ModalBody: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    ModalTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

function invite(id: string, accountName: string): UserInviteToken {
    return {
        id,
        data: { account: { id: `account-${id}`, name: accountName }, role: 'member' },
    } as unknown as UserInviteToken;
}

beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    session.client.account.listInvites.mockResolvedValue([invite('a', 'Alpha'), invite('b', 'Beta')]);
    session.client.account.acceptInvite.mockResolvedValue(undefined);
    session.client.account.rejectInvite.mockResolvedValue(undefined);
    session.refreshAuthToken.mockResolvedValue({});
    session.fetchAccounts.mockResolvedValue(undefined);
    session.fetchProjects.mockResolvedValue(undefined);
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.clearAllMocks();
});

it('refreshes the token before loading the new account projects', async () => {
    render(<InviteAcceptModal />);
    fireEvent.click((await screen.findAllByRole('button', { name: 'login.accept' }))[0]);

    await waitFor(() => expect(session.fetchProjects).toHaveBeenCalledWith('account-a'));
    expect(session.refreshAuthToken.mock.invocationCallOrder[0]).toBeLessThan(
        session.fetchProjects.mock.invocationCallOrder[0],
    );
    expect(screen.queryByText('Alpha')).toBeNull();
    expect(screen.getByText('Beta')).toBeTruthy();
});

it('removes an accepted invite even when the session refresh fails', async () => {
    session.fetchProjects.mockRejectedValue(new Error('Forbidden'));
    render(<InviteAcceptModal />);
    fireEvent.click((await screen.findAllByRole('button', { name: 'login.accept' }))[0]);

    await waitFor(() => expect(screen.queryByText('Alpha')).toBeNull());
    expect(screen.getByText('Beta')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
});

it('closes once the last invite is accepted', async () => {
    session.client.account.listInvites.mockResolvedValue([invite('a', 'Alpha')]);
    render(<InviteAcceptModal />);
    fireEvent.click(await screen.findByRole('button', { name: 'login.accept' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
});

it('disables every action while a request is pending', async () => {
    let finish!: () => void;
    session.client.account.acceptInvite.mockReturnValue(
        new Promise<void>((resolve) => {
            finish = resolve;
        }),
    );
    render(<InviteAcceptModal />);
    fireEvent.click((await screen.findAllByRole('button', { name: 'login.accept' }))[0]);

    for (const button of screen.getAllByRole('button')) {
        expect((button as HTMLButtonElement).disabled).toBe(true);
    }
    finish();
    await waitFor(() => expect(screen.queryByText('Alpha')).toBeNull());
});

it('reloads the invites and shows an error when an accept fails', async () => {
    session.client.account.acceptInvite.mockRejectedValue(new Error('Token not found'));
    session.client.account.listInvites
        .mockResolvedValueOnce([invite('a', 'Alpha'), invite('b', 'Beta')])
        .mockResolvedValueOnce([invite('b', 'Beta')]);
    render(<InviteAcceptModal />);
    fireEvent.click((await screen.findAllByRole('button', { name: 'login.accept' }))[0]);

    await waitFor(() => expect(screen.queryByText('Alpha')).toBeNull());
    expect(screen.getByRole('alert').textContent).toBe('login.inviteActionFailed');
    expect(session.refreshAuthToken).not.toHaveBeenCalled();
});
