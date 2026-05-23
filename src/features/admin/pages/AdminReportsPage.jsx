import { useState } from 'react';
import { useNavigate } from 'react-router';
import Button from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icon';
import {
    useGetAdminReportsQuery,
    useReviewAdminReportMutation,
    useCancelEventMutation,
} from '../adminApi';

const STATUS_FILTERS = [
    { id: 'PENDING',   label: 'Pending' },
    { id: 'REVIEWED',  label: 'Reviewed' },
    { id: 'DISMISSED', label: 'Dismissed' },
];

const REASON_LABELS = {
    INAPPROPRIATE_CONTENT: 'Inappropriate content',
    FRAUD:                 'Fraud',
    SPAM:                  'Spam',
    MISLEADING_INFO:       'Misleading info',
    SCAM:                  'Scam',
    HARASSMENT:            'Harassment',
    OTHER:                 'Other',
};

/* ── Status badge ────────────────────────────────── */
function ReportStatusBadge({ status }) {
    const map = {
        PENDING:   { bg: '#FEF3C7', fg: '#D97706', label: 'Pending' },
        REVIEWED:  { bg: 'var(--success-bg)', fg: 'var(--success)', label: 'Reviewed' },
        DISMISSED: { bg: 'var(--surface-subtle)', fg: 'var(--text-3)', label: 'Dismissed' },
    };
    const s = map[status] ?? map.PENDING;
    return (
        <span style={{
            fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
            background: s.bg, color: s.fg, letterSpacing: '0.03em', whiteSpace: 'nowrap',
        }}>
            {s.label}
        </span>
    );
}

/* ── Review dialog ───────────────────────────────── */
function ReviewDialog({ report, action, onConfirm, onDismiss, loading }) {
    const [note, setNote] = useState('');
    if (!report) return null;

    const isReview = action === 'REVIEWED';
    const title    = isReview ? 'Mark as reviewed' : 'Dismiss report';
    const body     = isReview
        ? 'Confirm you have reviewed this report. Add an optional note for internal records.'
        : 'Dismiss this report as not actionable. Add an optional note explaining why.';
    const cta      = isReview ? (loading ? 'Saving…' : 'Mark reviewed') : (loading ? 'Dismissing…' : 'Dismiss');

    return (
        <div
            role="dialog"
            onClick={onDismiss}
            style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(2,16,45,0.55)', display: 'grid', placeItems: 'center', padding: 20 }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{ width: '100%', maxWidth: 440, background: 'var(--surface-elevated)', borderRadius: 16, boxShadow: 'var(--shadow-modal)', padding: 28 }}
            >
                <h2 className="mp-h3" style={{ margin: '0 0 6px', color: 'var(--text-1)' }}>{title}</h2>
                <p className="body-sm" style={{ margin: '0 0 16px', color: 'var(--text-2)' }}>{body}</p>
                <label style={{ display: 'block' }}>
                    <span style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-1)', marginBottom: 6 }}>
                        Note <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span>
                    </span>
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Internal note for this decision…"
                        style={{
                            width: '100%', minHeight: 80, padding: '10px 14px',
                            background: 'var(--surface-elevated)', border: '1px solid var(--border)',
                            borderRadius: 12, fontSize: 15, color: 'var(--text-1)',
                            resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box',
                        }}
                    />
                </label>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                    <Button variant="ghost" size="md" onClick={onDismiss} disabled={loading}>Cancel</Button>
                    <Button
                        variant={isReview ? 'primary' : 'secondary'}
                        size="md"
                        onClick={() => onConfirm(note.trim() || undefined)}
                        disabled={loading}
                    >
                        {cta}
                    </Button>
                </div>
            </div>
        </div>
    );
}

/* ── Take-down confirm dialog ────────────────────── */
function TakeDownDialog({ report, onConfirm, onDismiss, loading }) {
    if (!report) return null;
    return (
        <div
            role="dialog"
            onClick={onDismiss}
            style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(2,16,45,0.55)', display: 'grid', placeItems: 'center', padding: 20 }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{ width: '100%', maxWidth: 420, background: 'var(--surface-elevated)', borderRadius: 16, boxShadow: 'var(--shadow-modal)', padding: 28 }}
            >
                <h2 className="mp-h3" style={{ margin: '0 0 8px', color: 'var(--text-1)' }}>Take down this event?</h2>
                <p className="body-sm" style={{ margin: '0 0 6px', color: 'var(--text-2)' }}>
                    <strong>{report.eventTitle}</strong> will be removed and marked cancelled.
                </p>
                <p className="body-sm" style={{ margin: '0 0 24px', color: 'var(--error)' }}>
                    This is irreversible. All ticket holders will be affected.
                </p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <Button variant="ghost" size="md" onClick={onDismiss} disabled={loading}>Cancel</Button>
                    <Button variant="destructive" size="md" onClick={onConfirm} disabled={loading}>
                        {loading ? 'Taking down…' : 'Take down event'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

/* ── Report card ─────────────────────────────────── */
function ReportCard({ report, onReview, onDismiss, onTakeDown }) {
    const navigate  = useNavigate();
    const date      = new Date(report.reportedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const isPending = report.status === 'PENDING';
    const isLive    = report.eventStatus === 'PUBLISHED';

    return (
        <div style={{
            background: 'var(--surface-elevated)', border: '1px solid var(--border)',
            borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow-card)',
        }}>
            {/* Header */}
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                        <ReportStatusBadge status={report.status} />
                        <span style={{
                            fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6,
                            background: '#EFF6FF', color: '#1D4ED8',
                        }}>
                            {REASON_LABELS[report.reason] ?? report.reason}
                        </span>
                    </div>
                    {/* Event info */}
                    <div
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate(`/admin/events/${report.eventId}`)}
                        onKeyDown={(e) => e.key === 'Enter' && navigate(`/admin/events/${report.eventId}`)}
                        style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 4 }}
                    >
                        <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--mp-blue)' }}>{report.eventTitle}</span>
                        <Icons.arrowR size={13} style={{ color: 'var(--mp-blue)', opacity: 0.6 }} />
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-2)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <span>
                            <span style={{ color: 'var(--text-3)' }}>Reported by </span>
                            <strong style={{ color: 'var(--text-1)' }}>{report.reportedByName}</strong>
                            {' · '}
                            <span style={{ color: 'var(--text-3)' }}>{report.reportedByEmail}</span>
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-3)' }}>
                            <Icons.clock size={12} /> {date}
                        </span>
                    </div>
                </div>

                {/* Actions */}
                {isPending && (
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
                        {isLive && (
                            <Button size="sm" variant="destructive" onClick={() => onTakeDown(report)}>
                                Take down
                            </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => onDismiss(report)}>
                            Dismiss
                        </Button>
                        <Button size="sm" variant="primary" icon={<Icons.check size={13} />} onClick={() => onReview(report)}>
                            Mark reviewed
                        </Button>
                    </div>
                )}
            </div>

            {/* Description */}
            {report.description && (
                <div style={{ padding: '14px 24px', borderBottom: report.adminNote ? '1px solid var(--border)' : 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                        Reporter's description
                    </div>
                    <p style={{ margin: 0, fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6 }}>{report.description}</p>
                </div>
            )}

            {/* Admin note */}
            {report.adminNote && (
                <div style={{ padding: '12px 24px', background: 'var(--surface-subtle)', display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14 }}>
                    <Icons.shield size={15} style={{ color: 'var(--text-3)', flexShrink: 0, marginTop: 1 }} />
                    <div>
                        <strong style={{ color: 'var(--text-1)' }}>Admin note — </strong>
                        <span style={{ color: 'var(--text-2)' }}>{report.adminNote}</span>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ── Skeleton ────────────────────────────────────── */
function Skeleton() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[1, 2, 3].map((i) => (
                <div key={i} style={{ height: 160, background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: 16, animation: 'mp-flash 1.6s ease-in-out infinite', opacity: 1 - (i - 1) * 0.25 }} />
            ))}
        </div>
    );
}

/* ── Page ────────────────────────────────────────── */
export default function AdminReportsPage() {
    const [statusFilter, setStatusFilter] = useState('PENDING');
    const [reviewTarget, setReviewTarget] = useState(null);
    const [dismissTarget, setDismissTarget] = useState(null);
    const [takeDownTarget, setTakeDownTarget] = useState(null);
    const [actionError, setActionError]   = useState('');

    const { data, isLoading, isError, refetch } = useGetAdminReportsQuery({ status: statusFilter });
    const [reviewReport, reviewState] = useReviewAdminReportMutation();
    const [cancelEvent, cancelState]  = useCancelEventMutation();

    const reports = data?.content ?? [];
    const pending = statusFilter === 'PENDING' ? (data?.totalElements ?? 0) : 0;

    async function handleReview(adminNote) {
        setActionError('');
        try {
            await reviewReport({ reportId: reviewTarget.id, action: 'REVIEWED', adminNote }).unwrap();
            setReviewTarget(null);
        } catch (err) {
            setActionError(err?.data?.message || 'Could not update report. Please try again.');
        }
    }

    async function handleDismiss(adminNote) {
        setActionError('');
        try {
            await reviewReport({ reportId: dismissTarget.id, action: 'DISMISSED', adminNote }).unwrap();
            setDismissTarget(null);
        } catch (err) {
            setActionError(err?.data?.message || 'Could not dismiss report. Please try again.');
        }
    }

    async function handleTakeDown() {
        setActionError('');
        try {
            await cancelEvent(takeDownTarget.eventId).unwrap();
            await reviewReport({ reportId: takeDownTarget.id, action: 'REVIEWED', adminNote: 'Event taken down following this report.' }).unwrap();
            setTakeDownTarget(null);
        } catch (err) {
            setActionError(err?.data?.message || 'Could not take down event. Please try again.');
        }
    }

    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px 80px' }}>

                {/* Header */}
                <div style={{ marginBottom: 28 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                        <h1 className="mp-h1" style={{ margin: 0, color: 'var(--text-1)' }}>Reports</h1>
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
                        User-submitted reports of events that may violate platform policy. Review and take action or dismiss.
                    </p>
                </div>

                {actionError && (
                    <div role="alert" style={{ marginBottom: 16, padding: '10px 16px', background: 'var(--error-bg)', color: 'var(--error)', borderRadius: 10, fontSize: 14 }}>
                        {actionError}
                    </div>
                )}

                {/* Filter tabs */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: 12, padding: 4, width: 'fit-content' }}>
                    {STATUS_FILTERS.map(({ id, label }) => {
                        const active = statusFilter === id;
                        return (
                            <button
                                key={id}
                                onClick={() => { setStatusFilter(id); setActionError(''); }}
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
                        <p className="body-sm" style={{ marginTop: 8, color: 'var(--text-2)' }}>Could not load reports.</p>
                        <Button variant="secondary" size="sm" onClick={refetch} style={{ marginTop: 12 }}>Retry</Button>
                    </div>
                )}

                {!isLoading && !isError && reports.length === 0 && (
                    <div style={{ padding: 56, textAlign: 'center', background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: 16 }}>
                        <Icons.inbox size={32} style={{ color: 'var(--text-3)' }} />
                        <p className="mp-h4" style={{ margin: '12px 0 4px', color: 'var(--text-1)' }}>
                            {statusFilter === 'PENDING' ? 'No pending reports' : 'No reports found'}
                        </p>
                        <p className="body-sm" style={{ color: 'var(--text-2)', margin: 0 }}>
                            {statusFilter === 'PENDING' ? 'No user reports are waiting for review.' : 'Nothing in this category yet.'}
                        </p>
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {reports.map((report) => (
                        <ReportCard
                            key={report.id}
                            report={report}
                            onReview={setReviewTarget}
                            onDismiss={setDismissTarget}
                            onTakeDown={setTakeDownTarget}
                        />
                    ))}
                </div>
            </div>

            <ReviewDialog
                report={reviewTarget}
                action="REVIEWED"
                onConfirm={handleReview}
                onDismiss={() => setReviewTarget(null)}
                loading={reviewState.isLoading}
            />
            <ReviewDialog
                report={dismissTarget}
                action="DISMISSED"
                onConfirm={handleDismiss}
                onDismiss={() => setDismissTarget(null)}
                loading={reviewState.isLoading}
            />
            <TakeDownDialog
                report={takeDownTarget}
                onConfirm={handleTakeDown}
                onDismiss={() => setTakeDownTarget(null)}
                loading={cancelState.isLoading || reviewState.isLoading}
            />
        </div>
    );
}
