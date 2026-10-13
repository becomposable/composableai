import { OnboardingInvitesApi, VertesiaClient } from '@vertesia/client';
import type { UserInviteToken } from '@vertesia/common';
import { Button } from '@vertesia/ui/core';
import { useUITranslation } from '@vertesia/ui/i18n';
import { useEffect, useMemo, useState } from 'react';

/** This screen needs only a provider credential; accepting is the first membership write. */
export function InvitationReview({
    studioUrl,
    getIdToken,
    onAccepted,
    onBack,
}: {
    studioUrl: string;
    getIdToken: () => Promise<string | null | undefined>;
    onAccepted: () => void;
    onBack: () => void;
}) {
    const { t } = useUITranslation();
    const [invites, setInvites] = useState<UserInviteToken[]>();
    const [error, setError] = useState(false);
    const [busy, setBusy] = useState(false);
    const api = useMemo(
        () =>
            new OnboardingInvitesApi(
                new VertesiaClient({ serverUrl: studioUrl, storeUrl: studioUrl }).withAuthCallback(async () => {
                    const token = await getIdToken();
                    if (!token) throw new Error('Provider credential required');
                    return `Bearer ${token}`;
                }),
            ),
        [studioUrl, getIdToken],
    );

    useEffect(() => {
        let active = true;
        void api
            .list()
            .then((items) => {
                if (active) setInvites(items);
            })
            .catch(() => {
                if (active) setError(true);
            });
        return () => {
            active = false;
        };
    }, [api]);

    async function decide(invite: UserInviteToken, accept: boolean) {
        if (busy) return;
        setBusy(true);
        setError(false);
        try {
            if (accept) {
                await api.accept(invite.id);
                onAccepted();
            } else {
                await api.decline(invite.id);
                setInvites((items) => items?.filter((item) => item.id !== invite.id));
            }
        } catch {
            setError(true);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="space-y-4">
            <h1 className="text-xl font-semibold">{t('login.reviewInvites')}</h1>
            <p>{t('login.inviteConsent')}</p>
            {error && (
                <p role="alert" className="text-destructive">
                    {t('login.inviteError')}
                </p>
            )}
            {invites?.length === 0 && <p>{t('login.inviteEmpty')}</p>}
            {invites?.map((invite) => (
                <div key={invite.id} className="rounded border p-4 space-y-2">
                    <div className="font-semibold">{invite.data.account.name}</div>
                    <div>{invite.data.project?.name}</div>
                    <div>{t('login.inviteRole', { role: invite.data.role })}</div>
                    <div>{t('login.inviteSender', { name: invite.data.invited_by.name })}</div>
                    <div className="flex gap-2">
                        <Button isDisabled={busy} onClick={() => void decide(invite, true)}>
                            {t('login.accept')}
                        </Button>
                        <Button isDisabled={busy} variant="outline" onClick={() => void decide(invite, false)}>
                            {t('login.reject')}
                        </Button>
                    </div>
                </div>
            ))}
            <Button variant="outline" isDisabled={busy} onClick={onBack}>
                {t('auth.recovery.useDifferentAccount')}
            </Button>
        </div>
    );
}
