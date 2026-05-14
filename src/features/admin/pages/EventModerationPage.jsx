import { useState } from 'react';
import { useNavigate } from 'react-router';
import TopNav from '@/components/ui/TopNav';
import Button from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { Icons } from '@/components/ui/Icon';
import { formatEventDate } from '@/utils/dateFormat';
import {
    useGetAdminEventsQuery,
    useApproveEventMutation,
    useRejectEventMutation,
    useCancelEventMutation,
    useGetAnalyticsQuery,
} from '../adminApi';

const FILTERS = [
    { id: 'PENDING_APPROVAL', label: 'Pending review', analyticsKey: 'PENDING_APPROVAL' },
    { id: 'PUBLISHED',        label: 'Published',      analyticsKey: 'PUBLISHED' },
    { id: 'CANCELLED',        label: 'Cancelled',      analyticsKey: 'CANCELLED' },
];

/* ── Stat tile ───────────────────────────────────── */
function StatTile({ label, value, icon, sub }) {
    return (
        <div style={{
            background: 'white', border: '1px solid var(--border)',
            borderRadius: 12, padding: 20, boxShadow: 'var(--shadow-card)',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 13, fontWeight: 500, color: 'var(--text-2)' }}>
                {icon}{label}
            </div>
            <div className="mp-num" style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1 }}>
                {value}
            </div>
            {sub && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>{sub}</div>}
        </div>
    );
}

/* ── Reject dialog ───────────────────────────────── */
function RejectDialog({ event, onConfirm, onDismiss, loading }) {
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');
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
            style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(2,16,45,0.55)', display: 'grid', placeItems: 'center', padding: 20 }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{ width: '100%', maxWidth: 440, background: 'white', borderRadius: 16, boxShadow: 'var(--shadow-modal)', padding: 28 }}
            >
                <h2 className="mp-h3" style={{ margin: '0 0 6px', color: 'var(--text-1)' }}>Reject event</h2>
                <p className="body-sm" style={{ margin: '0 0 16px', color: 'var(--text-2)' }}>
                    Tell the organiser why <strong>{event.title}</strong> was rejected. They&apos;ll see this reason.
                </p>
                <label style={{ display: 'block' }}>
                    <span style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-1)', marginBottom: 6 }}>Reason</span>
                    <textarea
                        value={reason}
                        onChange={(e) => { setReason(e.target.value); setError(''); }}
                        placeholder="e.g. Incomplete event details, inappropriate content…"
                        aria-label="Rejection reason"
                        style={{
                            width: '100%', minHeight: 100, padding: '10px 14px',
                            background: 'white', border: `1px solid ${error ? 'var(--error)' : 'var(--border)'}`,
                            borderRadius: 12, fontSize: 15, color: 'var(--text-1)',
                            resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box',
                        }}
                    />
                    {error && <span style={{ display: 'block', fontSize: 12, color: 'var(--error)', marginTop: 4 }}>{error}</span>}
                </label>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                    <Button variant="ghost" size="md" onClick={onDismiss} disabled={loading}>Cancel</Button>
                    <Button variant="destructive" size="md" onClick={submit} disabled={loading}>
                        {loading ? 'Rejecting…' : 'Reject event'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

/* ── Force cancel dialog ─────────────────────────── */
function CancelDialog({ event, onConfirm, onDismiss, loading }) {
    if (!event) return null;
    return (
        <div
            role="dialog"
            onClick={onDismiss}
            style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(2,16,45,0.55)', display: 'grid', placeItems: 'center', padding: 20 }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{ width: '100%', maxWidth: 400, background: 'white', borderRadius: 16, boxShadow: 'var(--shadow-modal)', padding: 28 }}
            >
                <h2 className="mp-h3" style={{ margin: '0 0 8px', color: 'var(--text-1)' }}>Force cancel event?</h2>
                <p className="body-sm" style={{ margin: '0 0 6px', color: 'var(--text-2)' }}>
                    <strong>{event.title}</strong> will be immediately taken down and marked as cancelled.
                </p>
                <p className="body-sm" style={{ margin: '0 0 24px', color: 'var(--error)' }}>
                    This cannot be undone. Existing ticket holders will be affected.
                </p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <Button variant="ghost" size="md" onClick={onDismiss} disabled={loading}>Cancel</Button>
                    <Button variant="destructive" size="md" onClick={onConfirm} disabled={loading}>
                        {loading ? 'Cancelling…' : 'Force cancel'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

/* ── Event row ───────────────────────────────────── */
function EventRow({ event, isLast, filter, onApprove, onReject, onCancel, approving, rejecting, cancelling }) {
    const navigate = useNavigate();
    const date = new Date(event.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const busy = approving || rejecting || cancelling;
    const isPending  = filter === 'PENDING_APPROVAL';
    const isPublished = filter === 'PUBLISHED';

    return (
        <div
            data-testid={`event-row-${event.id}`}
            className="mp-event-row"
            style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto',
                gap: 16,
                alignItems: 'center',
                padding: '16px 20px',
                borderBottom: isLast ? 0 : '1px solid var(--border)',
            }}
        >
            {/* Clickable info section */}
            <div
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/admin/events/${event.id}`)}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/admin/events/${event.id}`)}
                style={{ cursor: 'pointer' }}
                title="View event details"
            >
                <div style={{ fontWeight: 600, color: 'var(--mp-blue)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {event.title}
                    <Icons.arrowR size={13} style={{ color: 'var(--mp-blue)', opacity: 0.6 }} />
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Icons.pin size={13} style={{ color: 'var(--text-3)' }} />{event.venue}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Icons.calendar size={13} style={{ color: 'var(--text-3)' }} />{formatEventDate(event.startTime)}
                    </span>
                    <span style={{ color: 'var(--text-3)' }}>
                        {isPending ? 'Submitted' : isPublished ? 'Published' : 'Cancelled'} {date}
                    </span>
                </div>
            </div>

            <StatusBadge status={event.status} />

            <div style={{ display: 'flex', gap: 8 }}>
                {isPending && (
                    <>
                        <Button size="sm" variant="primary" onClick={() => onApprove(event.id)} disabled={busy}>
                            Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => onReject(event)} disabled={busy}>
                            Reject
                        </Button>
                    </>
                )}
                {isPublished && (
                    <Button size="sm" variant="destructive" onClick={() => onCancel(event)} disabled={busy}>
                        Force cancel
                    </Button>
                )}
            </div>
        </div>
    );
}

/* ── Skeleton ────────────────────────────────────── */
function Skeleton() {
    const row = { height: 72, borderBottom: '1px solid var(--border)', background: 'var(--surface-subtle)', animation: 'mp-flash 1.6s ease-in-out infinite' };
    return (
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={row} /><div style={{ ...row, opacity: 0.7 }} /><div style={{ ...row, opacity: 0.4, borderBottom: 0 }} />
        </div>
    );
}

/* ── Page ────────────────────────────────────────── */
export default function EventModerationPage() {
    const [filter, setFilter] = useState('PENDING_APPROVAL');

    const { data: analytics, isLoading: analyticsLoading } = useGetAnalyticsQuery();
    const { data, isLoading, isError, refetch } = useGetAdminEventsQuery(filter);
    const [approveEvent, approveState] = useApproveEventMutation();
    const [rejectEvent, rejectState]   = useRejectEventMutation();
    const [cancelEvent, cancelState]   = useCancelEventMutation();

    const [pendingReject, setPendingReject] = useState(null);
    const [pendingCancel, setPendingCancel] = useState(null);
    const [actionError, setActionError]     = useState('');

    const events    = data?.content ?? [];
    const byStatus  = analytics?.eventsByStatus ?? {};
    const pending   = byStatus.PENDING_APPROVAL ?? 0;
    const published = byStatus.PUBLISHED ?? 0;
    const cancelled = byStatus.CANCELLED ?? 0;
    const total     = Object.values(byStatus).reduce((s, n) => s + n, 0);

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

    const counts = {
        PENDING_APPROVAL: pending,
        PUBLISHED: published,
        CANCELLED: cancelled,
    };

    const emptyMessages = {
        PENDING_APPROVAL: { icon: <Icons.check size={28} style={{ color: 'var(--text-3)' }} />, title: 'All caught up!', body: 'No events are pending review.' },
        PUBLISHED:        { icon: <Icons.bolt  size={28} style={{ color: 'var(--text-3)' }} />, title: 'No published events', body: 'Approved events will appear here.' },
        CANCELLED:        { icon: <Icons.x     size={28} style={{ color: 'var(--text-3)' }} />, title: 'No cancelled events', body: 'Force-cancelled events will appear here.' },
    };

    const empty = emptyMessages[filter];

    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            <TopNav />
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 80px' }}>

                {/* Header */}
                <div style={{ marginBottom: 28 }}>
                    <h1 className="mp-h1" style={{ margin: 0, color: 'var(--text-1)' }}>Event Moderation</h1>
                    <p className="body" style={{ margin: '6px 0 0', color: 'var(--text-2)' }}>
                        Review and manage all events on the platform.
                    </p>
                </div>

                {/* Stats strip */}
                <div className="mp-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
                    <StatTile label="Pending review" value={analyticsLoading ? '—' : pending} icon={<Icons.clock size={16} />} sub="awaiting approval" />
                    <StatTile label="Published"      value={analyticsLoading ? '—' : published} icon={<Icons.bolt size={16} />} />
                    <StatTile label="Cancelled"      value={analyticsLoading ? '—' : cancelled} icon={<Icons.x size={16} />} />
                    <StatTile label="Total events"   value={analyticsLoading ? '—' : total} icon={<Icons.calendar size={16} />} />
                </div>

                {actionError && (
                    <div role="alert" style={{ margin: '0 0 16px', padding: '10px 16px', background: 'var(--error-bg)', color: 'var(--error)', borderRadius: 10, fontSize: 14 }}>
                        {actionError}
                    </div>
                )}

                {/* Filter tabs */}
                <div className="mp-tab-scroll" style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: 4, width: 'fit-content', maxWidth: '100%' }}>
                    {FILTERS.map(({ id, label, analyticsKey }) => {
                        const active = filter === id;
                        const count  = byStatus[analyticsKey] ?? null;
                        return (
                            <button
                                key={id}
                                onClick={() => { setFilter(id); setActionError(''); }}
                                style={{
                                    height: 36, padding: '0 16px', borderRadius: 8, border: 'none',
                                    background: active ? 'var(--mp-blue)' : 'transparent',
                                    color: active ? 'white' : 'var(--text-2)',
                                    fontSize: 14, fontWeight: active ? 600 : 500,
                                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                                    transition: 'all 0.15s',
                                }}
                            >
                                {label}
                                {count != null && count > 0 && (
                                    <span style={{
                                        minWidth: 18, height: 18, borderRadius: 9, padding: '0 4px',
                                        background: active ? 'rgba(255,255,255,0.25)' : id === 'PENDING_APPROVAL' ? 'var(--mp-coral)' : 'var(--surface-subtle)',
                                        color: active ? 'white' : id === 'PENDING_APPROVAL' ? 'white' : 'var(--text-2)',
                                        fontSize: 11, fontWeight: 700, display: 'grid', placeItems: 'center',
                                    }}>
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Event list */}
                {isLoading && <Skeleton />}

                {isError && (
                    <div role="alert" style={{ padding: 40, textAlign: 'center' }}>
                        <Icons.alert size={28} style={{ color: 'var(--error)' }} />
                        <p className="body-sm" style={{ marginTop: 8, color: 'var(--text-2)' }}>Could not load events.</p>
                        <Button variant="secondary" size="sm" onClick={refetch} style={{ marginTop: 12 }}>Retry</Button>
                    </div>
                )}

                {!isLoading && !isError && (
                    <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}>
                        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 14 }}>
                                {FILTERS.find((f) => f.id === filter)?.label}
                            </span>
                            <span style={{ fontSize: 13, color: 'var(--text-3)' }}>
                                {data?.totalElements ?? 0} event{(data?.totalElements ?? 0) !== 1 ? 's' : ''}
                            </span>
                        </div>

                        {events.length === 0 ? (
                            <div data-testid="review-queue-empty" style={{ padding: 48, textAlign: 'center' }}>
                                {empty.icon}
                                <p className="mp-h4" style={{ margin: '12px 0 4px', color: 'var(--text-1)' }}>{empty.title}</p>
                                <p className="body-sm" style={{ color: 'var(--text-2)', margin: 0 }}>{empty.body}</p>
                            </div>
                        ) : events.map((event, i) => (
                            <EventRow
                                key={event.id}
                                event={event}
                                isLast={i === events.length - 1}
                                filter={filter}
                                onApprove={handleApprove}
                                onReject={setPendingReject}
                                onCancel={setPendingCancel}
                                approving={approveState.isLoading}
                                rejecting={rejectState.isLoading}
                                cancelling={cancelState.isLoading}
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
