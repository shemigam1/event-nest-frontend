import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import TopNav from '@/components/ui/TopNav';
import Button from '@/components/ui/Button';
import { StatusBadge, RoleBadge } from '@/components/ui/Badge';
import { Icons } from '@/components/ui/Icon';
import { formatEventDate } from '@/utils/dateFormat';
import {
    useGetAdminUserByIdQuery,
    useEnableUserMutation,
    useDisableUserMutation,
    useGetEventsByOrganiserQuery,
    useApproveEventMutation,
    useRejectEventMutation,
    useCancelEventMutation,
} from '../adminApi';

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
            onClick={onDismiss}
            style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(2,16,45,0.55)', display: 'grid', placeItems: 'center', padding: 20 }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{ width: '100%', maxWidth: 440, background: 'white', borderRadius: 16, boxShadow: 'var(--shadow-modal)', padding: 28 }}
            >
                <h2 className="mp-h3" style={{ margin: '0 0 6px', color: 'var(--text-1)' }}>Reject event</h2>
                <p className="body-sm" style={{ margin: '0 0 16px', color: 'var(--text-2)' }}>
                    Tell the organiser why <strong>{event.title}</strong> was rejected.
                </p>
                <label style={{ display: 'block' }}>
                    <span style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-1)', marginBottom: 6 }}>Reason</span>
                    <textarea
                        value={reason}
                        onChange={(e) => { setReason(e.target.value); setError(''); }}
                        placeholder="e.g. Incomplete details, inappropriate content…"
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

/* ── Cancel confirmation dialog ──────────────────── */
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
                    This action cannot be undone. Existing ticket holders will no longer be able to access the event.
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

/* ── Page ────────────────────────────────────────── */
export default function AdminUserEventsPage() {
    const { id: userId } = useParams();
    const navigate = useNavigate();

    const userQuery = useGetAdminUserByIdQuery(userId);
    const eventsQuery = useGetEventsByOrganiserQuery(userId);

    const [enableUser, enableState] = useEnableUserMutation();
    const [disableUser, disableState] = useDisableUserMutation();
    const [approveEvent, approveState] = useApproveEventMutation();
    const [rejectEvent, rejectState] = useRejectEventMutation();
    const [cancelEvent, cancelState] = useCancelEventMutation();

    const [pendingReject, setPendingReject] = useState(null);
    const [pendingCancel, setPendingCancel] = useState(null);
    const [actionError, setActionError] = useState('');

    const user = userQuery.data;
    const events = eventsQuery.data?.content ?? [];
    const toggleBusy = enableState.isLoading || disableState.isLoading;

    async function handleToggleUser() {
        if (!user) return;
        setActionError('');
        try {
            if (user.enabled) await disableUser(user.id).unwrap();
            else await enableUser(user.id).unwrap();
        } catch (err) {
            setActionError(err?.data?.message || 'Could not update user status.');
        }
    }

    async function handleApprove(id) {
        setActionError('');
        try { await approveEvent(id).unwrap(); }
        catch (err) { setActionError(err?.data?.message || 'Could not approve event.'); }
    }

    async function handleRejectConfirm(reason) {
        setActionError('');
        try {
            await rejectEvent({ id: pendingReject.id, reason }).unwrap();
            setPendingReject(null);
        } catch (err) {
            setActionError(err?.data?.message || 'Could not reject event.');
        }
    }

    async function handleCancelConfirm() {
        setActionError('');
        try {
            await cancelEvent(pendingCancel.id).unwrap();
            setPendingCancel(null);
        } catch (err) {
            setActionError(err?.data?.message || 'Could not cancel event.');
        }
    }

    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            <TopNav />
            <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 80px' }}>

                <Link
                    to="/admin/users"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-2)', fontSize: 14, textDecoration: 'none', marginBottom: 24 }}
                >
                    <Icons.arrowL size={16} /> Back to users
                </Link>

                {actionError && (
                    <div role="alert" style={{ marginBottom: 16, padding: '10px 16px', background: 'var(--error-bg)', color: 'var(--error)', borderRadius: 10, fontSize: 14 }}>
                        {actionError}
                    </div>
                )}

                {/* User profile card */}
                {userQuery.isLoading ? (
                    <div style={{ height: 100, background: 'white', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 20, animation: 'mp-flash 1.6s ease-in-out infinite' }} />
                ) : user && (
                    <div style={{
                        background: 'white', border: '1px solid var(--border)',
                        borderRadius: 16, padding: 24, marginBottom: 24,
                        boxShadow: 'var(--shadow-card)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div style={{
                                width: 52, height: 52, borderRadius: 99,
                                background: 'var(--mp-blue)', color: 'white',
                                display: 'grid', placeItems: 'center',
                                fontSize: 20, fontWeight: 700, flexShrink: 0,
                            }}>
                                {(user.firstName?.[0] ?? user.email?.[0] ?? '?').toUpperCase()}
                            </div>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                                    <span style={{ fontWeight: 700, fontSize: 17, color: 'var(--text-1)' }}>
                                        {user.firstName} {user.lastName}
                                    </span>
                                    <RoleBadge role={user.role} />
                                    <span style={{
                                        fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                                        background: user.enabled ? 'var(--success-bg)' : 'var(--surface-subtle)',
                                        color: user.enabled ? 'var(--success)' : 'var(--text-3)',
                                    }}>
                                        {user.enabled ? 'Active' : 'Disabled'}
                                    </span>
                                </div>
                                <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
                                    {user.email} · Joined {new Date(user.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </div>
                            </div>
                        </div>

                        {user.role !== 'ADMIN' && (
                            <Button
                                variant={user.enabled ? 'destructive' : 'secondary'}
                                size="md"
                                onClick={handleToggleUser}
                                disabled={toggleBusy}
                            >
                                {toggleBusy ? '…' : user.enabled ? 'Disable account' : 'Enable account'}
                            </Button>
                        )}
                    </div>
                )}

                {/* Events table */}
                <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
                    <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 14 }}>
                            Events by {user ? `${user.firstName} ${user.lastName}` : 'organiser'}
                        </span>
                        <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{events.length} event{events.length !== 1 ? 's' : ''}</span>
                    </div>

                    {eventsQuery.isLoading && (
                        <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>Loading events…</div>
                    )}

                    {!eventsQuery.isLoading && events.length === 0 && (
                        <div style={{ padding: 48, textAlign: 'center' }}>
                            <Icons.calendar size={28} style={{ color: 'var(--text-3)' }} />
                            <p className="mp-h4" style={{ margin: '12px 0 4px', color: 'var(--text-1)' }}>No events yet</p>
                            <p className="body-sm" style={{ color: 'var(--text-2)', margin: 0 }}>
                                This organiser hasn&apos;t created any events.
                            </p>
                        </div>
                    )}

                    {events.map((event, i) => {
                        const isLast = i === events.length - 1;
                        const isPending = event.status === 'PENDING_APPROVAL';
                        const isPublished = event.status === 'PUBLISHED';
                        const busy = approveState.isLoading || rejectState.isLoading || cancelState.isLoading;

                        return (
                            <div
                                key={event.id}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr auto auto',
                                    gap: 16,
                                    alignItems: 'center',
                                    padding: '16px 20px',
                                    borderBottom: isLast ? 0 : '1px solid var(--border)',
                                }}
                            >
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                                        <StatusBadge status={event.status} />
                                    </div>
                                    <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>{event.title}</div>
                                    <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 3, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <Icons.pin size={12} style={{ color: 'var(--text-3)' }} />{event.venue}
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <Icons.calendar size={12} style={{ color: 'var(--text-3)' }} />{formatEventDate(event.startTime)}
                                        </span>
                                    </div>
                                </div>

                                <StatusBadge status={event.status} />

                                <div style={{ display: 'flex', gap: 8 }}>
                                    {isPending && (
                                        <>
                                            <Button size="sm" variant="primary" onClick={() => handleApprove(event.id)} disabled={busy}>
                                                Approve
                                            </Button>
                                            <Button size="sm" variant="destructive" onClick={() => setPendingReject(event)} disabled={busy}>
                                                Reject
                                            </Button>
                                        </>
                                    )}
                                    {isPublished && (
                                        <Button size="sm" variant="destructive" onClick={() => setPendingCancel(event)} disabled={busy}>
                                            Force cancel
                                        </Button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
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
