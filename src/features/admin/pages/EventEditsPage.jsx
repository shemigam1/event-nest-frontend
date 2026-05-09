import { useState } from 'react';
import TopNav from '@/components/ui/TopNav';
import Button from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icon';
import {
    useGetEventEditsQuery,
    useApproveEventEditMutation,
    useRejectEventEditMutation,
} from '../adminApi';

const FILTERS = [
    { id: undefined, label: 'All' },
    { id: 'PENDING', label: 'Pending' },
    { id: 'APPROVED', label: 'Approved' },
    { id: 'REJECTED', label: 'Rejected' },
];

/* ── Status badge ────────────────────────────────── */
function EditStatusBadge({ status }) {
    const map = {
        PENDING: { bg: '#FEF3C7', fg: '#D97706', label: 'Pending review' },
        APPROVED: { bg: 'var(--success-bg)', fg: 'var(--success)', label: 'Approved' },
        REJECTED: { bg: 'var(--error-bg)', fg: 'var(--error)', label: 'Rejected' },
    };
    const s = map[status] ?? map.PENDING;
    return (
        <span style={{
            fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
            background: s.bg, color: s.fg, letterSpacing: '0.03em',
        }}>
            {s.label}
        </span>
    );
}

/* ── Diff card ───────────────────────────────────── */
function ChangeDiff({ field, current, proposed }) {
    const label = field.charAt(0).toUpperCase() + field.slice(1);
    return (
        <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                {label}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{
                    padding: '12px 14px', borderRadius: 10,
                    background: '#FEF2F2', border: '1px solid #FECACA',
                }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#EF4444', marginBottom: 6, letterSpacing: '0.05em' }}>
                        CURRENT (LIVE)
                    </div>
                    <p style={{ margin: 0, fontSize: 14, color: '#7F1D1D', lineHeight: 1.5 }}>
                        {current || <em style={{ color: '#EF4444' }}>(empty)</em>}
                    </p>
                </div>
                <div style={{
                    padding: '12px 14px', borderRadius: 10,
                    background: '#F0FDF4', border: '1px solid #BBF7D0',
                }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#16A34A', marginBottom: 6, letterSpacing: '0.05em' }}>
                        PROPOSED
                    </div>
                    <p style={{ margin: 0, fontSize: 14, color: '#14532D', lineHeight: 1.5 }}>
                        {proposed}
                    </p>
                </div>
            </div>
        </div>
    );
}

/* ── Reject dialog ───────────────────────────────── */
function RejectDialog({ edit, onConfirm, onDismiss, loading }) {
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');
    if (!edit) return null;

    function submit() {
        if (!reason.trim()) { setError('A reason is required'); return; }
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
                <h2 className="mp-h3" style={{ margin: '0 0 6px', color: 'var(--text-1)' }}>Reject edit request</h2>
                <p className="body-sm" style={{ margin: '0 0 16px', color: 'var(--text-2)' }}>
                    Explain why the proposed changes to <strong>{edit.eventTitle}</strong> were rejected. The organiser will see this.
                </p>
                <label style={{ display: 'block' }}>
                    <span style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-1)', marginBottom: 6 }}>Reason</span>
                    <textarea
                        value={reason}
                        onChange={(e) => { setReason(e.target.value); setError(''); }}
                        placeholder="e.g. Contains unverified claims, please revise and resubmit…"
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
                        {loading ? 'Rejecting…' : 'Reject edit'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

/* ── Edit request card ───────────────────────────── */
function EditCard({ edit, onApprove, onReject, approving, rejecting }) {
    const submitted = new Date(edit.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const isPending = edit.status === 'PENDING';
    const busy = approving || rejecting;

    return (
        <div style={{
            background: 'white', border: '1px solid var(--border)',
            borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow-card)',
        }}>
            {/* Header */}
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <EditStatusBadge status={edit.status} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-1)', marginBottom: 4 }}>
                        {edit.eventTitle}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-2)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <span>
                            <span style={{ color: 'var(--text-3)' }}>By </span>
                            {edit.organiserName} · {edit.organiserEmail}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-3)' }}>
                            <Icons.clock size={12} /> Submitted {submitted}
                        </span>
                    </div>
                </div>

                {isPending && (
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => onReject(edit)}
                            disabled={busy}
                        >
                            Reject
                        </Button>
                        <Button
                            size="sm"
                            variant="primary"
                            onClick={() => onApprove(edit.id)}
                            disabled={busy}
                            icon={<Icons.check size={13} />}
                        >
                            {approving ? 'Approving…' : 'Approve'}
                        </Button>
                    </div>
                )}
            </div>

            {/* Diff */}
            <div style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {Object.keys(edit.proposedChanges).map((field) => (
                    <ChangeDiff
                        key={field}
                        field={field}
                        current={edit.currentValues?.[field]}
                        proposed={edit.proposedChanges[field]}
                    />
                ))}
            </div>

            {/* Rejection reason (if rejected) */}
            {edit.status === 'REJECTED' && edit.rejectionReason && (
                <div style={{
                    margin: '0 24px 18px',
                    padding: '12px 16px',
                    background: 'var(--error-bg)',
                    border: '1px solid var(--error)',
                    borderRadius: 10,
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                    fontSize: 14,
                }}>
                    <Icons.alert size={16} style={{ color: 'var(--error)', flexShrink: 0, marginTop: 1 }} />
                    <div>
                        <strong style={{ color: 'var(--error)' }}>Rejection reason — </strong>
                        <span style={{ color: 'var(--text-1)' }}>{edit.rejectionReason}</span>
                    </div>
                </div>
            )}

            {/* Approval confirmation */}
            {edit.status === 'APPROVED' && (
                <div style={{
                    margin: '0 24px 18px',
                    padding: '12px 16px',
                    background: 'var(--success-bg)',
                    border: '1px solid var(--success)',
                    borderRadius: 10,
                    display: 'flex', gap: 10, alignItems: 'center',
                    fontSize: 14, color: 'var(--success)',
                }}>
                    <Icons.check size={16} />
                    Changes applied to the live event.
                </div>
            )}
        </div>
    );
}

/* ── Skeleton ────────────────────────────────────── */
function Skeleton() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[1, 2].map((i) => (
                <div key={i} style={{ height: 260, background: 'white', border: '1px solid var(--border)', borderRadius: 16, animation: 'mp-flash 1.6s ease-in-out infinite', opacity: i === 1 ? 1 : 0.6 }} />
            ))}
        </div>
    );
}

/* ── Page ────────────────────────────────────────── */
export default function EventEditsPage() {
    const [filter, setFilter] = useState(undefined);
    const { data, isLoading, isError, refetch } = useGetEventEditsQuery(filter);
    const [approveEdit, approveState] = useApproveEventEditMutation();
    const [rejectEdit, rejectState] = useRejectEventEditMutation();
    const [pendingReject, setPendingReject] = useState(null);
    const [actionError, setActionError] = useState('');

    const edits = data?.content ?? [];
    const pending = edits.filter((e) => e.status === 'PENDING').length;

    async function handleApprove(id) {
        setActionError('');
        try { await approveEdit(id).unwrap(); }
        catch (err) { setActionError(err?.data?.message || 'Could not approve. Please try again.'); }
    }

    async function handleRejectConfirm(reason) {
        setActionError('');
        try {
            await rejectEdit({ id: pendingReject.id, reason }).unwrap();
            setPendingReject(null);
        } catch (err) {
            setActionError(err?.data?.message || 'Could not reject. Please try again.');
        }
    }

    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            <TopNav />
            <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px 80px' }}>

                {/* Header */}
                <div style={{ marginBottom: 28 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                        <h1 className="mp-h1" style={{ margin: 0, color: 'var(--text-1)' }}>Event Edit Requests</h1>
                        {pending > 0 && (
                            <span style={{
                                fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                                background: '#FEF3C7', color: '#D97706',
                            }}>
                                {pending} pending
                            </span>
                        )}
                    </div>
                    <p className="body" style={{ margin: 0, color: 'var(--text-2)' }}>
                        Review proposed changes to live events. Approved edits go live immediately; rejected edits are returned to the organiser.
                    </p>
                </div>

                {actionError && (
                    <div role="alert" style={{ marginBottom: 16, padding: '10px 16px', background: 'var(--error-bg)', color: 'var(--error)', borderRadius: 10, fontSize: 14 }}>
                        {actionError}
                    </div>
                )}

                {/* Filter tabs */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: 4, width: 'fit-content' }}>
                    {FILTERS.map(({ id, label }) => {
                        const active = filter === id;
                        return (
                            <button
                                key={label}
                                onClick={() => setFilter(id)}
                                style={{
                                    height: 34, padding: '0 14px', borderRadius: 8, border: 'none',
                                    background: active ? 'var(--mp-blue)' : 'transparent',
                                    color: active ? 'white' : 'var(--text-2)',
                                    fontSize: 13, fontWeight: active ? 600 : 500, cursor: 'pointer',
                                    transition: 'all 0.15s',
                                }}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>

                {isLoading && <Skeleton />}

                {isError && (
                    <div style={{ padding: 40, textAlign: 'center' }}>
                        <Icons.alert size={28} style={{ color: 'var(--error)' }} />
                        <p className="body-sm" style={{ marginTop: 8, color: 'var(--text-2)' }}>Could not load edit requests.</p>
                        <Button variant="secondary" size="sm" onClick={refetch} style={{ marginTop: 12 }}>Retry</Button>
                    </div>
                )}

                {!isLoading && !isError && edits.length === 0 && (
                    <div style={{ padding: 56, textAlign: 'center', background: 'white', border: '1px solid var(--border)', borderRadius: 16 }}>
                        <Icons.check size={32} style={{ color: 'var(--text-3)' }} />
                        <p className="mp-h4" style={{ margin: '12px 0 4px', color: 'var(--text-1)' }}>All clear</p>
                        <p className="body-sm" style={{ color: 'var(--text-2)', margin: 0 }}>
                            {filter === 'PENDING' ? 'No pending edit requests.' : 'No edit requests found.'}
                        </p>
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {edits.map((edit) => (
                        <EditCard
                            key={edit.id}
                            edit={edit}
                            onApprove={handleApprove}
                            onReject={setPendingReject}
                            approving={approveState.isLoading && approveState.originalArgs === edit.id}
                            rejecting={rejectState.isLoading && pendingReject?.id === edit.id}
                        />
                    ))}
                </div>
            </div>

            <RejectDialog
                edit={pendingReject}
                onConfirm={handleRejectConfirm}
                onDismiss={() => setPendingReject(null)}
                loading={rejectState.isLoading}
            />
        </div>
    );
}
