import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useDispatch } from 'react-redux';
import { logout } from '@/features/auth/authSlice';
import { useGetOrganizerEventsQuery } from '../organizerApi';
import {
    useSubmitEventMutation,
    useWithdrawEventMutation,
    useDeleteEventMutation,
} from '@/features/events/eventsApi';
import TopNav from '@/components/ui/TopNav';
import Button from '@/components/ui/Button';
import { RoleBadge, StatusBadge } from '@/components/ui/Badge';
import { Icons } from '@/components/ui/Icon';
import { formatEventDate } from '@/utils/dateFormat';

/**
 * "My events" — the organiser's home for every event they've submitted.
 * Drafts, pending review, live, and past, all in one place.
 *
 * Status semantics (from the backend):
 *   DRAFT             — newly created, can be edited / submitted / deleted
 *   PENDING_APPROVAL  — awaiting admin review; can be withdrawn
 *   PUBLISHED         — live; can be viewed publicly + managed
 *   CANCELLED         — admin-cancelled
 * "Rejected" isn't a real status — it's DRAFT + rejectionReason populated
 * after an admin reject. We surface it as its own filter tab.
 */
export default function MyEventsPage() {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const { data: events = [], isLoading, isError, error, refetch } = useGetOrganizerEventsQuery();

    const isAuthError = isError && (error?.status === 401 || error?.status === 403);
    useEffect(() => {
        if (isAuthError) {
            dispatch(logout());
            navigate('/login', { replace: true });
        }
    }, [isAuthError, dispatch, navigate]);

    const [submitEvent, submitState] = useSubmitEventMutation();
    const [withdrawEvent, withdrawState] = useWithdrawEventMutation();
    const [deleteEvent, deleteState] = useDeleteEventMutation();

    const [filter, setFilter] = useState('ALL');
    const [search, setSearch] = useState('');
    const [pendingDelete, setPendingDelete] = useState(null);
    const [actionError, setActionError] = useState('');

    // Derive everything the screenshot needs from the events list — no
    // separate /stats round-trip required.
    const buckets = useMemo(() => classify(events), [events]);

    const filtered = useMemo(() => {
        const base = filter === 'ALL' ? events : buckets[filter] || [];
        const q = search.trim().toLowerCase();
        if (!q) return base;
        return base.filter(e =>
            (e.title || '').toLowerCase().includes(q) ||
            (e.venue || '').toLowerCase().includes(q));
    }, [events, buckets, filter, search]);

    async function handleSubmit(event) {
        setActionError('');
        try { await submitEvent(event.id).unwrap(); }
        catch (err) { setActionError(err?.data?.message || 'Could not submit. Please try again.'); }
    }

    async function handleWithdraw(event) {
        setActionError('');
        try { await withdrawEvent(event.id).unwrap(); }
        catch (err) { setActionError(err?.data?.message || 'Could not withdraw. Please try again.'); }
    }

    async function handleDelete() {
        if (!pendingDelete) return;
        setActionError('');
        try {
            await deleteEvent(pendingDelete.id).unwrap();
            setPendingDelete(null);
        } catch (err) {
            setActionError(err?.data?.message || 'Could not delete. Please try again.');
        }
    }

    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            <TopNav />
            <div style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 24px 80px' }}>

                {/* ── Header ───────────────────────────────────────────── */}
                <div style={{
                    display: 'flex', flexWrap: 'wrap', gap: 16,
                    justifyContent: 'space-between', alignItems: 'flex-start',
                    marginBottom: 28,
                }}>
                    <div>
                        <div style={{ marginBottom: 10 }}>
                            <RoleBadge role="ORGANIZER" size="sm" />
                        </div>
                        <h1 className="mp-h1" style={{ margin: 0, color: 'var(--text-1)' }}>
                            My events
                        </h1>
                        <p className="body" style={{ margin: '6px 0 0', color: 'var(--text-2)' }}>
                            Everything you've submitted — drafts, pending review, live, and past.
                        </p>
                    </div>
                    <Button variant="primary" size="md" icon={<Icons.plus size={15} />}
                        onClick={() => navigate('/events/new')}>
                        Create event
                    </Button>
                </div>

                {/* ── Stats ────────────────────────────────────────────── */}
                <div className="mp-stat-grid" style={{
                    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 16, marginBottom: 28,
                }}>
                    <Tile
                        label="Total submissions"
                        value={isLoading ? '—' : events.length}
                        icon={<Icons.spark size={16} />}
                    />
                    <Tile
                        label="Live now"
                        value={isLoading ? '—' : buckets.PUBLISHED.length}
                        sub={!isLoading && buckets.PUBLISHED.length > 0
                            ? `${sumSold(buckets.PUBLISHED).toLocaleString()} tickets sold`
                            : null}
                    />
                    <Tile
                        label="Awaiting review"
                        value={isLoading ? '—' : buckets.PENDING_APPROVAL.length}
                        icon={<Icons.inbox size={16} />}
                        accent="warning"
                        onClick={() => setFilter('PENDING_APPROVAL')}
                    />
                    <Tile
                        label="Needs your action"
                        value={isLoading ? '—' : buckets.DRAFT.length + buckets.REJECTED.length}
                        sub={!isLoading && (buckets.DRAFT.length + buckets.REJECTED.length > 0)
                            ? actionSubLabel(buckets.DRAFT.length, buckets.REJECTED.length)
                            : null}
                    />
                </div>

                {actionError && (
                    <div role="alert" style={{
                        margin: '0 0 16px', padding: '10px 16px',
                        background: 'var(--error-bg)', color: 'var(--error)',
                        borderRadius: 10, fontSize: 14,
                    }}>
                        {actionError}
                    </div>
                )}

                {/* ── Filter tabs ──────────────────────────────────────── */}
                <FilterBar
                    filter={filter}
                    onChange={setFilter}
                    counts={{
                        ALL: events.length,
                        DRAFT: buckets.DRAFT.length,
                        PENDING_APPROVAL: buckets.PENDING_APPROVAL.length,
                        PUBLISHED: buckets.PUBLISHED.length,
                        REJECTED: buckets.REJECTED.length,
                        CANCELLED: buckets.CANCELLED.length,
                    }}
                />

                {/* ── Search ───────────────────────────────────────────── */}
                <div style={{ position: 'relative', marginBottom: 16 }}>
                    <Icons.search size={16}
                        style={{ position: 'absolute', left: 14, top: 14, color: 'var(--text-3)' }} />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by title or venue"
                        aria-label="Search events"
                        style={{
                            width: '100%', height: 44, padding: '0 14px 0 40px',
                            border: '1px solid var(--border)', borderRadius: 10,
                            background: 'white', fontSize: 14, color: 'var(--text-1)',
                        }}
                    />
                </div>

                {/* ── List ─────────────────────────────────────────────── */}
                {isLoading && <SkeletonList />}

                {isError && !isAuthError && (
                    <div style={{ padding: 40, textAlign: 'center' }}>
                        <Icons.alert size={28} style={{ color: 'var(--error)' }} />
                        <p className="body-sm" style={{ marginTop: 8, color: 'var(--text-2)' }}>
                            Could not load your events.
                        </p>
                        <Button variant="secondary" size="sm" onClick={refetch} style={{ marginTop: 12 }}>
                            Retry
                        </Button>
                    </div>
                )}

                {!isLoading && !isError && filtered.length === 0 && (
                    <EmptyState filter={filter} onCreate={() => navigate('/events/new')} />
                )}

                {!isLoading && !isError && filtered.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {filtered.map((event) => (
                            <EventCard
                                key={event.id}
                                event={event}
                                onView={(id) => navigate(`/organiser/events/${id}`)}
                                onPreview={(id) => navigate(`/events/${id}`)}
                                onEdit={(id) => navigate(`/events/${id}/edit`)}
                                onSubmit={handleSubmit}
                                onWithdraw={handleWithdraw}
                                onDelete={setPendingDelete}
                                busy={{
                                    submit: submitState.isLoading,
                                    withdraw: withdrawState.isLoading,
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>

            <DeleteDialog
                event={pendingDelete}
                onConfirm={handleDelete}
                onDismiss={() => setPendingDelete(null)}
                loading={deleteState.isLoading}
            />
        </div>
    );
}

/* ───────────────────────────── helpers ───────────────────────────── */

/**
 * Bucket the organiser's events by the design's status categories.
 * REJECTED is derived (DRAFT + rejectionReason) — the backend has no
 * REJECTED status, but the design surfaces them as their own filter.
 */
function classify(events) {
    const buckets = { DRAFT: [], PENDING_APPROVAL: [], PUBLISHED: [], REJECTED: [], CANCELLED: [] };
    for (const e of events) {
        if (e.status === 'DRAFT' && e.rejectionReason) {
            buckets.REJECTED.push(e);
        } else if (buckets[e.status]) {
            buckets[e.status].push(e);
        }
    }
    return buckets;
}

function sumSold(events) {
    return events.reduce((s, e) => s + (e.soldCount ?? 0), 0);
}

function actionSubLabel(draftCount, rejectedCount) {
    const parts = [];
    if (draftCount > 0) parts.push(`${draftCount} draft${draftCount > 1 ? 's' : ''}`);
    if (rejectedCount > 0) parts.push(`${rejectedCount} rejected`);
    return parts.join(' · ');
}

function sellingPace(event) {
    const sold = event.soldCount ?? 0;
    const total = event.totalCapacity ?? 0;
    if (!total || event.status !== 'PUBLISHED') return null;
    const ratio = sold / total;
    if (ratio >= 0.95) return { label: 'Almost sold out', color: 'var(--error)' };
    if (ratio >= 0.75) return { label: 'Selling fast', color: '#F59E0B' };
    return null;
}

/* ───────────────────────────── tiles ────────────────────────────── */

function Tile({ label, value, icon, sub, accent, onClick }) {
    const iconBg = accent === 'warning' ? '#FFF8E1' : 'var(--surface-subtle)';
    const iconFg = accent === 'warning' ? '#F59E0B' : 'var(--text-2)';
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={!onClick}
            style={{
                background: 'white', border: '1px solid var(--border)',
                borderRadius: 12, padding: 20, textAlign: 'left',
                cursor: onClick ? 'pointer' : 'default',
                boxShadow: 'var(--shadow-card)',
                transition: 'border-color 0.15s, transform 0.15s',
            }}
            onMouseOver={(e) => { if (onClick) e.currentTarget.style.borderColor = 'var(--mp-blue)'; }}
            onMouseOut={(e) => { if (onClick) e.currentTarget.style.borderColor = 'var(--border)'; }}
        >
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 10,
            }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)' }}>{label}</span>
                {icon && (
                    <span style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: iconBg, color: iconFg,
                        display: 'inline-grid', placeItems: 'center',
                    }}>
                        {icon}
                    </span>
                )}
            </div>
            <div className="mp-num" style={{
                fontSize: 32, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1,
            }}>
                {value}
            </div>
            {sub && (
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>
                    {sub}
                </div>
            )}
        </button>
    );
}

/* ─────────────────────────── filter bar ──────────────────────────── */

function FilterBar({ filter, onChange, counts }) {
    const tabs = [
        { id: 'ALL', label: 'All' },
        { id: 'DRAFT', label: 'Drafts' },
        { id: 'PENDING_APPROVAL', label: 'Pending' },
        { id: 'PUBLISHED', label: 'Published' },
        { id: 'REJECTED', label: 'Rejected' },
        { id: 'CANCELLED', label: 'Cancelled' },
    ];
    return (
        <div className="mp-tab-scroll" role="tablist" style={{
            display: 'flex', gap: 24, marginBottom: 16,
            borderBottom: '1px solid var(--border)',
        }}>
            {tabs.map(({ id, label }) => {
                const active = filter === id;
                const count = counts[id] ?? 0;
                return (
                    <button
                        key={id}
                        role="tab"
                        aria-selected={active}
                        onClick={() => onChange(id)}
                        style={{
                            background: 'transparent', border: 0,
                            padding: '12px 0', cursor: 'pointer',
                            color: active ? 'var(--mp-blue)' : 'var(--text-2)',
                            borderBottom: `2px solid ${active ? 'var(--mp-blue)' : 'transparent'}`,
                            marginBottom: -1,
                            fontSize: 14, fontWeight: active ? 600 : 500,
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                        }}
                    >
                        {label}
                        <span style={{
                            fontSize: 12, fontWeight: 600,
                            padding: '2px 7px', borderRadius: 99,
                            background: active ? 'rgba(37,99,235,0.1)' : 'var(--surface-subtle)',
                            color: active ? 'var(--mp-blue)' : 'var(--text-3)',
                        }}>{count}</span>
                    </button>
                );
            })}
        </div>
    );
}

/* ───────────────────────────── event card ───────────────────────── */

function EventCard({ event, onView, onPreview, onEdit, onSubmit, onWithdraw, onDelete, busy }) {
    const { month, day } = splitDate(event.startTime);
    const sold = event.soldCount ?? 0;
    const total = event.totalCapacity ?? 0;
    const isPublished = event.status === 'PUBLISHED';
    const isPending = event.status === 'PENDING_APPROVAL';
    const isDraft = event.status === 'DRAFT';
    const isRejected = isDraft && !!event.rejectionReason;
    const pace = sellingPace(event);
    const dateLabel = formatEventDate(event.startTime);

    return (
        <article style={{
            background: 'white', border: '1px solid var(--border)',
            borderRadius: 12, padding: '16px 20px',
            boxShadow: 'var(--shadow-card)',
            display: 'grid', gridTemplateColumns: '72px 1fr auto', gap: 20,
            alignItems: 'center',
        }}>
            {/* Date pill */}
            <div style={{
                textAlign: 'center', borderRight: '1px solid var(--border)', paddingRight: 16,
            }}>
                <div style={{
                    fontSize: 11, fontWeight: 700, color: 'var(--text-3)',
                    letterSpacing: '0.06em',
                }}>{month}</div>
                <div className="mp-num" style={{
                    fontSize: 26, fontWeight: 700, color: 'var(--text-1)',
                    lineHeight: 1.1, marginTop: 2,
                }}>{day}</div>
            </div>

            {/* Body */}
            <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <StatusBadge status={event.status} size="sm" />
                    {pace && (
                        <span style={{
                            fontSize: 12, fontWeight: 600, color: pace.color,
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                        }}>
                            <span style={{
                                width: 6, height: 6, borderRadius: 99, background: pace.color,
                            }} />
                            {pace.label}
                        </span>
                    )}
                    {isRejected && (
                        <span style={{
                            fontSize: 11, fontWeight: 700,
                            color: '#F59E0B', letterSpacing: '0.04em',
                        }}>
                            NEEDS REVISION
                        </span>
                    )}
                </div>
                <h3 style={{
                    margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text-1)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{event.title}</h3>
                <div style={{
                    fontSize: 13, color: 'var(--text-2)', marginTop: 4,
                    display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
                }}>
                    <span>{event.venue}</span>
                    <span style={{ color: 'var(--text-3)' }}>·</span>
                    <span>{dateLabel}</span>
                </div>
                {isRejected && (
                    <div style={{
                        marginTop: 8, padding: '8px 12px',
                        background: '#FFF8E1', borderRadius: 8,
                        fontSize: 12, color: '#92400E',
                        display: 'inline-flex', alignItems: 'flex-start', gap: 6,
                    }}>
                        <Icons.alert size={12} style={{ flexShrink: 0, marginTop: 2, color: '#F59E0B' }} />
                        <span><strong>Rejected — </strong>{event.rejectionReason}</span>
                    </div>
                )}
            </div>

            {/* Right column — capacity bar (live) or status text + actions */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 16,
                justifyContent: 'flex-end',
            }}>
                {isPublished && total > 0 && (
                    <CapacityBar sold={sold} total={total} />
                )}
                {isPending && (
                    <span style={{
                        fontSize: 13, color: 'var(--text-3)',
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                    }}>
                        <span style={{ width: 6, height: 6, borderRadius: 99, background: '#F59E0B' }} />
                        In admin queue
                    </span>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                    {isPublished && (
                        <>
                            <Button size="sm" variant="secondary" onClick={() => onPreview(event.id)}>
                                Public page
                            </Button>
                            <Button size="sm" variant="primary" onClick={() => onView(event.id)}>
                                Manage →
                            </Button>
                        </>
                    )}
                    {isPending && (
                        <>
                            <Button size="sm" variant="ghost"
                                onClick={() => onWithdraw(event)} disabled={busy.withdraw}>
                                {busy.withdraw ? 'Withdrawing…' : 'Withdraw'}
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => onPreview(event.id)}>
                                Preview
                            </Button>
                        </>
                    )}
                    {isDraft && (
                        <>
                            <Button size="sm" variant="secondary" onClick={() => onEdit(event.id)}>
                                Edit
                            </Button>
                            <Button size="sm" variant="primary"
                                onClick={() => onSubmit(event)} disabled={busy.submit}>
                                {busy.submit ? 'Submitting…' : 'Submit'}
                            </Button>
                            <button
                                onClick={() => onDelete(event)}
                                aria-label="Delete event"
                                style={{
                                    width: 32, height: 32, borderRadius: 8,
                                    border: '1px solid var(--border)', background: 'white',
                                    cursor: 'pointer', display: 'grid', placeItems: 'center',
                                    color: 'var(--error)',
                                }}
                            >
                                <Icons.x size={14} />
                            </button>
                        </>
                    )}
                    {event.status === 'CANCELLED' && (
                        <Button size="sm" variant="secondary" onClick={() => onPreview(event.id)}>
                            View
                        </Button>
                    )}
                </div>
            </div>
        </article>
    );
}

function CapacityBar({ sold, total }) {
    const pct = Math.min(100, Math.round((sold / total) * 100));
    return (
        <div style={{ width: 220 }}>
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                fontSize: 12, marginBottom: 4,
            }}>
                <span className="mp-num" style={{ fontWeight: 600, color: 'var(--text-1)' }}>
                    {sold.toLocaleString()} / {total.toLocaleString()}
                </span>
                <span style={{ color: 'var(--text-3)' }}>{pct}%</span>
            </div>
            <div style={{
                height: 6, background: 'var(--surface-subtle)', borderRadius: 99, overflow: 'hidden',
            }}>
                <div style={{
                    width: `${pct}%`, height: '100%',
                    background: 'var(--mp-blue)',
                    transition: 'width 0.3s',
                }} />
            </div>
        </div>
    );
}

/* ─────────────────────────── misc ───────────────────────────────── */

function splitDate(iso) {
    if (!iso) return { month: '—', day: '—' };
    const d = new Date(iso);
    return {
        month: d.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
        day: String(d.getDate()).padStart(2, '0'),
    };
}

function SkeletonList() {
    const row = {
        height: 88, background: 'white', border: '1px solid var(--border)',
        borderRadius: 12, animation: 'mp-flash 1.6s ease-in-out infinite',
    };
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={row} /><div style={{ ...row, opacity: 0.7 }} /><div style={{ ...row, opacity: 0.4 }} />
        </div>
    );
}

function EmptyState({ filter, onCreate }) {
    const isAll = filter === 'ALL';
    return (
        <div style={{
            background: 'white', border: '1px solid var(--border)',
            borderRadius: 12, padding: 56, textAlign: 'center',
        }}>
            <Icons.calendar size={32} style={{ color: 'var(--text-3)' }} />
            <p className="mp-h4" style={{ margin: '12px 0 4px', color: 'var(--text-1)' }}>
                {isAll ? 'No events yet' : `No ${friendlyStatus(filter)} events`}
            </p>
            <p className="body-sm" style={{ color: 'var(--text-2)', margin: '0 0 20px' }}>
                {isAll
                    ? 'Create your first event to get started.'
                    : 'Events with this status will appear here.'}
            </p>
            {isAll && (
                <Button variant="primary" size="sm" icon={<Icons.plus size={14} />} onClick={onCreate}>
                    Create event
                </Button>
            )}
        </div>
    );
}

function friendlyStatus(id) {
    return {
        DRAFT: 'draft',
        PENDING_APPROVAL: 'pending',
        PUBLISHED: 'published',
        REJECTED: 'rejected',
        CANCELLED: 'cancelled',
    }[id] ?? id.toLowerCase();
}

/* ───────────────────────── delete confirmation ──────────────────── */

function DeleteDialog({ event, onConfirm, onDismiss, loading }) {
    if (!event) return null;
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
                    <strong>{event.title}</strong> will be permanently deleted. This cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <Button variant="ghost" size="md" onClick={onDismiss} disabled={loading}>Cancel</Button>
                    <Button variant="destructive" size="md" onClick={onConfirm} disabled={loading}>
                        {loading ? 'Deleting…' : 'Delete'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
