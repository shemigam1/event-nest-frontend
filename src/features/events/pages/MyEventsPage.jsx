import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useGetMyBookingsQuery } from '@/features/bookings/bookingsApi';
import { useGetOrganizerEventsQuery } from '@/features/organiser/organizerApi';
import { useGetPublishedEventsQuery } from '../eventsApi';
import { formatEventDate } from '@/utils/dateFormat';
import Button from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { Icons } from '@/components/ui/Icon';
import MessagesTab        from '@/features/organiser/components/MessagesTab';
import EscrowTab          from '@/features/organiser/components/EscrowTab';
import MarketplaceDashTab from '@/features/organiser/components/MarketplaceDashTab';
import PaymentsTab        from '@/features/organiser/components/PaymentsTab';

const DASH_TABS = [
    { id: 'my-events',   label: 'My Events',    icon: <Icons.calendar size={14} /> },
    { id: 'messages',    label: 'Messages',     icon: <Icons.message  size={14} /> },
    { id: 'escrow',      label: 'Escrow',       icon: <Icons.shield   size={14} /> },
    { id: 'marketplace', label: 'Marketplace',  icon: <Icons.users    size={14} /> },
    { id: 'payments',    label: 'Payments',     icon: <Icons.wallet   size={14} /> },
];

/* ── Role badge — small chip on the card ───────────────────────── */
function RoleBadge({ role }) {
    const isOrganiser = role === 'ORGANISER';
    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 10px',
            borderRadius: 99,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            background: isOrganiser ? 'var(--mp-blue)' : 'rgba(2,16,45,0.65)',
            color: 'white',
            backdropFilter: 'blur(4px)',
        }}>
            {isOrganiser ? <Icons.spark size={11} /> : <Icons.ticket size={11} />}
            {isOrganiser ? 'Organiser' : 'Attendee'}
        </span>
    );
}

/* ── Card with role badge top-left ───────────────────────── */
function MyEventCard({ event, role, onClick }) {
    const venue = event.venue || event.venueName || null;
    return (
        <button
            onClick={onClick}
            style={{
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                boxShadow: 'var(--shadow-card)',
                overflow: 'hidden',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all var(--motion-fast)',
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
            }}
            onMouseOver={(e) => {
                e.currentTarget.style.boxShadow = 'var(--shadow-elevated)';
                e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
                e.currentTarget.style.boxShadow = 'var(--shadow-card)';
                e.currentTarget.style.transform = 'translateY(0)';
            }}
        >
            <div style={{ position: 'relative' }}>
                {event.coverImageUrl ? (
                    <img
                        src={event.coverImageUrl}
                        alt={event.title}
                        style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }}
                    />
                ) : (
                    <div className="mp-placeholder" data-label="EVENT IMAGE" style={{ height: 160 }} />
                )}
                <div style={{ position: 'absolute', top: 12, left: 12 }}>
                    <RoleBadge role={role} />
                </div>
            </div>
            <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <h3 className="mp-h4" style={{ margin: 0, color: 'var(--text-1)' }}>
                    {event.title}
                </h3>
                {role === 'ORGANISER' && event.status && event.status !== 'PUBLISHED' && (
                    <div><StatusBadge status={event.status} size="sm" /></div>
                )}
                <div style={{
                    display: 'flex', flexDirection: 'column', gap: 6,
                    fontSize: 14, color: 'var(--text-2)',
                }}>
                    <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                        <Icons.calendar size={15} style={{ color: 'var(--text-3)' }} />
                        {event.startTime ? formatEventDate(event.startTime) : '—'}
                    </span>
                    {venue && (
                        <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                            <Icons.pin size={15} style={{ color: 'var(--text-3)' }} />
                            {venue}
                        </span>
                    )}
                </div>
            </div>
        </button>
    );
}

/* ── Tabs + chips ────────────────────────────────────────── */
const TIME_TABS = [
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'past',     label: 'Past' },
    { id: 'drafts',   label: 'Drafts' },
];
const ROLE_CHIPS = [
    { id: 'all',       label: 'All' },
    { id: 'ATTENDEE',  label: 'Attendee' },
    { id: 'ORGANISER', label: 'Organiser' },
];

function SegmentedTabs({ items, active, onChange, variant = 'pill' }) {
    return (
        <div style={{
            display: 'inline-flex',
            gap: 4,
            padding: 4,
            background: variant === 'pill' ? 'var(--surface-subtle)' : 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 12,
        }}>
            {items.map(({ id, label }) => {
                const isActive = active === id;
                return (
                    <button
                        key={id}
                        onClick={() => onChange(id)}
                        style={{
                            background: isActive ? 'var(--surface-elevated)' : 'transparent',
                            border: 0,
                            padding: '8px 14px',
                            borderRadius: 8,
                            fontSize: 14,
                            fontWeight: isActive ? 600 : 500,
                            color: isActive ? 'var(--mp-blue)' : 'var(--text-2)',
                            boxShadow: isActive ? 'var(--shadow-card)' : 'none',
                            cursor: 'pointer',
                            transition: 'all var(--motion-fast)',
                        }}
                    >
                        {label}
                    </button>
                );
            })}
        </div>
    );
}

/* ── Skeleton ──────────────────────────────────────────── */
function SkeletonCard() {
    return (
        <div style={{
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            overflow: 'hidden',
        }}>
            <div style={{ height: 160, background: 'var(--surface-subtle)' }} />
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ height: 18, width: '80%', borderRadius: 6, background: 'var(--surface-subtle)', animation: 'mp-flash 1.6s ease-in-out infinite' }} />
                <div style={{ height: 12, width: '50%', borderRadius: 6, background: 'var(--surface-subtle)', animation: 'mp-flash 1.6s ease-in-out infinite' }} />
            </div>
        </div>
    );
}

/* ── Page ─────────────────────────────────────────────────
   Central hub for events the user is active in — either as
   an attendee (from their bookings) or as an organiser (from
   their owned/managed events). Clicking through routes by
   role: attendees → /tickets, organisers → /organiser/events/:id.
   ─────────────────────────────────────────────────────────── */
export default function MyEventsPage() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('my-events');
    const [timeTab, setTimeTab]     = useState('upcoming');
    const [roleChip, setRoleChip]   = useState('all');
    // Capture "now" once at mount so the upcoming/past split is stable
    // across re-renders (and so we don't trip the no-impure-call rule).
    const [now] = useState(() => Date.now());

    // Force a refetch on mount so we never serve a stale cache after the user
    // creates an event in another tab/route and lands here expecting to see it.
    const bookingsQuery   = useGetMyBookingsQuery(undefined, { refetchOnMountOrArgChange: true });
    const organiserQuery  = useGetOrganizerEventsQuery(undefined, { refetchOnMountOrArgChange: true });
    const publishedQuery  = useGetPublishedEventsQuery();

    const isLoading = bookingsQuery.isLoading || organiserQuery.isLoading || publishedQuery.isLoading;
    // Surface a partial error if EITHER feed failed — quietly returning an
    // empty list when /me/organiser/events 500s makes "I just created an
    // event but it's not here" impossible to debug.
    const isError   = bookingsQuery.isError || organiserQuery.isError;
    const partialError = bookingsQuery.isError !== organiserQuery.isError;

    // Build a lookup of full event data from published events so we can
    // enrich attendee bookings (which only carry eventId + title) with
    // cover image, start time, and venue.
    const eventsById = useMemo(() => {
        const map = new Map();
        (publishedQuery.data ?? []).forEach((e) => map.set(e.id, e));
        return map;
    }, [publishedQuery.data]);

    // Merge attendee + organiser entries into a single list keyed by
    // event id. If the user both organises and attends the same event
    // (rare but possible), the organiser role wins.
    const items = useMemo(() => {
        const byId = new Map();

        (organiserQuery.data ?? []).forEach((event) => {
            byId.set(event.id, { event, role: 'ORGANISER' });
        });

        (bookingsQuery.data ?? []).forEach((booking) => {
            if (byId.has(booking.eventId)) return;
            const full = eventsById.get(booking.eventId);
            byId.set(booking.eventId, {
                event: full ?? {
                    id: booking.eventId,
                    title: booking.eventTitle,
                    startTime: booking.eventStartTime,
                },
                role: 'ATTENDEE',
                bookingId: booking.id,
            });
        });

        return Array.from(byId.values());
    }, [organiserQuery.data, bookingsQuery.data, eventsById]);

    const filtered = useMemo(() => {
        return items.filter(({ event, role }) => {
            // Drafts tab: only organiser events with DRAFT status
            if (timeTab === 'drafts') {
                return role === 'ORGANISER' && event.status === 'DRAFT';
            }
            // Role filter
            if (roleChip !== 'all' && role !== roleChip) return false;
            // Draft organiser events live exclusively in the Drafts tab
            if (role === 'ORGANISER' && event.status === 'DRAFT') return false;
            // Time filter
            const t = event.startTime ? new Date(event.startTime).getTime() : null;
            const isPast = t != null && t < now;
            if (timeTab === 'upcoming' && isPast) return false;
            if (timeTab === 'past' && !isPast) return false;
            return true;
        }).sort((a, b) => {
            const ta = a.event.startTime ? new Date(a.event.startTime).getTime() : 0;
            const tb = b.event.startTime ? new Date(b.event.startTime).getTime() : 0;
            return timeTab === 'past' ? tb - ta : ta - tb;
        });
    }, [items, roleChip, timeTab, now]);

    function handleClick({ event, role }) {
        if (role === 'ORGANISER') navigate(`/organiser/events/${event.id}`);
        else                       navigate(`/events/${event.id}`);
    }

    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 80px' }}>

                {/* Header */}
                <div style={{
                    display: 'flex', flexWrap: 'wrap', gap: 16,
                    justifyContent: 'space-between', alignItems: 'flex-start',
                    marginBottom: 24,
                }}>
                    <div>
                        <h1 className="mp-h1" style={{ margin: 0, color: 'var(--text-1)' }}>My events</h1>
                        <p className="body" style={{ margin: '8px 0 0', color: 'var(--text-2)' }}>
                            Everything you&apos;re going to, hosting, or have already done.
                        </p>
                    </div>
                    <Button
                        variant="primary"
                        size="md"
                        onClick={() => navigate('/events/new')}
                        iconLeft={<Icons.plus size={15} />}
                    >
                        Create event
                    </Button>
                </div>

                {/* Dashboard tab bar */}
                <div className="mp-tab-scroll" style={{
                    display: 'flex', gap: 4, marginBottom: 28,
                    background: 'var(--surface-elevated)', border: '1px solid var(--border)',
                    borderRadius: 12, padding: 4,
                    width: 'fit-content', maxWidth: '100%',
                }}>
                    {DASH_TABS.map(({ id, label, icon }) => {
                        const active = activeTab === id;
                        return (
                            <button
                                key={id}
                                onClick={() => setActiveTab(id)}
                                style={{
                                    height: 36, padding: '0 14px', borderRadius: 8, border: 'none',
                                    background: active ? 'var(--mp-blue)' : 'transparent',
                                    color: active ? 'white' : 'var(--text-2)',
                                    fontSize: 13, fontWeight: active ? 600 : 500, cursor: 'pointer',
                                    transition: 'all 0.15s',
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    fontFamily: 'inherit',
                                }}
                            >
                                {icon} {label}
                            </button>
                        );
                    })}
                </div>

                {/* ── My Events tab ─────────────────────────────── */}
                {activeTab === 'my-events' && (
                    <>
                        {/* Time + role filters */}
                        <div style={{
                            display: 'flex', flexWrap: 'wrap', gap: 12,
                            alignItems: 'center', marginBottom: 24,
                        }}>
                            <SegmentedTabs items={TIME_TABS} active={timeTab} onChange={setTimeTab} />
                            <SegmentedTabs items={ROLE_CHIPS} active={roleChip} onChange={setRoleChip} />
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { bookingsQuery.refetch(); organiserQuery.refetch(); publishedQuery.refetch(); }}
                                style={{ marginLeft: 'auto' }}
                                iconLeft={<Icons.arrowR size={13} style={{ transform: 'rotate(45deg)' }} />}
                            >
                                Refresh
                            </Button>
                        </div>

                        {/* Partial-error banner — one feed failed but the other
                            succeeded. We still render whatever we have so the
                            user isn't left with a blank page. */}
                        {partialError && !isLoading && (
                            <div role="alert" style={{
                                padding: '10px 14px',
                                background: 'var(--warning-bg)',
                                color: 'var(--warning)',
                                borderRadius: 10,
                                fontSize: 13,
                                marginBottom: 16,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                            }}>
                                <Icons.alert size={14} />
                                <span>
                                    {organiserQuery.isError
                                        ? 'Could not load your organiser events. Showing attended events only.'
                                        : 'Could not load your bookings. Showing organiser events only.'}
                                </span>
                            </div>
                        )}

                        {/* Event grid */}
                        {isError && !partialError ? (
                            <div style={{ textAlign: 'center', padding: '80px 24px' }}>
                                <Icons.alert size={32} style={{ color: 'var(--error)' }} />
                                <div className="mp-h4" style={{ color: 'var(--text-1)', marginTop: 12 }}>
                                    Could not load your events
                                </div>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => { bookingsQuery.refetch(); organiserQuery.refetch(); }}
                                    style={{ marginTop: 16 }}
                                >
                                    Retry
                                </Button>
                            </div>
                        ) : isLoading ? (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                                gap: 20,
                            }}>
                                {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
                            </div>
                        ) : filtered.length === 0 ? (
                            <EmptyState
                                timeTab={timeTab}
                                roleChip={roleChip}
                                onBrowse={() => navigate('/events')}
                                onCreate={() => navigate('/events/new')}
                            />
                        ) : (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                                gap: 20,
                            }}>
                                {filtered.map((item) => (
                                    <MyEventCard
                                        key={`${item.role}-${item.event.id}`}
                                        event={item.event}
                                        role={item.role}
                                        onClick={() => handleClick(item)}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* ── Messages tab ──────────────────────────────── */}
                {activeTab === 'messages' && <MessagesTab />}

                {/* ── Escrow tab ────────────────────────────────── */}
                {activeTab === 'escrow' && <EscrowTab />}

                {/* ── Marketplace tab ───────────────────────────── */}
                {activeTab === 'marketplace' && <MarketplaceDashTab />}

                {/* ── Payments tab ──────────────────────────────── */}
                {activeTab === 'payments' && (
                    <PaymentsTab
                        events={organiserQuery.data ?? []}
                        isLoading={organiserQuery.isLoading}
                    />
                )}
            </div>
        </div>
    );
}

function EmptyState({ timeTab, roleChip, onBrowse, onCreate }) {
    const msg = (() => {
        if (timeTab === "drafts")     return "You don’t have any draft events.";
        if (timeTab === "past")       return "Nothing in your past events yet.";
        if (roleChip === "ORGANISER") return "You haven’t created any events yet.";
        if (roleChip === "ATTENDEE")  return "You haven’t booked any upcoming events.";
        return "No upcoming events yet.";
    })();

    return (
        <div style={{
            textAlign: 'center',
            padding: '80px 24px',
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 12,
        }}>
            <Icons.calendar size={32} style={{ color: 'var(--text-3)' }} />
            <div className="mp-h4" style={{ color: 'var(--text-1)', marginTop: 12 }}>{msg}</div>
            <p className="body-sm" style={{ color: 'var(--text-2)', margin: '8px 0 24px' }}>
                Browse what&apos;s on, or host your own.
            </p>
            <div style={{ display: 'inline-flex', gap: 10 }}>
                <Button variant="secondary" size="md" onClick={onBrowse}>Browse events</Button>
                <Button variant="primary" size="md" onClick={onCreate} iconLeft={<Icons.plus size={14} />}>
                    Create event
                </Button>
            </div>
        </div>
    );
}
