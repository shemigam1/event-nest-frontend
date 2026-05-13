import { useState } from 'react';
import {
    useGetAdminVendorVerificationQueueQuery,
    useApproveVendorVerificationMutation,
    useRejectVendorVerificationMutation,
} from '@/features/organiser/vendorsApi';
import TopNav from '@/components/ui/TopNav';
import Button from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icon';

const DOC_LABELS = {
    CAC:        'CAC Registration',
    PORTFOLIO:  'Portfolio',
    INSURANCE:  'Insurance',
    TAX:        'Tax Certificate',
    REFERENCE:  'References',
};

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

export default function VendorVerificationPage() {
    const { data: queue = [], isLoading, isError, refetch } = useGetAdminVendorVerificationQueueQuery();
    const [approve, approveState] = useApproveVendorVerificationMutation();
    const [reject, rejectState]   = useRejectVendorVerificationMutation();

    const [selected,      setSelected]      = useState(null);
    const [rejectReason,  setRejectReason]  = useState('');
    const [rejectTarget,  setRejectTarget]  = useState(null);
    const [actionError,   setActionError]   = useState('');

    async function handleApprove(applicationId) {
        setActionError('');
        try {
            await approve(applicationId).unwrap();
            if (selected?.id === applicationId) setSelected(null);
        } catch (err) {
            setActionError(err?.data?.message || 'Could not approve application.');
        }
    }

    async function handleRejectConfirm() {
        if (!rejectTarget) return;
        setActionError('');
        try {
            await reject({ applicationId: rejectTarget.id, reason: rejectReason.trim() || null }).unwrap();
            if (selected?.id === rejectTarget.id) setSelected(null);
            setRejectTarget(null);
            setRejectReason('');
        } catch (err) {
            setActionError(err?.data?.message || 'Could not reject application.');
        }
    }

    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            <TopNav />
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 80px' }}>

                {/* Header */}
                <div style={{ marginBottom: 24 }}>
                    <h1 className="mp-h1" style={{ margin: 0, color: 'var(--text-1)' }}>
                        Vendor verification queue
                    </h1>
                    <p className="body" style={{ margin: '8px 0 0', color: 'var(--text-2)' }}>
                        Review vendor documents and grant or deny the verified badge.
                    </p>
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
                                    Pending review
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
                                        All clear!
                                    </div>
                                    <p className="body-sm" style={{ color: 'var(--text-2)', marginTop: 6 }}>
                                        No vendor verification applications pending.
                                    </p>
                                </div>
                            ) : (
                                queue.map((app, i) => (
                                    <QueueRow
                                        key={app.id}
                                        application={app}
                                        isLast={i === queue.length - 1}
                                        isActive={selected?.id === app.id}
                                        busy={
                                            (approveState.isLoading && approveState.originalArgs === app.id)
                                            || (rejectState.isLoading && rejectTarget?.id === app.id)
                                        }
                                        onSelect={() => setSelected(selected?.id === app.id ? null : app)}
                                        onApprove={() => handleApprove(app.id)}
                                        onReject={() => { setRejectTarget(app); setRejectReason(''); }}
                                    />
                                ))
                            )}
                        </div>

                        {/* Detail panel */}
                        {selected && (
                            <DetailPanel
                                application={selected}
                                onClose={() => setSelected(null)}
                                onApprove={() => handleApprove(selected.id)}
                                onReject={() => { setRejectTarget(selected); setRejectReason(''); }}
                                busy={
                                    approveState.isLoading || rejectState.isLoading
                                }
                            />
                        )}
                    </div>
                )}

                {/* Reject reason modal */}
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
                                Rejecting <strong>{rejectTarget.vendorName}</strong>&apos;s verification
                                application. Optionally include a reason so they know what to fix.
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
                                    placeholder="e.g. CAC certificate expired, portfolio links broken…"
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

function QueueRow({ application, isLast, isActive, busy, onSelect, onApprove, onReject }) {
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
                {initials(application.vendorName)}
            </div>
            <div style={{ minWidth: 0 }}>
                <div style={{
                    fontWeight: 600, color: 'var(--text-1)', marginBottom: 4,
                    display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                }}>
                    {application.vendorName}
                    {application.category && (
                        <span style={{
                            fontSize: 11, padding: '2px 8px',
                            background: 'var(--surface-subtle)', borderRadius: 6,
                            color: 'var(--text-2)', fontWeight: 600,
                        }}>
                            {application.category}
                        </span>
                    )}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
                    Applied {fmtDate(application.createdAt)}
                    {application.documents?.length > 0 && (
                        <span> · {application.documents.length} document{application.documents.length !== 1 ? 's' : ''}</span>
                    )}
                </div>
            </div>
            <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                <Button
                    size="sm" variant="primary"
                    icon={<Icons.check size={13} />}
                    onClick={onApprove} disabled={busy}
                >
                    Approve
                </Button>
                <Button
                    size="sm" variant="secondary"
                    icon={<Icons.x size={13} />}
                    onClick={onReject} disabled={busy}
                >
                    Reject
                </Button>
            </div>
        </div>
    );
}

function DetailPanel({ application, onClose, onApprove, onReject, busy }) {
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
                {/* Vendor info */}
                <div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-1)', marginBottom: 4 }}>
                        {application.vendorName}
                    </div>
                    {application.vendorLead && (
                        <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{application.vendorLead}</div>
                    )}
                    {application.vendorCity && (
                        <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>
                            <Icons.pin size={12} style={{ verticalAlign: 'middle' }} /> {application.vendorCity}
                        </div>
                    )}
                </div>

                {application.vendorBio && (
                    <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 6 }}>
                            BIO
                        </div>
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>
                            {application.vendorBio}
                        </p>
                    </div>
                )}

                {/* Documents */}
                {application.documents?.length > 0 && (
                    <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 8 }}>
                            SUBMITTED DOCUMENTS
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {application.documents.map((doc) => (
                                <a
                                    key={doc.id}
                                    href={doc.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 8,
                                        padding: '8px 12px',
                                        background: 'var(--surface-subtle)', borderRadius: 8,
                                        color: 'var(--mp-blue)', fontSize: 13, textDecoration: 'none',
                                        fontWeight: 500,
                                    }}
                                >
                                    <Icons.inbox size={14} style={{ flexShrink: 0 }} />
                                    {DOC_LABELS[doc.type] || doc.type}
                                    <Icons.arrowR size={12} style={{ marginLeft: 'auto', opacity: 0.6 }} />
                                </a>
                            ))}
                        </div>
                    </div>
                )}

                {/* References */}
                {application.references?.length > 0 && (
                    <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 8 }}>
                            ORGANISER REFERENCES
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {application.references.map((ref, i) => (
                                <div key={i} style={{
                                    padding: '10px 12px',
                                    background: 'var(--surface-subtle)', borderRadius: 8,
                                }}>
                                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-1)' }}>
                                        {ref.organiserName}
                                    </div>
                                    {ref.eventTitle && (
                                        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                                            {ref.eventTitle}
                                        </div>
                                    )}
                                    {ref.rating != null && (
                                        <div style={{ fontSize: 12, color: '#F59E0B', marginTop: 4 }}>
                                            {'★'.repeat(Math.round(ref.rating))}
                                            {'☆'.repeat(5 - Math.round(ref.rating))}
                                            <span style={{ color: 'var(--text-3)', marginLeft: 4 }}>
                                                {ref.rating}/5
                                            </span>
                                        </div>
                                    )}
                                    {ref.comment && (
                                        <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>
                                            &ldquo;{ref.comment}&rdquo;
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div style={{
                    display: 'flex', gap: 10, paddingTop: 8,
                    borderTop: '1px solid var(--border)',
                }}>
                    <Button
                        variant="primary" size="md"
                        icon={<Icons.check size={14} />}
                        onClick={onApprove} disabled={busy}
                        style={{ flex: 1 }}
                    >
                        Approve
                    </Button>
                    <Button
                        variant="destructive" size="md"
                        icon={<Icons.x size={14} />}
                        onClick={onReject} disabled={busy}
                        style={{ flex: 1 }}
                    >
                        Reject
                    </Button>
                </div>
            </div>
        </div>
    );
}
