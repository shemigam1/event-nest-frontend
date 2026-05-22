import { useState } from 'react';
import { useGetKycStatusQuery, useVerifyBvnMutation } from '@/features/auth/authApi';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icon';

/* ────────────────────────────────────────────────────────────────────────────
   KYC verification

   What the user sees:
     · BVN not on file  → an 11-digit BVN input and a "Verify" button
     · BVN verified     → a green badge + last 4 digits + verified date

   Verification is currently SIMULATED on the server (~2s sleep) — there's no
   real provider call. The UI just needs to surface the loading state honestly
   while the request is in flight.

   Verifying a BVN unlocks the Host profiles section below. Once a BVN is set
   on the account, swapping to a different one is intentionally not exposed
   here — the backend rejects that to prevent quiet identity-changes.
   ──────────────────────────────────────────────────────────────────────── */

function StatusBadge({ verified }) {
    const tone = verified
        ? { bg: 'var(--success-bg, #E6F4EA)', fg: 'var(--success, #0F7B3E)' }
        : { bg: 'var(--warning-bg)',          fg: 'var(--warning)' };
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '3px 10px', borderRadius: 99,
            fontSize: 11, fontWeight: 600, letterSpacing: '0.02em',
            background: tone.bg, color: tone.fg,
        }}>
            {verified ? <Icons.check size={12} /> : <Icons.shield size={12} />}
            {verified ? 'Verified' : 'Not verified'}
        </span>
    );
}

function VerifiedView({ status }) {
    const verifiedDate = status.verifiedAt
        ? new Date(status.verifiedAt).toLocaleDateString('en-NG', {
              day: 'numeric', month: 'short', year: 'numeric',
          })
        : null;

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 16,
            padding: 16,
            background: 'var(--success-bg, #E6F4EA)',
            border: '1px solid var(--success, #0F7B3E)',
            borderRadius: 12,
        }}>
            <span style={{
                width: 40, height: 40, borderRadius: 99,
                background: 'var(--success, #0F7B3E)', color: 'white',
                display: 'grid', placeItems: 'center', flexShrink: 0,
            }}>
                <Icons.check size={20} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>
                    Your identity is verified
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
                    BVN ending in <strong>{status.bvnLast4 || '—'}</strong>
                    {verifiedDate ? ` · verified ${verifiedDate}` : ''}
                </div>
            </div>
        </div>
    );
}

function VerifyForm({ onSuccess }) {
    const [bvn, setBvn] = useState('');
    const [error, setError] = useState('');
    const [verifyBvn, { isLoading }] = useVerifyBvnMutation();

    const isValid = /^\d{11}$/.test(bvn);

    async function handleSubmit(e) {
        e.preventDefault();
        if (!isValid || isLoading) return;
        setError('');
        try {
            await verifyBvn({ bvn }).unwrap();
            onSuccess?.();
        } catch (err) {
            const fieldErrors = Array.isArray(err?.data?.errors) ? err.data.errors.join('; ') : '';
            setError(fieldErrors || err?.data?.message || 'Could not verify BVN.');
        }
    }

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Input
                label="Bank Verification Number (BVN)"
                value={bvn}
                onChange={(e) => {
                    // Numeric-only, cap at 11 digits.
                    setBvn(e.target.value.replace(/\D/g, '').slice(0, 11));
                    if (error) setError('');
                }}
                placeholder="11-digit BVN"
                inputMode="numeric"
                maxLength={11}
                icon={<Icons.shield size={16} />}
                hint="Your BVN is never displayed to other users. Required to host public events."
                error={error}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={!isValid || isLoading}
                >
                    {isLoading ? 'Verifying…' : 'Verify BVN'}
                </Button>
            </div>
        </form>
    );
}

export default function KycSection() {
    const { data: status, isLoading } = useGetKycStatusQuery();

    if (isLoading && !status) {
        return (
            <div style={{ padding: 24, color: 'var(--text-3)', fontSize: 13 }}>
                Loading verification status…
            </div>
        );
    }

    const verified = status?.status === 'VERIFIED';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', maxWidth: 540 }}>
                    Verify your identity once and unlock the ability to create host profiles
                    for public events. Required by Nigerian financial regulations.
                </p>
                <StatusBadge verified={verified} />
            </div>

            {verified
                ? <VerifiedView status={status} />
                : <VerifyForm onSuccess={() => { /* RTK Query refetches via tag invalidation */ }} />}
        </div>
    );
}
