import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
    useGetMyTicketsQuery,
    useTransferTicketMutation,
    useGetMyPendingGiftsQuery,
    useClaimGiftByIdMutation,
} from '../ticketsApi';
import { formatEventDate } from '@/utils/dateFormat';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { QRCode } from 'react-qr-code';
import TicketCard from '@/components/ui/TicketCard';
import { Icons } from '@/components/ui/Icon';
import { downloadTicketPdf } from '../pdf';

const TABS = [
    { key: 'tickets', label: 'My Tickets' },
    { key: 'gifts',   label: 'Gifts' },
];

export default function TicketsPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const eventId = searchParams.get('eventId') || null;

    const [tab, setTab] = useState('tickets');
    const [activeQr, setActiveQr] = useState(null);
    const pendingGiftsQuery = useGetMyPendingGiftsQuery();
    const giftsCount = pendingGiftsQuery.data?.length ?? 0;

    /* ── eventId-filtered mode: no tabs, back button ─────────────── */
    if (eventId) {
        return (
            <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
                <div style={{ maxWidth: 880, margin: '0 auto', padding: '32px 24px 80px' }}>
                    <button
                        type="button"
                        onClick={() => navigate(`/events/${eventId}`)}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            background: 'none', border: 0, padding: 0, cursor: 'pointer',
                            fontSize: 13, color: 'var(--text-2)', marginBottom: 24,
                            fontFamily: 'inherit',
                        }}
                    >
                        <Icons.chevronL size={14} /> Back to event
                    </button>

                    <h1 className="mp-h1" style={{ margin: 0, color: 'var(--text-1)' }}>Your tickets</h1>
                    <p className="body" style={{ margin: '8px 0 24px', color: 'var(--text-2)' }}>
                        Tickets for this event.
                    </p>

                    <MyTicketsTab onShowQr={setActiveQr} eventId={eventId} />
                </div>

                <Modal open={!!activeQr} onClose={() => setActiveQr(null)} width={400} label="Ticket QR code">
                    {activeQr && <QrModalContent ticket={activeQr} onClose={() => setActiveQr(null)} />}
                </Modal>
            </div>
        );
    }

    /* ── Normal mode: tabs ────────────────────────────────────────── */
    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            <div style={{ maxWidth: 880, margin: '0 auto', padding: '32px 24px 80px' }}>
                <h1 className="mp-h1" style={{ margin: 0, color: 'var(--text-1)' }}>Tickets</h1>
                <p className="body" style={{ margin: '8px 0 24px', color: 'var(--text-2)' }}>
                    Your tickets and gifted tickets.
                </p>

                {/* Tab bar */}
                <div style={{
                    display: 'flex',
                    gap: 4,
                    marginBottom: 28,
                    borderBottom: '2px solid var(--border)',
                    paddingBottom: 0,
                }}>
                    {TABS.map(t => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            style={{
                                padding: '10px 18px',
                                border: 0,
                                background: 'transparent',
                                fontFamily: 'inherit',
                                fontSize: 14,
                                fontWeight: tab === t.key ? 600 : 500,
                                color: tab === t.key ? 'var(--mp-blue)' : 'var(--text-2)',
                                cursor: 'pointer',
                                borderBottom: tab === t.key ? '2px solid var(--mp-blue)' : '2px solid transparent',
                                marginBottom: -2,
                                borderRadius: 0,
                                transition: 'color 0.15s',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                            }}
                        >
                            {t.label}
                            {t.key === 'gifts' && giftsCount > 0 && (
                                <span style={{
                                    fontSize: 11, fontWeight: 700,
                                    background: '#E35B00', color: 'white',
                                    borderRadius: 99, padding: '1px 6px', lineHeight: 1.6,
                                }}>
                                    {giftsCount}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {tab === 'tickets' && <MyTicketsTab onShowQr={setActiveQr} eventId={null} />}
                {tab === 'gifts'   && <GiftsTab />}
            </div>

            <Modal open={!!activeQr} onClose={() => setActiveQr(null)} width={400} label="Ticket QR code">
                {activeQr && <QrModalContent ticket={activeQr} onClose={() => setActiveQr(null)} />}
            </Modal>
        </div>
    );
}

/* ── My Tickets tab ──────────────────────────────────────────── */

function MyTicketsTab({ onShowQr, eventId }) {
    const navigate = useNavigate();
    const [transferTarget, setTransferTarget] = useState(null);

    const tickets = useGetMyTicketsQuery(eventId ? { eventId } : undefined);

    if (tickets.isLoading || tickets.isFetching) return <SkeletonList />;
    if (tickets.isError)   return <ErrorState onRetry={tickets.refetch} />;
    if ((tickets.data?.length ?? 0) === 0) return <EmptyState onBrowse={() => navigate('/events')} />;

    // When viewing all tickets (no eventId filter), group by event so the user
    // can find tickets without scanning through a flat list.
    const content = eventId ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {tickets.data.map((t) => (
                <TicketCard
                    key={t.id}
                    ticket={t}
                    eventStartTime={t.eventStartTime}
                    venue={t.eventVenue}
                    onShowQr={onShowQr}
                    onTransfer={() => setTransferTarget(t)}
                />
            ))}
        </div>
    ) : (
        Object.values(
            tickets.data.reduce((acc, t) => {
                const key = t.eventId ?? t.id;
                (acc[key] ??= { title: t.eventTitle, tickets: [] }).tickets.push(t);
                return acc;
            }, {})
        ).map(({ title, tickets: group }) => (
            <section key={title} style={{ marginBottom: 32 }}>
                <h2 style={{
                    fontSize: 16, fontWeight: 700,
                    color: 'var(--text-1)',
                    margin: '0 0 12px',
                    paddingBottom: 8,
                    borderBottom: '1px solid var(--border)',
                }}>
                    {title}
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {group.map((t) => (
                        <TicketCard
                            key={t.id}
                            ticket={t}
                            eventStartTime={t.eventStartTime}
                            venue={t.eventVenue}
                            onShowQr={onShowQr}
                            onTransfer={() => setTransferTarget(t)}
                        />
                    ))}
                </div>
            </section>
        ))
    );

    return (
        <>
            {content}
            {transferTarget && (
                <TransferModal
                    ticket={transferTarget}
                    onClose={() => setTransferTarget(null)}
                />
            )}
        </>
    );
}

/* ── Transfer modal ──────────────────────────────────────────── */

function TransferModal({ ticket, onClose }) {
    const [transferTicket, { isLoading: isTransferring }] = useTransferTicketMutation();
    const [step, setStep]     = useState('form');
    const [email, setEmail]   = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    function handleReview(e) {
        e.preventDefault();
        if (!email.trim()) return;
        setErrorMsg('');
        setStep('confirm');
    }

    async function handleConfirm() {
        setErrorMsg('');
        try {
            // Pass eventId so the API layer can also patch the per-event cache entry
            await transferTicket({
                ticketId: ticket.id,
                recipientEmail: email.trim(),
                eventId: ticket.eventId ?? null,
            }).unwrap();
            setStep('done');
        } catch (err) {
            setErrorMsg(err?.data?.message ?? err?.error ?? 'Transfer failed. Please try again.');
        }
    }

    /* ── Done ── */
    if (step === 'done') {
        return <TransferDoneModal email={email} onClose={onClose} />;
    }

    /* ── Confirm ── */
    if (step === 'confirm') {
        return (
            <Modal open onClose={onClose} width={480} label="Confirm transfer">
                <div style={{ padding: 24 }}>
                    <button
                        type="button"
                        onClick={() => setStep('form')}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            background: 'none', border: 0, padding: 0, cursor: 'pointer',
                            fontSize: 13, color: 'var(--text-2)', marginBottom: 20,
                            fontFamily: 'inherit',
                        }}
                    >
                        <Icons.chevronL size={14} /> Back
                    </button>

                    <h2 className="mp-h3" style={{ margin: '0 0 6px', color: 'var(--text-1)' }}>
                        Confirm transfer
                    </h2>
                    <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--text-2)' }}>
                        Review the details below. This action cannot be undone.
                    </p>

                    {/* Summary card */}
                    <div style={{
                        border: '1px solid var(--border)', borderRadius: 10,
                        overflow: 'hidden', marginBottom: 16,
                    }}>
                        <div style={{ padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: 8,
                                background: '#EAF1FE', display: 'flex',
                                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            }}>
                                <Icons.ticket size={16} style={{ color: 'var(--mp-blue)' }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>
                                    {ticket.eventTitle}
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
                                    {ticket.tierName}
                                    {ticket.seatNumber ? ` · Seat ${ticket.seatNumber}` : ''}
                                    {ticket.eventStartTime ? ` · ${formatEventDate(ticket.eventStartTime)}` : ''}
                                </div>
                            </div>
                        </div>
                        <div style={{
                            borderTop: '1px solid var(--border)',
                            padding: '10px 16px',
                            display: 'flex', gap: 8, alignItems: 'center',
                        }}>
                            <Icons.mail size={13} style={{ color: 'var(--text-3)' }} />
                            <div style={{ fontSize: 13, color: 'var(--text-1)', fontWeight: 500 }}>{email}</div>
                        </div>
                    </div>

                    {/* Warning */}
                    <div style={{
                        background: '#FEF9EC', border: '1px solid #F5D97A',
                        borderRadius: 10, padding: '12px 14px', marginBottom: 20,
                        display: 'flex', gap: 8, alignItems: 'flex-start',
                    }}>
                        <Icons.alert size={14} style={{ color: '#B45309', flexShrink: 0, marginTop: 1 }} />
                        <span style={{ fontSize: 13, color: '#92400E', lineHeight: 1.5 }}>
                            Once confirmed, <strong>this cannot be reversed.</strong> The ticket will immediately
                            move to the recipient and you will lose all access to it.
                        </span>
                    </div>

                    {errorMsg && (
                        <div style={{
                            background: '#FBE9E9', border: '1px solid #FBB6B6',
                            borderRadius: 10, padding: '10px 14px', marginBottom: 16,
                            display: 'flex', gap: 8, alignItems: 'center',
                        }}>
                            <Icons.alert size={14} style={{ color: '#D62828', flexShrink: 0 }} />
                            <span style={{ fontSize: 13, color: '#D62828' }}>{errorMsg}</span>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: 10 }}>
                        <Button
                            variant="secondary"
                            size="md"
                            onClick={() => setStep('form')}
                            disabled={isTransferring}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            size="md"
                            onClick={handleConfirm}
                            disabled={isTransferring}
                            style={{ background: '#D62828', borderColor: '#D62828' }}
                        >
                            {isTransferring ? 'Transferring…' : 'Yes, transfer ticket'}
                        </Button>
                    </div>
                </div>
            </Modal>
        );
    }

    /* ── Form ── */
    return (
        <Modal open onClose={onClose} width={480} label="Transfer ticket">
            <div style={{ padding: 24 }}>
                {/* Header */}
                <div style={{
                    paddingBottom: 16,
                    borderBottom: '1px solid var(--border)',
                    marginBottom: 20,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                }}>
                    <div>
                        <div style={{
                            fontSize: 11, fontWeight: 700, color: 'var(--text-3)',
                            textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4,
                        }}>
                            Transfer ticket
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>
                            {ticket.eventTitle}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
                            {ticket.tierName}{ticket.seatNumber ? ` · Seat ${ticket.seatNumber}` : ''}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        style={{
                            background: 'var(--surface-subtle)', border: 0,
                            padding: 8, borderRadius: 8, color: 'var(--text-2)', cursor: 'pointer',
                        }}
                    >
                        <Icons.x size={15} />
                    </button>
                </div>

                {/* Info banner */}
                <div style={{
                    background: '#EAF1FE', border: '1px solid #C2D9F7',
                    borderRadius: 10, padding: '12px 14px', marginBottom: 20,
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                }}>
                    <Icons.alert size={16} style={{ color: 'var(--mp-blue)', flexShrink: 0, marginTop: 1 }} />
                    <div style={{ fontSize: 13, color: '#1e40af', lineHeight: 1.5 }}>
                        The recipient gets the ticket PDF + calendar invite by email immediately.
                        <strong> This action is permanent.</strong>
                    </div>
                </div>

                <form onSubmit={handleReview} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                        <label style={{
                            display: 'block', fontSize: 13, fontWeight: 600,
                            color: 'var(--text-1)', marginBottom: 8,
                        }}>
                            Recipient&apos;s email address
                        </label>
                        <Input
                            type="email"
                            placeholder="recipient@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-3)' }}>
                            They don&apos;t need an EventNest account — we&apos;ll send the ticket directly.
                        </p>
                    </div>
                    <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        disabled={!email.trim()}
                        style={{ alignSelf: 'flex-start' }}
                    >
                        Review transfer
                    </Button>
                </form>
            </div>
        </Modal>
    );
}

/* ── Transfer done (auto-closes after 2.5 s) ─────────────────── */

function TransferDoneModal({ email, onClose }) {
    useEffect(() => {
        const timer = setTimeout(onClose, 2500);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <Modal open onClose={onClose} width={480} label="Ticket transferred">
            <div style={{ padding: 32, textAlign: 'center' }}>
                <div style={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: '#E6F4EA', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
                }}>
                    <Icons.check size={28} style={{ color: '#0F9D58' }} />
                </div>
                <h2 className="mp-h3" style={{ margin: 0, color: 'var(--text-1)' }}>
                    Ticket transferred
                </h2>
                <p style={{ margin: '8px 0 24px', fontSize: 14, color: 'var(--text-2)' }}>
                    The ticket has been sent to <strong>{email}</strong> — they&apos;ll receive it
                    by email with a PDF and calendar invite. Your copy has been invalidated.
                </p>
                <Button variant="secondary" size="md" onClick={onClose}>Close</Button>
            </div>
        </Modal>
    );
}

/* ── Gifts tab ───────────────────────────────────────────────── */

function GiftsTab() {
    const navigate = useNavigate();
    const giftsQuery = useGetMyPendingGiftsQuery();
    const [claimGift, { isLoading: isClaiming }] = useClaimGiftByIdMutation();
    const [results, setResults] = useState({});
    const [claimingId, setClaimingId] = useState(null);

    async function handleClaim(ticketId) {
        setClaimingId(ticketId);
        try {
            await claimGift(ticketId).unwrap();
            setResults((r) => ({ ...r, [ticketId]: 'claimed' }));
        } catch (err) {
            setResults((r) => ({ ...r, [ticketId]: err?.data?.message ?? 'Something went wrong. Try again.' }));
        } finally {
            setClaimingId(null);
        }
    }

    if (giftsQuery.isLoading) return <SkeletonList count={2} />;
    if (giftsQuery.isError)   return <ErrorState onRetry={giftsQuery.refetch} />;

    const gifts = giftsQuery.data ?? [];
    const hasAny = gifts.length > 0 || Object.values(results).some((v) => v === 'claimed');

    if (!hasAny) {
        return (
            <div style={{
                background: 'var(--surface-elevated)', border: '1px solid var(--border)',
                borderRadius: 12, padding: 48, textAlign: 'center',
            }}>
                <Icons.gift size={32} style={{ color: 'var(--text-3)' }} />
                <p style={{ margin: '12px 0 4px', fontWeight: 600, fontSize: 16, color: 'var(--text-1)' }}>
                    No pending gifts
                </p>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--text-2)' }}>
                    When someone gifts you a ticket, it will appear here for you to claim.
                </p>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--text-2)' }}>
                These tickets were gifted to your email address. Claim them to add them to your account.
            </p>

            {gifts.map((gift) => {
                const outcome = results[gift.id];
                const busy    = claimingId === gift.id;

                if (outcome === 'claimed') {
                    return (
                        <div key={gift.id} style={{
                            background: '#E6F4EA', border: '1px solid #A8D5B5',
                            borderRadius: 12, padding: '14px 18px',
                            display: 'flex', gap: 10, alignItems: 'center',
                        }}>
                            <Icons.check size={16} style={{ color: '#0F9D58', flexShrink: 0 }} />
                            <span style={{ fontSize: 13, color: '#0F7B3E', fontWeight: 500 }}>
                                Ticket for <strong>{gift.eventTitle}</strong> added to your account.{' '}
                                <button
                                    onClick={() => navigate('/tickets')}
                                    style={{
                                        background: 'none', border: 0, padding: 0,
                                        cursor: 'pointer', fontSize: 13, color: '#0F7B3E',
                                        fontWeight: 600, textDecoration: 'underline', fontFamily: 'inherit',
                                    }}
                                >
                                    View tickets
                                </button>
                            </span>
                        </div>
                    );
                }

                return (
                    <div key={gift.id} style={{
                        background: 'var(--surface-elevated)', border: '1px solid var(--border)',
                        borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-card)',
                    }}>
                        <div style={{ padding: '16px 18px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                            <div style={{
                                width: 40, height: 40, borderRadius: 8,
                                background: '#FFF3E0', display: 'flex',
                                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            }}>
                                <Icons.gift size={18} style={{ color: '#E35B00' }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>
                                    {gift.eventTitle}
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 3 }}>
                                    {gift.tierName}
                                    {gift.eventStartTime && ` · ${formatEventDate(gift.eventStartTime)}`}
                                    {gift.eventVenue && ` · ${gift.eventVenue}`}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 5 }}>
                                    Pending claim
                                </div>
                            </div>
                            <span style={{
                                fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
                                textTransform: 'uppercase', flexShrink: 0,
                                color: '#E35B00', background: '#FFF3E0',
                                padding: '3px 10px', borderRadius: 99,
                            }}>
                                Gift
                            </span>
                        </div>

                        {typeof outcome === 'string' && outcome !== 'claimed' && (
                            <div style={{
                                margin: '0 18px 10px',
                                background: '#FBE9E9', border: '1px solid #FBB6B6',
                                borderRadius: 8, padding: '8px 12px',
                                fontSize: 12, color: '#D62828',
                                display: 'flex', gap: 6, alignItems: 'center',
                            }}>
                                <Icons.alert size={13} style={{ flexShrink: 0 }} /> {outcome}
                            </div>
                        )}

                        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)' }}>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleClaim(gift.id)}
                                disabled={busy || isClaiming}
                                style={{ background: '#E35B00', borderColor: '#E35B00' }}
                            >
                                {busy ? 'Claiming…' : 'Claim ticket'}
                            </Button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/* ── QR Modal ─────────────────────────────────────────────────── */

function QrModalContent({ ticket, onClose }) {
    const [downloading, setDownloading] = useState(false);

    async function handleDownload() {
        if (downloading) return;
        setDownloading(true);
        try {
            await downloadTicketPdf(ticket);
        } finally {
            setDownloading(false);
        }
    }

    return (
        <div>
            <div style={{
                padding: '20px 24px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)' }}>
                        BOARDING PASS
                    </div>
                    <div className="mp-h4" style={{ color: 'var(--text-1)', marginTop: 2 }}>
                        {ticket.eventTitle}
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close QR"
                    style={{
                        background: 'var(--surface-subtle)',
                        border: 0, padding: 8, borderRadius: 8,
                        color: 'var(--text-2)', cursor: 'pointer',
                    }}
                >
                    <Icons.x size={16} />
                </button>
            </div>

            <div style={{
                padding: 24,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 16,
            }}>
                <div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Seat</div>
                    <div className="mp-num" style={{
                        fontSize: 28, fontWeight: 700, color: 'var(--mp-blue)', marginTop: 4,
                    }}>
                        {ticket.seatNumber ?? '—'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
                        {ticket.tierName}
                    </div>
                </div>
                <div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Issued</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', marginTop: 4 }}>
                        {ticket.issuedAt ? formatEventDate(ticket.issuedAt) : '—'}
                    </div>
                </div>
            </div>

            <div style={{
                padding: 24, paddingTop: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 16,
            }}>
                <div style={{ padding: 14, background: 'var(--surface-subtle)', borderRadius: 12, lineHeight: 0 }}>
                    <QRCode value={ticket.qrCode || ticket.id} size={200} />
                </div>
                {ticket.shortCode && (
                    <div className="mp-num" style={{
                        fontSize: 13, fontWeight: 600,
                        color: 'var(--text-2)', letterSpacing: '0.08em',
                    }}>
                        {ticket.shortCode}
                    </div>
                )}

                <Button
                    variant="secondary"
                    size="md"
                    onClick={handleDownload}
                    disabled={downloading}
                    iconLeft={<Icons.download size={14} />}
                >
                    {downloading ? 'Preparing PDF…' : 'Download as PDF'}
                </Button>
            </div>
        </div>
    );
}

/* ── Shared states ─────────────────────────────────────────────── */

function EmptyState({ onBrowse }) {
    return (
        <div data-testid="tickets-empty" style={{
            background: 'var(--surface-elevated)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 40, textAlign: 'center',
        }}>
            <Icons.ticket size={32} style={{ color: 'var(--text-3)' }} />
            <h2 className="mp-h3" style={{ marginTop: 12, color: 'var(--text-1)' }}>
                No tickets yet
            </h2>
            <p className="body" style={{ marginTop: 6, color: 'var(--text-2)' }}>
                Once you book a seat, it&apos;ll show up here with a scannable QR code.
            </p>
            <Button variant="primary" size="md" onClick={onBrowse} style={{ marginTop: 16 }}>
                Browse events
            </Button>
        </div>
    );
}

function ErrorState({ onRetry }) {
    return (
        <div role="alert" style={{
            background: 'var(--surface-elevated)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 40, textAlign: 'center',
        }}>
            <Icons.alert size={32} style={{ color: 'var(--error)' }} />
            <h2 className="mp-h3" style={{ marginTop: 12, color: 'var(--text-1)' }}>
                Could not load tickets
            </h2>
            <p className="body" style={{ marginTop: 6, color: 'var(--text-2)' }}>
                Check your connection and try again.
            </p>
            <Button variant="secondary" size="md" onClick={onRetry} style={{ marginTop: 16 }}>
                Retry
            </Button>
        </div>
    );
}

function SkeletonList({ count = 3 }) {
    const skeleton = {
        height: 130, background: 'var(--surface-elevated)',
        border: '1px solid var(--border)', borderRadius: 12,
        animation: 'mp-flash 1.6s ease-in-out infinite',
    };
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {Array.from({ length: count }).map((_, i) => <div key={i} style={skeleton} />)}
        </div>
    );
}
