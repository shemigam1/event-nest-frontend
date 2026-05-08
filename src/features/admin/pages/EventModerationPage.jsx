import { useState } from 'react';
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

/* ── Event row ───────────────────────────────────── */
function EventRow({ event, isLast, onApprove, onReject, approving, rejecting }) {
    const submitted = new Date(event.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const busy = approving || rejecting;

    return (
        <div
            data-testid={`event-row-${event.id}`}
            style={{
                display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 16,
                alignItems: 'center', padding: '16px 20px',
                borderBottom: isLast ? 0 : '1px solid var(--border)',
            }}
        >
            <div>
                <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>{event.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Icons.pin size={13} style={{ color: 'var(--text-3)' }} />{event.venue}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Icons.calendar size={13} style={{ color: 'var(--text-3)' }} />{formatEventDate(event.startTime)}
                    </span>
                    <span style={{ color: 'var(--text-3)' }}>Submitted {submitted}</span>
                </div>
            </div>
            <StatusBadge status={event.status} />
            <div style={{ display: 'flex', gap: 8 }}>
                <Button size="sm" variant="primary" onClick={() => onApprove(event.id)} disabled={busy} aria-label={`Approve ${event.title}`}>
                    Approve
                </Button>
                <Button size="sm" variant="destructive" onClick={() => onReject(event)} disabled={busy} aria-label={`Reject ${event.title}`}>
                    Reject
                </Button>
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
    const { data: analytics, isLoading: analyticsLoading } = useGetAnalyticsQuery();
    const { data, isLoading, isError, refetch } = useGetAdminEventsQuery('PENDING_APPROVAL');
    const { data: publishedData } = useGetAdminEventsQuery('PUBLISHED');
    const [approveEvent, approveState] = useApproveEventMutation();
    const [rejectEvent, rejectState] = useRejectEventMutation();
    const [cancelEvent, cancelState] = useCancelEventMutation();
    const [pendingReject, setPendingReject] = useState(null);
    const [pendingCancel, setPendingCancel] = useState(null);
    const [actionError, setActionError] = useState('');

    const events = data?.content ?? [];
    const pending = analytics?.eventsByStatus?.PENDING_APPROVAL ?? 0;
    const published = analytics?.eventsByStatus?.PUBLISHED ?? 0;
    const total = (analytics?.eventsByStatus
        ? Object.values(analytics.eventsByStatus).reduce((s, n) => s + n, 0)
        : 0);

    async function handleApprove(id) {
        setActionError('');
        try { await approveEvent(id).unwrap(); }
        catch (err) { setActionError(err?.data?.message || 'Could not approve event. Please try again.'); }
    }

    async function handleRejectConfirm(reason) {
        setActionError('');
        try {
            await rejectEvent({ id: pendingReject.id, reason }).unwrap();
            setPendingReject(null);
        } catch (err) {
            setActionError(err?.data?.message || 'Could not reject event. Please try again.');
        }
    }

    async function handleCancelConfirm() {
        setActionError('');
        try {
            await cancelEvent(pendingCancel.id).unwrap();
            setPendingCancel(null);
        } catch (err) {
            setActionError(err?.data?.message || 'Could not cancel event. Please try again.');
        }
    }

    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            <TopNav />
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 80px' }}>
                <div style={{ marginBottom: 28 }}>
                    <h1 className="mp-h1" style={{ margin: 0, color: 'var(--text-1)' }}>Event Moderation</h1>
                    <p className="body" style={{ margin: '6px 0 0', color: 'var(--text-2)' }}>
                        Review and approve or reject events submitted by organisers.
                    </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
                    <StatTile label="Pending review" value={analyticsLoading ? '—' : pending} icon={<Icons.clock size={16} />} sub="awaiting approval" />
                    <StatTile label="Published events" value={analyticsLoading ? '—' : published} icon={<Icons.bolt size={16} />} />
                    <StatTile label="Total events" value={analyticsLoading ? '—' : total} icon={<Icons.calendar size={16} />} />
                </div>

                {actionError && (
                    <div role="alert" style={{ margin: '0 0 16px', padding: '10px 16px', background: 'var(--error-bg)', color: 'var(--error)', borderRadius: 10, fontSize: 14 }}>
                        {actionError}
                    </div>
                )}

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
                            <span style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 14 }}>Pending review</span>
                            <span style={{ fontSize: 13, color: 'var(--text-3)' }}>
                                {data?.totalElements ?? 0} event{(data?.totalElements ?? 0) !== 1 ? 's' : ''}
                            </span>
                        </div>
                        {events.length === 0 ? (
                            <div data-testid="review-queue-empty" style={{ padding: 40, textAlign: 'center' }}>
                                <Icons.check size={28} style={{ color: 'var(--text-3)' }} />
                                <p className="mp-h4" style={{ margin: '12px 0 4px', color: 'var(--text-1)' }}>All caught up!</p>
                                <p className="body-sm" style={{ color: 'var(--text-2)', margin: 0 }}>No events pending review.</p>
                            </div>
                        ) : events.map((event, i) => (
                            <EventRow
                                key={event.id}
                                event={event}
                                isLast={i === events.length - 1}
                                onApprove={handleApprove}
                                onReject={setPendingReject}
                                approving={approveState.isLoading}
                                rejecting={rejectState.isLoading}
                            />
                        ))}
                    </div>
                )}

                {/* Published events — force cancel */}
                {(publishedData?.content ?? []).length > 0 && (
                    <div style={{ marginTop: 24, background: 'white', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}>
                        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <span style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 14 }}>Live events</span>
                                <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-3)' }}>Force cancel if an event violates platform policy</span>
                            </div>
                            <span style={{ fontSize: 13, color: 'var(--text-3)' }}>
                                {publishedData?.totalElements ?? 0} published
                            </span>
                        </div>
                        {(publishedData?.content ?? []).map((event, i) => {
                            const submitted = new Date(event.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                            const isLast = i === (publishedData?.content ?? []).length - 1;
                            return (
                                <div
                                    key={event.id}
                                    style={{
                                        display: 'grid', gridTemplateColumns: '1fr auto auto',
                                        gap: 16, alignItems: 'center',
                                        padding: '16px 20px',
                                        borderBottom: isLast ? 0 : '1px solid var(--border)',
                                    }}
                                >
                                    <div>
                                        <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>{event.title}</div>
                                        <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Icons.pin size={13} style={{ color: 'var(--text-3)' }} />{event.venue}
                                            </span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Icons.calendar size={13} style={{ color: 'var(--text-3)' }} />{formatEventDate(event.startTime)}
                                            </span>
                                            <span style={{ color: 'var(--text-3)' }}>Published {submitted}</span>
                                        </div>
                                    </div>
                                    <StatusBadge status={event.status} />
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => setPendingCancel(event)}
                                        disabled={cancelState.isLoading}
                                    >
                                        Force cancel
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                )}

                <RejectDialog
                    event={pendingReject}
                    onConfirm={handleRejectConfirm}
                    onDismiss={() => setPendingReject(null)}
                    loading={rejectState.isLoading}
                />

                {pendingCancel && (
                    <div
                        role="dialog"
                        onClick={() => setPendingCancel(null)}
                        style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(2,16,45,0.55)', display: 'grid', placeItems: 'center', padding: 20 }}
                    >
                        <div
                            onClick={(e) => e.stopPropagation()}
                            style={{ width: '100%', maxWidth: 400, background: 'white', borderRadius: 16, boxShadow: 'var(--shadow-modal)', padding: 28 }}
                        >
                            <h2 className="mp-h3" style={{ margin: '0 0 8px', color: 'var(--text-1)' }}>Force cancel event?</h2>
                            <p className="body-sm" style={{ margin: '0 0 6px', color: 'var(--text-2)' }}>
                                <strong>{pendingCancel.title}</strong> will be immediately taken down and marked as cancelled.
                            </p>
                            <p className="body-sm" style={{ margin: '0 0 24px', color: 'var(--error)' }}>
                                This cannot be undone. Existing ticket holders will be affected.
                            </p>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                <Button variant="ghost" size="md" onClick={() => setPendingCancel(null)} disabled={cancelState.isLoading}>
                                    Cancel
                                </Button>
                                <Button variant="destructive" size="md" onClick={handleCancelConfirm} disabled={cancelState.isLoading}>
                                    {cancelState.isLoading ? 'Cancelling…' : 'Force cancel'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
