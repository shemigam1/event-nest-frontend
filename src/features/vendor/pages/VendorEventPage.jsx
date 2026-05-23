import { useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import { useGetMyVendorApplicationsQuery } from '@/features/organiser/vendorsApi';
import { useGetVendorContractsQuery } from '@/features/organiser/contractsApi';
import { useGetEventByIdQuery, useGetEventBySlugQuery } from '@/features/events/eventsApi';
import { formatEventDate } from '@/utils/dateFormat';
import Button from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icon';

/* ── helpers ──────────────────────────────────────────── */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const APP_STATUS = {
    PENDING:  { bg: '#FEF4E2', fg: '#B8770A', label: 'Pending review' },
    ACCEPTED: { bg: '#E6F4EA', fg: '#0F9D58', label: 'Accepted' },
    REJECTED: { bg: '#FBE9E9', fg: '#D62828', label: 'Rejected' },
};

const CONTRACT_STATUS = {
    DRAFT:         { bg: 'var(--surface-subtle)', fg: 'var(--text-2)',  label: 'Draft' },
    SIGNED:        { bg: '#EAF1FE',               fg: 'var(--mp-blue)', label: 'Signed' },
    ACTIVE:        { bg: '#E6F4EA',               fg: '#0F9D58',        label: 'Active' },
    COMPLETED:     { bg: '#E6F4EA',               fg: '#0F7B3E',        label: 'Completed' },
    CANCELLED:     { bg: '#FBE9E9',               fg: '#D62828',        label: 'Cancelled' },
    COUNTERSIGNED: { bg: '#EAF1FE',               fg: 'var(--mp-blue)', label: 'Countersigned' },
};

const MILESTONE_STATUS = {
    PENDING:  { bg: '#FEF4E2', fg: '#B8770A', label: 'Pending' },
    APPROVED: { bg: '#EAF1FE', fg: 'var(--mp-blue)', label: 'Approved' },
    RELEASED: { bg: '#E6F4EA', fg: '#0F9D58', label: 'Released' },
    DISPUTED: { bg: '#FBE9E9', fg: '#D62828', label: 'Disputed' },
};

function ngn(v) {
    const n = Number(v ?? 0);
    if (!Number.isFinite(n) || n <= 0) return null;
    return `₦${n.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
}

function fmtDate(iso) {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function Badge({ style, label }) {
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '3px 10px', borderRadius: 99,
            fontSize: 11, fontWeight: 600,
            background: style.bg, color: style.fg,
        }}>
            {label}
        </span>
    );
}

/* ── Page ─────────────────────────────────────────────── */

export default function VendorEventPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const isUuid = UUID_RE.test(id);
    const byId   = useGetEventByIdQuery(id,   { skip: !isUuid });
    const bySlug = useGetEventBySlugQuery(id, { skip: isUuid });
    const eventQ = isUuid ? byId : bySlug;
    const event  = eventQ.data;

    const appsQ      = useGetMyVendorApplicationsQuery();
    const contractsQ = useGetVendorContractsQuery();

    // Pick the vendor's application and contract for this event. An applicant
    // can re-apply if their first was rejected, so prefer ACCEPTED if present.
    const application = useMemo(() => {
        const list = appsQ.data ?? [];
        const mine = list.filter((a) => a.eventId === (event?.id ?? id));
        if (mine.length === 0) return null;
        return mine.find((a) => a.status === 'ACCEPTED')
            ?? mine.find((a) => a.status === 'PENDING')
            ?? mine[0];
    }, [appsQ.data, event?.id, id]);

    const contract = useMemo(() => {
        const list = contractsQ.data ?? [];
        return list.find((c) => c.eventId === (event?.id ?? id)) ?? null;
    }, [contractsQ.data, event?.id, id]);

    if (eventQ.isLoading || appsQ.isLoading) {
        return <PageShell><Skeleton /></PageShell>;
    }

    if (eventQ.isError || !event) {
        return (
            <PageShell>
                <NotFound onBack={() => navigate('/vendor/applications')} />
            </PageShell>
        );
    }

    // Without an application this isn't a vendor event for the caller.
    if (!application) {
        return (
            <PageShell>
                <BackLink onClick={() => navigate('/vendor/applications')} />
                <div style={emptyCardStyle}>
                    <Icons.alert size={28} style={{ color: 'var(--text-3)' }} />
                    <h2 className="mp-h3" style={{ margin: '12px 0 6px', color: 'var(--text-1)' }}>
                        You haven&apos;t applied to this event
                    </h2>
                    <p className="body-sm" style={{ color: 'var(--text-2)', margin: 0 }}>
                        Browse opportunities to find events looking for vendors.
                    </p>
                    <div style={{ marginTop: 16, display: 'inline-flex', gap: 8 }}>
                        <Button variant="secondary" size="md" onClick={() => navigate('/vendor/applications')}>
                            My events
                        </Button>
                        <Button variant="primary" size="md" onClick={() => navigate('/vendor/opportunities')}>
                            Find opportunities
                        </Button>
                    </div>
                </div>
            </PageShell>
        );
    }

    return (
        <PageShell>
            <BackLink onClick={() => navigate('/vendor/applications')} />

            {/* Header */}
            <header style={{ marginBottom: 28 }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 16,
                    flexWrap: 'wrap',
                    marginBottom: 12,
                }}>
                    <div style={{ minWidth: 0, flex: '1 1 auto' }}>
                        <Badge
                            style={APP_STATUS[application.status] ?? APP_STATUS.PENDING}
                            label={APP_STATUS[application.status]?.label ?? application.status}
                        />
                        <h1 className="mp-h1" style={{ margin: '8px 0 0', color: 'var(--text-1)' }}>
                            {event.title}
                        </h1>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {application.status === 'ACCEPTED' && (
                            <Button
                                variant="secondary"
                                size="md"
                                iconLeft={<Icons.message size={14} />}
                                onClick={() => navigate('/messages')}
                            >
                                Message organiser
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="md"
                            iconLeft={<Icons.search size={14} />}
                            onClick={() => navigate(`/events/${event.slug ?? event.id}`)}
                        >
                            View listing
                        </Button>
                    </div>
                </div>

                <div style={{
                    display: 'flex',
                    gap: 18,
                    fontSize: 14,
                    color: 'var(--text-2)',
                    flexWrap: 'wrap',
                }}>
                    {event.startTime && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <Icons.calendar size={14} style={{ color: 'var(--text-3)' }} />
                            {formatEventDate(event.startTime)}
                        </span>
                    )}
                    {(event.venue || event.venueName) && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <Icons.pin size={14} style={{ color: 'var(--text-3)' }} />
                            {event.venue || event.venueName}
                        </span>
                    )}
                    {event.organizerName && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <Icons.users size={14} style={{ color: 'var(--text-3)' }} />
                            Organised by {event.organizerName}
                        </span>
                    )}
                </div>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <ApplicationCard application={application} />
                <ContractCard contract={contract} loading={contractsQ.isLoading} />
            </div>
        </PageShell>
    );
}

/* ── Sub-sections ─────────────────────────────────────── */

function ApplicationCard({ application: a }) {
    const amount = ngn(a.proposedAmount);
    const status = APP_STATUS[a.status] ?? APP_STATUS.PENDING;

    return (
        <section style={cardStyle}>
            <div style={cardHeaderStyle}>
                <h2 className="mp-h4" style={{ margin: 0, color: 'var(--text-1)' }}>
                    Your application
                </h2>
                <Badge style={status} label={status.label} />
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                    gap: 16,
                }}>
                    <Field label="Service">
                        <span style={{
                            display: 'inline-block',
                            padding: '3px 10px',
                            borderRadius: 6,
                            background: 'var(--surface-subtle)',
                            color: 'var(--text-1)',
                            fontSize: 13,
                            fontWeight: 600,
                        }}>
                            {a.serviceType}
                        </span>
                    </Field>
                    <Field label="Proposed">{amount ?? '—'}</Field>
                    <Field label="Applied">{fmtDate(a.createdAt) ?? '—'}</Field>
                    {a.reviewedAt && <Field label="Reviewed">{fmtDate(a.reviewedAt)}</Field>}
                </div>
                {a.description && (
                    <div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>
                            Your pitch
                        </div>
                        <p style={{
                            margin: 0,
                            fontSize: 14,
                            color: 'var(--text-1)',
                            lineHeight: 1.6,
                            whiteSpace: 'pre-wrap',
                        }}>
                            {a.description}
                        </p>
                    </div>
                )}
                {a.status === 'REJECTED' && a.rejectionReason && (
                    <div style={{
                        background: '#FBE9E9',
                        border: '1px solid rgba(214,40,40,0.15)',
                        borderRadius: 8,
                        padding: '10px 12px',
                        fontSize: 13,
                        color: '#A11D1D',
                    }}>
                        <strong>Organiser feedback:</strong> {a.rejectionReason}
                    </div>
                )}
            </div>
        </section>
    );
}

function ContractCard({ contract, loading }) {
    if (loading) {
        return (
            <section style={cardStyle}>
                <div style={cardHeaderStyle}>
                    <h2 className="mp-h4" style={{ margin: 0, color: 'var(--text-1)' }}>Contract</h2>
                </div>
                <div style={{ padding: 20, color: 'var(--text-3)', fontSize: 14 }}>Loading…</div>
            </section>
        );
    }

    if (!contract) {
        return (
            <section style={cardStyle}>
                <div style={cardHeaderStyle}>
                    <h2 className="mp-h4" style={{ margin: 0, color: 'var(--text-1)' }}>Contract</h2>
                </div>
                <div style={{ padding: 20, color: 'var(--text-2)', fontSize: 14 }}>
                    No contract yet. The organiser will draft one once your application is accepted.
                </div>
            </section>
        );
    }

    const status = CONTRACT_STATUS[contract.status] ?? CONTRACT_STATUS.DRAFT;
    const milestones = contract.milestones ?? [];
    const amount = ngn(contract.amount ?? contract.totalValue);
    const released = ngn(contract.releasedAmount);
    const outstanding = ngn(contract.outstandingBalance);

    return (
        <section style={cardStyle}>
            <div style={cardHeaderStyle}>
                <h2 className="mp-h4" style={{ margin: 0, color: 'var(--text-1)' }}>
                    {contract.title ?? 'Contract'}
                </h2>
                <Badge style={status} label={status.label} />
            </div>

            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
                {/* Money summary */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 12,
                    background: 'var(--surface-subtle)',
                    borderRadius: 10,
                    padding: '14px 16px',
                }}>
                    <MoneyRow label="Contract value" value={amount ?? '—'} />
                    <MoneyRow label="Released to you" value={released ?? '—'} accent="success" />
                    <MoneyRow label="Outstanding" value={outstanding ?? '—'} />
                </div>

                {/* Timeline */}
                <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                    {fmtDate(contract.signedAt)    && <Chip label="Signed"    val={fmtDate(contract.signedAt)} />}
                    {fmtDate(contract.activatedAt) && <Chip label="Activated" val={fmtDate(contract.activatedAt)} />}
                    {fmtDate(contract.fundedAt)    && <Chip label="Funded"    val={fmtDate(contract.fundedAt)} />}
                    {fmtDate(contract.completedAt) && <Chip label="Completed" val={fmtDate(contract.completedAt)} />}
                </div>

                {/* Milestones */}
                {milestones.length > 0 && (
                    <div>
                        <h3 style={{
                            margin: '0 0 10px', fontSize: 14, fontWeight: 600,
                            color: 'var(--text-1)',
                        }}>
                            Milestones ({milestones.length})
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {milestones.map((m, i) => {
                                const ms = MILESTONE_STATUS[m.status] ?? MILESTONE_STATUS.PENDING;
                                const mAmt = ngn(m.amount);
                                return (
                                    <div
                                        key={m.id ?? i}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 12,
                                            padding: '10px 14px',
                                            borderRadius: 8,
                                            background: 'var(--surface-subtle)',
                                            flexWrap: 'wrap',
                                        }}
                                    >
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-1)' }}>
                                                {m.title}
                                            </div>
                                            {m.description && (
                                                <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
                                                    {m.description}
                                                </div>
                                            )}
                                            {m.disputeReason && (
                                                <div style={{ fontSize: 12, color: '#D62828', marginTop: 2 }}>
                                                    Dispute: {m.disputeReason}
                                                </div>
                                            )}
                                            {m.releasedAt && (
                                                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                                                    Released {fmtDate(m.releasedAt)}
                                                </div>
                                            )}
                                        </div>
                                        {mAmt && (
                                            <div style={{
                                                fontSize: 13, fontWeight: 600,
                                                color: 'var(--text-1)', whiteSpace: 'nowrap',
                                            }}>
                                                {mAmt}
                                            </div>
                                        )}
                                        <Badge style={ms} label={ms.label} />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div>
                    <Link
                        to="/vendor/contracts"
                        style={{
                            fontSize: 13, fontWeight: 600,
                            color: 'var(--mp-blue)', textDecoration: 'none',
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                        }}
                    >
                        View all my contracts <Icons.arrowR size={13} />
                    </Link>
                </div>
            </div>
        </section>
    );
}

/* ── Layout helpers ───────────────────────────────────── */

function PageShell({ children }) {
    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px 80px' }}>
                {children}
            </div>
        </div>
    );
}

function BackLink({ onClick }) {
    return (
        <button
            onClick={onClick}
            style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'transparent', border: 0, padding: 0,
                color: 'var(--text-2)', fontSize: 14,
                cursor: 'pointer', marginBottom: 20,
                fontFamily: 'inherit',
            }}
        >
            <Icons.arrowL size={14} />
            Back to my events
        </button>
    );
}

function Field({ label, children }) {
    return (
        <div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 14, color: 'var(--text-1)', fontWeight: 500 }}>{children}</div>
        </div>
    );
}

function MoneyRow({ label, value, accent }) {
    const color = accent === 'success' ? '#0F9D58' : 'var(--text-1)';
    return (
        <div style={{ fontSize: 13 }}>
            <div style={{ color: 'var(--text-2)', marginBottom: 2 }}>{label}</div>
            <div style={{ fontWeight: 700, fontSize: 16, color }}>{value}</div>
        </div>
    );
}

function Chip({ label, val }) {
    return (
        <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{label}: </span>{val}
        </div>
    );
}

function Skeleton() {
    const row = (h) => ({
        height: h,
        background: 'var(--surface-subtle)',
        borderRadius: 12,
        animation: 'mp-flash 1.6s ease-in-out infinite',
    });
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={row(48)} />
            <div style={row(120)} />
            <div style={row(160)} />
        </div>
    );
}

function NotFound({ onBack }) {
    return (
        <div style={emptyCardStyle}>
            <Icons.alert size={28} style={{ color: 'var(--error)' }} />
            <h2 className="mp-h3" style={{ margin: '12px 0 6px', color: 'var(--text-1)' }}>
                Event not found
            </h2>
            <p className="body-sm" style={{ color: 'var(--text-2)', margin: 0 }}>
                It may have been removed, or the link is wrong.
            </p>
            <Button variant="secondary" size="md" onClick={onBack} style={{ marginTop: 16 }}>
                Back to my events
            </Button>
        </div>
    );
}

const cardStyle = {
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    overflow: 'hidden',
};

const cardHeaderStyle = {
    padding: '14px 20px',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
};

const emptyCardStyle = {
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: 56,
    textAlign: 'center',
};
