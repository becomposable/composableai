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
    Modal: ({ isOpen, onClose, children }: { isOpen: boolean; onClose: () => void; children: ReactNode }) =>
        isOpen ? (
            <div role="dialog">
                <button type="button" onClick={onClose}>
                    close
                </button>
                {children}
            </div>
        ) : null,
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

it('defers the session refresh while invites remain', async () => {
    render(<InviteAcceptModal />);
    fireEvent.click((await screen.findAllByRole('button', { name: 'login.accept' }))[0]);

    await waitFor(() => expect(screen.queryByText('Alpha')).toBeNull());
    expect(screen.getByText('Beta')).toBeTruthy();
    expect(session.refreshAuthToken).not.toHaveBeenCalled();
});

it('refreshes the token once, then loads every accepted account, after the last invite', async () => {
    render(<InviteAcceptModal />);
    fireEvent.click((await screen.findAllByRole('button', { name: 'login.accept' }))[0]);
    await waitFor(() => expect(screen.queryByText('Alpha')).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: 'login.accept' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(session.fetchProjects).toHaveBeenCalledTimes(2));
    expect(session.fetchProjects).toHaveBeenNthCalledWith(1, 'account-a');
    expect(session.fetchProjects).toHaveBeenNthCalledWith(2, 'account-b');
    expect(session.refreshAuthToken).toHaveBeenCalledTimes(1);
    expect(session.refreshAuthToken.mock.invocationCallOrder[0]).toBeLessThan(
        session.fetchProjects.mock.invocationCallOrder[0],
    );
});

it('refreshes the session when the modal is closed with invites remaining', async () => {
    render(<InviteAcceptModal />);
    fireEvent.click((await screen.findAllByRole('button', { name: 'login.accept' }))[0]);
    await waitFor(() => expect(screen.queryByText('Alpha')).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: 'close' }));

    await waitFor(() => expect(session.fetchProjects).toHaveBeenCalledWith('account-a'));
    expect(session.refreshAuthToken).toHaveBeenCalledTimes(1);
});

it('does not refresh the session when nothing was accepted', async () => {
    render(<InviteAcceptModal />);
    for (const button of await screen.findAllByRole('button', { name: 'login.reject' })) {
        fireEvent.click(button);
        await waitFor(() => expect((button as HTMLButtonElement).isConnected).toBe(false));
    }

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(session.refreshAuthToken).not.toHaveBeenCalled();
});

it('keeps the modal usable when the session refresh fails', async () => {
    session.refreshAuthToken.mockRejectedValue(new Error('Forbidden'));
    session.client.account.listInvites.mockResolvedValue([invite('a', 'Alpha')]);
    render(<InviteAcceptModal />);
    fireEvent.click(await screen.findByRole('button', { name: 'login.accept' }));

    await waitFor(() => expect(session.refreshAuthToken).toHaveBeenCalled());
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
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

    const actions = [
        ...screen.getAllByRole('button', { name: 'login.accept' }),
        ...screen.getAllByRole('button', { name: 'login.reject' }),
    ];
    for (const button of actions) {
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
