import type { UserInviteToken } from '@vertesia/common';
import { Button, Modal, ModalBody, ModalTitle } from '@vertesia/ui/core';
import { useUITranslation } from '@vertesia/ui/i18n';
import { useUserSession } from '@vertesia/ui/session';
import { useCallback, useEffect, useState } from 'react';

// Legacy invites have no account data and cannot be shown or accepted here.
function withAccount(invites: UserInviteToken[]) {
    return invites.filter((i) => i.data.account);
}

export function InviteAcceptModal() {
    const session = useUserSession();
    const { client } = session;
    const { t } = useUITranslation();
    const [showModal, setShowModal] = useState(false);
    const [invites, setInvites] = useState<UserInviteToken[]>([]);
    const [pendingId, setPendingId] = useState<string>();
    const [error, setError] = useState<string>();

    const loadInvites = useCallback(async () => {
        const valid = withAccount(await client.account.listInvites());
        setInvites(valid);
        return valid;
    }, [client]);

    useEffect(() => {
        loadInvites()
            .then((valid) => {
                if (valid.length > 0) {
                    console.log('Found valid invites', valid.length);
                    setShowModal(true);
                }
            })
            .catch((err) => {
                console.error('Error fetching invites', err);
            });
    }, [loadInvites]);

    const closeModal = () => setShowModal(false);

    const removeInvite = (inviteId: string) => setInvites((current) => current.filter((i) => i.id !== inviteId));

    // An accept or reject can fail because the invite was already used, e.g. from another tab: show the server's list.
    const recoverFromFailure = async (action: string, err: unknown) => {
        console.error(`Failed to ${action} invite`, err);
        setError(t('login.inviteActionFailed'));
        await loadInvites().catch((reloadErr) => console.error('Error fetching invites', reloadErr));
    };

    const accept = async (invite: UserInviteToken) => {
        setPendingId(invite.id);
        setError(undefined);
        try {
            await client.account.acceptInvite(invite.id);
        } catch (err) {
            await recoverFromFailure('accept', err);
            setPendingId(undefined);
            return;
        }
        // The invite is consumed: drop it before refreshing, so a refresh failure cannot leave it clickable.
        removeInvite(invite.id);
        try {
            // The current token predates the new membership and does not list the new account, so the
            // server rejects reads of it until a fresh token is minted.
            await session.refreshAuthToken();
            await session.fetchAccounts();
            await session.fetchProjects(invite.data.account.id);
        } catch (err) {
            console.error('Failed to refresh the session after accepting an invite', err);
        } finally {
            setPendingId(undefined);
        }
    };

    const reject = async (invite: UserInviteToken) => {
        setPendingId(invite.id);
        setError(undefined);
        try {
            await client.account.rejectInvite(invite.id);
            removeInvite(invite.id);
        } catch (err) {
            await recoverFromFailure('reject', err);
        } finally {
            setPendingId(undefined);
        }
    };

    const inviteList = invites.map((invite) => (
        <div key={invite.id} className="flex flex-row w-full justify-between border rounded-sm px-2 py-2 ">
            <div className="flex flex-col">
                <div className="w-full font-semibold">{invite.data.account.name ?? invite.data.account}</div>
                {invite.data.project && <div className="w-full text-base">- {invite.data.project.name}</div>}
                <div className="text-xs">Role: {invite.data.role}</div>
                {invite.data.invited_by && (
                    <div className="text-xs">by {invite.data.invited_by.name ?? invite.data.invited_by}</div>
                )}
            </div>
            <div className="flex flex-col gap-4">
                <Button
                    size={'xs'}
                    isDisabled={!!pendingId}
                    isLoading={pendingId === invite.id}
                    onClick={() => void accept(invite)}
                >
                    {t('login.accept')}
                </Button>{' '}
                <Button size={'xs'} variant="secondary" isDisabled={!!pendingId} onClick={() => void reject(invite)}>
                    {t('login.reject')}
                </Button>
            </div>
        </div>
    ));

    return (
        <div>
            <Modal isOpen={showModal && invites.length > 0} onClose={closeModal}>
                <ModalTitle>{t('login.reviewInvites')}</ModalTitle>
                <ModalBody>
                    <div className="text-sm pb-4">
                        You have received the following invites to join other accounts. Please review and accept or
                        declined them.
                    </div>
                    {error && (
                        <div role="alert" className="text-sm text-destructive pb-4">
                            {error}
                        </div>
                    )}
                    {inviteList}
                </ModalBody>
            </Modal>
        </div>
    );
}
