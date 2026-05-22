import { useSelector } from 'react-redux';
import { selectActivityForEvent } from './activitySlice';
import { Icons } from '@/components/ui/Icon';
import { formatNaira } from '@/utils/currency';

/**
 * Live feed of SSE events for a single event. Mount on the organiser
 * console — items appear here in real time as bookings and check-ins
 * arrive. Backed by the in-memory activity slice (no network).
 */
export default function ActivityFeed({ eventId, max = 10 }) {
    const items = useSelector(selectActivityForEvent(eventId)).slice(0, max);

    return (
        <div
            data-testid="activity-feed"
            style={{
                background: 'white',
                border: '1px solid var(--border)',
                borderRadius: 12,
                boxShadow: 'var(--shadow-card)',
                overflow: 'hidden',
            }}
        >
            <div style={{
                padding: '14px 18px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <span className="mp-h5" style={{ margin: 0, color: 'var(--text-1)' }}>
                    Live activity
                </span>
                <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 11,
                    color: 'var(--success)',
                    fontWeight: 600,
                }}>
                    <span className="mp-live-dot" />Live
                </span>
            </div>

            {items.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                    Waiting for activity… new bookings and check-ins appear here in real time.
                </div>
            ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                    {items.map((item) => (
                        <li
                            key={item.id}
                            style={{
                                display: 'flex',
                                gap: 12,
                                padding: '12px 18px',
                                borderBottom: '1px solid var(--border)',
                                alignItems: 'flex-start',
                            }}
                        >
                            <ActivityIcon type={item.type} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <ActivityText item={item} />
                                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                                    {relativeTime(item.receivedAt)}
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

/* ── icon per event type ────────────────────────────────────── */
function ActivityIcon({ type }) {
    const map = {
        'booking.confirmed':  { icon: Icons.ticket, fg: 'var(--mp-blue)',  bg: 'var(--mp-blue-bg, #eef2ff)' },
        'ticket.checked-in':  { icon: Icons.scan,   fg: 'var(--success)',  bg: 'var(--success-bg, #ecfdf5)' },
        'event.approved':     { icon: Icons.check,  fg: 'var(--success)',  bg: 'var(--success-bg, #ecfdf5)' },
        'event.rejected':     { icon: Icons.alert,  fg: 'var(--error)',    bg: 'var(--error-bg, #fef2f2)' },
    };
    const m = map[type] ?? { icon: Icons.bell, fg: 'var(--text-2)', bg: 'var(--surface-subtle)' };
    const I = m.icon;
    return (
        <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: m.bg, color: m.fg,
            display: 'grid', placeItems: 'center', flexShrink: 0,
        }}>
            <I size={14} />
        </div>
    );
}

/* ── per-event-type rendering ───────────────────────────────── */
function ActivityText({ item }) {
    const p = item.payload ?? {};
    switch (item.type) {
        case 'booking.confirmed':
            return (
                <div style={{ fontSize: 13, color: 'var(--text-1)', lineHeight: 1.4 }}>
                    <strong>{p.attendeeEmail ?? 'Someone'}</strong>{' '}
                    booked {p.quantity ?? '—'} × {p.tierName ?? 'ticket'}
                    {p.totalAmount != null && (
                        <span style={{ color: 'var(--text-3)' }}>
                            {' '}· {p.totalAmount === 0 ? 'Free' : formatNaira(p.totalAmount)}
                        </span>
                    )}
                </div>
            );
        case 'ticket.checked-in':
            return (
                <div style={{ fontSize: 13, color: 'var(--text-1)', lineHeight: 1.4 }}>
                    Seat <strong>{p.seatNumber ?? '—'}</strong> checked in
                    {p.checkedInByLabel && (
                        <span style={{ color: 'var(--text-3)' }}> · by {p.checkedInByLabel}</span>
                    )}
                </div>
            );
        case 'event.approved':
            return (
                <div style={{ fontSize: 13, color: 'var(--text-1)', lineHeight: 1.4 }}>
                    Event approved & published
                </div>
            );
        case 'event.rejected':
            return (
                <div style={{ fontSize: 13, color: 'var(--text-1)', lineHeight: 1.4 }}>
                    Event rejected{p.reason && <span style={{ color: 'var(--text-3)' }}> · {p.reason}</span>}
                </div>
            );
        default:
            return (
                <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.4 }}>
                    {item.type}
                </div>
            );
    }
}

/* ── relative timestamps ────────────────────────────────────── */
function relativeTime(epoch) {
    const seconds = Math.max(0, Math.floor((Date.now() - epoch) / 1000));
    if (seconds < 10) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}
