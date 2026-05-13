import { useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import {
    useGetEventTiersQuery,
    useSubmitEventMutation,
    useDeleteEventMutation,
    useGetEventConfigQuery,
    useUpdateEventConfigMutation,
} from '@/features/events/eventsApi';
import {
    useGetOrganizerEventByIdQuery,
    useGetEventBookingsQuery,
    useGetEventAnalyticsQuery,
} from '../organizerApi';
import ProgrammeTab from '../components/ProgrammeTab';
import GuestsTab from '../components/GuestsTab';
import VendorsTab from '../components/VendorsTab';
import BudgetTab from '../components/BudgetTab';
import TeamTab from '../components/TeamTab';
import ActivityFeed from '@/features/activity/ActivityFeed';
import {
    useListCheckInInvitesQuery,
    useCreateCheckInInviteMutation,
    useRevokeCheckInInviteMutation,
} from '@/features/checkin/checkInApi';
import TopNav from '@/components/ui/TopNav';
import Button from '@/components/ui/Button';
import CapacityBar from '@/components/ui/CapacityBar';
import { RoleBadge, StatusBadge } from '@/components/ui/Badge';
import { Icons } from '@/components/ui/Icon';
import { formatEventDate } from '@/utils/dateFormat';

/**
 * Event manage screen — the organiser's command centre for a single event.
 * Reached from My events → Manage. Header carries role/status badges and
 * Sold/Checked-in big numbers; the tab bar exposes four sections:
 *
 *   Live dashboard — tiles + per-tier capacity + bookings chart + activity
 *   Attendees      — full bookings list
 *   Staff          — check-in staff invite management
 *   Settings       — event-lifecycle actions (edit/submit/delete)
 */
export default function OrganizerEventPage() {
    const { id: eventId } = useParams();
    const navigate = useNavigate();
    const [tab, setTab] = useState('attendees');

    const eventQuery = useGetOrganizerEventByIdQuery(eventId);
    const tiersQuery = useGetEventTiersQuery(eventId);
    const bookingsQuery = useGetEventBookingsQuery(eventId);
    const analyticsQuery = useGetEventAnalyticsQuery(eventId);

    if (eventQuery.isLoading || tiersQuery.isLoading) {
        return (
            <Shell>
                <BackLink />
                <PageSkeleton />
            </Shell>
        );
    }

    if (eventQuery.isError || !eventQuery.data) {
        return (
            <Shell>
                <BackLink />
                <div style={{ padding: 48, textAlign: 'center' }}>
                    <Icons.alert size={32} style={{ color: 'var(--error)' }} />
                    <p className="mp-h3" style={{ margin: '12px 0 4px', color: 'var(--text-1)' }}>
                        Event not found
                    </p>
                    <Button variant="secondary" size="md"
                        onClick={() => navigate('/organiser')}
                        style={{ marginTop: 16 }}>
                        Back to my events
                    </Button>
                </div>
            </Shell>
        );
    }

    const event = eventQuery.data;
    const tiers = tiersQuery.data ?? [];
    const bookings = bookingsQuery.data ?? [];
    const analytics = analyticsQuery.data;

    const totalCapacity = tiers.reduce((s, t) => s + (t.totalCapacity ?? 0), 0);
    const totalSold = analytics?.ticketsSold
        ?? tiers.reduce((s, t) => s + ((t.totalCapacity ?? 0) - (t.availableCapacity ?? 0)), 0);
    const checkInRate = analytics?.checkInRate ?? 0;
    const checkedIn = Math.round(totalSold * (checkInRate / 100));

    return (
        <PageContainer>
            <Header
                event={event}
                totalSold={totalSold}
                totalCapacity={totalCapacity}
                checkedIn={checkedIn}
                checkInRate={checkInRate}
                tab={tab}
                onTabChange={setTab}
            />

            <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 24px 80px' }}>
                {tab === 'dashboard' && (
                    <DashboardTab
                        eventId={eventId}
                        event={event}
                        tiers={tiers}
                        bookings={bookings}
                        analytics={analytics}
                        totalSold={totalSold}
                        totalCapacity={totalCapacity}
                        checkedIn={checkedIn}
                        checkInRate={checkInRate}
                    />
                )}

                {tab === 'attendees' && (
                    <AttendeesTab bookings={bookings} loading={bookingsQuery.isLoading} />
                )}

                {tab === 'programme' && (
                    <ProgrammeTab eventId={eventId} event={event} />
                )}

                {tab === 'guests' && (
                    <GuestsTab eventId={eventId} />
                )}

                {tab === 'vendors' && (
                    <VendorsTab eventId={eventId} />
                )}

                {tab === 'budget' && (
                    <BudgetTab eventId={eventId} />
                )}

                {tab === 'team' && (
                    <>
                        <TeamTab eventId={eventId} isPublished={event.status === 'PUBLISHED'} />
                        <CheckInStaffSection eventId={eventId} isPublished={event.status === 'PUBLISHED'} />
                    </>
                )}

                {tab === 'settings' && (
                    <SettingsTab event={event} eventId={eventId} navigate={navigate} />
                )}
            </div>
        </PageContainer>
    );
}

/* ───────────────────────────── shell ───────────────────────────── */

function PageContainer({ children }) {
    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            <TopNav />
            {children}
        </div>
    );
}

function Shell({ children }) {
    // Used by the error/skeleton states only.
    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            <TopNav />
            <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 24px 80px' }}>
                {children}
            </div>
        </div>
    );
}

function BackLink() {
    return (
        <Link
            to="/organiser"
            style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                color: 'var(--text-2)', fontSize: 14, textDecoration: 'none',
                marginBottom: 14, background: 'none', padding: 0,
            }}
        >
            <Icons.arrowL size={14} /> All my events
        </Link>
    );
}

/* ───────────────────────────── header ──────────────────────────── */

function Header({ event, totalSold, totalCapacity, checkedIn, checkInRate, tab, onTabChange }) {
    const isLive = event.status === 'PUBLISHED';
    const tabs = [
        ...(isLive ? [{ id: 'dashboard', label: 'Live dashboard' }] : []),
        { id: 'attendees', label: 'Attendees' },
        { id: 'guests',    label: 'Guests' },
        { id: 'programme', label: 'Programme' },
        { id: 'vendors',   label: 'Vendors' },
        { id: 'budget',    label: 'Budget' },
        { id: 'team',      label: 'Team' },
        { id: 'settings',  label: 'Settings' },
    ];
    return (
        <div style={{ background: 'white', borderBottom: '1px solid var(--border)' }}>
            <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 24px 0' }}>
                <BackLink />

                <div style={{
                    display: 'grid', gridTemplateColumns: '1fr auto',
                    gap: 24, alignItems: 'center',
                }}>
                    <div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                            <RoleBadge role="ORGANISER" size="sm" />
                            <StatusBadge status={event.status} size="sm" />
                            {isLive && (
                                <span style={{
                                    fontSize: 12, fontWeight: 600,
                                    color: 'var(--success)',
                                    display: 'inline-flex', alignItems: 'center', gap: 5,
                                }}>
                                    <span className="mp-live-dot" /> Live
                                </span>
                            )}
                        </div>
                        <h1 className="mp-h1" style={{ margin: 0, color: 'var(--text-1)' }}>
                            {event.title}
                        </h1>
                        <div style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 4 }}>
                            {formatEventDate(event.startTime)} · {event.venue}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 32 }}>
                        <HeroNumber
                            label="Sold"
                            value={totalSold}
                            sub={totalCapacity > 0 ? `of ${totalCapacity.toLocaleString()}` : null}
                        />
                        <div style={{ width: 1, background: 'var(--border)' }} />
                        <HeroNumber
                            label="Checked in"
                            value={checkedIn}
                            sub={`${Math.round(checkInRate)}% rate`}
                            accent
                        />
                    </div>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 0, marginTop: 24, overflowX: 'auto' }}>
                    {tabs.map(t => {
                        const active = tab === t.id;
                        const isDisabled = !isLive && t.id !== 'settings';
                        return (
                            <button
                                key={t.id}
                                onClick={() => !isDisabled && onTabChange(t.id)}
                                role="tab"
                                aria-selected={active}
                                disabled={isDisabled}
                                title={isDisabled ? 'Publish the event to access this tab' : ''}
                                style={{
                                    background: 'transparent', border: 0,
                                    padding: '12px 18px', whiteSpace: 'nowrap',
                                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                                    color: active ? 'var(--mp-blue)' : isDisabled ? 'var(--text-3)' : 'var(--text-2)',
                                    borderBottom: `2px solid ${active ? 'var(--mp-blue)' : 'transparent'}`,
                                    marginBottom: -1,
                                    fontWeight: active ? 600 : 500, fontSize: 14,
                                    opacity: isDisabled ? 0.5 : 1,
                                }}
                            >
                                {t.label}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function HeroNumber({ label, value, sub, accent }) {
    return (
        <div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>{label}</div>
            <div className="mp-num" style={{
                fontSize: 28, fontWeight: 700, lineHeight: 1.1, marginTop: 2,
                color: accent ? 'var(--mp-blue)' : 'var(--text-1)',
            }}>
                {Number(value).toLocaleString()}
            </div>
            {sub && (
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{sub}</div>
            )}
        </div>
    );
}

/* ─────────────────────────── Live dashboard ────────────────────── */

function DashboardTab({
    eventId, event, tiers, bookings, analytics,
    totalSold, totalCapacity, checkedIn, checkInRate,
}) {
    // Seed "now" once on mount so React's purity rules don't flag a
    // Date.now() call inside useMemo. RTK Query refetches bookings on
    // tab focus, so a stable mount-time anchor is fine.
    const [nowMs] = useState(() => Date.now());
    const { bookingsLastHour, revenueLastHour } = useMemo(() => {
        const hourAgo = nowMs - 60 * 60 * 1000;
        let bk = 0;
        let rv = 0;
        for (const b of bookings) {
            if (b.status !== 'CONFIRMED') continue;
            const t = new Date(b.createdAt).getTime();
            if (t >= hourAgo && t <= nowMs) {
                bk += b.quantity ?? 0;
                rv += b.totalAmount ?? 0;
            }
        }
        return { bookingsLastHour: bk, revenueLastHour: rv };
    }, [bookings, nowMs]);

    const totalRevenue = analytics?.totalRevenue != null
        ? Number(analytics.totalRevenue)
        : tiers.reduce((s, t) => {
            const sold = (t.totalCapacity ?? 0) - (t.availableCapacity ?? 0);
            return s + sold * Number(t.price ?? 0);
        }, 0);

    const pendingUpdate = event.pendingUpdate ?? null;
    const isRejected = event.status === 'DRAFT' && event.rejectionReason;
    const isPublished = event.status === 'PUBLISHED';

    return (
        <>
            {pendingUpdate?.status === 'PENDING' && <PendingUpdateBanner />}
            {pendingUpdate?.status === 'REJECTED' && (
                <RejectedUpdateBanner reason={pendingUpdate.rejectionReason} />
            )}
            {isRejected && <RejectionBanner reason={event.rejectionReason} />}

            <div className="mp-dashboard-grid" style={{
                display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px',
                gap: 20, alignItems: 'flex-start',
            }}>
                {/* Main column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
                    {/* Top tiles */}
                    <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16,
                    }}>
                        <Tile
                            label="Tickets sold"
                            value={totalSold.toLocaleString()}
                            sub={totalCapacity > 0 ? `of ${totalCapacity.toLocaleString()}` : null}
                            icon={<Icons.ticket size={16} />}
                        />
                        <Tile
                            label="Capacity left"
                            value={(totalCapacity - totalSold).toLocaleString()}
                            delta={bookingsLastHour > 0
                                ? { sign: 'down', value: `-${bookingsLastHour} last hr` }
                                : null}
                        />
                        <Tile
                            label="Checked in"
                            value={checkedIn.toLocaleString()}
                            sub={`${Math.round(checkInRate)}%`}
                            icon={<Icons.check size={16} />}
                        />
                        <Tile
                            label="Revenue"
                            value={formatMoney(totalRevenue)}
                            delta={revenueLastHour > 0
                                ? { sign: 'up', value: `+${formatMoney(revenueLastHour)}` }
                                : null}
                        />
                    </div>

                    {/* Per-tier capacity */}
                    {tiers.length > 0 && <PerTierCard tiers={tiers} />}

                    {/* Bookings chart */}
                    {analytics?.bookingsByDate?.length > 0 && (
                        <BookingsChart points={analytics.bookingsByDate} />
                    )}

                    {!isPublished && totalSold === 0 && (
                        <div style={{
                            background: 'white', border: '1px solid var(--border)',
                            borderRadius: 12, padding: 32, textAlign: 'center',
                            color: 'var(--text-2)',
                        }}>
                            <Icons.calendar size={28} style={{ color: 'var(--text-3)' }} />
                            <p style={{ marginTop: 10 }}>
                                Live data will appear here once your event is published and the first ticket is sold.
                            </p>
                        </div>
                    )}
                </div>

                {/* Right rail — Activity feed */}
                <div style={{ position: 'sticky', top: 24, height: 'fit-content' }}>
                    <ActivityFeedCard eventId={eventId} />
                </div>
            </div>
        </>
    );
}

function Tile({ label, value, sub, icon, delta }) {
    return (
        <div style={{
            background: 'white', border: '1px solid var(--border)',
            borderRadius: 12, padding: 20, boxShadow: 'var(--shadow-card)',
        }}>
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                marginBottom: 12,
            }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)' }}>
                    {label}
                </span>
                {icon && (
                    <span style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: 'var(--mp-blue-50)', color: 'var(--mp-blue)',
                        display: 'grid', placeItems: 'center',
                    }}>
                        {icon}
                    </span>
                )}
            </div>
            <div className="mp-num" style={{
                fontSize: 28, fontWeight: 700, color: 'var(--text-1)',
                lineHeight: 1.1, letterSpacing: '-0.01em',
            }}>
                {value}
            </div>
            {(sub || delta) && (
                <div style={{ marginTop: 8, display: 'flex', gap: 10, alignItems: 'center' }}>
                    {delta && (
                        <span style={{
                            fontSize: 12, fontWeight: 600,
                            color: delta.sign === 'up' ? 'var(--success)' : 'var(--error)',
                        }}>
                            {delta.sign === 'up' ? '↑' : '↓'} {delta.value}
                        </span>
                    )}
                    {sub && <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{sub}</span>}
                </div>
            )}
        </div>
    );
}

function PerTierCard({ tiers }) {
    return (
        <Card>
            <CardHeader>
                <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>
                    Per-tier capacity
                </span>
                <span style={{
                    fontSize: 12, color: 'var(--success)', fontWeight: 600,
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                }}>
                    <span className="mp-live-dot" /> Updating
                </span>
            </CardHeader>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
                {tiers.map(tier => {
                    const sold = (tier.totalCapacity ?? 0) - (tier.availableCapacity ?? 0);
                    const total = tier.totalCapacity ?? 0;
                    const revenue = sold * Number(tier.price ?? 0);
                    return (
                        <div key={tier.id}>
                            <div style={{
                                display: 'flex', justifyContent: 'space-between',
                                alignItems: 'baseline', marginBottom: 6,
                            }}>
                                <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>
                                    {tier.name}
                                </span>
                                <span className="mp-num" style={{
                                    fontSize: 13, color: 'var(--text-2)',
                                }}>
                                    {revenue === 0 ? '—' : formatMoney(revenue)}
                                </span>
                            </div>
                            <CapacityBar sold={sold} total={total} showPct={false} />
                        </div>
                    );
                })}
            </div>
        </Card>
    );
}

function BookingsChart({ points }) {
    // Backend exposes daily buckets via /analytics. We use the last 24
    // entries as our "last 24 hours" approximation until an hourly
    // endpoint exists.
    const slice = points.slice(-24);
    const max = Math.max(1, ...slice.map(p => p.count));
    return (
        <Card>
            <CardHeader>
                <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>
                    Bookings · last 24 hours
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Hourly</span>
            </CardHeader>
            <div style={{ padding: 20 }}>
                <div style={{
                    display: 'flex', alignItems: 'flex-end', gap: 6,
                    height: 140,
                }}>
                    {slice.length === 0 && (
                        <span style={{ fontSize: 13, color: 'var(--text-3)' }}>
                            No bookings yet.
                        </span>
                    )}
                    {slice.map((p, i) => {
                        const h = Math.max(4, (p.count / max) * 100);
                        const last = i === slice.length - 1;
                        return (
                            <div
                                key={p.date}
                                title={`${p.date} · ${p.count}`}
                                style={{
                                    flex: 1,
                                    height: `${h}%`,
                                    background: last ? 'var(--mp-blue)' : 'var(--mp-blue-200, rgba(37,99,235,0.25))',
                                    borderRadius: 4,
                                    minHeight: 4,
                                }}
                            />
                        );
                    })}
                </div>
            </div>
        </Card>
    );
}

function ActivityFeedCard({ eventId }) {
    return (
        <Card>
            <CardHeader>
                <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>
                    Activity feed
                </span>
                <span style={{
                    fontSize: 12, color: 'var(--success)', fontWeight: 600,
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                }}>
                    <span className="mp-live-dot" /> Live
                </span>
            </CardHeader>
            {/*
              The shared <ActivityFeed/> renders its own header. We want our
              own header above, so render the feed without an outer card
              wrapper by reading its body content via a style override.
              Easiest: just embed it as-is — the visual nesting is fine on
              the screen.
            */}
            <ActivityFeed eventId={eventId} max={10} />
        </Card>
    );
}

/* ───────────────────────────── Attendees tab ───────────────────── */

function AttendeesTab({ bookings, loading }) {
    return (
        <Card>
            <CardHeader>
                <span style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 14 }}>
                    Attendees
                </span>
                <span style={{ fontSize: 13, color: 'var(--text-3)' }}>
                    {bookings.length} booking{bookings.length === 1 ? '' : 's'}
                </span>
            </CardHeader>

            {loading && (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>
                    Loading bookings…
                </div>
            )}

            {!loading && bookings.length === 0 && (
                <div style={{ padding: 48, textAlign: 'center' }}>
                    <Icons.inbox size={28} style={{ color: 'var(--text-3)' }} />
                    <p className="mp-h4" style={{ margin: '12px 0 4px', color: 'var(--text-1)' }}>
                        No bookings yet
                    </p>
                    <p className="body-sm" style={{ color: 'var(--text-2)', margin: 0 }}>
                        Bookings will appear here once attendees start registering.
                    </p>
                </div>
            )}

            {bookings.map((booking, i) => {
                const date = new Date(booking.createdAt).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric',
                });
                const isLast = i === bookings.length - 1;
                const isCancelled = booking.status === 'CANCELLED';
                return (
                    <div
                        key={booking.id}
                        className="mp-org-bookings-row"
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 140px 100px 80px',
                            gap: 16,
                            alignItems: 'center',
                            padding: '14px 20px',
                            borderBottom: isLast ? 0 : '1px solid var(--border)',
                            opacity: isCancelled ? 0.6 : 1,
                        }}
                    >
                        <div>
                            <div style={{ fontWeight: 500, color: 'var(--text-1)' }}>
                                {booking.attendeeName}
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
                                {booking.attendeeEmail}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: 13, color: 'var(--text-1)' }}>
                                {booking.tierName}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                                {booking.quantity} ticket{booking.quantity !== 1 ? 's' : ''}
                            </div>
                        </div>
                        <div className="mp-num" style={{
                            fontSize: 14, fontWeight: 600, color: 'var(--text-1)',
                        }}>
                            {booking.totalAmount === 0 ? 'Free' : `₦${booking.totalAmount.toLocaleString()}`}
                        </div>
                        <div style={{
                            display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end',
                        }}>
                            <span style={{
                                fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                                background: isCancelled ? 'var(--surface-subtle)' : 'var(--success-bg)',
                                color: isCancelled ? 'var(--text-3)' : 'var(--success)',
                            }}>
                                {booking.status}
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{date}</span>
                        </div>
                    </div>
                );
            })}
        </Card>
    );
}

/* ───────────────────────────── Settings tab ────────────────────── */

function SettingsTab({ event, eventId, navigate }) {
    const [submitEvent, submitState]   = useSubmitEventMutation();
    const [deleteEvent, deleteState]   = useDeleteEventMutation();
    const [updateConfig, configState]  = useUpdateEventConfigMutation();
    const configQuery = useGetEventConfigQuery(eventId);

    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [actionError, setActionError] = useState('');
    const [moduleError, setModuleError] = useState('');
    const isDraft = event.status === 'DRAFT';

    // Config may not exist yet (404) — treat as all-off defaults.
    const config = configQuery.data ?? {};
    const programmeOn  = config.programmeEnabled  ?? false;
    const guestListOn  = config.guestListEnabled  ?? false;
    const ratingsOn    = config.ratingsEnabled     ?? false;
    const ticketingOn  = config.ticketingEnabled   ?? true;

    async function handleSubmit() {
        setActionError('');
        try { await submitEvent(eventId).unwrap(); }
        catch (err) { setActionError(err?.data?.message || 'Could not submit. Please try again.'); }
    }

    async function handleDelete() {
        setActionError('');
        try {
            await deleteEvent(eventId).unwrap();
            navigate('/organiser');
        } catch (err) {
            setActionError(err?.data?.message || 'Could not delete. Please try again.');
            setShowDeleteDialog(false);
        }
    }

    async function toggleModule(key, currentValue) {
        setModuleError('');
        try {
            await updateConfig({ eventId, [key]: !currentValue }).unwrap();
        } catch (err) {
            setModuleError(err?.data?.message || 'Could not update setting.');
        }
    }

    const modules = [
        {
            key: 'programmeEnabled',
            label: 'Programme / agenda',
            description: 'Publish a run-of-show — sessions, speakers, and timing — visible on the event page and emailed to attendees.',
            value: programmeOn,
            icon: <Icons.calendar size={18} />,
        },
        {
            key: 'guestListEnabled',
            label: 'Guest list & RSVPs',
            description: 'Invite guests by email, track RSVPs, and optionally gate ticket bookings to accepted guests only.',
            value: guestListOn,
            icon: <Icons.mail size={18} />,
        },
        {
            key: 'ratingsEnabled',
            label: 'Attendee ratings',
            description: 'Allow attendees to rate the event after it ends. Ratings are visible on the public event page.',
            value: ratingsOn,
            icon: <Icons.bolt size={18} />,
        },
        {
            key: 'ticketingEnabled',
            label: 'Ticketing',
            description: 'Enable ticket sales for this event. Turning this off prevents new bookings while keeping existing ones intact.',
            value: ticketingOn,
            icon: <Icons.ticket size={18} />,
        },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {actionError && (
                <div role="alert" style={{
                    padding: '10px 16px', background: 'var(--error-bg)',
                    color: 'var(--error)', borderRadius: 10, fontSize: 14,
                }}>
                    {actionError}
                </div>
            )}

            {/* Event modules */}
            <div style={{
                background: 'white', border: '1px solid var(--border)',
                borderRadius: 12, overflow: 'hidden',
            }}>
                <div style={{
                    padding: '16px 20px', borderBottom: '1px solid var(--border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                    <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 15 }}>
                            Event modules
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
                            Turn features on or off — you can change these any time before or after publishing.
                        </div>
                    </div>
                    {configQuery.isLoading && (
                        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Loading…</span>
                    )}
                </div>

                {moduleError && (
                    <div role="alert" style={{
                        margin: '12px 20px 0', padding: '10px 12px',
                        background: 'var(--error-bg, #FBE9E9)', color: 'var(--error)',
                        borderRadius: 8, fontSize: 13,
                    }}>
                        {moduleError}
                    </div>
                )}

                {modules.map((m, i) => (
                    <div
                        key={m.key}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 16,
                            padding: '16px 20px',
                            borderBottom: i < modules.length - 1 ? '1px solid var(--border)' : 0,
                        }}
                    >
                        <div style={{
                            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                            background: m.value ? '#EAF1FE' : 'var(--surface-subtle)',
                            color: m.value ? 'var(--mp-blue)' : 'var(--text-3)',
                            display: 'grid', placeItems: 'center',
                            transition: 'all 0.2s',
                        }}>
                            {m.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 14 }}>
                                {m.label}
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
                                {m.description}
                            </div>
                        </div>
                        <button
                            onClick={() => toggleModule(m.key, m.value)}
                            disabled={configState.isLoading || configQuery.isLoading}
                            aria-label={`${m.value ? 'Disable' : 'Enable'} ${m.label}`}
                            style={{
                                flexShrink: 0,
                                width: 44, height: 24, borderRadius: 99, border: 0,
                                background: m.value ? 'var(--mp-blue)' : 'var(--border)',
                                cursor: configState.isLoading ? 'not-allowed' : 'pointer',
                                position: 'relative',
                                transition: 'background 0.2s',
                                opacity: configState.isLoading ? 0.6 : 1,
                            }}
                        >
                            <span style={{
                                position: 'absolute', top: 3,
                                left: m.value ? 23 : 3,
                                width: 18, height: 18, borderRadius: 99,
                                background: 'white',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                transition: 'left 0.2s',
                            }} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Event details */}
            <SettingCard
                title="Event details"
                description="Title, description, dates, venue, cover image."
                action={
                    <Button variant="secondary" size="md"
                        icon={<Icons.list size={15} />}
                        onClick={() => navigate(`/events/${eventId}/edit`)}>
                        Edit event
                    </Button>
                }
            />

            {isDraft && (
                <SettingCard
                    title="Submit for approval"
                    description="Once approved by an admin your event becomes public and ticket sales open."
                    action={
                        <Button variant="primary" size="md"
                            disabled={submitState.isLoading}
                            iconRight={<Icons.arrowR size={15} />}
                            onClick={handleSubmit}>
                            {submitState.isLoading ? 'Submitting…' : 'Submit for approval'}
                        </Button>
                    }
                />
            )}

            {isDraft && (
                <SettingCard
                    title="Delete event"
                    danger
                    description="Permanently remove this event. Tickets cannot be issued once it's gone."
                    action={
                        <Button variant="destructive" size="md"
                            disabled={deleteState.isLoading}
                            onClick={() => setShowDeleteDialog(true)}>
                            Delete
                        </Button>
                    }
                />
            )}

            {showDeleteDialog && (
                <DeleteDialog
                    title={event.title}
                    onConfirm={handleDelete}
                    onDismiss={() => setShowDeleteDialog(false)}
                    loading={deleteState.isLoading}
                />
            )}
        </div>
    );
}

function SettingCard({ title, description, action, danger }) {
    return (
        <div style={{
            background: 'white',
            border: `1px solid ${danger ? 'var(--error)' : 'var(--border)'}`,
            borderRadius: 12, padding: 20,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            gap: 16, flexWrap: 'wrap',
        }}>
            <div style={{ minWidth: 0, flex: '1 1 200px' }}>
                <div style={{
                    fontWeight: 600, color: danger ? 'var(--error)' : 'var(--text-1)',
                    marginBottom: 4,
                }}>
                    {title}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
                    {description}
                </div>
            </div>
            <div style={{ flexShrink: 0 }}>{action}</div>
        </div>
    );
}

/* ─────────────────────────── banners ───────────────────────────── */

function PendingUpdateBanner() {
    return (
        <div style={{
            display: 'flex', gap: 12, padding: '14px 18px', marginBottom: 16,
            background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12,
            fontSize: 14, color: '#1E40AF',
        }}>
            <Icons.clock size={17} style={{ color: '#3B82F6', flexShrink: 0, marginTop: 1 }} />
            <div>
                <strong>Update pending admin review</strong>
                <div style={{ marginTop: 3, fontSize: 13, color: '#1D4ED8' }}>
                    Your proposed changes are under review. The live event is unchanged until they are approved.
                </div>
            </div>
        </div>
    );
}

function RejectedUpdateBanner({ reason }) {
    return (
        <div style={{
            display: 'flex', gap: 12, padding: '14px 18px', marginBottom: 16,
            background: 'var(--error-bg)', border: '1px solid var(--error)',
            borderRadius: 12, fontSize: 14,
        }}>
            <Icons.alert size={17} style={{ color: 'var(--error)', flexShrink: 0, marginTop: 1 }} />
            <div>
                <strong style={{ color: 'var(--error)' }}>Edit request rejected</strong>
                <div style={{ marginTop: 3, fontSize: 13, color: 'var(--text-1)' }}>{reason}</div>
                <div style={{ marginTop: 6, fontSize: 13, color: 'var(--text-2)' }}>
                    Please revise and resubmit.
                </div>
            </div>
        </div>
    );
}

function RejectionBanner({ reason }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '12px 16px', borderRadius: 10, background: '#FFF8E1',
            color: '#92400E', fontSize: 14, marginBottom: 16,
        }}>
            <Icons.alert size={16} style={{ flexShrink: 0, marginTop: 1, color: '#F59E0B' }} />
            <div>
                <strong>Rejected by admin — </strong>{reason}
                <div style={{ marginTop: 4, fontSize: 13, color: '#78350F' }}>
                    Address the feedback above, then resubmit for approval.
                </div>
            </div>
        </div>
    );
}

/* ─────────────────── delete dialog ─────────────────────────── */

function DeleteDialog({ title, onConfirm, onDismiss, loading }) {
    return (
        <div
            role="dialog"
            aria-label="Delete event"
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
                    width: '100%', maxWidth: 400, background: 'white',
                    borderRadius: 16, padding: 28, boxShadow: 'var(--shadow-modal)',
                }}
            >
                <h2 className="mp-h3" style={{ margin: '0 0 8px', color: 'var(--text-1)' }}>
                    Delete event?
                </h2>
                <p className="body-sm" style={{ margin: '0 0 24px', color: 'var(--text-2)' }}>
                    <strong>{title}</strong> will be permanently deleted. This cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <Button variant="ghost" size="md" onClick={onDismiss} disabled={loading}>
                        Cancel
                    </Button>
                    <Button variant="destructive" size="md" onClick={onConfirm} disabled={loading}>
                        {loading ? 'Deleting…' : 'Delete'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

/* ─────────────────── Check-in staff (carried over) ─────────────── */

function CheckInStaffSection({ eventId, isPublished = true }) {
    const { data: invites = [], isLoading } = useListCheckInInvitesQuery(eventId);
    const [createInvite, createState] = useCreateCheckInInviteMutation();
    const [revokeInvite, revokeState] = useRevokeCheckInInviteMutation();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [newToken, setNewToken] = useState(null);
    const [copied, setCopied] = useState(false);
    const [formError, setFormError] = useState('');
    const [pendingRevoke, setPendingRevoke] = useState(null);

    async function handleCreate(e) {
        e.preventDefault();
        if (!name.trim() || !email.trim()) return;
        setFormError('');
        try {
            const result = await createInvite({ eventId, name: name.trim(), email: email.trim() }).unwrap();
            setNewToken(result.rawToken);
            setName('');
            setEmail('');
        } catch (err) {
            setFormError(err?.data?.message || 'Could not create invite. Please try again.');
        }
    }

    async function handleRevokeConfirm() {
        if (!pendingRevoke) return;
        try {
            await revokeInvite({ eventId, inviteId: pendingRevoke.id }).unwrap();
        } catch { /* list will refetch */ }
        setPendingRevoke(null);
    }

    function copyToken() {
        if (!newToken) return;
        navigator.clipboard.writeText(newToken).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }

    const statusColor = { ACTIVE: 'var(--success)', REVOKED: 'var(--error)', EXPIRED: 'var(--text-3)' };

    return (
        <Card>
            <CardHeader>
                <div>
                    <span style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 14 }}>
                        Check-in staff
                    </span>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-3)' }}>
                        Staff tokens allow scanning tickets without a full account login.
                        {!isPublished && ' Publish the event to invite check-in staff.'}
                    </p>
                </div>
            </CardHeader>

            <div style={{
                padding: '16px 20px', borderBottom: '1px solid var(--border)',
                background: 'var(--surface-subtle)',
            }}>
                <form onSubmit={handleCreate} style={{
                    display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap',
                }}>
                    <div style={{ flex: '1 1 160px' }}>
                        <label style={{
                            display: 'block', fontSize: 12, fontWeight: 500,
                            color: 'var(--text-2)', marginBottom: 4,
                        }}>
                            Staff name
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. David Okafor"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={!isPublished}
                            required
                            style={{
                                width: '100%', height: 38, padding: '0 12px',
                                background: !isPublished ? 'var(--surface-subtle)' : 'white',
                                border: '1px solid var(--border)',
                                borderRadius: 8, fontSize: 14,
                                color: !isPublished ? 'var(--text-3)' : 'var(--text-1)',
                                boxSizing: 'border-box',
                                opacity: !isPublished ? 0.6 : 1,
                            }}
                        />
                    </div>
                    <div style={{ flex: '1 1 200px' }}>
                        <label style={{
                            display: 'block', fontSize: 12, fontWeight: 500,
                            color: 'var(--text-2)', marginBottom: 4,
                        }}>
                            Email
                        </label>
                        <input
                            type="email"
                            placeholder="staff@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={!isPublished}
                            required
                            style={{
                                width: '100%', height: 38, padding: '0 12px',
                                background: !isPublished ? 'var(--surface-subtle)' : 'white',
                                border: '1px solid var(--border)',
                                borderRadius: 8, fontSize: 14,
                                color: !isPublished ? 'var(--text-3)' : 'var(--text-1)',
                                boxSizing: 'border-box',
                                opacity: !isPublished ? 0.6 : 1,
                            }}
                        />
                    </div>
                    <Button type="submit" variant="primary" size="sm"
                        disabled={createState.isLoading || !isPublished}
                        icon={<Icons.plus size={14} />}
                        title={!isPublished ? 'Publish the event before inviting check-in staff' : ''}>
                        {createState.isLoading ? 'Creating…' : 'Create invite'}
                    </Button>
                </form>
                {formError && (
                    <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--error)' }}>{formError}</p>
                )}
            </div>

            {newToken && (
                <div style={{
                    padding: '14px 20px', borderBottom: '1px solid var(--border)',
                    background: '#FFFBEB', display: 'flex', gap: 14, alignItems: 'flex-start',
                }}>
                    <Icons.alert size={16} style={{ color: '#D97706', flexShrink: 0, marginTop: 2 }} />
                    <div style={{ flex: 1 }}>
                        <div style={{
                            fontWeight: 600, fontSize: 13, color: '#92400E', marginBottom: 6,
                        }}>
                            Token created — copy it now. It will not be shown again.
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            <code style={{
                                flex: 1, background: 'white', border: '1px solid #FCD34D',
                                borderRadius: 6, padding: '6px 10px', fontSize: 13,
                                fontFamily: 'monospace', color: 'var(--text-1)', wordBreak: 'break-all',
                            }}>
                                {newToken}
                            </code>
                            <Button variant="secondary" size="sm" onClick={copyToken}>
                                {copied ? 'Copied!' : 'Copy'}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setNewToken(null)}>
                                Dismiss
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {isLoading && (
                <div style={{ padding: '20px', fontSize: 13, color: 'var(--text-3)', textAlign: 'center' }}>
                    Loading staff…
                </div>
            )}

            {!isLoading && invites.length === 0 && !newToken && (
                <div style={{ padding: '28px 20px', textAlign: 'center' }}>
                    <Icons.users size={24} style={{ color: 'var(--text-3)' }} />
                    <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--text-2)' }}>
                        No check-in staff invited yet.
                    </p>
                </div>
            )}

            {invites.map((invite, i) => {
                const created = new Date(invite.createdAt).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric',
                });
                const isLast = i === invites.length - 1;
                return (
                    <div
                        key={invite.id}
                        style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '12px 20px',
                            borderBottom: isLast ? 0 : '1px solid var(--border)',
                        }}
                    >
                        <div>
                            <div style={{ fontWeight: 500, color: 'var(--text-1)', fontSize: 14 }}>
                                {invite.name}
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
                                {invite.email} · Added {created}
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{
                                fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                                background: invite.status === 'ACTIVE' ? 'var(--success-bg)' : 'var(--surface-subtle)',
                                color: statusColor[invite.status] ?? 'var(--text-3)',
                            }}>
                                {invite.status}
                            </span>
                            {invite.status === 'ACTIVE' && (
                                <button
                                    onClick={() => setPendingRevoke(invite)}
                                    disabled={revokeState.isLoading}
                                    aria-label={`Revoke ${invite.name}`}
                                    style={{
                                        background: 'none', border: '1px solid var(--border)',
                                        borderRadius: 6, padding: '4px 8px', cursor: 'pointer',
                                        fontSize: 12, color: 'var(--error)', fontWeight: 500,
                                    }}
                                >
                                    Revoke
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}

            {pendingRevoke && (
                <div
                    role="dialog"
                    onClick={() => setPendingRevoke(null)}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 1000,
                        background: 'rgba(2,16,45,0.55)',
                        display: 'grid', placeItems: 'center', padding: 20,
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: '100%', maxWidth: 400, background: 'white',
                            borderRadius: 16, boxShadow: 'var(--shadow-modal)', padding: 28,
                        }}
                    >
                        <h2 className="mp-h3" style={{ margin: '0 0 8px', color: 'var(--text-1)' }}>
                            Revoke access?
                        </h2>
                        <p className="body-sm" style={{ margin: '0 0 6px', color: 'var(--text-2)' }}>
                            <strong>{pendingRevoke.name}</strong> ({pendingRevoke.email}) will immediately lose the ability to scan tickets for this event.
                        </p>
                        <p className="body-sm" style={{ margin: '0 0 24px', color: 'var(--text-3)' }}>
                            Their staff token will be invalidated. This cannot be undone — you can create a new invite if needed.
                        </p>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <Button variant="ghost" size="md"
                                onClick={() => setPendingRevoke(null)}
                                disabled={revokeState.isLoading}>
                                Cancel
                            </Button>
                            <Button variant="destructive" size="md"
                                onClick={handleRevokeConfirm}
                                disabled={revokeState.isLoading}>
                                {revokeState.isLoading ? 'Revoking…' : 'Yes, revoke access'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </Card>
    );
}

/* ─────────────────────── shared card primitives ──────────────────── */

function Card({ children }) {
    return (
        <div style={{
            background: 'white', border: '1px solid var(--border)',
            borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-card)',
        }}>
            {children}
        </div>
    );
}

function CardHeader({ children }) {
    return (
        <div style={{
            padding: '16px 20px', borderBottom: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
        }}>
            {children}
        </div>
    );
}

/* ───────────────────────────── misc ────────────────────────────── */

function PageSkeleton() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[300, 180, 240].map((h, i) => (
                <div
                    key={i}
                    style={{
                        height: h, background: 'white', border: '1px solid var(--border)',
                        borderRadius: 12, animation: 'mp-flash 1.6s ease-in-out infinite',
                        opacity: 1 - i * 0.2,
                    }}
                />
            ))}
        </div>
    );
}

/**
 * Compact money formatter — mirrors the design (e.g. ₦11,900K, ₦1.2M).
 */
function formatMoney(amount) {
    if (amount == null) return '₦0';
    const n = Number(amount);
    if (n === 0) return '₦0';
    if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `₦${Math.round(n / 1_000)}K`;
    return `₦${n.toLocaleString()}`;
}
