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
                        background: active === id ? 'white' : 'transparent',
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

/* ── Skeleton card (loading placeholder) ── */
function SkeletonCard() {
    const pulse = { animation: 'mp-flash 1.6s ease-in-out infinite', borderRadius: 8, background: 'var(--surface-subtle)' };
    return (
        <div style={{
            background: 'white', border: '1px solid var(--border)',
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
        tiers: event.tiers ?? [],
    };
}

/* ── Client-side filter predicate ── */
function applyFilter(event, filter, query) {
    if (query) {
        const q = query.toLowerCase();
        const matchesTitle = event.title.toLowerCase().includes(q);
        const matchesVenue = event.venue.toLowerCase().includes(q);
        if (!matchesTitle && !matchesVenue) return false;
    }

    if (filter === 'this-month') return isThisMonth(event.startTime);

    if (filter === 'free') {
        if (!event.tiers?.length) return true; // no tier data — don't exclude
        return event.tiers.some(t => t.price === 0);
    }

    if (filter === 'sellingfast') {
        if (!event.tiers?.length) return true; // no tier data — don't exclude
        const sold  = event.tiers.reduce((s, t) => s + (t.sold ?? 0), 0);
        const total = event.tiers.reduce((s, t) => s + (t.total ?? t.totalCapacity ?? 0), 0);
        return total > 0 && sold / total >= 0.6;
    }

    return true; // 'all'
}

/* ══════════════════════════════════════════
   DISCOVERY PAGE
══════════════════════════════════════════ */
export default function DiscoveryPage() {
    const navigate = useNavigate();
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const [query,  setQuery]  = useState('');
    const [filter, setFilter] = useState('all');

    const { data: rawEvents, isLoading, isError, refetch } = useGetPublishedEventsQuery();

    const events = useMemo(
        () => (rawEvents ?? []).map(adaptEvent),
        [rawEvents]
    );

    const filtered = useMemo(
        () => events.filter(e => applyFilter(e, filter, query)),
        [events, filter, query]
    );

    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            {/* Only render the marketing TopNav when the user is anonymous —
                authenticated users see AppShell's persistent sidebar + TopBar. */}
            {!isAuthenticated && <TopNav showBrowse={false} />}

            {/* ── Header strip ── */}
            <div style={{ background: 'white', borderBottom: '1px solid var(--border)' }}>
                <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px 24px' }}>
                    <h1 className="mp-h1" style={{ margin: 0, color: 'var(--text-1)' }}>
                        Browse events
                    </h1>
                    <p className="body" style={{ margin: '8px 0 0', color: 'var(--text-2)' }}>
                        {isLoading
                            ? 'Loading events…'
                            : `${filtered.length} event${filtered.length !== 1 ? 's' : ''} available · capacity updates in real time`}
                    </p>

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

            {/* ── Grid ── */}
            <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px 64px' }}>
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
                                onClick={() => navigate(`/events/${event.id}`)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
