import { useState } from 'react';
import { useNavigate } from 'react-router';
import TopNav from '@/components/ui/TopNav';
import Button from '@/components/ui/Button';
import { RoleBadge, StatusBadge } from '@/components/ui/Badge';
import { Icons } from '@/components/ui/Icon';
import { formatEventDate } from '@/utils/dateFormat';
import {
    useGetAdminEventsQuery,
    useApproveEventMutation,
    useRejectEventMutation,
    useCancelEventMutation,
    useGetAnalyticsQuery,
} from '../adminApi';

const TABS = [
    { id: 'PENDING_APPROVAL', label: 'Approvals' },
    { id: 'PUBLISHED',        label: 'Published' },
    { id: 'CANCELLED',        label: 'Cancelled' },
];

/* "3 hours ago" anchored to a per-render `nowMs` so the value is stable
   for the entire pass and doesn't churn during re-renders. */
function relativeTime(iso, nowMs) {
    if (!iso) return '';
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return '';
    const diffMs = Math.max(0, nowMs - t);
    const m = Math.floor(diffMs / 60_000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
}

function organiserLabel(event) {
    if (event.organizer?.firstName || event.organizer?.lastName) {
        return `${event.organizer.firstName ?? ''} ${event.organizer.lastName ?? ''}`.trim();
    }
    if (event.organizer?.email) return event.organizer.email;
    if (event.createdBy) return `Organiser · ${String(event.createdBy).slice(0, 8)}`;
    return 'Unknown organiser';
}

function tiersSummary(event) {
    const tiers = event.tiers || [];
    if (tiers.length === 0) return '—';
    return tiers
        .map((t) => `${t.name} (${t.totalCapacity ?? 0})`)
        .join(' · ');
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

/* ─── Reject dialog ───────────────────────────────── */
function RejectDialog({ event, onConfirm, onDismiss, loading }) {
    const [reason, setReason] = useState('');
    const [error, setError]   = useState('');
    if (!event) return null;

    function submit() {
        if (!reason.trim()) { setError('A rejection reason is required'); return; }
        onConfirm(reason.trim());
    }

    return (
        <div
            role="dialog"
            aria-label="Reject event"
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
                    width: '100%', maxWidth: 460,
                    background: 'white', borderRadius: 16,
                    boxShadow: 'var(--shadow-modal)', padding: 28,
                }}
            >
                <h3 className="mp-h3" style={{ margin: 0, color: 'var(--text-1)' }}>
                    Reject &ldquo;{event.title}&rdquo;
                </h3>
                <p className="body-sm" style={{ color: 'var(--text-2)', marginTop: 6 }}>
                    Status returns to Draft. The organiser sees your reason and can re-submit.
                </p>
                <div style={{ marginTop: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 6 }}>
                        Reason
                    </div>
                    <textarea
                        value={reason}
                        onChange={(e) => { setReason(e.target.value); setError(''); }}
                        placeholder="e.g. Venue capacity exceeds fire-marshal limits…"
                        aria-label="Rejection reason"
                        rows={4}
                        style={{
                            width: '100%',
                            padding: 12,
                            fontFamily: 'inherit',
                            fontSize: 14,
                            border: `1px solid ${error ? 'var(--error)' : 'var(--border)'}`,
                            borderRadius: 8,
                            resize: 'vertical',
                            color: 'var(--text-1)',
                            boxSizing: 'border-box',
                        }}
                    />
                    {error && (
                        <span style={{ display: 'block', fontSize: 12, color: 'var(--error)', marginTop: 4 }}>
                            {error}
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
                    <Button variant="ghost" size="md" onClick={onDismiss} disabled={loading}>
                        Cancel
                    </Button>
                    <Button variant="destructive" size="md" onClick={submit} disabled={loading}>
                        {loading ? 'Rejecting…' : 'Reject event'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

/* ─── Force-cancel dialog ─────────────────────────── */
function CancelDialog({ event, onConfirm, onDismiss, loading }) {
    if (!event) return null;
    return (
        <div
            role="dialog"
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
                    width: '100%', maxWidth: 420,
                    background: 'white', borderRadius: 16,
                    boxShadow: 'var(--shadow-modal)', padding: 28,
                }}
            >
                <h2 className="mp-h3" style={{ margin: 0, color: 'var(--text-1)' }}>
                    Force cancel event?
                </h2>
                <p className="body-sm" style={{ margin: '8px 0 6px', color: 'var(--text-2)' }}>
                    <strong>{event.title}</strong> will be immediately taken down and marked as cancelled.
                </p>
                <p className="body-sm" style={{ margin: '0 0 24px', color: 'var(--error)' }}>
                    This cannot be undone. Existing ticket holders will be affected.
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <Button variant="ghost" size="md" onClick={onDismiss} disabled={loading}>
                        Cancel
                    </Button>
                    <Button variant="destructive" size="md" onClick={onConfirm} disabled={loading}>
                        {loading ? 'Cancelling…' : 'Force cancel'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

/* ─── Pending-approval card (the big one) ─────────── */
function PendingCard({ event, nowMs, onView, onApprove, onReject, busy }) {
    return (
        <div style={{
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 22,
        }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 24 }}>
                <div style={{ minWidth: 0 }}>
                    <div style={{
                        display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8,
                        flexWrap: 'wrap',
                    }}>
                        <StatusBadge status="PENDING_APPROVAL" />
                        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                            Submitted {relativeTime(event.updatedAt || event.createdAt, nowMs)}
                        </span>
                    </div>

                    <button
                        onClick={() => onView(event.id)}
                        style={{
                            background: 'none', border: 0, padding: 0,
                            margin: 0, cursor: 'pointer',
                            textAlign: 'left',
                            color: 'var(--text-1)',
                            fontFamily: 'inherit',
                        }}
                    >
                        <h3 className="mp-h3" style={{ margin: 0, color: 'var(--text-1)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            {event.title}
                            <Icons.arrowR size={14} style={{ color: 'var(--mp-blue)', opacity: 0.7 }} />
                        </h3>
                    </button>
                    <p className="body-sm" style={{ margin: '4px 0 14px', color: 'var(--text-2)' }}>
                        by <strong style={{ fontWeight: 600 }}>{organiserLabel(event)}</strong>
                        {event.organizer?.email && event.organizer.email !== organiserLabel(event) && (
                            <> · {event.organizer.email}</>
                        )}
                    </p>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 18,
                        marginTop: 14,
                    }}>
                        {[
                            ['Venue', event.venue || '—'],
                            ['Date',  formatEventDate(event.startTime) || '—'],
                            ['Tiers', tiersSummary(event)],
                        ].map(([k, v]) => (
                            <div key={k} style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, letterSpacing: 0.3 }}>
                                    {k}
                                </div>
                                <div style={{
                                    fontSize: 14, color: 'var(--text-1)', marginTop: 4,
                                    overflow: 'hidden', textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {v}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{
                    display: 'flex', flexDirection: 'column',
                    gap: 8, justifyContent: 'center', minWidth: 160,
                }}>
                    <Button
                        variant="primary"
                        icon={<Icons.check size={14} />}
                        onClick={() => onApprove(event.id)}
                        disabled={busy}
                    >
                        Approve
                    </Button>
                    <Button
                        variant="secondary"
                        icon={<Icons.x size={14} />}
                        onClick={() => onReject(event)}
                        disabled={busy}
                    >
                        Reject
                    </Button>
                </div>
            </div>
        </div>
    );
}

/* ─── Compact row (for Published / Cancelled tabs) ──── */
function CompactRow({ event, isLast, filter, nowMs, onView, onCancel, busy }) {
    const isPublished = filter === 'PUBLISHED';

    return (
        <div
            data-testid={`event-row-${event.id}`}
            style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto',
                gap: 16,
                alignItems: 'center',
                padding: '16px 20px',
                borderBottom: isLast ? 0 : '1px solid var(--border)',
            }}
        >
            <button
                onClick={() => onView(event.id)}
                style={{
                    background: 'none', border: 0, padding: 0,
                    textAlign: 'left', cursor: 'pointer',
                    fontFamily: 'inherit',
                    minWidth: 0,
                }}
            >
                <div style={{
                    fontWeight: 600,
                    color: 'var(--mp-blue)',
                    marginBottom: 4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                }}>
                    {event.title}
                    <Icons.arrowR size={13} style={{ color: 'var(--mp-blue)', opacity: 0.6 }} />
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Icons.pin size={13} style={{ color: 'var(--text-3)' }} />{event.venue}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Icons.calendar size={13} style={{ color: 'var(--text-3)' }} />
                        {formatEventDate(event.startTime)}
                    </span>
                    <span style={{ color: 'var(--text-3)' }}>
                        {isPublished ? 'Published' : 'Cancelled'}{' '}
                        {relativeTime(event.updatedAt || event.createdAt, nowMs)}
                    </span>
                </div>
            </button>

            <StatusBadge status={event.status} />

            <div style={{ display: 'flex', gap: 8 }}>
                {isPublished && (
                    <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onCancel(event)}
                        disabled={busy}
                    >
                        Force cancel
                    </Button>
                )}
            </div>
        </div>
    );
}

/* ─── Skeletons ───────────────────────────────────── */
function CardSkeleton() {
    const card = {
        height: 168,
        background: 'white',
        border: '1px solid var(--border)',
        borderRadius: 12,
        animation: 'mp-flash 1.6s ease-in-out infinite',
    };
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={card} />
            <div style={{ ...card, opacity: 0.7 }} />
        </div>
    );
}

function RowSkeleton() {
    const row = {
        height: 72,
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface-subtle)',
        animation: 'mp-flash 1.6s ease-in-out infinite',
    };
    return (
        <div style={{
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: 12,
            overflow: 'hidden',
        }}>
            <div style={row} />
            <div style={{ ...row, opacity: 0.7 }} />
            <div style={{ ...row, opacity: 0.4, borderBottom: 0 }} />
        </div>
    );
}

/* ─── Page ────────────────────────────────────────── */
export default function EventModerationPage() {
    const navigate = useNavigate();
    const [filter, setFilter] = useState('PENDING_APPROVAL');

    const { data: analytics, isLoading: analyticsLoading } = useGetAnalyticsQuery();
    const { data, isLoading, isError, refetch } = useGetAdminEventsQuery(filter);

    const [approveEvent, approveState] = useApproveEventMutation();
    const [rejectEvent, rejectState]   = useRejectEventMutation();
    const [cancelEvent, cancelState]   = useCancelEventMutation();

    const [pendingReject, setPendingReject] = useState(null);
    const [pendingCancel, setPendingCancel] = useState(null);
    const [actionError, setActionError]     = useState('');

    // Stable "now" anchor for "X ago" labels.
    const [nowMs] = useState(() => Date.now());

    const events    = data?.content ?? [];
    const byStatus  = analytics?.eventsByStatus ?? {};
    const pending   = byStatus.PENDING_APPROVAL ?? 0;
    const published = byStatus.PUBLISHED ?? 0;
    const cancelled = byStatus.CANCELLED ?? 0;
    const draft     = byStatus.DRAFT ?? 0;
    const busy      = approveState.isLoading || rejectState.isLoading || cancelState.isLoading;

    async function handleApprove(id) {
        setActionError('');
        try { await approveEvent(id).unwrap(); }
        catch (err) { setActionError(err?.data?.message || 'Could not approve. Please try again.'); }
    }

    async function handleRejectConfirm(reason) {
        setActionError('');
        try {
            await rejectEvent({ id: pendingReject.id, reason }).unwrap();
            setPendingReject(null);
        } catch (err) {
            setActionError(err?.data?.message || 'Could not reject. Please try again.');
        }
    }

    async function handleCancelConfirm() {
        setActionError('');
        try {
            await cancelEvent(pendingCancel.id).unwrap();
            setPendingCancel(null);
        } catch (err) {
            setActionError(err?.data?.message || 'Could not cancel. Please try again.');
        }
    }

    const view = (id) => navigate(`/admin/events/${id}`);

    const emptyState = {
        PENDING_APPROVAL: { icon: <Icons.check size={28} style={{ color: 'var(--success)' }} />, title: 'Queue empty',          body: 'No events waiting for approval.' },
        PUBLISHED:        { icon: <Icons.bolt  size={28} style={{ color: 'var(--text-3)' }} />, title: 'No published events',  body: 'Approved events will appear here.' },
        CANCELLED:        { icon: <Icons.x     size={28} style={{ color: 'var(--text-3)' }} />, title: 'No cancelled events',  body: 'Force-cancelled events will appear here.' },
    }[filter];

    const isApprovalsTab = filter === 'PENDING_APPROVAL';

    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            <TopNav />

            {/* Header band */}
            <div style={{ background: 'white', borderBottom: '1px solid var(--border)' }}>
                <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 24px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <RoleBadge role="ADMIN" />
                    </div>
                    <h1 className="mp-h1" style={{ margin: 0, color: 'var(--text-1)' }}>
                        Platform console
                    </h1>
                    <p className="body" style={{ margin: '6px 0 0', color: 'var(--text-2)' }}>
                        Approve events, manage the queue, monitor platform health.
                    </p>

                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: 0, marginTop: 24, overflowX: 'auto' }}>
                        {TABS.map(({ id, label }) => {
                            const active = filter === id;
                            const n = byStatus[id] ?? 0;
                            return (
                                <button
                                    key={id}
                                    onClick={() => { setFilter(id); setActionError(''); }}
                                    style={{
                                        background: 'transparent',
                                        border: 0,
                                        padding: '12px 18px',
                                        color: active ? 'var(--mp-blue)' : 'var(--text-2)',
                                        borderBottom: `2px solid ${active ? 'var(--mp-blue)' : 'transparent'}`,
                                        fontWeight: active ? 600 : 500,
                                        fontSize: 14,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {label}
                                    {!analyticsLoading && n > 0 && (
                                        <span className="mp-num" style={{
                                            fontSize: 11,
                                            padding: '2px 7px',
                                            borderRadius: 99,
                                            fontWeight: 600,
                                            background: active
                                                ? 'var(--mp-blue-50, #EAF1FE)'
                                                : (id === 'PENDING_APPROVAL' ? 'var(--mp-coral, #FBE9E9)' : 'var(--surface-subtle)'),
                                            color: active
                                                ? 'var(--mp-blue)'
                                                : (id === 'PENDING_APPROVAL' ? 'var(--error)' : 'var(--text-3)'),
                                        }}>
                                            {n}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Body */}
            <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 24px 80px' }}>

                {/* Tiles */}
                <div className="mp-stat-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 16,
                    marginBottom: 24,
                }}>
                    <Tile
                        label="Pending approval"
                        value={analyticsLoading ? '—' : pending}
                        icon={<Icons.inbox size={16} />}
                        accent={pending > 0 ? 'var(--warning)' : undefined}
                    />
                    <Tile
                        label="Published"
                        value={analyticsLoading ? '—' : published}
                        icon={<Icons.bolt size={16} />}
                        accent={published > 0 ? 'var(--success)' : undefined}
                    />
                    <Tile
                        label="Draft"
                        value={analyticsLoading ? '—' : draft}
                        icon={<Icons.calendar size={16} />}
                    />
                    <Tile
                        label="Cancelled"
                        value={analyticsLoading ? '—' : cancelled}
                        icon={<Icons.x size={16} />}
                    />
                </div>

                {actionError && (
                    <div role="alert" style={{
                        margin: '0 0 16px',
                        padding: '10px 16px',
                        background: 'var(--error-bg, #FBE9E9)',
                        color: 'var(--error)',
                        borderRadius: 10,
                        fontSize: 14,
                    }}>
                        {actionError}
                    </div>
                )}

                {isLoading && (isApprovalsTab ? <CardSkeleton /> : <RowSkeleton />)}

                {!isLoading && isError && (
                    <div style={{
                        background: 'white',
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                        padding: 40,
                        textAlign: 'center',
                    }}>
                        <Icons.alert size={28} style={{ color: 'var(--error)' }} />
                        <p className="body-sm" style={{ marginTop: 8, color: 'var(--text-2)' }}>
                            Could not load events.
                        </p>
                        <Button variant="secondary" size="sm" onClick={refetch} style={{ marginTop: 12 }}>
                            Retry
                        </Button>
                    </div>
                )}

                {!isLoading && !isError && events.length === 0 && (
                    <div style={{
                        background: 'white',
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                        padding: 48,
                        textAlign: 'center',
                    }}>
                        {emptyState.icon}
                        <p className="mp-h4" style={{ margin: '12px 0 4px', color: 'var(--text-1)' }}>
                            {emptyState.title}
                        </p>
                        <p className="body-sm" style={{ color: 'var(--text-2)', margin: 0 }}>
                            {emptyState.body}
                        </p>
                    </div>
                )}

                {/* Pending tab: big cards */}
                {!isLoading && !isError && isApprovalsTab && events.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {events.map((event) => (
                            <PendingCard
                                key={event.id}
                                event={event}
                                nowMs={nowMs}
                                onView={view}
                                onApprove={handleApprove}
                                onReject={setPendingReject}
                                busy={busy}
                            />
                        ))}
                    </div>
                )}

                {/* Published / Cancelled tabs: compact rows */}
                {!isLoading && !isError && !isApprovalsTab && events.length > 0 && (
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
                        }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 14 }}>
                                {TABS.find((t) => t.id === filter)?.label}
                            </span>
                            <span style={{ fontSize: 13, color: 'var(--text-3)' }}>
                                {data?.totalElements ?? events.length} event
                                {(data?.totalElements ?? events.length) !== 1 ? 's' : ''}
                            </span>
                        </div>
                        {events.map((event, i) => (
                            <CompactRow
                                key={event.id}
                                event={event}
                                isLast={i === events.length - 1}
                                filter={filter}
                                nowMs={nowMs}
                                onView={view}
                                onCancel={setPendingCancel}
                                busy={busy}
                            />
                        ))}
                    </div>
                )}
            </div>

            <RejectDialog
                event={pendingReject}
                onConfirm={handleRejectConfirm}
                onDismiss={() => setPendingReject(null)}
                loading={rejectState.isLoading}
            />
            <CancelDialog
                event={pendingCancel}
                onConfirm={handleCancelConfirm}
                onDismiss={() => setPendingCancel(null)}
                loading={cancelState.isLoading}
            />
        </div>
    );
}
