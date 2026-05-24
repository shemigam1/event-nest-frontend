import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useGetPublishedEventsQuery } from '@/features/events/eventsApi';
import { useGetMyVendorApplicationsQuery } from '@/features/organiser/vendorsApi';
import { formatEventDate } from '@/utils/dateFormat';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Icons } from '@/components/ui/Icon';

export default function VendorOpportunitiesPage() {
    const navigate = useNavigate();
    const events = useGetPublishedEventsQuery();
    const mine = useGetMyVendorApplicationsQuery();

    const [query, setQuery] = useState('');

    const list = useMemo(() => events.data || [], [events.data]);
    const filtered = useMemo(() => {
        if (!query.trim()) return list;
        const q = query.toLowerCase();
        return list.filter((e) => (
            (e.title || '').toLowerCase().includes(q)
            || (e.venue || '').toLowerCase().includes(q)
        ));
    }, [list, query]);

    // eventId → application (the most recent one for that event, if any).
    const appliedByEvent = useMemo(() => {
        const map = {};
        for (const a of (mine.data || [])) {
            if (!map[a.eventId]) map[a.eventId] = a;
        }
        return map;
    }, [mine.data]);

    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            <div className="mp-page-wrap" style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 80px' }}>
                {/* Header */}
                <div style={{ marginBottom: 24 }}>
                    <h1 className="mp-h1" style={{ margin: 0, color: 'var(--text-1)' }}>
                        Vendor opportunities
                    </h1>
                    <p className="body" style={{ margin: '8px 0 0', color: 'var(--text-2)' }}>
                        Browse published events and pitch the ones you&apos;d be great for.
                        Any account can apply — no separate vendor signup.
                    </p>
                </div>

                {/* Hero hint */}
                <div className="mp-grid-stack" style={{
                    background: 'var(--mp-navy)',
                    color: 'white',
                    borderRadius: 12,
                    padding: '18px 22px',
                    marginBottom: 24,
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: 16,
                    alignItems: 'center',
                }}>
                    <div>
                        <div style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: 'rgba(255,255,255,0.65)',
                            letterSpacing: 0.4,
                        }}>
                            HOW IT WORKS
                        </div>
                        <div className="mp-h4" style={{ color: 'white', marginTop: 4 }}>
                            Apply → organiser reviews → get accepted
                        </div>
                        <p style={{
                            fontSize: 13,
                            color: 'rgba(255,255,255,0.75)',
                            marginTop: 6,
                            lineHeight: 1.5,
                        }}>
                            Submit a short pitch with service type, scope, and price.
                            Track every application from <strong style={{ color: 'white' }}>My applications</strong>.
                        </p>
                    </div>
                    <Button
                        variant="onDark"
                        size="md"
                        onClick={() => navigate('/vendor/applications')}
                        iconRight={<Icons.arrowR size={14} />}
                    >
                        My applications
                    </Button>
                </div>

                {/* Search */}
                <div style={{ marginBottom: 20, maxWidth: 420 }}>
                    <Input
                        placeholder="Search by event title or venue"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        icon={<Icons.search size={18} />}
                    />
                </div>

                {events.isLoading && <GridSkeleton />}

                {events.isError && (
                    <div style={{
                        background: 'var(--surface-elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                        padding: 40,
                        textAlign: 'center',
                    }}>
                        <Icons.alert size={28} style={{ color: 'var(--error)' }} />
                        <p className="body-sm" style={{ marginTop: 8, color: 'var(--text-2)' }}>
                            Could not load events.
                        </p>
                        <Button variant="secondary" size="sm" onClick={events.refetch} style={{ marginTop: 12 }}>
                            Retry
                        </Button>
                    </div>
                )}

                {events.isSuccess && list.length === 0 && (
                    <EmptyState />
                )}

                {events.isSuccess && list.length > 0 && filtered.length === 0 && (
                    <div style={{
                        background: 'var(--surface-elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                        padding: 40,
                        textAlign: 'center',
                        color: 'var(--text-3)',
                    }}>
                        No events match &ldquo;{query}&rdquo;.
                    </div>
                )}

                {events.isSuccess && filtered.length > 0 && (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                        gap: 16,
                    }}>
                        {filtered.map((event) => (
                            <OpportunityCard
                                key={event.id}
                                event={event}
                                application={appliedByEvent[event.id]}
                                onApply={() => navigate(`/vendor/apply/${event.id}`)}
                                onView={() => navigate(`/events/${event.id}`)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─── Card ─────────────────────────────────────────── */
function OpportunityCard({ event, application, onApply, onView }) {
    const applied = !!application;

    return (
        <div style={{
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
        }}>
            {event.coverImageUrl ? (
                <div
                    role="img"
                    aria-label={event.title}
                    style={{
                        height: 140,
                        backgroundImage: `url(${event.coverImageUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundColor: 'var(--surface-subtle)',
                    }}
                />
            ) : (
                <div
                    className="mp-placeholder"
                    data-label="EVENT"
                    style={{ height: 140 }}
                    aria-hidden="true"
                />
            )}
            <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                <button
                    onClick={onView}
                    style={{
                        background: 'none',
                        border: 0,
                        padding: 0,
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                    }}
                >
                    <h3 className="mp-h4" style={{ margin: 0, color: 'var(--text-1)' }}>
                        {event.title}
                    </h3>
                </button>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    fontSize: 13,
                    color: 'var(--text-2)',
                }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Icons.calendar size={13} style={{ color: 'var(--text-3)' }} />
                        {formatEventDate(event.startTime)}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Icons.pin size={13} style={{ color: 'var(--text-3)' }} />
                        {event.venue}
                    </span>
                </div>

                <div style={{ marginTop: 'auto', paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                    {applied ? (
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 8,
                            flexWrap: 'wrap',
                        }}>
                            <ApplicationStatusPill status={application.status} />
                            <Button size="sm" variant="ghost" onClick={onView}>
                                View event
                            </Button>
                        </div>
                    ) : (
                        <Button
                            size="sm"
                            variant="primary"
                            onClick={onApply}
                            iconRight={<Icons.arrowR size={13} />}
                            style={{ width: '100%' }}
                        >
                            Apply as vendor
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

function ApplicationStatusPill({ status }) {
    const style = {
        PENDING:  { bg: '#FEF4E2', fg: '#B8770A', label: 'Pending review' },
        ACCEPTED: { bg: '#E6F4EA', fg: '#0F9D58', label: 'Accepted' },
        REJECTED: { bg: '#FBE9E9', fg: '#D62828', label: 'Rejected' },
    }[status] || { bg: '#F5F7FA', fg: '#4A5468', label: status };
    return (
        <span style={{
            padding: '4px 10px',
            background: style.bg,
            color: style.fg,
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 99,
        }}>
            {style.label}
        </span>
    );
}
function EmptyState() {
    return (
        <div style={{
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 60,
            textAlign: 'center',
        }}>
            <div style={{
                width: 56, height: 56, borderRadius: 99,
                margin: '0 auto 14px',
                background: 'var(--surface-subtle)',
                display: 'grid', placeItems: 'center',
                color: 'var(--text-3)',
            }}>
                <Icons.calendar size={22} />
            </div>
            <div className="mp-h4" style={{ color: 'var(--text-1)', margin: 0 }}>
                No published events right now
            </div>
            <p className="body-sm" style={{ color: 'var(--text-2)', marginTop: 6 }}>
                Check back soon — organisers publish events all the time.
            </p>
        </div>
    );
}

function GridSkeleton() {
    const card = {
        height: 280,
        background: 'var(--surface-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        animation: 'mp-flash 1.6s ease-in-out infinite',
    };
    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 16,
        }}>
            <div style={card} />
            <div style={{ ...card, opacity: 0.8 }} />
            <div style={{ ...card, opacity: 0.6 }} />
        </div>
    );
}
