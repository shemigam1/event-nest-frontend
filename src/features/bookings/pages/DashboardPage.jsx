import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useSelector } from 'react-redux';
import { selectCurrentUser, selectAuthEmail } from '@/features/auth/authSlice';
import {
    useGetMyBookingsQuery,
    useCancelBookingMutation,
} from '../bookingsApi';
import { useGetMyTicketsQuery } from '@/features/tickets/ticketsApi';
import { useGetOrganizerEventsQuery } from '@/features/organiser/organizerApi';
import { useGetMyNotificationsQuery } from '@/features/notifications/notificationsApi';
import Button from '@/components/ui/Button';
import TopNav from '@/components/ui/TopNav';
import { RoleBadge } from '@/components/ui/Badge';
import { Icons } from '@/components/ui/Icon';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const MONTHS_FULL = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function eventDateBits(startTime) {
    if (!startTime) return { month: '—', day: '—', label: '' };
    const d = new Date(startTime);
    if (Number.isNaN(d.getTime())) return { month: '—', day: '—', label: '' };
    const hours = d.getHours();
    const mins = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h = hours % 12 || 12;
    return {
        month: MONTHS[d.getMonth()],
        day: d.getDate(),
        label: `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS_FULL[d.getMonth()]} · ${h}:${mins} ${ampm}`,
        ms: d.getTime(),
    };
}

/* ─── Tile ─────────────────────────────────────────── */
function Tile({ label, value, sub, icon, accent }) {
    return (
        <div style={{
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 18,
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
            }}>
                <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>{label}</span>
                {icon && <span style={{ color: 'var(--text-3)' }}>{icon}</span>}
            </div>
            <div className="mp-num" style={{
                fontSize: 26,
                fontWeight: 700,
                lineHeight: 1,
                color: accent || 'var(--text-1)',
            }}>
                {value}
            </div>
            {sub && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>{sub}</div>}
        </div>
    );
}

/* ─── Cancel dialog ────────────────────────────────── */
function CancelDialog({ booking, onConfirm, onDismiss, loading }) {
    if (!booking) return null;
    return (
        <div
            role="dialog"
            aria-label="Cancel booking"
            onClick={onDismiss}
            style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: 'rgba(2,16,45,0.55)',
                display: 'grid', placeItems: 'center', padding: 20,
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: '100%', maxWidth: 400,
                    background: 'white', borderRadius: 16,
                    boxShadow: 'var(--shadow-modal)', padding: 28,
                }}
            >
                <h2 className="mp-h3" style={{ margin: 0, color: 'var(--text-1)' }}>
                    Cancel this booking?
                </h2>
                <p className="body-sm" style={{ margin: '10px 0 24px', color: 'var(--text-2)' }}>
                    <strong>{booking.quantity} {booking.quantity === 1 ? 'ticket' : 'tickets'}</strong>{' '}
                    for <strong>{booking.eventTitle}</strong> will be cancelled. This action cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <Button variant="ghost" size="md" onClick={onDismiss} disabled={loading}>
                        Keep booking
                    </Button>
                    <Button variant="destructive" size="md" onClick={onConfirm} disabled={loading}>
                        {loading ? 'Cancelling…' : 'Yes, cancel'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

/* ─── Membership row ───────────────────────────────── */
function MembershipRow({ membership, isLast, onCancel, cancelling }) {
    const { event, roles, attendeeBooking } = membership;
    const date = eventDateBits(event.startTime);
    const canCancel = roles.has('ATTENDEE') && attendeeBooking?.status === 'CONFIRMED';

    return (
        <div
            data-testid={`membership-row-${event.id}`}
            style={{
                display: 'grid',
                gridTemplateColumns: '70px 1fr auto auto',
                gap: 20,
                alignItems: 'center',
                padding: '16px 20px',
                borderBottom: isLast ? 0 : '1px solid var(--border)',
            }}
        >
            <div style={{
                textAlign: 'center',
                borderRight: '1px solid var(--border)',
                paddingRight: 16,
            }}>
                <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, letterSpacing: 0.5 }}>
                    {date.month}
                </div>
                <div className="mp-num" style={{
                    fontSize: 22, fontWeight: 700, color: 'var(--text-1)',
                    lineHeight: 1.1, marginTop: 2,
                }}>
                    {date.day}
                </div>
            </div>

            <div style={{ minWidth: 0 }}>
                <div style={{
                    fontWeight: 600,
                    color: 'var(--text-1)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                }}>
                    {event.title}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>
                    {event.venue}{date.label ? ` · ${date.label}` : ''}
                </div>
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[...roles].map((r) => <RoleBadge key={r} role={r} size="sm" />)}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
                {roles.has('ORGANISER') && (
                    <Button
                        size="sm"
                        variant="primary"
                        onClick={() => window.location.assign(`/organiser/events/${event.id}`)}
                    >
                        Manage
                    </Button>
                )}
                {roles.has('ATTENDEE') && (
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => window.location.assign('/tickets')}
                    >
                        Tickets
                    </Button>
                )}
                {canCancel && (
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onCancel(attendeeBooking)}
                        disabled={cancelling}
                        style={{ color: 'var(--error)' }}
                    >
                        Cancel
                    </Button>
                )}
            </div>
        </div>
    );
}

/* ─── Page ─────────────────────────────────────────── */
export default function DashboardPage() {
    const navigate = useNavigate();
    const user = useSelector(selectCurrentUser);
    const email = useSelector(selectAuthEmail);
    const firstName = user?.firstName ?? email?.split('@')[0] ?? 'there';

    const bookings  = useGetMyBookingsQuery();
    const tickets   = useGetMyTicketsQuery();
    const organiser = useGetOrganizerEventsQuery();
    const notifs    = useGetMyNotificationsQuery({ page: 0, size: 50 });

    const [cancelBooking, cancelState] = useCancelBookingMutation();
    const [pendingCancel, setPendingCancel] = useState(null);
    const [cancelError, setCancelError]     = useState('');

    // Anchor "now" once per render so date math stays consistent across re-renders.
    const [nowMs] = useState(() => Date.now());

    /* Aggregate roles per event.
       Sources:
         - tickets    → ATTENDEE  (gives us eventStartTime + eventVenue)
         - bookings   → ATTENDEE  (gives us status/quantity for the cancel CTA)
         - organiser  → ORGANISER (full event response)
       The map preserves whichever source has the richest event metadata. */
    const memberships = useMemo(() => {
        const m = new Map();

        function ensure(eventId) {
            if (!m.has(eventId)) {
                m.set(eventId, {
                    event: { id: eventId },
                    roles: new Set(),
                    attendeeBooking: null,
                });
            }
            return m.get(eventId);
        }

        for (const t of (tickets.data || [])) {
            if (!t.eventId) continue;
            const entry = ensure(t.eventId);
            entry.roles.add('ATTENDEE');
            // Tickets are the best source of start time + venue
            entry.event.startTime = entry.event.startTime ?? t.eventStartTime;
            entry.event.venue     = entry.event.venue     ?? t.eventVenue;
            entry.event.title     = entry.event.title     ?? t.eventTitle;
        }

        for (const b of (bookings.data || [])) {
            if (!b.eventId) continue;
            const entry = ensure(b.eventId);
            entry.roles.add('ATTENDEE');
            entry.event.title = entry.event.title ?? b.eventTitle;
            // First CONFIRMED booking we see is the cancel target — there's
            // usually only one per event for an attendee.
            if (!entry.attendeeBooking && b.status === 'CONFIRMED') {
                entry.attendeeBooking = b;
            }
        }

        for (const e of (organiser.data || [])) {
            if (!e.id) continue;
            const entry = ensure(e.id);
            entry.roles.add('ORGANISER');
            entry.event = {
                ...entry.event,
                ...e,
                startTime: e.startTime || entry.event.startTime,
                venue:     e.venue     || entry.event.venue,
                title:     e.title     || entry.event.title,
            };
        }

        // Sort: upcoming first (soonest), then events without a date, then past.
        const list = [...m.values()];
        list.sort((a, b) => {
            const at = a.event.startTime ? new Date(a.event.startTime).getTime() : Infinity;
            const bt = b.event.startTime ? new Date(b.event.startTime).getTime() : Infinity;
            const aUp = at >= nowMs;
            const bUp = bt >= nowMs;
            if (aUp !== bUp) return aUp ? -1 : 1;
            return aUp ? at - bt : bt - at;
        });
        return list;
    }, [bookings.data, tickets.data, organiser.data, nowMs]);

    /* Tiles */
    const activeTickets = useMemo(
        () => (tickets.data || []).filter((t) => t.status === 'VALID').length,
        [tickets.data],
    );

    const upcomingEventCount = useMemo(() => {
        const ids = new Set();
        for (const t of (tickets.data || [])) {
            if (t.status !== 'VALID' || !t.eventStartTime) continue;
            const ms = new Date(t.eventStartTime).getTime();
            if (!Number.isNaN(ms) && ms >= nowMs) ids.add(t.eventId);
        }
        return ids.size;
    }, [tickets.data, nowMs]);

    const organisingCount = (organiser.data || []).length;

    const unreadCount = useMemo(() => {
        const content = notifs.data?.content || notifs.data || [];
        return content.filter((n) => !n.read).length;
    }, [notifs.data]);

    const isLoading = bookings.isLoading || tickets.isLoading || organiser.isLoading;
    const isError   = bookings.isError && tickets.isError && organiser.isError;

    async function handleConfirmCancel() {
        setCancelError('');
        try {
            await cancelBooking({
                eventId: pendingCancel.eventId,
                bookingId: pendingCancel.id,
            }).unwrap();
            setPendingCancel(null);
        } catch (err) {
            setCancelError(err?.data?.message || 'Could not cancel. Please try again.');
        }
    }

    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            <TopNav />

            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 80px' }}>
                <h1 className="mp-h1" style={{ margin: 0, color: 'var(--text-1)' }}>
                    Welcome back, {firstName}.
                </h1>
                <p className="body" style={{ margin: '8px 0 0', color: 'var(--text-2)' }}>
                    You wear different roles across your events — they&apos;re listed inline with each one.
                </p>

                {/* Tiles */}
                <div className="mp-stat-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 16,
                    margin: '24px 0 32px',
                }}>
                    <Tile
                        label="Active tickets"
                        value={isLoading ? '—' : activeTickets}
                        icon={<Icons.ticket size={16} />}
                        sub={`across ${upcomingEventCount} event${upcomingEventCount !== 1 ? 's' : ''}`}
                    />
                    <Tile
                        label="Upcoming"
                        value={isLoading ? '—' : upcomingEventCount}
                        icon={<Icons.calendar size={16} />}
                        sub={upcomingEventCount > 0 ? 'next 30 days' : 'none scheduled'}
                    />
                    <Tile
                        label="Organising"
                        value={isLoading ? '—' : organisingCount}
                        icon={<Icons.spark size={16} />}
                        sub={organisingCount > 0 ? 'tap Manage to open' : 'create an event'}
                    />
                    <Tile
                        label="Notifications"
                        value={notifs.isLoading ? '—' : unreadCount}
                        icon={<Icons.bell size={16} />}
                        sub={unreadCount > 0 ? 'unread' : 'all caught up'}
                        accent={unreadCount > 0 ? 'var(--warning)' : undefined}
                    />
                </div>

                {/* My events card */}
                <div style={{
                    background: 'white',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    boxShadow: 'var(--shadow-card)',
                    overflow: 'hidden',
                }}>
                    <div style={{
                        padding: '16px 20px',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>My events</span>
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => navigate('/events')}
                            iconRight={<Icons.arrowR size={14} />}
                        >
                            Browse events
                        </Button>
                    </div>

                    {isLoading && <TableSkeleton />}

                    {!isLoading && isError && (
                        <div role="alert" style={{ padding: 40, textAlign: 'center' }}>
                            <Icons.alert size={28} style={{ color: 'var(--error)' }} />
                            <p className="body-sm" style={{ marginTop: 8, color: 'var(--text-2)' }}>
                                Could not load your events.
                            </p>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                    bookings.refetch();
                                    tickets.refetch();
                                    organiser.refetch();
                                }}
                                style={{ marginTop: 12 }}
                            >
                                Retry
                            </Button>
                        </div>
                    )}

                    {!isLoading && !isError && memberships.length === 0 && (
                        <div data-testid="dashboard-empty" style={{ padding: 40, textAlign: 'center' }}>
                            <Icons.inbox size={28} style={{ color: 'var(--text-3)' }} />
                            <p className="mp-h4" style={{ margin: '12px 0 4px', color: 'var(--text-1)' }}>
                                No events yet
                            </p>
                            <p className="body-sm" style={{ color: 'var(--text-2)', margin: 0 }}>
                                Book a seat or create an event — they&apos;ll all show up here.
                            </p>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => navigate('/events')}
                                >
                                    Browse events
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => navigate('/events/new')}
                                    icon={<Icons.plus size={14} />}
                                >
                                    Create event
                                </Button>
                            </div>
                        </div>
                    )}

                    {cancelError && (
                        <div role="alert" style={{
                            margin: '12px 20px 0',
                            padding: '10px 12px',
                            background: 'var(--error-bg, #FBE9E9)',
                            color: 'var(--error)',
                            borderRadius: 8,
                            fontSize: 13,
                        }}>
                            {cancelError}
                        </div>
                    )}

                    {!isLoading && !isError && memberships.map((m, i) => (
                        <MembershipRow
                            key={m.event.id}
                            membership={m}
                            isLast={i === memberships.length - 1}
                            onCancel={setPendingCancel}
                            cancelling={cancelState.isLoading}
                        />
                    ))}
                </div>
            </div>

            <CancelDialog
                booking={pendingCancel}
                onConfirm={handleConfirmCancel}
                onDismiss={() => { setPendingCancel(null); setCancelError(''); }}
                loading={cancelState.isLoading}
            />
        </div>
    );
}

function TableSkeleton() {
    const row = {
        height: 80,
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface-subtle)',
        animation: 'mp-flash 1.6s ease-in-out infinite',
    };
    return (
        <>
            <div style={row} />
            <div style={{ ...row, opacity: 0.7 }} />
            <div style={{ ...row, opacity: 0.4, borderBottom: 0 }} />
        </>
    );
}
