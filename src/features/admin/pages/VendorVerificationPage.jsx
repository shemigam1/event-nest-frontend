import { useState } from 'react';
import {
    useGetAdminVendorVerificationsQuery,
    useApproveVendorVerificationMutation,
    useRejectVendorVerificationMutation,
} from '@/features/organiser/vendorsApi';
import TopNav from '@/components/ui/TopNav';
import Button from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icon';

const STATUS_TABS = [
    { key: 'PENDING',  label: 'Pending' },
    { key: 'VERIFIED', label: 'Verified' },
    { key: 'REJECTED', label: 'Rejected' },
];

function initials(name) {
    if (!name) return '?';
    return name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase() || '?';
}

function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '—'
        : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fullName(app) {
    return `${app.firstName ?? ''} ${app.lastName ?? ''}`.trim() || app.email || 'Unknown vendor';
}

export default function VendorVerificationPage() {
    const [status, setStatus] = useState('PENDING');
    const { data: queue = [], isLoading, isError, refetch } =
        useGetAdminVendorVerificationsQuery({ status });
    const [approve, approveState] = useApproveVendorVerificationMutation();
    const [reject,  rejectState]  = useRejectVendorVerificationMutation();

    const [selected,     setSelected]     = useState(null);
    const [rejectTarget, setRejectTarget] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [actionError,  setActionError]  = useState('');

    async function handleApprove(userId) {
        setActionError('');
        try {
            await approve(userId).unwrap();
            if (selected?.userId === userId) setSelected(null);
        } catch (err) {
            setActionError(err?.data?.message || 'Could not approve application.');
        }
    }

    async function handleRejectConfirm() {
        if (!rejectTarget) return;
        setActionError('');
        try {
            await reject({
                userId: rejectTarget.userId,
                reason: rejectReason.trim() || null,
            }).unwrap();
            if (selected?.userId === rejectTarget.userId) setSelected(null);
            setRejectTarget(null);
            setRejectReason('');
        } catch (err) {
            setActionError(err?.data?.message || 'Could not reject application.');
        }
    }

    const isPendingTab = status === 'PENDING';
    const emptyCopy = {
        PENDING:  { title: 'All clear!',         body: 'No vendor verification applications pending.' },
        VERIFIED: { title: 'No verified vendors yet', body: 'Approved vendors show up here.' },
        REJECTED: { title: 'No rejected applications', body: 'Rejected applications show up here.' },
    }[status];

    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            <TopNav />
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 80px' }}>

                {/* Header */}
                <div style={{ marginBottom: 20 }}>
                    <h1 className="mp-h1" style={{ margin: 0, color: 'var(--text-1)' }}>
                        Vendor verification queue
                    </h1>
                    <p className="body" style={{ margin: '8px 0 0', color: 'var(--text-2)' }}>
                        Review vendor applications and grant or deny the verified badge.
                    </p>
                </div>

                {/* Status tabs */}
                <div style={{
                    display: 'flex', gap: 0,
                    borderBottom: '1px solid var(--border)',
                    marginBottom: 20,
                }}>
                    {STATUS_TABS.map(({ key, label }) => {
                        const active = status === key;
                        return (
                            <button
                                key={key}
                                onClick={() => { setStatus(key); setSelected(null); setActionError(''); }}
                                style={{
                                    padding: '10px 18px', border: 0,
                                    borderBottom: active ? '2px solid var(--mp-blue)' : '2px solid transparent',
                                    background: 'none', cursor: 'pointer',
                                    fontFamily: 'inherit', fontSize: 14,
                                    fontWeight: active ? 600 : 500,
                                    color: active ? 'var(--mp-blue)' : 'var(--text-2)',
                                    marginBottom: -1,
                                }}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>

                {isLoading && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {[1, 2, 3].map((n) => (
                            <div key={n} style={{
                                height: 80, background: 'white', border: '1px solid var(--border)',
                                borderRadius: 12, animation: 'mp-flash 1.6s ease-in-out infinite',
                                opacity: 1.2 - n * 0.2,
                            }} />
                        ))}
                    </div>
                )}

                {isError && !isLoading && (
                    <div style={{
                        background: 'white', border: '1px solid var(--border)',
                        borderRadius: 12, padding: 40, textAlign: 'center',
                    }}>
                        <Icons.alert size={28} style={{ color: 'var(--error)' }} />
                        <p className="body-sm" style={{ marginTop: 8, color: 'var(--text-2)' }}>
                            Could not load verification queue.
                        </p>
                        <Button variant="secondary" size="sm" onClick={refetch} style={{ marginTop: 12 }}>
                            Retry
                        </Button>
                    </div>
                )}

                {!isLoading && !isError && (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: selected ? 'minmax(0,1fr) 380px' : '1fr',
                        gap: 20,
                        alignItems: 'start',
                    }}>
                        {/* Queue list */}
                        <div style={{
                            background: 'white', border: '1px solid var(--border)',
                            borderRadius: 12, overflow: 'hidden',
                        }}>
                            <div style={{
                                padding: '14px 20px', borderBottom: '1px solid var(--border)',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            }}>
                                <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-1)' }}>
                                    {STATUS_TABS.find((t) => t.key === status)?.label}
                                </span>
                                <span className="mp-num" style={{ fontSize: 13, color: 'var(--text-3)' }}>
                                    {queue.length}
                                </span>
                            </div>

                            {actionError && (
                                <div role="alert" style={{
                                    margin: '12px 20px 0', padding: '10px 12px',
                                    background: '#FBE9E9', color: 'var(--error)',
                                    borderRadius: 8, fontSize: 13,
                                }}>
                                    {actionError}
                                </div>
                            )}

                            {queue.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: 60 }}>
                                    <div style={{
                                        width: 52, height: 52, borderRadius: 99,
                                        margin: '0 auto 14px', background: 'var(--surface-subtle)',
                                        display: 'grid', placeItems: 'center', color: 'var(--text-3)',
                                    }}>
                                        <Icons.check size={22} />
                                    </div>
                                    <div className="mp-h4" style={{ color: 'var(--text-1)', margin: 0 }}>
                                        {emptyCopy.title}
                                    </div>
                                    <p className="body-sm" style={{ color: 'var(--text-2)', marginTop: 6 }}>
                                        {emptyCopy.body}
                                    </p>
                                </div>
                            ) : (
                                queue.map((app, i) => (
                                    <QueueRow
                                        key={app.userId}
                                        application={app}
                                        isLast={i === queue.length - 1}
                                        isActive={selected?.userId === app.userId}
                                        isPendingTab={isPendingTab}
                                        busy={
                                            (approveState.isLoading && approveState.originalArgs === app.userId)
                                            || (rejectState.isLoading && rejectTarget?.userId === app.userId)
                                        }
                                        onSelect={() => setSelected(selected?.userId === app.userId ? null : app)}
                                        onApprove={() => handleApprove(app.userId)}
                                        onReject={() => { setRejectTarget(app); setRejectReason(''); }}
                                    />
                                ))
                            )}
                        </div>

                        {/* Detail panel */}
                        {selected && (
                            <DetailPanel
                                application={selected}
                                isPendingTab={isPendingTab}
                                onClose={() => setSelected(null)}
                                onApprove={() => handleApprove(selected.userId)}
                                onReject={() => { setRejectTarget(selected); setRejectReason(''); }}
                                busy={approveState.isLoading || rejectState.isLoading}
                            />
                        )}
                    </div>
                )}

                {rejectTarget && (
                    <div
                        role="dialog"
                        aria-label="Reject vendor verification"
                        onClick={() => setRejectTarget(null)}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 1000,
                            background: 'rgba(2,16,45,0.55)',
                            display: 'grid', placeItems: 'center', padding: 20,
                        }}
                    >
                        <div onClick={(e) => e.stopPropagation()} style={{
                            width: '100%', maxWidth: 440,
                            background: 'white', borderRadius: 16,
                            boxShadow: 'var(--shadow-modal)', padding: 28,
                        }}>
                            <h2 className="mp-h3" style={{ margin: 0, color: 'var(--text-1)' }}>
                                Reject verification
                            </h2>
                            <p className="body-sm" style={{ margin: '8px 0 16px', color: 'var(--text-2)' }}>
                                Rejecting <strong>{fullName(rejectTarget)}</strong>&apos;s verification.
                                Optionally tell them why so they can fix it.
                            </p>
                            <label style={{ display: 'block' }}>
                                <span style={{
                                    display: 'block', fontSize: 14, fontWeight: 500,
                                    color: 'var(--text-1)', marginBottom: 6,
                                }}>
                                    Reason <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span>
                                </span>
                                <textarea
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    rows={4}
                                    placeholder="e.g. Description too vague — tell us what you actually do."
                                    style={{
                                        width: '100%', padding: 12,
                                        fontFamily: 'inherit', fontSize: 14,
                                        border: '1px solid var(--border)', borderRadius: 8,
                                        resize: 'vertical', color: 'var(--text-1)',
                                        boxSizing: 'border-box',
                                    }}
                                />
                            </label>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
                                <Button variant="ghost" size="md" onClick={() => setRejectTarget(null)} disabled={rejectState.isLoading}>
                                    Cancel
                                </Button>
                                <Button variant="destructive" size="md" onClick={handleRejectConfirm} disabled={rejectState.isLoading}>
                                    {rejectState.isLoading ? 'Rejecting…' : 'Reject'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function QueueRow({ application: app, isLast, isActive, isPendingTab, busy, onSelect, onApprove, onReject }) {
    return (
        <div style={{
            display: 'grid', gridTemplateColumns: '48px 1fr auto',
            gap: 14, alignItems: 'flex-start',
            padding: '16px 20px',
            borderBottom: isLast ? 0 : '1px solid var(--border)',
            background: isActive ? '#F0F4FF' : 'white',
            cursor: 'pointer',
        }}
            onClick={onSelect}
        >
            <div style={{
                width: 48, height: 48, borderRadius: 10,
                background: 'var(--surface-subtle)', color: 'var(--text-2)',
                display: 'grid', placeItems: 'center',
                fontSize: 14, fontWeight: 700, flexShrink: 0,
            }}>
                {initials(fullName(app))}
            </div>
            <div style={{ minWidth: 0 }}>
                <div style={{
                    fontWeight: 600, color: 'var(--text-1)', marginBottom: 4,
                    display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                }}>
                    {fullName(app)}
                    {app.serviceType && (
                        <span style={{
                            fontSize: 11, padding: '2px 8px',
                            background: 'var(--surface-subtle)', borderRadius: 6,
                            color: 'var(--text-2)', fontWeight: 600,
                        }}>
                            {app.serviceType}
                        </span>
                    )}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
                    {app.email}
                    {app.submittedAt && (
                        <span> · Applied {fmtDate(app.submittedAt)}</span>
                    )}
                </div>
            </div>
            {isPendingTab && (
                <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                    <Button size="sm" variant="primary" icon={<Icons.check size={13} />} onClick={onApprove} disabled={busy}>
                        Approve
                    </Button>
                    <Button size="sm" variant="secondary" icon={<Icons.x size={13} />} onClick={onReject} disabled={busy}>
                        Reject
                    </Button>
                </div>
            )}
        </div>
    );
}

function DetailPanel({ application: app, isPendingTab, onClose, onApprove, onReject, busy }) {
    return (
        <div style={{
            background: 'white', border: '1px solid var(--border)',
            borderRadius: 12, overflow: 'hidden',
            position: 'sticky', top: 24,
        }}>
            <div style={{
                padding: '14px 18px', borderBottom: '1px solid var(--border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-1)' }}>
                    Application detail
                </span>
                <button
                    onClick={onClose}
                    style={{
                        background: 'none', border: 0, cursor: 'pointer',
                        color: 'var(--text-3)', padding: 4,
                    }}
                    aria-label="Close detail panel"
                >
                    <Icons.x size={18} />
                </button>
            </div>

            <div style={{ padding: '18px 18px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-1)', marginBottom: 4 }}>
                        {fullName(app)}
                    </div>
                    {app.email && (
                        <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{app.email}</div>
                    )}
                </div>

                {app.serviceType && (
                    <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 6 }}>
                            SERVICE TYPE
                        </div>
                        <div style={{ fontSize: 14, color: 'var(--text-1)', fontWeight: 500 }}>
                            {app.serviceType}
                        </div>
                    </div>
                )}

                {app.description && (
                    <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 6 }}>
                            DESCRIPTION
                        </div>
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                            {app.description}
                        </p>
                    </div>
                )}

                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-3)' }}>
                    {app.submittedAt && <span>Submitted {fmtDate(app.submittedAt)}</span>}
                    {app.verifiedAt && <span>Verified {fmtDate(app.verifiedAt)}</span>}
                </div>

                {app.rejectionReason && (
                    <div style={{
                        padding: '10px 12px',
                        background: '#FBE9E9',
                        borderRadius: 8,
                        fontSize: 13,
                        color: 'var(--text-2)',
                    }}>
                        <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--error)', marginBottom: 4 }}>
                            Rejection reason
                        </div>
                        {app.rejectionReason}
                    </div>
                )}

                {isPendingTab && (
                    <div style={{
                        display: 'flex', gap: 10, paddingTop: 8,
                        borderTop: '1px solid var(--border)',
                    }}>
                        <Button variant="primary" size="md" icon={<Icons.check size={14} />} onClick={onApprove} disabled={busy} style={{ flex: 1 }}>
                            Approve
                        </Button>
                        <Button variant="destructive" size="md" icon={<Icons.x size={14} />} onClick={onReject} disabled={busy} style={{ flex: 1 }}>
                            Reject
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
