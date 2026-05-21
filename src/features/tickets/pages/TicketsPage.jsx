import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useGetMyTicketsQuery } from '../ticketsApi';
import { formatEventDate } from '@/utils/dateFormat';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { QRCode } from 'react-qr-code';
import TicketCard from '@/components/ui/TicketCard';
import { Icons } from '@/components/ui/Icon';

export default function TicketsPage() {
    const navigate = useNavigate();
    const tickets = useGetMyTicketsQuery();
    const [active, setActive] = useState(null);

    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            <div style={{ maxWidth: 880, margin: '0 auto', padding: '32px 24px 80px' }}>
                <h1 className="mp-h1" style={{ margin: 0, color: 'var(--text-1)' }}>My tickets</h1>
                <p className="body" style={{ margin: '8px 0 24px', color: 'var(--text-2)' }}>
                    Tap any ticket to display the QR at the gate. Keep your screen brightness up.
                </p>

                {tickets.isLoading && <SkeletonList />}

                {tickets.isError && (
                    <ErrorState onRetry={tickets.refetch} />
                )}

                {tickets.isSuccess && (tickets.data?.length ?? 0) === 0 && (
                    <EmptyState onBrowse={() => navigate('/events')} />
                )}

                {tickets.isSuccess && (tickets.data?.length ?? 0) > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {tickets.data.map((t) => (
                            <TicketCard
                                key={t.id}
                                ticket={t}
                                eventStartTime={t.eventStartTime}
                                venue={t.eventVenue}
                                onShowQr={setActive}
                            />
                        ))}
                    </div>
                )}
            </div>

            <Modal open={!!active} onClose={() => setActive(null)} width={400} label="Ticket QR code">
                {active && <QrModalContent ticket={active} onClose={() => setActive(null)} />}
            </Modal>
        </div>
    );
}

/* ── Modal contents (boarding-pass style) ─────────────────────── */

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
                        border: 0,
                        padding: 8,
                        borderRadius: 8,
                        color: 'var(--text-2)',
                        cursor: 'pointer',
                    }}
                >
                    <Icons.x size={16} />
                </button>
            </div>

            <div className="mp-grid-stack" style={{
                padding: 24,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 16,
            }}>
                <div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Seat</div>
                    <div className="mp-num" style={{
                        fontSize: 28,
                        fontWeight: 700,
                        color: 'var(--mp-blue)',
                        marginTop: 4,
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
                padding: 24,
                paddingTop: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 16,
            }}>
                <div style={{ padding: 14, background: 'var(--surface-subtle)', borderRadius: 12, lineHeight: 0 }}>
                    <QRCode value={ticket.qrCode || ticket.id} size={200} />
                </div>
                {ticket.shortCode && (
                    <div className="mp-num" style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--text-2)',
                        letterSpacing: '0.08em',
                    }}>
                        {ticket.shortCode}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ── Empty / error / loading states ─────────────────────── */

function EmptyState({ onBrowse }) {
    return (
        <div data-testid="tickets-empty" style={{
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 40,
            textAlign: 'center',
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
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 40,
            textAlign: 'center',
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

function SkeletonList() {
    const skeleton = {
        height: 130,
        background: 'white',
        border: '1px solid var(--border)',
        borderRadius: 12,
        animation: 'mp-flash 1.6s ease-in-out infinite',
    };
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={skeleton} />
            <div style={skeleton} />
            <div style={skeleton} />
        </div>
    );
}
