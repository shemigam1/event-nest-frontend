import { useState } from 'react';
import { Link } from 'react-router';
import { useGetMyVendorProfileQuery } from '@/features/organiser/vendorsApi';
import { useSelfVerifyVendorMutation } from '../vendorInvitesApi';
import Button from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icon';

/* ────────────────────────────────────────────────────────────────────────────
   Sandbox banner.

   Renders nothing unless the caller's vendor profile is SANDBOXED. When it is,
   shows a clear notice:
     · what's limited ("sandboxed to <event> until you verify")
     · where to verify (Verify now button, ~2s simulated)
     · where the inviting event lives (link to /organiser/events/:id is wrong —
       the vendor isn't the organiser, they're the VENDOR; we just surface the
       event title for context, no clickable link)

   The "Verify now" button calls /vendor/self-verify which transitions
   SANDBOXED → VERIFIED (and clears sandboxEventId) after a simulated ~2s
   provider wait. On success the parent automatically re-renders without the
   banner because the cached profile invalidates.
   ─────────────────────────────────────────────────────────────────────── */
export default function SandboxBanner() {
    const { data: profile } = useGetMyVendorProfileQuery();
    const [selfVerify, { isLoading }] = useSelfVerifyVendorMutation();
    const [error, setError] = useState('');
    const [justVerified, setJustVerified] = useState(false);

    if (!profile || profile.status !== 'SANDBOXED') return null;

    async function handleVerify() {
        if (isLoading) return;
        setError('');
        try {
            await selfVerify().unwrap();
            setJustVerified(true);
        } catch (err) {
            setError(err?.data?.message || 'Could not verify right now. Try again.');
        }
    }

    if (justVerified) {
        return (
            <div role="status" style={{
                display: 'flex', gap: 12, alignItems: 'center',
                padding: '14px 18px', marginBottom: 20,
                background: 'var(--success-bg, #E6F4EA)',
                border: '1px solid var(--success, #0F7B3E)',
                borderRadius: 12,
            }}>
                <span style={{
                    width: 32, height: 32, borderRadius: 99,
                    background: 'var(--success, #0F7B3E)', color: 'white',
                    display: 'grid', placeItems: 'center', flexShrink: 0,
                }}>
                    <Icons.check size={16} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>
                        You&apos;re verified
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
                        Your vendor profile is now live on the marketplace. Other organisers
                        can find and invite you.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div role="region" aria-label="Sandbox notice" style={{
            display: 'flex', gap: 14, alignItems: 'flex-start',
            padding: '14px 18px', marginBottom: 20,
            background: 'var(--warning-bg)',
            border: '1px solid var(--warning)',
            borderRadius: 12,
        }}>
            <span style={{
                width: 34, height: 34, borderRadius: 99,
                background: 'var(--surface-elevated, white)',
                color: 'var(--warning)',
                display: 'grid', placeItems: 'center', flexShrink: 0,
                border: '1px solid var(--warning)',
            }}>
                <Icons.shield size={16} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>
                    You&apos;re sandboxed to one event
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>
                    Your vendor account currently works only for the event you were invited to.
                    Verify your account to unlock the full marketplace, apply to other events,
                    and earn the green badge.
                </div>
                {error && (
                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--error)' }}>
                        {error}
                    </div>
                )}
                <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={handleVerify}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Verifying…' : 'Verify now'}
                    </Button>
                    {profile.sandboxEventId && (
                        <Link
                            to="/vendor/contracts"
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                fontSize: 13, fontWeight: 500,
                                color: 'var(--text-2)', textDecoration: 'none',
                                padding: '7px 12px', borderRadius: 8,
                                border: '1px solid var(--border)',
                                background: 'var(--surface-elevated, white)',
                            }}
                        >
                            Go to event contracts
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}
