import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useGetMyVendorApplicationsQuery } from '@/features/organiser/vendorsApi';
import { formatEventDate } from '@/utils/dateFormat';
import Button from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icon';

const STATUS_STYLE = {
    PENDING:  { bg: '#FEF4E2', fg: '#B8770A', label: 'Pending review' },
    ACCEPTED: { bg: '#E6F4EA', fg: '#0F9D58', label: 'Accepted' },
    REJECTED: { bg: '#FBE9E9', fg: '#D62828', label: 'Rejected' },
};

const FILTERS = [
    ['all',      'All'],
    ['PENDING',  'Pending'],
    ['ACCEPTED', 'Accepted'],
    ['REJECTED', 'Rejected'],
];

const VIEWS = [
    { key: 'working',  label: 'Working at',       sub: 'Events with an accepted application' },
    { key: 'all',      label: 'All applications', sub: 'Everything you’ve submitted' },
];

function ngn(amount) {
    const n = Number(amount ?? 0);
    if (!Number.isFinite(n) || n <= 0) return null;
    return `₦${n.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
}

function formatTimestamp(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* Bucket an accepted application as upcoming/past relative to a frozen
   `nowMs` so the split stays stable within one render. Uses eventEndTime
   when present, falling back to startTime — an event without an explicit
   end is "upcoming" until it has started. */
function isUpcoming(app, nowMs) {
    const end = app.eventEndTime ? new Date(app.eventEndTime).getTime() : null;
    if (end != null && Number.isFinite(end)) return end >= nowMs;
    const start = app.eventStartTime ? new Date(app.eventStartTime).getTime() : null;
    if (start != null && Number.isFinite(start)) return start >= nowMs;
    return true;
}

export default function MyApplicationsPage() {
    const navigate = useNavigate();
    const apps = useGetMyVendorApplicationsQuery();

    const [view, setView]     = useState('working');
    const [filter, setFilter] = useState('all');

    // Stable "now" so upcoming/past doesn't reshuffle when an unrelated
    // re-render fires.
    const [nowMs] = useState(() => Date.now());

    const list = useMemo(() => apps.data || [], [apps.data]);
    const counts = useMemo(() => {
        const c = { all: list.length, PENDING: 0, ACCEPTED: 0, REJECTED: 0 };
        for (const a of list) {
            if (c[a.status] !== undefined) c[a.status] += 1;
        }
        return c;
    }, [list]);

    const accepted = useMemo(() => list.filter((a) => a.status === 'ACCEPTED'), [list]);
    const working = useMemo(() => {
        const upcoming = accepted.filter((a) => isUpcoming(a, nowMs));
        const past     = accepted.filter((a) => !isUpcoming(a, nowMs));
        // Soonest first for upcoming, most-recent first for past.
        upcoming.sort((a, b) => {
            const at = a.eventStartTime ? new Date(a.eventStartTime).getTime() : Infinity;
            const bt = b.eventStartTime ? new Date(b.eventStartTime).getTime() : Infinity;
            return at - bt;
        });
        past.sort((a, b) => {
            const at = a.eventStartTime ? new Date(a.eventStartTime).getTime() : 0;
            const bt = b.eventStartTime ? new Date(b.eventStartTime).getTime() : 0;
            return bt - at;
        });
        return { upcoming, past };
    }, [accepted, nowMs]);

    const filtered = useMemo(() => (
        filter === 'all' ? list : list.filter((a) => a.status === filter)
    ), [list, filter]);

    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 80px' }}>

                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 20,
                    gap: 16,
                    flexWrap: 'wrap',
                }}>
                    <div>
                        <h1 className="mp-h1" style={{ margin: 0, color: 'var(--text-1)' }}>
                            My vendor applications
                        </h1>
                        <p className="body" style={{ margin: '6px 0 0', color: 'var(--text-2)' }}>
                            Switch between events you&apos;re working at and the full list of
                            applications you&apos;ve submitted.
                        </p>
                    </div>
                    <Button
                        variant="primary"
                        size="md"
                        icon={<Icons.search size={14} />}
                        onClick={() => navigate('/vendor/opportunities')}
                    >
                        Find opportunities
                    </Button>
                </div>

                {/* View toggle */}
                <div style={{
                    display: 'flex', gap: 0,
                    borderBottom: '1px solid var(--border)',
                    marginBottom: 24,
                }}>
                    {VIEWS.map(({ key, label }) => {
                        const active = view === key;
                        const n = key === 'working' ? accepted.length : list.length;
                        return (
                            <button
                                key={key}
                                onClick={() => setView(key)}
                                style={{
                                    background: 'transparent', border: 0,
                                    padding: '10px 18px',
                                    color: active ? 'var(--mp-blue)' : 'var(--text-2)',
                                    borderBottom: `2px solid ${active ? 'var(--mp-blue)' : 'transparent'}`,
                                    fontWeight: active ? 600 : 500, fontSize: 14,
                                    cursor: 'pointer', marginBottom: -1,
                                    display: 'inline-flex', alignItems: 'center', gap: 8,
                                    fontFamily: 'inherit',
                                }}
                            >
                                {label}
                                <span className="mp-num" style={{
                                    fontSize: 11, padding: '2px 7px', borderRadius: 99, fontWeight: 600,
                                    background: active ? 'var(--mp-blue-50, #EAF1FE)' : 'var(--surface-subtle)',
                                    color: active ? 'var(--mp-blue)' : 'var(--text-3)',
                                }}>
                                    {apps.isLoading ? '—' : n}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {apps.isLoading && <Skeleton />}

                {apps.isError && !apps.isLoading && (
                    <div style={{
                        background: 'white',
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                        padding: 40,
                        textAlign: 'center',
                    }}>
                        <Icons.alert size={28} style={{ color: 'var(--error)' }} />
                        <p className="body-sm" style={{ marginTop: 8, color: 'var(--text-2)' }}>
                            {apps.error?.data?.message || 'Could not load your applications.'}
                        </p>
                        <Button variant="secondary" size="sm" onClick={apps.refetch} style={{ marginTop: 12 }}>
                            Retry
                        </Button>
                    </div>
                )}

                {apps.isSuccess && view === 'working' && (
                    <WorkingView
                        working={working}
                        onBrowse={() => navigate('/vendor/opportunities')}
                        onView={(eventId) => navigate(`/events/${eventId}`)}
                    />
                )}

                {apps.isSuccess && view === 'all' && (
                    <AllApplicationsView
                        list={list}
                        filtered={filtered}
                        filter={filter}
                        counts={counts}
                        onFilterChange={setFilter}
                        onView={(eventId) => navigate(`/events/${eventId}`)}
                        onBrowse={() => navigate('/vendor/opportunities')}
                    />
                )}
            </div>
        </div>
    );
}

/* ─── Working-at view ─────────────────────────────── */

function WorkingView({ working, onBrowse, onView }) {
    const total = working.upcoming.length + working.past.length;

    if (total === 0) {
        return (
            <div style={{
                background: 'white',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: 60,
                textAlign: 'center',
            }}>
                <div style={{
                    width: 52, height: 52, borderRadius: 99,
                    margin: '0 auto 14px',
                    background: 'var(--surface-subtle)',
                    display: 'grid', placeItems: 'center',
                    color: 'var(--text-3)',
                }}>
                    <Icons.calendar size={20} />
                </div>
                <div className="mp-h4" style={{ color: 'var(--text-1)', margin: 0 }}>
                    No active gigs yet
                </div>
                <p className="body-sm" style={{ color: 'var(--text-2)', marginTop: 6 }}>
                    Once an organiser accepts your application, the event lands here.
                </p>
                <Button
                    variant="primary"
                    size="md"
                    icon={<Icons.search size={14} />}
                    onClick={onBrowse}
                    style={{ marginTop: 16 }}
                >
                    Find opportunities
                </Button>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {working.upcoming.length > 0 && (
                <Section
                    title="Upcoming"
                    count={working.upcoming.length}
                    accent="var(--success)"
                >
                    {working.upcoming.map((a, i) => (
                        <WorkingRow
                            key={a.id}
                            application={a}
                            isLast={i === working.upcoming.length - 1}
                            variant="upcoming"
                            onView={() => onView(a.eventId)}
                        />
                    ))}
                </Section>
            )}
            {working.past.length > 0 && (
                <Section
                    title="Past gigs"
                    count={working.past.length}
                >
                    {working.past.map((a, i) => (
                        <WorkingRow
                            key={a.id}
                            application={a}
                            isLast={i === working.past.length - 1}
                            variant="past"
                            onView={() => onView(a.eventId)}
                        />
                    ))}
                </Section>
            )}
        </div>
    );
}

function Section({ title, count, accent, children }) {
    return (
        <div style={{
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: 12,
            overflow: 'hidden',
        }}>
            <div style={{
                padding: '12px 20px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
            }}>
                <span style={{
                    fontSize: 13, fontWeight: 600,
                    color: accent || 'var(--text-1)',
                }}>
                    {title}
                </span>
                <span className="mp-num" style={{
                    fontSize: 12, color: 'var(--text-3)', fontWeight: 500,
                }}>
                    {count}
                </span>
            </div>
            <div>{children}</div>
        </div>
    );
}

function WorkingRow({ application: a, isLast, variant, onView }) {
    const amount = ngn(a.proposedAmount);
    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: 16,
            alignItems: 'flex-start',
            padding: '16px 20px',
            borderBottom: isLast ? 0 : '1px solid var(--border)',
        }}>
            <div style={{ minWidth: 0 }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 4,
                    flexWrap: 'wrap',
                }}>
                    <button
                        onClick={onView}
                        style={{
                            background: 'none', border: 0, padding: 0,
                            cursor: 'pointer', fontFamily: 'inherit',
                            fontWeight: 600, color: 'var(--mp-blue)', fontSize: 15,
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                        }}
                    >
                        {a.eventTitle}
                        <Icons.arrowR size={13} style={{ opacity: 0.7 }} />
                    </button>
                    <span style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        background: 'var(--surface-subtle)',
                        borderRadius: 6,
                        color: 'var(--text-2)',
                        fontWeight: 600,
                    }}>
                        {a.serviceType}
                    </span>
                </div>

                <div style={{
                    display: 'flex',
                    gap: 14,
                    fontSize: 13,
                    color: 'var(--text-2)',
                    flexWrap: 'wrap',
                }}>
                    {a.eventStartTime && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Icons.calendar size={12} style={{ color: 'var(--text-3)' }} />
                            {formatEventDate(a.eventStartTime)}
                        </span>
                    )}
                    {a.eventVenue && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Icons.pin size={12} style={{ color: 'var(--text-3)' }} />
                            {a.eventVenue}
                        </span>
                    )}
                    {amount && (
                        <span className="mp-num" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Icons.wallet size={12} style={{ color: 'var(--text-3)' }} />
                            <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{amount}</span>
                        </span>
                    )}
                </div>
            </div>

            <span style={{
                padding: '3px 10px',
                borderRadius: 99,
                fontSize: 11,
                fontWeight: 600,
                background: variant === 'upcoming' ? '#E6F4EA' : 'var(--surface-subtle)',
                color: variant === 'upcoming' ? '#0F9D58' : 'var(--text-3)',
                whiteSpace: 'nowrap',
            }}>
                {variant === 'upcoming' ? 'Upcoming' : 'Completed'}
            </span>
        </div>
    );
}

/* ─── All-applications view ───────────────────────── */

function AllApplicationsView({
    list, filtered, filter, counts, onFilterChange, onView, onBrowse,
}) {
    return (
        <>
            {/* Tiles */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 16,
                marginBottom: 24,
            }}>
                <Tile label="Total"    value={counts.all} icon={<Icons.inbox size={16} />} />
                <Tile
                    label="Pending"
                    value={counts.PENDING}
                    accent={counts.PENDING > 0 ? 'var(--warning)' : undefined}
                />
                <Tile
                    label="Accepted"
                    value={counts.ACCEPTED}
                    accent={counts.ACCEPTED > 0 ? 'var(--success)' : undefined}
                />
                <Tile label="Rejected" value={counts.REJECTED} />
            </div>

            {/* List card */}
            <div style={{
                background: 'white',
                border: '1px solid var(--border)',
                borderRadius: 12,
                overflow: 'hidden',
            }}>
                <div style={{
                    padding: '14px 20px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                    flexWrap: 'wrap',
                }}>
                    <div style={{
                        display: 'flex', gap: 4, padding: 4,
                        background: 'var(--surface-subtle)',
                        borderRadius: 10,
                        border: '1px solid var(--border)',
                        flexWrap: 'wrap',
                    }}>
                        {FILTERS.map(([k, l]) => {
                            const active = filter === k;
                            const n = k === 'all' ? counts.all : counts[k];
                            return (
                                <button
                                    key={k}
                                    onClick={() => onFilterChange(k)}
                                    style={{
                                        background: active ? 'white' : 'transparent',
                                        border: 0,
                                        padding: '6px 12px',
                                        borderRadius: 7,
                                        fontSize: 13,
                                        fontWeight: active ? 600 : 500,
                                        color: active ? 'var(--mp-blue)' : 'var(--text-2)',
                                        boxShadow: active ? 'var(--shadow-card)' : 'none',
                                        cursor: 'pointer',
                                        fontFamily: 'inherit',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4,
                                    }}
                                >
                                    {l}
                                    <span className="mp-num" style={{ color: 'var(--text-3)' }}>{n}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {list.length === 0 && <EmptyState onBrowse={onBrowse} />}

                {list.length > 0 && filtered.length === 0 && (
                    <div style={{
                        padding: 50,
                        textAlign: 'center',
                        color: 'var(--text-3)',
                        fontSize: 14,
                    }}>
                        No applications with this status.
                    </div>
                )}

                {filtered.map((a, i) => (
                    <ApplicationRow
                        key={a.id}
                        application={a}
                        isLast={i === filtered.length - 1}
                        onView={() => onView(a.eventId)}
                    />
                ))}
            </div>
        </>
    );
}

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

function ApplicationRow({ application: a, isLast, onView }) {
    const style = STATUS_STYLE[a.status] || STATUS_STYLE.PENDING;
    const amount = ngn(a.proposedAmount);
    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: 16,
            alignItems: 'flex-start',
            padding: '18px 20px',
            borderBottom: isLast ? 0 : '1px solid var(--border)',
        }}>
            <div style={{ minWidth: 0 }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 6,
                    flexWrap: 'wrap',
                }}>
                    <button
                        onClick={onView}
                        style={{
                            background: 'none',
                            border: 0,
                            padding: 0,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            fontWeight: 600,
                            color: 'var(--mp-blue)',
                            fontSize: 15,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                        }}
                    >
                        {a.eventTitle}
                        <Icons.arrowR size={13} style={{ opacity: 0.7 }} />
                    </button>
                    <span style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        background: 'var(--surface-subtle)',
                        borderRadius: 6,
                        color: 'var(--text-2)',
                        fontWeight: 600,
                    }}>
                        {a.serviceType}
                    </span>
                    <span style={{
                        padding: '2px 9px',
                        background: style.bg,
                        color: style.fg,
                        fontSize: 11,
                        fontWeight: 600,
                        borderRadius: 99,
                    }}>
                        {style.label}
                    </span>
                </div>

                {/* Event timing (new fields from backend) */}
                {(a.eventStartTime || a.eventVenue) && (
                    <div style={{
                        display: 'flex',
                        gap: 14,
                        fontSize: 13,
                        color: 'var(--text-2)',
                        marginBottom: 6,
                        flexWrap: 'wrap',
                    }}>
                        {a.eventStartTime && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <Icons.calendar size={12} style={{ color: 'var(--text-3)' }} />
                                {formatEventDate(a.eventStartTime)}
                            </span>
                        )}
                        {a.eventVenue && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <Icons.pin size={12} style={{ color: 'var(--text-3)' }} />
                                {a.eventVenue}
                            </span>
                        )}
                    </div>
                )}

                {a.description && (
                    <p className="body-sm" style={{
                        margin: '0 0 8px',
                        color: 'var(--text-2)',
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.5,
                    }}>
                        {a.description}
                    </p>
                )}

                <div style={{
                    display: 'flex',
                    gap: 14,
                    fontSize: 12,
                    color: 'var(--text-3)',
                    flexWrap: 'wrap',
                }}>
                    {amount && (
                        <span className="mp-num" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Icons.wallet size={12} />
                            <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{amount}</span>
                            <span>proposed</span>
                        </span>
                    )}
                    <span>· Applied {formatTimestamp(a.createdAt)}</span>
                    {a.reviewedAt && (
                        <span>· Reviewed {formatTimestamp(a.reviewedAt)}</span>
                    )}
                </div>
            </div>
        </div>
    );
}

function EmptyState({ onBrowse }) {
    return (
        <div style={{ textAlign: 'center', padding: 50 }}>
            <div style={{
                width: 52, height: 52, borderRadius: 99,
                margin: '0 auto 14px',
                background: 'var(--surface-subtle)',
                display: 'grid', placeItems: 'center',
                color: 'var(--text-3)',
            }}>
                <Icons.inbox size={20} />
            </div>
            <div className="mp-h4" style={{ color: 'var(--text-1)', margin: 0 }}>
                You haven&apos;t applied yet
            </div>
            <p className="body-sm" style={{ color: 'var(--text-2)', marginTop: 6 }}>
                Browse open events and pitch the ones that match what you do.
            </p>
            <Button
                variant="primary"
                size="md"
                icon={<Icons.search size={14} />}
                onClick={onBrowse}
                style={{ marginTop: 16 }}
            >
                Find opportunities
            </Button>
        </div>
    );
}

function Skeleton() {
    const row = {
        height: 96,
        background: 'var(--surface-subtle)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        marginBottom: 10,
        animation: 'mp-flash 1.6s ease-in-out infinite',
    };
    return (
        <div>
            <div style={row} />
            <div style={{ ...row, opacity: 0.7 }} />
            <div style={{ ...row, opacity: 0.4 }} />
        </div>
    );
}
