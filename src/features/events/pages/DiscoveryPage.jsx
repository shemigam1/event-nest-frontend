import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useSelector } from 'react-redux';
import { useGetPublishedEventsQuery } from '../eventsApi';
import { selectIsAuthenticated } from '@/features/auth/authSlice';
import { formatEventDate, isThisMonth } from '@/utils/dateFormat';
import EventCard from '@/components/ui/EventCard';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import TopNav from '@/components/ui/TopNav';
import { Icons } from '@/components/ui/Icon';

/* ── Filter tab strip ── */
const FILTERS = [
    { id: 'all',         label: 'All' },
    { id: 'this-month',  label: 'This month' },
    { id: 'free',        label: 'Free' },
    { id: 'sellingfast', label: 'Selling fast' },
];

function FilterTabs({ active, onChange }) {
    return (
        <div data-testid="filter-tabs" className="mp-tab-scroll" style={{
            display: 'flex', gap: 4, padding: 4,
            background: 'var(--surface-subtle)',
            borderRadius: 12, border: '1px solid var(--border)',
            maxWidth: '100%',
        }}>
            {FILTERS.map(({ id, label }) => (
                <button
                    key={id}
                    onClick={() => onChange(id)}
                    style={{
                        background: active === id ? 'var(--surface-elevated)' : 'transparent',
                        border: 0, padding: '8px 14px', borderRadius: 8,
                        fontSize: 14,
                        fontWeight: active === id ? 600 : 500,
                        color: active === id ? 'var(--mp-blue)' : 'var(--text-2)',
                        boxShadow: active === id ? 'var(--shadow-card)' : 'none',
                        cursor: 'pointer',
                        transition: 'all var(--motion-fast)',
                    }}
                >
                    {label}
                </button>
            ))}
        </div>
    );
}

/* ── Empty state ── */
function EmptyState({ hasQuery }) {
    return (
        <div style={{ textAlign: 'center', padding: '80px 24px', color: 'var(--text-3)' }}>
            <Icons.search size={32} />
            <div className="mp-h4" style={{ color: 'var(--text-1)', marginTop: 12 }}>
                {hasQuery ? 'No events match.' : 'No events yet.'}
            </div>
            <div className="body-sm" style={{ marginTop: 4 }}>
                {hasQuery ? 'Try a different keyword or clear the filters.' : 'Check back soon.'}
            </div>
        </div>
    );
}

/* ── Error state ── */
function ErrorState({ onRetry }) {
    return (
        <div style={{ textAlign: 'center', padding: '80px 24px', color: 'var(--text-3)' }}>
            <Icons.alert size={32} style={{ color: 'var(--error)' }} />
            <div className="mp-h4" style={{ color: 'var(--text-1)', marginTop: 12 }}>
                Could not load events
            </div>
            <div className="body-sm" style={{ marginTop: 4, marginBottom: 20 }}>
                Check your connection and try again.
            </div>
            <Button variant="secondary" size="sm" onClick={onRetry}>Retry</Button>
        </div>
    );
}

/* ── Skeleton card ── */
function SkeletonCard() {
    const pulse = { animation: 'mp-flash 1.6s ease-in-out infinite', borderRadius: 8, background: 'var(--surface-subtle)' };
    return (
        <div style={{
            background: 'var(--surface-elevated)', border: '1px solid var(--border)',
            borderRadius: 12, overflow: 'hidden',
        }}>
            <div style={{ height: 160, background: 'var(--surface-subtle)' }} />
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ ...pulse, height: 12, width: '60%' }} />
                <div style={{ ...pulse, height: 18, width: '80%' }} />
                <div style={{ ...pulse, height: 12, width: '50%' }} />
                <div style={{ ...pulse, height: 12, width: '40%' }} />
            </div>
        </div>
    );
}

/* ── Adapter: EventResponse → EventCard shape ── */
function adaptEvent(event) {
    return {
        ...event,
        dateLabel: formatEventDate(event.startTime),
        venue: event.venue || event.venueName || '',
        tiers: event.tiers ?? [],
    };
}

/* ── Compute "hotness" score for sorting Selling Fast ── */
function hotnessScore(event) {
    if (!event.tiers?.length) return 0;
    const sold  = event.tiers.reduce((s, t) => s + (t.sold ?? 0), 0);
    const total = event.tiers.reduce((s, t) => s + (t.total ?? t.totalCapacity ?? 0), 0);
    if (total === 0) return 0;
    return sold / total;
}

/* ── Client-side filter predicate ── */
function applyFilter(event, filter, query) {
    if (query) {
        const q = query.toLowerCase();
        const matchesTitle = (event.title ?? '').toLowerCase().includes(q);
        const matchesVenue = (event.venue ?? '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesVenue) return false;
    }

    if (filter === 'this-month') return isThisMonth(event.startTime);

    if (filter === 'free') {
        if (!event.tiers?.length) return true;
        return event.tiers.some(t => t.price === 0);
    }

    if (filter === 'sellingfast') {
        return hotnessScore(event) >= 0.6;
    }

    return true;
}

/* ══════════════════════════════════════════
   DISCOVERY / HOME PAGE
   The default landing for signed-in users.
   Search + filter + Selling Fast strip + grid + Create CTA.
══════════════════════════════════════════ */
export default function DiscoveryPage() {
    const navigate = useNavigate();
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const [query,  setQuery]  = useState('');
    const [filter, setFilter] = useState('all');

    const { data: rawEvents, isLoading, isError, refetch } = useGetPublishedEventsQuery();
    const { data: rawTrending } = useGetPublishedEventsQuery({ sort: 'trending' });

    const events = useMemo(
        () => (rawEvents ?? []).map(adaptEvent),
        [rawEvents]
    );

    const filtered = useMemo(
        () => events.filter(e => applyFilter(e, filter, query)),
        [events, filter, query]
    );

    // Backend ranks by featured-first then view count. We surface the top 3
    // when the user isn't searching or sub-filtering.
    const trending = useMemo(() => {
        if (query) return [];
        return (rawTrending ?? []).slice(0, 3).map(adaptEvent);
    }, [rawTrending, query]);

    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            {!isAuthenticated && <TopNav showBrowse={false} />}

            {/* ── Header strip ── */}
            <div style={{ background: 'var(--surface-elevated)', borderBottom: '1px solid var(--border)' }}>
                <div className="mp-page-wrap" style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px 24px' }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        flexWrap: 'wrap',
                        gap: 16,
                    }}>
                        <div style={{ minWidth: 0, flex: '1 1 auto' }}>
                            <h1 className="mp-h1" style={{ margin: 0, color: 'var(--text-1)' }}>
                                Browse events
                            </h1>
                            <p className="body" style={{ margin: '8px 0 0', color: 'var(--text-2)' }}>
                                {isLoading
                                    ? 'Loading events…'
                                    : `${filtered.length} event${filtered.length !== 1 ? 's' : ''} available · capacity updates in real time`}
                            </p>
                        </div>

                        {/* Create your own event CTA — visible to all, auth-gates on click */}
                        <Button
                            variant="primary"
                            size="md"
                            onClick={() => isAuthenticated
                                ? navigate('/events/new')
                                : navigate('/login', { state: { from: '/events/new' } })
                            }
                            iconLeft={<Icons.plus size={16} />}
                        >
                            Create your own event
                        </Button>
                    </div>

                    <div style={{
                        display: 'flex', gap: 12, marginTop: 24,
                        alignItems: 'center', flexWrap: 'wrap',
                    }}>
                        <div style={{ flex: '1 1 320px', maxWidth: 480 }}>
                            <Input
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder="Search events or venues"
                                icon={<Icons.search size={18} />}
                                aria-label="Search events"
                            />
                        </div>
                        <FilterTabs active={filter} onChange={setFilter} />
                    </div>
                </div>
            </div>

            {/* ── Main content ── */}
            <div className="mp-page-wrap" style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px 64px' }}>
                {/* Trending strip — only when not searching and we have results */}
                {!isError && !isLoading && trending.length > 0 && filter === 'all' && (
                    <TrendingStrip
                        events={trending}
                        onClick={(e) => navigate(`/events/${e.slug ?? e.id}`)}
                    />
                )}

                {/* Main grid heading — only shown when trending appears above */}
                {trending.length > 0 && filter === 'all' && !isLoading && !isError && (
                    <h2 className="mp-h3" style={{
                        margin: '0 0 16px',
                        color: 'var(--text-1)',
                    }}>
                        All events
                    </h2>
                )}

                {isError ? (
                    <ErrorState onRetry={refetch} />
                ) : isLoading ? (
                    <div className="mp-events-grid" style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                        gap: 20,
                    }}>
                        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                ) : filtered.length === 0 ? (
                    <EmptyState hasQuery={Boolean(query || filter !== 'all')} />
                ) : (
                    <div className="mp-events-grid" style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                        gap: 20,
                    }}>
                        {filtered.map(event => (
                            <EventCard
                                key={event.id}
                                event={event}
                                onClick={() => navigate(`/events/${event.slug ?? event.id}`)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ── Trending strip — horizontal-scroll row above the main grid ──────────
   Backend ranks by featured-first then view count. Up to 3 cards visible
   on desktop; on narrower viewports the row scrolls horizontally so all
   trending events stay reachable.
   ───────────────────────────────────────────────────────────────────────── */
function TrendingStrip({ events, onClick }) {
    return (
        <section style={{ marginBottom: 32 }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 16,
            }}>
                <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 28, height: 28, borderRadius: 8,
                    background: 'var(--mp-blue-50, #EAF1FE)',
                    color: 'var(--mp-blue)',
                }}>
                    <Icons.spark size={16} />
                </span>
                <h2 className="mp-h3" style={{ margin: 0, color: 'var(--text-1)' }}>
                    Trending now
                </h2>
                <span style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: 'var(--text-3)',
                    marginLeft: 4,
                }}>
                    What everyone&apos;s booking
                </span>
            </div>

            <div
                className="mp-tab-scroll"
                style={{
                    display: 'grid',
                    gridAutoFlow: 'column',
                    gridAutoColumns: 'minmax(280px, 1fr)',
                    gap: 16,
                    overflowX: 'auto',
                    scrollSnapType: 'x mandatory',
                    paddingBottom: 4,
                }}
            >
                {events.map((event) => (
                    <div key={event.id} style={{ scrollSnapAlign: 'start', minWidth: 0 }}>
                        <EventCard event={event} onClick={() => onClick(event)} />
                    </div>
                ))}
            </div>
        </section>
    );
}
