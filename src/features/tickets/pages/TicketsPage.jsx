import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useGetMyTicketsQuery, useTransferTicketMutation } from '../ticketsApi';
import { formatEventDate } from '@/utils/dateFormat';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { QRCode } from 'react-qr-code';
import TicketCard from '@/components/ui/TicketCard';
import { Icons } from '@/components/ui/Icon';

const TABS = [
    { key: 'tickets',  label: 'My Tickets' },
    { key: 'transfer', label: 'Transfer a Ticket' },
];

export default function TicketsPage() {
    const [tab, setTab] = useState('tickets');
    const [activeQr, setActiveQr] = useState(null);

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
                            }}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {tab === 'tickets' && <MyTicketsTab onShowQr={setActiveQr} />}
                {tab === 'transfer' && <TransferTab />}
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

    const [selectedId, setSelectedId] = useState('');
    const [email, setEmail]           = useState('');
    const [result, setResult]         = useState(null); // null | 'success' | 'error'
    const [errorMsg, setErrorMsg]     = useState('');

    const transferable = (tickets.data ?? []).filter(
        t => t.status !== 'USED' && t.status !== 'REFUNDED' && t.status !== 'CANCELLED'
    );

    const selected = transferable.find(t => String(t.id) === selectedId);

    async function handleSubmit(e) {
        e.preventDefault();
        if (!selectedId || !email.trim()) return;
        setResult(null);
        setErrorMsg('');
        try {
            await transferTicket({ ticketId: selectedId, recipientEmail: email.trim() }).unwrap();
            setResult('success');
            setSelectedId('');
            setEmail('');
        } catch (err) {
            setErrorMsg(
                err?.data?.message ?? err?.error ?? 'Transfer failed. Please try again.'
            );
            setResult('error');
        }
    }

    if (tickets.isLoading) return <SkeletonList count={2} />;

    if (tickets.isError) return (
        <ErrorState onRetry={tickets.refetch} />
    );

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
                <div style={{
                    background: 'white', border: '1px solid var(--border)',
                    borderRadius: 12, padding: 48, textAlign: 'center',
                }}>
                    <Icons.ticket size={32} style={{ color: 'var(--text-3)' }} />
                    <p style={{ margin: '12px 0 4px', fontWeight: 600, fontSize: 16, color: 'var(--text-1)' }}>
                        No transferable tickets
                    </p>
                    <p style={{ margin: 0, fontSize: 14, color: 'var(--text-2)' }}>
                        Used, refunded, or cancelled tickets cannot be transferred.
                    </p>
                </div>
            ) : (
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

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

                    {/* Result feedback */}
                    {result === 'success' && (
                        <div style={{
                            background: '#E6F4EA', border: '1px solid #A8D5B5',
                            borderRadius: 10, padding: '12px 16px',
                            display: 'flex', gap: 10, alignItems: 'center',
                        }}>
                            <Icons.check size={16} style={{ color: '#0F9D58', flexShrink: 0 }} />
                            <span style={{ fontSize: 13, color: '#0F7B3E', fontWeight: 500 }}>
                                Ticket transferred successfully.
                            </span>
                        </div>
                    )}
                    {result === 'error' && (
                        <div style={{
                            background: '#FBE9E9', border: '1px solid #FBB6B6',
                            borderRadius: 10, padding: '12px 16px',
                            display: 'flex', gap: 10, alignItems: 'center',
                        }}>
                            <Icons.alert size={16} style={{ color: '#D62828', flexShrink: 0 }} />
                            <span style={{ fontSize: 13, color: '#D62828' }}>{errorMsg}</span>
                        </div>
                    )}

                    <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        disabled={!selectedId || !email.trim() || isTransferring}
                        style={{ alignSelf: 'flex-start' }}
                    >
                        {isTransferring ? 'Transferring…' : 'Transfer ticket'}
                    </Button>
                </form>
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
