import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
    useGetMyTicketsQuery,
    useTransferTicketMutation,
    useGetIncomingTransfersQuery,
    useGetOutgoingTransfersQuery,
    useAcceptTransferMutation,
    useDeclineTransferMutation,
} from '../ticketsApi';
import { formatEventDate } from '@/utils/dateFormat';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { QRCode } from 'react-qr-code';
import TicketCard from '@/components/ui/TicketCard';
import { Icons } from '@/components/ui/Icon';

const TABS = [
    { key: 'tickets',   label: 'My Tickets' },
    { key: 'transfer',  label: 'Transfer a Ticket' },
    { key: 'transfers', label: 'Transfers' },
];

export default function TicketsPage() {
    const [tab, setTab] = useState('tickets');
    const [activeQr, setActiveQr] = useState(null);
    const incomingQuery = useGetIncomingTransfersQuery();
    const incomingCount = incomingQuery.data?.length ?? 0;

    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            <div style={{ maxWidth: 880, margin: '0 auto', padding: '32px 24px 80px' }}>
                <h1 className="mp-h1" style={{ margin: 0, color: 'var(--text-1)' }}>Tickets</h1>
                <p className="body" style={{ margin: '8px 0 24px', color: 'var(--text-2)' }}>
                    View your tickets or transfer one to someone else.
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
                            {t.key === 'transfers' && incomingCount > 0 && (
                                <span style={{
                                    fontSize: 11, fontWeight: 700,
                                    background: 'var(--mp-blue)', color: 'white',
                                    borderRadius: 99, padding: '1px 6px', lineHeight: 1.6,
                                }}>
                                    {incomingCount}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {tab === 'tickets'   && <MyTicketsTab onShowQr={setActiveQr} />}
                {tab === 'transfer'  && <TransferTab />}
                {tab === 'transfers' && <TransfersTab />}
            </div>

            <Modal open={!!activeQr} onClose={() => setActiveQr(null)} width={400} label="Ticket QR code">
                {activeQr && <QrModalContent ticket={activeQr} onClose={() => setActiveQr(null)} />}
            </Modal>
        </div>
    );
}

/* ── My Tickets tab ─────────────────────────────────────── */

function MyTicketsTab({ onShowQr }) {
    const navigate = useNavigate();
    const tickets = useGetMyTicketsQuery();

    if (tickets.isLoading) return <SkeletonList />;
    if (tickets.isError)   return <ErrorState onRetry={tickets.refetch} />;
    if ((tickets.data?.length ?? 0) === 0) return <EmptyState onBrowse={() => navigate('/events')} />;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {tickets.data.map((t) => (
                <TicketCard
                    key={t.id}
                    ticket={t}
                    eventStartTime={t.eventStartTime}
                    venue={t.eventVenue}
                    onShowQr={onShowQr}
                />
            ))}
        </div>
    );
}

/* ── Transfer tab ───────────────────────────────────────── */

function TransferTab() {
    const tickets = useGetMyTicketsQuery();
    const [transferTicket, { isLoading: isTransferring }] = useTransferTicketMutation();

    // step: 'form' → 'confirm' → 'done'
    const [step, setStep]         = useState('form');
    const [selectedId, setSelectedId] = useState('');
    const [email, setEmail]           = useState('');
    const [errorMsg, setErrorMsg]     = useState('');

    const transferable = (tickets.data ?? []).filter(
        t => t.transfersEnabled
          && t.status !== 'USED'
          && t.status !== 'REFUNDED'
          && t.status !== 'CANCELLED'
    );

    const selected = transferable.find(t => String(t.id) === selectedId);

    function handleReview(e) {
        e.preventDefault();
        if (!selectedId || !email.trim()) return;
        setErrorMsg('');
        setStep('confirm');
    }

    async function handleConfirm() {
        setErrorMsg('');
        try {
            await transferTicket({ ticketId: selectedId, recipientEmail: email.trim() }).unwrap();
            setStep('done');
        } catch (err) {
            setErrorMsg(err?.data?.message ?? err?.error ?? 'Transfer failed. Please try again.');
            setStep('confirm');
        }
    }

    function handleReset() {
        setStep('form');
        setSelectedId('');
        setEmail('');
        setErrorMsg('');
    }

    if (tickets.isLoading) return <SkeletonList count={2} />;
    if (tickets.isError)   return <ErrorState onRetry={tickets.refetch} />;

    /* ── Done state ── */
    if (step === 'done') {
        return (
            <div style={{ maxWidth: 560 }}>
                <div style={{
                    background: 'white', border: '1px solid #A8D5B5',
                    borderRadius: 16, padding: 40, textAlign: 'center',
                }}>
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
                    <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--text-2)' }}>
                        The ticket has been moved to <strong>{email}</strong>.
                        It no longer appears in your account.
                    </p>
                    <Button variant="secondary" size="md" onClick={handleReset} style={{ marginTop: 24 }}>
                        Transfer another ticket
                    </Button>
                </div>
            </div>
        );
    }

    /* ── Confirm step ── */
    if (step === 'confirm') {
        return (
            <div style={{ maxWidth: 560 }}>
                {/* Back link */}
                <button
                    type="button"
                    onClick={() => setStep('form')}
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        background: 'none', border: 0, padding: 0, cursor: 'pointer',
                        fontSize: 13, color: 'var(--text-2)', marginBottom: 24,
                        fontFamily: 'inherit',
                    }}
                >
                    <Icons.chevronL size={14} /> Back
                </button>

                <h2 className="mp-h3" style={{ margin: '0 0 6px', color: 'var(--text-1)' }}>
                    Confirm transfer
                </h2>
                <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--text-2)' }}>
                    Please review the details below. This action cannot be undone.
                </p>

                {/* Transfer summary card */}
                <div style={{
                    border: '1px solid var(--border)', borderRadius: 12,
                    overflow: 'hidden', marginBottom: 20,
                }}>
                    <div style={{
                        background: 'var(--surface-subtle)', padding: '12px 20px',
                        fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                        color: 'var(--text-3)', textTransform: 'uppercase',
                    }}>
                        Ticket being transferred
                    </div>
                    <div style={{ padding: '16px 20px', display: 'flex', gap: 14, alignItems: 'center' }}>
                        <div style={{
                            width: 40, height: 40, borderRadius: 8,
                            background: '#EAF1FE', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                            <Icons.ticket size={18} style={{ color: 'var(--mp-blue)' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>
                                {selected?.eventTitle}
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 3 }}>
                                {selected?.tierName}
                                {selected?.seatNumber ? ` · Seat ${selected.seatNumber}` : ''}
                                {selected?.eventStartTime ? ` · ${formatEventDate(selected.eventStartTime)}` : ''}
                            </div>
                        </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border)', padding: '14px 20px', display: 'flex', gap: 10, alignItems: 'center' }}>
                        <Icons.users size={15} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                        <div>
                            <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                                Recipient
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', marginTop: 1 }}>
                                {email}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Warning */}
                <div style={{
                    background: '#FEF9EC', border: '1px solid #F5D97A',
                    borderRadius: 10, padding: '12px 16px', marginBottom: 24,
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                }}>
                    <Icons.alert size={16} style={{ color: '#B45309', flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontSize: 13, color: '#92400E', lineHeight: 1.5 }}>
                        Once confirmed, <strong>this cannot be reversed.</strong> The ticket will immediately
                        move to the recipient's account and you will lose all access to it.
                    </span>
                </div>

                {/* Error */}
                {errorMsg && (
                    <div style={{
                        background: '#FBE9E9', border: '1px solid #FBB6B6',
                        borderRadius: 10, padding: '12px 16px', marginBottom: 20,
                        display: 'flex', gap: 10, alignItems: 'center',
                    }}>
                        <Icons.alert size={16} style={{ color: '#D62828', flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: '#D62828' }}>{errorMsg}</span>
                    </div>
                )}

                <div style={{ display: 'flex', gap: 12 }}>
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
        );
    }

    /* ── Form step ── */
    return (
        <div style={{ maxWidth: 560 }}>
            {/* Info banner */}
            <div style={{
                background: '#EAF1FE', border: '1px solid #C2D9F7',
                borderRadius: 10, padding: '14px 18px', marginBottom: 28,
                display: 'flex', gap: 12, alignItems: 'flex-start',
            }}>
                <Icons.alert size={18} style={{ color: 'var(--mp-blue)', flexShrink: 0, marginTop: 1 }} />
                <div style={{ fontSize: 13, color: 'var(--mp-blue)', lineHeight: 1.5 }}>
                    <strong>Ticket transfers are permanent.</strong> Once transferred, the ticket moves to the
                    recipient's account and your access to that ticket is revoked.
                </div>
            </div>

            {transferable.length === 0 ? (
                <TransferEmptyState tickets={tickets.data ?? []} />
            ) : (
                <form onSubmit={handleReview} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                    {/* Ticket selector */}
                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 8 }}>
                            Select ticket to transfer
                        </label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {transferable.map(t => (
                                <TicketOption
                                    key={t.id}
                                    ticket={t}
                                    selected={String(t.id) === selectedId}
                                    onSelect={() => setSelectedId(String(t.id))}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Preview of selected */}
                    {selected && (
                        <div style={{
                            background: 'var(--surface-subtle)', borderRadius: 10,
                            padding: '12px 16px', border: '1px solid var(--border)',
                            display: 'flex', gap: 12, alignItems: 'center',
                        }}>
                            <Icons.ticket size={16} style={{ color: 'var(--mp-blue)', flexShrink: 0 }} />
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
                                    {selected.eventTitle}
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
                                    {selected.tierName} · Seat {selected.seatNumber ?? '—'}
                                    {selected.eventStartTime && ` · ${formatEventDate(selected.eventStartTime)}`}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Recipient email */}
                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 8 }}>
                            Recipient's email address
                        </label>
                        <Input
                            type="email"
                            placeholder="recipient@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-3)' }}>
                            The recipient must have an EventNest account with this email.
                        </p>
                    </div>

                    <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        disabled={!selectedId || !email.trim()}
                        style={{ alignSelf: 'flex-start' }}
                    >
                        Review transfer
                    </Button>
                </form>
            )}
        </div>
    );
}

/* ── Unified Transfers tab ───────────────────────────────── */

function TransfersTab() {
    const incomingQuery = useGetIncomingTransfersQuery();
    const outgoingQuery = useGetOutgoingTransfersQuery();
    const [acceptTransfer, { isLoading: isAccepting }] = useAcceptTransferMutation();
    const [declineTransfer, { isLoading: isDeclining }] = useDeclineTransferMutation();
    const [actionId, setActionId] = useState(null);
    const [results, setResults]   = useState({});

    async function handleAccept(id) {
        setActionId(id);
        try {
            await acceptTransfer(id).unwrap();
            setResults(r => ({ ...r, [id]: 'accepted' }));
        } catch (err) {
            setResults(r => ({ ...r, [id]: 'error' }));
        } finally { setActionId(null); }
    }

    async function handleDecline(id) {
        setActionId(id);
        try {
            await declineTransfer(id).unwrap();
            setResults(r => ({ ...r, [id]: 'declined' }));
        } catch (err) {
            setResults(r => ({ ...r, [id]: 'error' }));
        } finally { setActionId(null); }
    }

    const incoming = incomingQuery.data ?? [];
    const outgoing = outgoingQuery.data ?? [];
    const isLoading = incomingQuery.isLoading || outgoingQuery.isLoading;
    const isError   = incomingQuery.isError   || outgoingQuery.isError;

    if (isLoading) return <SkeletonList count={3} />;
    if (isError)   return <ErrorState onRetry={() => { incomingQuery.refetch(); outgoingQuery.refetch(); }} />;

    const hasAnything = incoming.length > 0 || outgoing.length > 0 || Object.keys(results).length > 0;

    if (!hasAnything) {
        return (
            <div style={{
                background: 'white', border: '1px solid var(--border)',
                borderRadius: 12, padding: 48, textAlign: 'center',
            }}>
                <Icons.send size={32} style={{ color: 'var(--text-3)' }} />
                <p style={{ margin: '12px 0 4px', fontWeight: 600, fontSize: 16, color: 'var(--text-1)' }}>
                    No transfers yet
                </p>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--text-2)' }}>
                    Tickets you send or receive will appear here.
                </p>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 28 }}>

            {/* ── Incoming (recipient) ── */}
            {(incoming.length > 0 || Object.keys(results).length > 0) && (
                <section>
                    <SectionHeader label="Received" icon={<Icons.inbox size={14} />} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {incoming.map(t => {
                            const outcome = results[t.id];
                            if (outcome === 'accepted') return (
                                <div key={t.id} style={{
                                    background: '#E6F4EA', border: '1px solid #A8D5B5',
                                    borderRadius: 12, padding: '14px 18px',
                                    display: 'flex', gap: 10, alignItems: 'center',
                                }}>
                                    <Icons.check size={16} style={{ color: '#0F9D58', flexShrink: 0 }} />
                                    <span style={{ fontSize: 13, color: '#0F7B3E', fontWeight: 500 }}>
                                        Ticket for <strong>{t.eventTitle}</strong> added to your account.
                                    </span>
                                </div>
                            );
                            if (outcome === 'declined') return (
                                <div key={t.id} style={{
                                    background: 'var(--surface-subtle)', border: '1px solid var(--border)',
                                    borderRadius: 12, padding: '14px 18px',
                                    display: 'flex', gap: 10, alignItems: 'center',
                                }}>
                                    <Icons.x size={16} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                                    <span style={{ fontSize: 13, color: 'var(--text-2)' }}>
                                        Transfer for <strong>{t.eventTitle}</strong> declined.
                                    </span>
                                </div>
                            );

                            const busy = actionId === t.id;
                            return (
                                <div key={t.id} style={{
                                    background: 'white', border: '1px solid var(--border)',
                                    borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-card)',
                                }}>
                                    <div style={{ padding: '16px 18px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                                        <div style={{
                                            width: 40, height: 40, borderRadius: 8,
                                            background: '#EAF1FE', display: 'flex',
                                            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                        }}>
                                            <Icons.ticket size={18} style={{ color: 'var(--mp-blue)' }} />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>
                                                {t.eventTitle}
                                            </div>
                                            <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <span style={{ filter: 'blur(4px)', userSelect: 'none', pointerEvents: 'none' }}>
                                                    {t.tierName || 'Standard'}{t.seatLabel ? ` · Seat ${t.seatLabel}` : ''}
                                                </span>
                                                <span style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic', filter: 'none' }}>
                                                    — accept to reveal
                                                </span>
                                            </div>
                                            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 5, display: 'flex', gap: 5, alignItems: 'center' }}>
                                                <Icons.users size={12} />
                                                From <strong style={{ color: 'var(--text-2)' }}>{t.fromUserName}</strong>
                                                {t.expiresAt && <> · Expires {formatEventDate(t.expiresAt)}</>}
                                            </div>
                                        </div>
                                    </div>
                                    {results[t.id] === 'error' && (
                                        <div style={{ margin: '0 18px 10px', background: '#FBE9E9', border: '1px solid #FBB6B6', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#D62828', display: 'flex', gap: 6, alignItems: 'center' }}>
                                            <Icons.alert size={13} style={{ flexShrink: 0 }} /> Something went wrong. Please try again.
                                        </div>
                                    )}
                                    <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
                                        <Button variant="primary" size="sm" onClick={() => handleAccept(t.id)} disabled={busy}>
                                            {busy && isAccepting ? 'Accepting…' : 'Accept ticket'}
                                        </Button>
                                        <Button variant="secondary" size="sm" onClick={() => handleDecline(t.id)} disabled={busy} style={{ color: 'var(--error)', borderColor: 'var(--error)' }}>
                                            {busy && isDeclining ? 'Declining…' : 'Decline'}
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* ── Outgoing (sender history) ── */}
            {outgoing.length > 0 && (
                <section>
                    <SectionHeader label="Sent" icon={<Icons.send size={14} />} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {outgoing.map(t => (
                            <div key={t.id} style={{
                                background: 'white', border: '1px solid var(--border)',
                                borderRadius: 12, padding: '16px 18px',
                                display: 'flex', gap: 14, alignItems: 'flex-start',
                                boxShadow: 'var(--shadow-card)',
                            }}>
                                <div style={{
                                    width: 40, height: 40, borderRadius: 8,
                                    background: 'var(--surface-subtle)', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                }}>
                                    <Icons.send size={16} style={{ color: 'var(--text-3)' }} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>
                                        {t.eventTitle}
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 3 }}>
                                        {t.tierName}{t.seatLabel ? ` · Seat ${t.seatLabel}` : ''}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 5, display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
                                        <Icons.mail size={12} />
                                        To&nbsp;
                                        {/* Blur recipient email — privacy for screenshots */}
                                        <span style={{ filter: 'blur(3.5px)', userSelect: 'none', pointerEvents: 'none', fontWeight: 600, color: 'var(--text-2)' }}>
                                            {t.toEmail}
                                        </span>
                                        <span>·</span>
                                        {t.createdAt && formatEventDate(t.createdAt)}
                                    </div>
                                </div>
                                {/* Deliberately show "Transferred" — do not reveal acceptance status */}
                                <span style={{
                                    fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
                                    textTransform: 'uppercase', flexShrink: 0,
                                    color: '#0F7B3E', background: '#E6F4EA',
                                    padding: '3px 10px', borderRadius: 99,
                                }}>
                                    Transferred
                                </span>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

function SectionHeader({ label, icon }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 11, fontWeight: 700, letterSpacing: '0.07em',
            textTransform: 'uppercase', color: 'var(--text-3)',
            marginBottom: 10,
        }}>
            {icon}{label}
        </div>
    );
}

/* ── Transfer empty state ───────────────────────────────── */

/**
 * Distinguishes between "you have tickets but transfers are disabled by the
 * organiser" vs "you simply have no eligible tickets left."
 */
function TransferEmptyState({ tickets }) {
    // Any active ticket where the organiser hasn't enabled transfers
    const hasDisabled = tickets.some(
        t => !t.transfersEnabled
          && t.status !== 'USED'
          && t.status !== 'REFUNDED'
          && t.status !== 'CANCELLED'
    );

    return (
        <div style={{
            background: 'white', border: '1px solid var(--border)',
            borderRadius: 12, padding: 48, textAlign: 'center',
        }}>
            <Icons.ticket size={32} style={{ color: 'var(--text-3)' }} />
            {hasDisabled ? (
                <>
                    <p style={{ margin: '12px 0 4px', fontWeight: 600, fontSize: 16, color: 'var(--text-1)' }}>
                        Transfers not available
                    </p>
                    <p style={{ margin: 0, fontSize: 14, color: 'var(--text-2)' }}>
                        The organiser has not enabled ticket transfers for this event.
                    </p>
                </>
            ) : (
                <>
                    <p style={{ margin: '12px 0 4px', fontWeight: 600, fontSize: 16, color: 'var(--text-1)' }}>
                        No transferable tickets
                    </p>
                    <p style={{ margin: 0, fontSize: 14, color: 'var(--text-2)' }}>
                        Used, refunded, or cancelled tickets cannot be transferred.
                    </p>
                </>
            )}
        </div>
    );
}

/* ── TicketOption — selectable row ─────────────────────── */

function TicketOption({ ticket: t, selected, onSelect }) {
    return (
        <button
            type="button"
            onClick={onSelect}
            style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
                border: selected ? '2px solid var(--mp-blue)' : '1px solid var(--border)',
                background: selected ? '#EAF1FE' : 'white',
                textAlign: 'left', fontFamily: 'inherit', width: '100%',
            }}
        >
            <div style={{
                width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                border: selected ? '5px solid var(--mp-blue)' : '2px solid var(--border)',
                background: 'white',
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>
                    {t.eventTitle}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
                    {t.tierName} · Seat {t.seatNumber ?? '—'}
                    {t.eventStartTime && ` · ${formatEventDate(t.eventStartTime)}`}
                </div>
            </div>
            <div style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: t.status === 'ACTIVE' ? '#0F9D58' : 'var(--text-3)',
                background: t.status === 'ACTIVE' ? '#E6F4EA' : 'var(--surface-subtle)',
                padding: '3px 8px', borderRadius: 99, flexShrink: 0,
            }}>
                {t.status}
            </div>
        </button>
    );
}

/* ── QR Modal ───────────────────────────────────────────── */

function QrModalContent({ ticket, onClose }) {
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
            </div>
        </div>
    );
}

/* ── Shared states ──────────────────────────────────────── */

function EmptyState({ onBrowse }) {
    return (
        <div data-testid="tickets-empty" style={{
            background: 'white', border: '1px solid var(--border)',
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
            background: 'white', border: '1px solid var(--border)',
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
        height: 130, background: 'white',
        border: '1px solid var(--border)', borderRadius: 12,
        animation: 'mp-flash 1.6s ease-in-out infinite',
    };
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {Array.from({ length: count }).map((_, i) => <div key={i} style={skeleton} />)}
        </div>
    );
}
