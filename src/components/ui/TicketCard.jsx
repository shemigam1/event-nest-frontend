import { useState } from 'react';
import Button from './Button';
import { StatusBadge } from './Badge';
import { formatEventDate } from '@/utils/dateFormat';
import { downloadTicketPdf } from '@/features/tickets/pdf';
import { Icons } from './Icon';

/**
 * Ticket card matching the v2 design: details on the left,
 * navy seat hero with "Show QR" CTA on the right.
 *
 * Expects a TicketResponse-shaped object from the backend:
 *   { id, eventTitle, tierName, seatNumber, status, qrCode, ... }
 *
 * `eventStartTime` (optional ISO string) is rendered into "When";
 * `venue` (optional) is rendered into "Where".
 */
export default function TicketCard({ ticket, eventStartTime, venue, onShowQr }) {
    // Accept the values from props (legacy) or from the ticket object directly
    const resolvedStartTime = eventStartTime ?? ticket.eventStartTime ?? null;
    const resolvedVenue     = venue ?? ticket.eventVenue ?? null;
    const muted = ticket.status === 'USED' || ticket.status === 'REFUNDED';
    const [generating, setGenerating] = useState(false);

    async function handleDownload() {
        if (generating) return;
        setGenerating(true);
        try {
            await downloadTicketPdf({
                ...ticket,
                // Make sure the PDF gets the resolved start time + venue
                // even when they were supplied via props (legacy callers).
                eventStartTime: resolvedStartTime ?? ticket.eventStartTime,
                eventVenue:     resolvedVenue     ?? ticket.eventVenue,
            });
        } finally {
            setGenerating(false);
        }
    }
    return (
        <div
            data-testid={`ticket-${ticket.id}`}
            className="mp-ticket-card"
            style={{
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                boxShadow: 'var(--shadow-card)',
                overflow: 'hidden',
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                opacity: muted ? 0.7 : 1,
            }}
        >
            <div style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <StatusBadge status={ticket.status} size="sm" />
                    {ticket.bookingId && (
                        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                            · {String(ticket.bookingId).slice(0, 8)}
                        </span>
                    )}
                </div>
                <h3 className="mp-h4" style={{ margin: 0, color: 'var(--text-1)' }}>
                    {ticket.eventTitle}
                </h3>
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 18,
                    rowGap: 12,
                    marginTop: 14,
                }}>
                    <Field label="When" value={resolvedStartTime ? formatEventDate(resolvedStartTime) : '—'} />
                    <Field label="Where" value={resolvedVenue ?? '—'} />
                    <Field label="Tier" value={ticket.tierName ?? '—'} />
                </div>

                {(ticket.shortCode || ticket.qrCode) && (
                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 18,
                        rowGap: 10,
                        marginTop: 14,
                        paddingTop: 14,
                        borderTop: '1px dashed var(--border)',
                    }}>
                        {ticket.shortCode && (
                            <CodeField label="Short code" value={ticket.shortCode} />
                        )}
                        {ticket.qrCode && (
                            <CodeField label="Long code" value={ticket.qrCode} />
                        )}
                    </div>
                )}
            </div>

            <div style={{
                background: 'var(--mp-navy)',
                color: 'white',
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 180,
                gap: 10,
                borderLeft: '1px dashed var(--border-strong)',
            }}>
                <div style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.65)',
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                }}>
                    SEAT
                </div>
                <div className="mp-num" style={{
                    fontSize: 28,
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    lineHeight: 1,
                }}>
                    {ticket.seatNumber ?? '—'}
                </div>
                <Button
                    size="sm"
                    variant="onDark"
                    onClick={() => onShowQr?.(ticket)}
                    disabled={muted}
                >
                    Show QR
                </Button>
                {/* Refunded/used tickets can still be re-downloaded — useful for
                    receipt purposes — so this stays enabled even when muted. */}
                <button
                    type="button"
                    onClick={handleDownload}
                    disabled={generating}
                    aria-label="Download ticket as PDF"
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        background: 'transparent',
                        border: '1px solid rgba(255,255,255,0.25)',
                        color: 'rgba(255,255,255,0.9)',
                        padding: '6px 10px', borderRadius: 8,
                        fontSize: 12, fontWeight: 500,
                        cursor: generating ? 'wait' : 'pointer',
                        fontFamily: 'inherit',
                        transition: 'background 0.15s, border-color 0.15s',
                    }}
                    onMouseOver={(e) => {
                        if (generating) return;
                        e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.45)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)';
                    }}
                >
                    <Icons.download size={13} />
                    {generating ? 'Preparing…' : 'PDF'}
                </button>
            </div>
        </div>
    );
}

function Field({ label, value }) {
    return (
        <div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 14, color: 'var(--text-1)', fontWeight: 500 }}>{value}</div>
        </div>
    );
}

function CodeField({ label, value }) {
    return (
        <div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>{label}</div>
            <code style={{
                display: 'inline-block',
                fontSize: 12,
                fontFamily: 'ui-monospace, "Cascadia Code", "Fira Code", monospace',
                fontWeight: 600,
                letterSpacing: '0.04em',
                color: 'var(--text-1)',
                background: 'var(--surface-subtle)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: '2px 8px',
                wordBreak: 'break-all',
            }}>
                {value}
            </code>
        </div>
    );
}
