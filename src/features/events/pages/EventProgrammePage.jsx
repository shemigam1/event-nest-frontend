import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useSelector } from 'react-redux';
import {
    useGetEventByIdQuery,
    useGetEventBySlugQuery,
} from '../eventsApi';
import { useGetProgrammeQuery } from '@/features/organiser/programmeApi';
import { useGetMyBookingsQuery } from '@/features/bookings/bookingsApi';
import { selectIsAuthenticated } from '@/features/auth/authSlice';
import { formatEventDate } from '@/utils/dateFormat';
import Button from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icon';
import TopNav from '@/components/ui/TopNav';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function EventProgrammePage() {
    const { identifier } = useParams();
    const navigate = useNavigate();
    const isAuthenticated = useSelector(selectIsAuthenticated);

    // Resolve slug or UUID — same pattern as EventDetailPage
    const isUuid = UUID_RE.test(identifier);
    const byId   = useGetEventByIdQuery(identifier,   { skip: !isUuid });
    const bySlug = useGetEventBySlugQuery(identifier, { skip: isUuid });
    const event  = isUuid ? byId : bySlug;

    const eventId = event.data?.id ?? identifier;

    const programmeQuery = useGetProgrammeQuery(eventId, { skip: !event.data });
    const bookingsQuery  = useGetMyBookingsQuery(undefined, { skip: !isAuthenticated });

    const hasMyTickets = useMemo(() =>
        (bookingsQuery.data ?? []).some((b) => b.eventId === eventId),
        [bookingsQuery.data, eventId],
    );

    // Guard: once both queries resolve, redirect non-ticket-holders back to the event
    const queriesLoaded = !event.isLoading && !bookingsQuery.isLoading;
    if (queriesLoaded && !hasMyTickets) {
        navigate(`/events/${identifier}`, { replace: true });
        return null;
    }

    if (event.isLoading || programmeQuery.isLoading || bookingsQuery.isLoading) {
        return <Shell isAuthenticated={isAuthenticated}><SkeletonProgramme /></Shell>;
    }

    if (event.isError || !event.data) {
        return (
            <Shell isAuthenticated={isAuthenticated}>
                <div style={{ textAlign: 'center', padding: '80px 24px' }}>
                    <Icons.alert size={36} style={{ color: 'var(--error)' }} />
                    <h2 className="mp-h3" style={{ marginTop: 12, color: 'var(--text-1)' }}>Event not found</h2>
                    <Button variant="secondary" size="md" onClick={() => navigate('/events')} style={{ marginTop: 16 }}>
                        Browse events
                    </Button>
                </div>
            </Shell>
        );
    }

    const e = event.data;
    const items = [...(programmeQuery.data ?? [])].sort((a, b) => a.orderIndex - b.orderIndex);
    const isMultiDay = (e.eventDays ?? []).length > 1;

    return (
        <Shell isAuthenticated={isAuthenticated}>
            <div style={{ maxWidth: 760, margin: '0 auto', padding: '36px 24px 80px' }}>

                {/* ── Back link ──────────────────────────────────────── */}
                <button
                    type="button"
                    onClick={() => navigate(`/events/${identifier}`)}
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        background: 'none', border: 0, padding: 0, cursor: 'pointer',
                        fontSize: 13, fontWeight: 500,
                        color: 'var(--text-2)', fontFamily: 'inherit',
                        marginBottom: 28,
                        transition: 'color 0.15s',
                    }}
                    onMouseOver={(ev) => { ev.currentTarget.style.color = 'var(--mp-blue)'; }}
                    onMouseOut={(ev)  => { ev.currentTarget.style.color = 'var(--text-2)'; }}
                >
                    <Icons.arrowL size={14} />
                    Back to event
                </button>

                {/* ── Page header ────────────────────────────────────── */}
                <div style={{ marginBottom: 32 }}>
                    <div style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 500, marginBottom: 4 }}>
                        {e.title}
                    </div>
                    <h1 className="mp-h2" style={{ margin: 0, color: 'var(--text-1)' }}>
                        Programme of Events
                    </h1>
                    {e.startTime && (
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            marginTop: 10, fontSize: 13, color: 'var(--text-2)', fontWeight: 500,
                        }}>
                            <Icons.calendar size={14} />
                            {formatEventDate(e.startTime)}
                            {(e.venueName || e.venue) && (
                                <> · {e.venueName || e.venue}</>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Programme timeline ─────────────────────────────── */}
                {items.length === 0 ? (
                    <div style={{
                        padding: '48px 24px', textAlign: 'center',
                        background: 'var(--surface-elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: 14,
                    }}>
                        <Icons.calendar size={28} style={{ color: 'var(--text-3)' }} />
                        <p style={{ color: 'var(--text-3)', fontSize: 14, marginTop: 10 }}>
                            The organiser hasn't published a programme yet.
                            <br />Check back closer to the event date.
                        </p>
                    </div>
                ) : isMultiDay ? (
                    <DayGroupedTimeline items={items} eventDays={e.eventDays} />
                ) : (
                    <div style={{
                        background: 'var(--surface-elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: 14,
                        padding: '28px 32px',
                    }}>
                        <ProgrammeTimeline items={items} />
                    </div>
                )}
            </div>
        </Shell>
    );
}

/* ── Shell ────────────────────────────────────────────────────── */

function Shell({ isAuthenticated, children }) {
    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            {!isAuthenticated && <TopNav />}
            {children}
        </div>
    );
}

/* ── Day-grouped helpers ──────────────────────────────────────── */

/**
 * Partition programme items into per-day buckets.
 * Items are matched to a day by the date portion of their startTime.
 * Items with no startTime or a date that matches no event day are
 * collected in an "unscheduled" bucket appended at the end.
 */
function groupByDay(items, eventDays) {
    const dayMap = {};
    (eventDays ?? []).forEach((day) => {
        dayMap[day.dayDate] = { day, items: [] };
    });

    const unscheduled = [];
    items.forEach((item) => {
        if (!item.startTime) {
            unscheduled.push(item);
            return;
        }
        const dateStr = item.startTime.slice(0, 10);
        if (dayMap[dateStr]) {
            dayMap[dateStr].items.push(item);
        } else {
            unscheduled.push(item);
        }
    });

    const groups = (eventDays ?? [])
        .map((day) => ({ day, items: dayMap[day.dayDate]?.items ?? [] }))
        .filter((g) => g.items.length > 0);

    if (unscheduled.length > 0) {
        groups.push({ day: null, items: unscheduled });
    }

    return groups;
}

function formatDayLabel(day) {
    if (!day) return 'Other sessions';
    // dayDate is 'YYYY-MM-DD' — parse as local midnight to avoid UTC offset shift
    const [y, m, d] = day.dayDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const weekday = date.toLocaleDateString('en-GB', { weekday: 'short' });
    const dayMonth = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    return `${day.label} — ${weekday} ${dayMonth}`;
}

function DayGroupedTimeline({ items, eventDays }) {
    const groups = groupByDay(items, eventDays);
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {groups.map(({ day, items: dayItems }) => (
                <div key={day?.id ?? 'unscheduled'}>
                    {/* Day header */}
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        padding: '6px 14px',
                        background: 'var(--mp-blue)',
                        color: 'white',
                        borderRadius: 99,
                        fontSize: 12, fontWeight: 700,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        marginBottom: 16,
                    }}>
                        <Icons.calendar size={12} />
                        {formatDayLabel(day)}
                    </div>

                    {/* Timeline card for this day */}
                    <div style={{
                        background: 'var(--surface-elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: 14,
                        padding: '28px 32px',
                    }}>
                        <ProgrammeTimeline items={dayItems} timeOnly />
                    </div>
                </div>
            ))}
        </div>
    );
}

/* ── Timeline ─────────────────────────────────────────────────── */

/**
 * Format an ISO datetime for display inside a timeline item.
 * When `timeOnly` is true (day-grouped view), only show HH:MM to avoid
 * repeating the date that's already shown in the day header above.
 */
function fmtItemTime(iso, timeOnly) {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    if (timeOnly) {
        return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    }
    return formatEventDate(iso);
}

function ProgrammeTimeline({ items, timeOnly = false }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            {items.map((item, idx) => (
                <div
                    key={item.id}
                    style={{
                        display: 'flex',
                        gap: 20,
                        paddingBottom: idx < items.length - 1 ? 28 : 0,
                    }}
                >
                    {/* Spine dot + line */}
                    <div style={{
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', flexShrink: 0, width: 20,
                    }}>
                        <div style={{
                            width: 12, height: 12, borderRadius: '50%',
                            background: 'var(--mp-blue)', marginTop: 5, flexShrink: 0,
                            boxShadow: '0 0 0 3px var(--mp-blue-50, #EAF1FE)',
                        }} />
                        {idx < items.length - 1 && (
                            <div style={{
                                width: 2, flex: 1, marginTop: 8,
                                background: 'var(--border)',
                                borderRadius: 1,
                            }} />
                        )}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0, paddingBottom: idx < items.length - 1 ? 4 : 0 }}>
                        {item.startTime && (
                            <div style={{
                                fontSize: 11, fontWeight: 700, color: 'var(--mp-blue)',
                                textTransform: 'uppercase', letterSpacing: '0.07em',
                                marginBottom: 5,
                            }}>
                                {fmtItemTime(item.startTime, timeOnly)}
                                {item.endTime && (
                                    <span style={{ fontWeight: 500 }}>
                                        {' '}— {fmtItemTime(item.endTime, timeOnly)}
                                    </span>
                                )}
                            </div>
                        )}
                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.35 }}>
                            {item.title}
                        </div>
                        {item.speakerName && (
                            <div style={{
                                fontSize: 13, color: 'var(--mp-blue)',
                                marginTop: 3, fontWeight: 500,
                            }}>
                                {item.speakerName}
                            </div>
                        )}
                        {item.description && (
                            <p style={{
                                fontSize: 14, color: 'var(--text-2)',
                                margin: '6px 0 0', lineHeight: 1.65,
                            }}>
                                {item.description}
                            </p>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

/* ── Loading skeleton ─────────────────────────────────────────── */

function SkeletonProgramme() {
    const bar = (w, h = 14) => ({
        height: h,
        width: w,
        background: 'var(--surface-subtle)',
        border: '1px solid var(--border)',
        borderRadius: 4,
        animation: 'mp-flash 1.6s ease-in-out infinite',
    });
    return (
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '36px 24px 80px' }}>
            <div style={bar(90)} />
            <div style={{ ...bar('55%', 34), marginTop: 28, marginBottom: 10 }} />
            <div style={{ ...bar(220), marginBottom: 32 }} />
            <div style={{
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 14, padding: '28px 32px',
                display: 'flex', flexDirection: 'column', gap: 28,
            }}>
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} style={{ display: 'flex', gap: 20 }}>
                        <div style={{
                            width: 12, height: 12, borderRadius: '50%',
                            background: 'var(--surface-subtle)',
                            border: '1px solid var(--border)',
                            marginTop: 5, flexShrink: 0,
                        }} />
                        <div style={{ flex: 1 }}>
                            <div style={bar(130)} />
                            <div style={{ ...bar('65%', 16), marginTop: 8 }} />
                            <div style={{ ...bar('88%'), marginTop: 8 }} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
