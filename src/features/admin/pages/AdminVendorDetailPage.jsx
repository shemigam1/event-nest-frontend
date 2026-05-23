import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
    useGetAdminVendorByIdQuery,
    useVerifyVendorMutation,
    useRejectVendorVerificationMutation,
    useSuspendVendorMutation,
    useGetVendorTrustHistoryQuery,
} from '../adminApi';
import Button from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icon';
import { formatNaira } from '@/utils/currency';
import { formatEventDate } from '@/utils/dateFormat';

/* ────────────────────────────────────────────────────────────────────────────
   AdminVendorDetailPage — review one vendor end-to-end.

   Actions:
     - Verify (PATCH /admin/vendors/{id}/verify) → status = VERIFIED
     - Reject verification (PATCH /admin/vendors/{id}/reject-verification) → stores reason
     - Suspend (PATCH /admin/vendors/{id}/suspend) → status = SUSPENDED + reason
     - View trust history (GET /admin/vendors/{id}/trust-history) → audit timeline

   Layout: vendor card + actions on the left, trust history timeline on the right.
   ──────────────────────────────────────────────────────────────────────── */

const CATEGORY_LABEL = {
    CATERING:    'Catering',
    AV:          'AV & Sound',
    PHOTOGRAPHY: 'Photography',
    VENUE:       'Venue',
    DECORATION:  'Decoration',
    MUSIC:       'Music & DJs',
    SECURITY:    'Security',
    OTHER:       'Other',
};

const STATUS_PILL = {
    PENDING:   { bg: 'var(--warning-bg)', fg: 'var(--warning)', label: 'Pending' },
    ACTIVE:    { bg: 'var(--mp-blue-50)', fg: 'var(--mp-blue)', label: 'Active' },
    VERIFIED:  { bg: 'var(--success-bg)', fg: 'var(--success)', label: 'Verified' },
    SUSPENDED: { bg: 'var(--error-bg)',   fg: 'var(--error)',   label: 'Suspended' },
};

const TRUST_EVENT_LABEL = {
    MILESTONE_RELEASED:           { label: 'Milestone released',          tone: 'positive' },
    CONTRACT_COMPLETED:           { label: 'Contract completed',          tone: 'positive' },
    POSITIVE_RATING:              { label: 'Positive rating',             tone: 'positive' },
    MILESTONE_DISPUTED:           { label: 'Milestone disputed',          tone: 'negative' },
    DISPUTE_RULED_AGAINST_VENDOR: { label: 'Dispute ruled against vendor', tone: 'negative' },
    CONTRACT_CANCELLED_BY_VENDOR: { label: 'Vendor-cancelled contract',    tone: 'negative' },
    NO_SHOW:                      { label: 'No-show',                     tone: 'negative' },
    ESCROW_VIOLATION:             { label: 'Escrow violation',            tone: 'negative' },
};

export default function AdminVendorDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const vendorQ = useGetAdminVendorByIdQuery(id);
    const trustQ  = useGetVendorTrustHistoryQuery(id);

    if (vendorQ.isLoading) {
        return <Shell><Skeleton /></Shell>;
    }
    if (vendorQ.isError || !vendorQ.data) {
        return (
            <Shell>
                <ErrorCard
                    message={vendorQ.error?.data?.message || 'Vendor not found.'}
                    onBack={() => navigate('/admin/vendors')}
                />
            </Shell>
        );
    }

    return (
        <Shell>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
                gap: 20,
                alignItems: 'start',
            }}>
                <VendorPanel vendor={vendorQ.data} />
                <TrustHistoryPanel history={trustQ.data ?? []} isLoading={trustQ.isLoading} />
            </div>
        </Shell>
    );
}

/* ─── Vendor + actions panel ───────────────────────── */

function VendorPanel({ vendor }) {
    const v = vendor;
    const pill = STATUS_PILL[v.status] ?? STATUS_PILL.PENDING;
    const trust = v.trustScore != null ? Number(v.trustScore) : null;
    const awaitingReview = v.verificationSubmittedAt && v.status !== 'VERIFIED';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Profile card */}
            <div style={{
                background: 'var(--surface-elevated)', border: '1px solid var(--border)',
                borderRadius: 12, padding: 24,
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <h2 className="mp-h2" style={{ margin: 0, color: 'var(--text-1)' }}>
                                {v.businessName}
                            </h2>
                            <span style={{
                                padding: '3px 10px', borderRadius: 99,
                                background: pill.bg, color: pill.fg,
                                fontSize: 11, fontWeight: 600, letterSpacing: '0.02em',
                            }}>
                                {pill.label}
                            </span>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 6 }}>
                            {CATEGORY_LABEL[v.category] ?? v.category}
                            {v.contactEmail && ` · ${v.contactEmail}`}
                        </div>
                    </div>
                    {trust != null && (
                        <div style={{ textAlign: 'right' }}>
                            <div className="mp-num" style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1 }}>
                                {trust.toFixed(0)}
                                <span style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 500 }}> / 100</span>
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>trust score</div>
                        </div>
                    )}
                </div>

                {v.bio && (
                    <p className="body" style={{
                        marginTop: 16, color: 'var(--text-2)', textWrap: 'pretty',
                    }}>
                        {v.bio}
                    </p>
                )}

                {/* Quick stats */}
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                    gap: 12, marginTop: 20,
                    paddingTop: 20, borderTop: '1px solid var(--border)',
                }}>
                    <Stat label="Total contracts"     value={v.totalContracts ?? 0} />
                    <Stat label="Completed"           value={v.completedContracts ?? 0} />
                    <Stat label="Disputed"            value={v.disputedContracts ?? 0} />
                    <Stat label="Base rate"
                          value={v.baseRate != null ? formatNaira(v.baseRate) : '—'} />
                </div>

                {/* Service areas + portfolio */}
                {(v.serviceAreas?.length > 0 || v.portfolioImages?.length > 0) && (
                    <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
                        {v.serviceAreas?.length > 0 && (
                            <div style={{ marginBottom: v.portfolioImages?.length > 0 ? 12 : 0 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.05em', marginBottom: 8 }}>
                                    SERVICE AREAS
                                </div>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    {v.serviceAreas.map((a) => (
                                        <span key={a} style={{
                                            padding: '4px 10px', borderRadius: 99,
                                            background: 'var(--surface-subtle)', color: 'var(--text-1)',
                                            fontSize: 12, fontWeight: 500,
                                        }}>
                                            {a}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {v.portfolioImages?.length > 0 && (
                            <div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.05em', marginBottom: 8 }}>
                                    PORTFOLIO ({v.portfolioImages.length})
                                </div>
                                <ul style={{
                                    margin: 0, padding: 0, listStyle: 'none',
                                    display: 'flex', flexDirection: 'column', gap: 4,
                                }}>
                                    {v.portfolioImages.map((url) => (
                                        <li key={url}>
                                            <a href={url} target="_blank" rel="noopener noreferrer"
                                               style={{ fontSize: 12, color: 'var(--mp-blue)', wordBreak: 'break-all' }}>
                                                {url}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {/* Rejection / suspension notes if present */}
                {v.verificationRejectionReason && (
                    <NoteBlock kind="error" title="Last verification rejection" body={v.verificationRejectionReason} />
                )}
                {v.suspensionReason && (
                    <NoteBlock kind="error" title="Suspension reason" body={v.suspensionReason} />
                )}
                {awaitingReview && (
                    <NoteBlock
                        kind="warning"
                        title="Awaiting verification review"
                        body={`Submitted ${formatEventDate(v.verificationSubmittedAt)}. Approve below or reject with a reason.`}
                    />
                )}
            </div>

            <ActionsCard vendor={v} />
        </div>
    );
}

function Stat({ label, value }) {
    return (
        <div>
            <div className="mp-num" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)' }}>
                {value}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{label}</div>
        </div>
    );
}

function NoteBlock({ kind, title, body }) {
    const colors = {
        error:   { bg: 'var(--error-bg)',   fg: 'var(--error)',   bd: 'var(--error)' },
        warning: { bg: 'var(--warning-bg)', fg: 'var(--warning)', bd: 'var(--warning)' },
    };
    const c = colors[kind] ?? colors.error;
    return (
        <div style={{
            marginTop: 16, padding: '12px 14px',
            background: c.bg, borderLeft: `3px solid ${c.bd}`,
            borderRadius: 8,
        }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: c.fg, marginBottom: 4 }}>
                {title}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{body}</div>
        </div>
    );
}

/* ─── Action buttons (verify / reject / suspend) ───────────────────────── */

function ActionsCard({ vendor }) {
    const [verifyVendor, verifyState]                 = useVerifyVendorMutation();
    const [rejectVerification, rejectState]           = useRejectVendorVerificationMutation();
    const [suspendVendor, suspendState]               = useSuspendVendorMutation();
    const [openReject, setOpenReject]   = useState(false);
    const [openSuspend, setOpenSuspend] = useState(false);
    const [error, setError]             = useState('');

    const isVerified  = vendor.status === 'VERIFIED';
    const isSuspended = vendor.status === 'SUSPENDED';
    const canVerify   = !isVerified && !isSuspended;
    const canReject   = !!vendor.verificationSubmittedAt && !isVerified;

    async function handleVerify() {
        setError('');
        try {
            await verifyVendor(vendor.id).unwrap();
        } catch (e) {
            setError(e?.data?.message || 'Verify failed.');
        }
    }

    async function handleReject(reason) {
        setError('');
        try {
            await rejectVerification({ vendorId: vendor.id, reason }).unwrap();
            setOpenReject(false);
        } catch (e) {
            setError(e?.data?.message || 'Reject failed.');
        }
    }

    async function handleSuspend(reason) {
        setError('');
        try {
            await suspendVendor({ vendorId: vendor.id, reason }).unwrap();
            setOpenSuspend(false);
        } catch (e) {
            setError(e?.data?.message || 'Suspend failed.');
        }
    }

    return (
        <div style={{
            background: 'var(--surface-elevated)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 20,
        }}>
            <div className="mp-h4" style={{ margin: 0, color: 'var(--text-1)' }}>Admin actions</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                <Button
                    variant="primary"
                    size="md"
                    onClick={handleVerify}
                    disabled={!canVerify || verifyState.isLoading}
                    icon={<Icons.check size={14} />}
                >
                    {verifyState.isLoading ? 'Verifying…' : 'Verify'}
                </Button>
                <Button
                    variant="secondary"
                    size="md"
                    onClick={() => setOpenReject(true)}
                    disabled={!canReject || rejectState.isLoading}
                    icon={<Icons.x size={14} />}
                >
                    Reject verification
                </Button>
                <Button
                    variant="destructive"
                    size="md"
                    onClick={() => setOpenSuspend(true)}
                    disabled={isSuspended || suspendState.isLoading}
                    icon={<Icons.alert size={14} />}
                >
                    Suspend
                </Button>
            </div>

            {error && (
                <div role="alert" style={{
                    marginTop: 12,
                    padding: '10px 14px',
                    background: 'var(--error-bg)',
                    color: 'var(--error)',
                    borderRadius: 8, fontSize: 13,
                }}>
                    {error}
                </div>
            )}

            {openReject && (
                <ReasonDialog
                    title="Reject verification"
                    description="Tell the vendor what's missing so they can resubmit."
                    confirmLabel="Reject"
                    busy={rejectState.isLoading}
                    onClose={() => setOpenReject(false)}
                    onConfirm={handleReject}
                />
            )}

            {openSuspend && (
                <ReasonDialog
                    title="Suspend vendor"
                    description="They'll be removed from the marketplace and unable to accept new engagements."
                    confirmLabel="Suspend"
                    confirmDestructive
                    busy={suspendState.isLoading}
                    onClose={() => setOpenSuspend(false)}
                    onConfirm={handleSuspend}
                />
            )}
        </div>
    );
}

function ReasonDialog({ title, description, confirmLabel, confirmDestructive, busy, onClose, onConfirm }) {
    const [reason, setReason] = useState('');

    return (
        <div role="dialog" aria-label={title} onClick={onClose} style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(2,16,45,0.55)',
            display: 'grid', placeItems: 'center', padding: 20,
        }}>
            <div onClick={(e) => e.stopPropagation()} style={{
                width: '100%', maxWidth: 440,
                background: 'var(--surface-elevated)', borderRadius: 16,
                boxShadow: 'var(--shadow-modal)', padding: 24,
            }}>
                <h3 className="mp-h3" style={{ margin: 0, color: 'var(--text-1)' }}>{title}</h3>
                <p className="body-sm" style={{ margin: '8px 0 16px', color: 'var(--text-2)' }}>
                    {description}
                </p>
                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={4}
                    maxLength={1000}
                    placeholder="Reason…"
                    style={{
                        width: '100%', padding: 12,
                        fontFamily: 'inherit', fontSize: 14,
                        border: '1px solid var(--border)', borderRadius: 8,
                        resize: 'vertical', color: 'var(--text-1)',
                        boxSizing: 'border-box',
                    }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                    <Button type="button" variant="ghost" size="md" onClick={onClose} disabled={busy}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant={confirmDestructive ? 'destructive' : 'primary'}
                        size="md"
                        disabled={!reason.trim() || busy}
                        onClick={() => onConfirm(reason.trim())}
                    >
                        {busy ? 'Working…' : confirmLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
}

/* ─── Trust history timeline ───────────────────────── */

function TrustHistoryPanel({ history, isLoading }) {
    return (
        <div style={{
            background: 'var(--surface-elevated)', border: '1px solid var(--border)',
            borderRadius: 12, overflow: 'hidden',
            position: 'sticky', top: 20,
        }}>
            <div style={{
                padding: '14px 20px', borderBottom: '1px solid var(--border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
                <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>Trust history</span>
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                    {isLoading ? 'Loading…' : `${history.length} event${history.length !== 1 ? 's' : ''}`}
                </span>
            </div>

            {isLoading && (
                <div style={{ padding: 20 }}>
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} style={{
                            height: 40, marginBottom: 8, borderRadius: 8,
                            background: 'var(--surface-subtle)',
                            animation: 'mp-flash 1.6s ease-in-out infinite',
                        }} />
                    ))}
                </div>
            )}

            {!isLoading && history.length === 0 && (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                    No trust events recorded yet.
                </div>
            )}

            {!isLoading && history.length > 0 && (
                <div style={{ maxHeight: 540, overflowY: 'auto' }}>
                    {history.map((e, i) => (
                        <TrustEventRow key={e.id} event={e} isLast={i === history.length - 1} />
                    ))}
                </div>
            )}
        </div>
    );
}

function TrustEventRow({ event, isLast }) {
    const info = TRUST_EVENT_LABEL[event.eventType] ?? { label: event.eventType, tone: 'positive' };
    const delta = Number(event.scoreDelta);
    const isPositive = delta > 0;

    return (
        <div style={{
            padding: '12px 20px',
            borderBottom: isLast ? 0 : '1px solid var(--border)',
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: 12,
            alignItems: 'center',
        }}>
            <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
                    {info.label}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                    {event.createdAt ? formatEventDate(event.createdAt) : '—'}
                    {event.referenceType && ` · ${event.referenceType}`}
                </div>
            </div>
            <div style={{ textAlign: 'right' }}>
                <div className="mp-num" style={{
                    fontSize: 14, fontWeight: 700,
                    color: isPositive ? 'var(--success)' : 'var(--error)',
                }}>
                    {isPositive ? '+' : ''}{delta}
                </div>
                <div className="mp-num" style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                    → {Number(event.scoreAfter).toFixed(0)}
                </div>
            </div>
        </div>
    );
}

/* ─── Shell + skeletons ───────────────────────── */

function Shell({ children }) {
    const navigate = useNavigate();
    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 24px 80px' }}>
                <button
                    type="button"
                    onClick={() => navigate('/admin/vendors')}
                    style={{
                        background: 'none', border: 0, color: 'var(--text-2)',
                        fontSize: 13, padding: 0, marginBottom: 16,
                        display: 'inline-flex', gap: 6, alignItems: 'center',
                        cursor: 'pointer',
                    }}
                >
                    <Icons.arrowL size={14} /> Back to vendors
                </button>
                {children}
            </div>
        </div>
    );
}

function Skeleton() {
    return (
        <div style={{
            background: 'var(--surface-elevated)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 40, minHeight: 320,
            animation: 'mp-flash 1.6s ease-in-out infinite',
        }} />
    );
}

function ErrorCard({ message, onBack }) {
    return (
        <div style={{
            background: 'var(--surface-elevated)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 60, textAlign: 'center',
        }}>
            <Icons.alert size={28} style={{ color: 'var(--error)' }} />
            <p className="body-sm" style={{ marginTop: 8, color: 'var(--text-2)' }}>{message}</p>
            <Button variant="secondary" size="sm" onClick={onBack} style={{ marginTop: 12 }}>
                Back to vendors
            </Button>
        </div>
    );
}
