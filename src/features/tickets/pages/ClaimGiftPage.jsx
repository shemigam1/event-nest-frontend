import { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated } from '@/features/auth/authSlice';
import {
    usePreviewGiftQuery,
    useClaimGiftByTokenMutation,
} from '../ticketsApi';
import { formatEventDate } from '@/utils/dateFormat';
import Button from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icon';

/* ────────────────────────────────────────────────────────────────────────────
   Gift claim landing page — routed at /tickets/claim/:token (PUBLIC).

   Flow:
     · Unauthenticated  → show gift preview card + "Log in to claim" /
                          "Create account" buttons. The `from` state ensures
                          LoginPage redirects straight back here after login.
     · Authenticated    → auto-trigger the claim on mount, show
                          success/error state, then navigate to /tickets.
   ──────────────────────────────────────────────────────────────────────── */

export default function ClaimGiftPage() {
    const { token } = useParams();
    const navigate = useNavigate();
    const isAuthenticated = useSelector(selectIsAuthenticated);

    const preview = usePreviewGiftQuery(token, { skip: !token });
    const [claimGift, claimState] = useClaimGiftByTokenMutation();

    // Auto-claim as soon as the authenticated user lands here
    useEffect(() => {
        if (!isAuthenticated || !token) return;
        if (claimState.isSuccess || claimState.isError || claimState.isLoading) return;
        claimGift(token);
    }, [isAuthenticated, token, claimGift, claimState.isSuccess, claimState.isError, claimState.isLoading]);

    // Redirect to tickets after a short delay on success
    useEffect(() => {
        if (!claimState.isSuccess) return;
        const timer = setTimeout(() => navigate('/tickets', { replace: true }), 2500);
        return () => clearTimeout(timer);
    }, [claimState.isSuccess, navigate]);

    return (
        <div style={{
            background: 'var(--surface-subtle)',
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
        }}>
            <div style={{ width: '100%', maxWidth: 480 }}>

                {/* ── Loading preview ── */}
                {preview.isLoading && <PreviewSkeleton />}

                {/* ── Bad / expired token ── */}
                {preview.isError && (
                    <StatusCard
                        icon={<Icons.alert size={28} style={{ color: 'var(--error)' }} />}
                        title="Gift link not found"
                        body="This gift link is invalid or has already been used. Check your email for the correct link, or contact the sender."
                        action={<Button variant="primary" size="md" onClick={() => navigate('/events')}>Browse events</Button>}
                    />
                )}

                {/* ── Valid preview loaded ── */}
                {preview.data && !claimState.isSuccess && (
                    <>
                        <GiftCard gift={preview.data} />

                        {isAuthenticated ? (
                            /* Claiming… / error state */
                            <div style={{ marginTop: 20 }}>
                                {claimState.isLoading && (
                                    <Button variant="primary" size="lg" disabled style={{ width: '100%' }}>
                                        Claiming your ticket…
                                    </Button>
                                )}
                                {claimState.isError && (
                                    <>
                                        <div style={{
                                            background: '#FBE9E9', border: '1px solid #FBB6B6',
                                            borderRadius: 10, padding: '12px 16px', marginBottom: 14,
                                            fontSize: 13, color: '#D62828',
                                            display: 'flex', gap: 8, alignItems: 'center',
                                        }}>
                                            <Icons.alert size={15} style={{ flexShrink: 0 }} />
                                            {claimState.error?.data?.message ?? 'Could not claim this ticket. Please try again.'}
                                        </div>
                                        <Button
                                            variant="primary"
                                            size="lg"
                                            onClick={() => claimGift(token)}
                                            style={{ width: '100%' }}
                                        >
                                            Retry
                                        </Button>
                                    </>
                                )}
                            </div>
                        ) : (
                            /* Not logged in — prompt */
                            <div style={{
                                marginTop: 20,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 10,
                            }}>
                                <Link
                                    to="/login"
                                    state={{ from: `/tickets/claim/${token}` }}
                                    style={{ textDecoration: 'none' }}
                                >
                                    <Button variant="primary" size="lg" style={{ width: '100%' }}>
                                        Log in to claim your ticket
                                    </Button>
                                </Link>
                                <Link
                                    to="/register"
                                    state={{ from: `/tickets/claim/${token}` }}
                                    style={{ textDecoration: 'none' }}
                                >
                                    <Button variant="secondary" size="lg" style={{ width: '100%' }}>
                                        Create an account
                                    </Button>
                                </Link>
                                <p style={{
                                    margin: '4px 0 0',
                                    fontSize: 12,
                                    color: 'var(--text-3)',
                                    textAlign: 'center',
                                    lineHeight: 1.5,
                                }}>
                                    Register with the same email address this gift was sent to.
                                </p>
                            </div>
                        )}
                    </>
                )}

                {/* ── Claimed successfully ── */}
                {claimState.isSuccess && (
                    <StatusCard
                        icon={
                            <div style={{
                                width: 56, height: 56, borderRadius: '50%',
                                background: '#E6F4EA',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Icons.check size={28} style={{ color: '#0F9D58' }} />
                            </div>
                        }
                        title="Ticket claimed!"
                        body={`Your ticket for ${preview.data?.eventTitle ?? 'the event'} is now in your account.`}
                        action={
                            <Button variant="primary" size="md" onClick={() => navigate('/tickets', { replace: true })}>
                                View my tickets
                            </Button>
                        }
                    />
                )}
            </div>
        </div>
    );
}

/* ── Gift preview card ──────────────────────────────────────────────────── */

function GiftCard({ gift }) {
    return (
        <div style={{
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: 'var(--shadow-elevated)',
        }}>
            {/* Header */}
            <div style={{
                background: 'var(--mp-blue)',
                padding: '24px 28px 20px',
                textAlign: 'center',
            }}>
                <Icons.gift size={32} style={{ color: 'white', opacity: 0.9 }} />
                <h1 style={{
                    margin: '12px 0 4px',
                    fontSize: 22,
                    fontWeight: 700,
                    color: 'white',
                    fontFamily: 'inherit',
                }}>
                    You&apos;ve received a ticket!
                </h1>
                <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>
                    {gift.fromName} sent you a ticket to an event.
                </p>
            </div>

            {/* Details */}
            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <DetailRow
                    icon={<Icons.calendar size={16} style={{ color: 'var(--text-3)' }} />}
                    label="Event"
                    value={gift.eventTitle}
                    bold
                />
                {gift.eventStartTime && (
                    <DetailRow
                        icon={<Icons.clock size={16} style={{ color: 'var(--text-3)' }} />}
                        label="Date"
                        value={formatEventDate(gift.eventStartTime)}
                    />
                )}
                {gift.eventVenue && (
                    <DetailRow
                        icon={<Icons.pin size={16} style={{ color: 'var(--text-3)' }} />}
                        label="Venue"
                        value={gift.eventVenue}
                    />
                )}
                <DetailRow
                    icon={<Icons.ticket size={16} style={{ color: 'var(--text-3)' }} />}
                    label="Tier"
                    value={gift.tierName}
                />
                <DetailRow
                    icon={<Icons.mail size={16} style={{ color: 'var(--text-3)' }} />}
                    label="Sent to"
                    value={gift.giftedToEmail}
                />
            </div>
        </div>
    );
}

function DetailRow({ icon, label, value, bold }) {
    return (
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ marginTop: 2, flexShrink: 0 }}>{icon}</div>
            <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {label}
                </div>
                <div style={{ fontSize: 14, fontWeight: bold ? 600 : 400, color: 'var(--text-1)', marginTop: 2 }}>
                    {value}
                </div>
            </div>
        </div>
    );
}

/* ── Status card (success / error) ─────────────────────────────────────── */

function StatusCard({ icon, title, body, action }) {
    return (
        <div style={{
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: '40px 28px',
            textAlign: 'center',
            boxShadow: 'var(--shadow-elevated)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
        }}>
            {icon}
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text-1)', fontFamily: 'inherit' }}>
                {title}
            </h2>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6 }}>
                {body}
            </p>
            <div style={{ marginTop: 8 }}>{action}</div>
        </div>
    );
}

/* ── Loading skeleton ───────────────────────────────────────────────────── */

function PreviewSkeleton() {
    const bar = (w) => ({
        height: 14,
        width: w,
        borderRadius: 6,
        background: 'var(--surface-subtle)',
        animation: 'mp-flash 1.6s ease-in-out infinite',
    });
    return (
        <div style={{
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            overflow: 'hidden',
        }}>
            <div style={{ height: 120, background: 'var(--surface-subtle)', animation: 'mp-flash 1.6s ease-in-out infinite' }} />
            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {['80%', '60%', '50%', '40%'].map((w, i) => <div key={i} style={bar(w)} />)}
            </div>
        </div>
    );
}
