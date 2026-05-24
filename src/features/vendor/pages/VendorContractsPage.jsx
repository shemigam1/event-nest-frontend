import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useGetVendorContractsQuery } from '@/features/organiser/contractsApi';
import Button from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icon';

/* ─── helpers ─────────────────────────────────────────── */

const STATUS_STYLE = {
    DRAFT:         { bg: 'var(--surface-subtle)', fg: 'var(--text-2)',  label: 'Draft' },
    SIGNED:        { bg: '#EAF1FE',               fg: 'var(--mp-blue)', label: 'Signed' },
    ACTIVE:        { bg: '#E6F4EA',               fg: '#0F9D58',        label: 'Active' },
    COMPLETED:     { bg: '#E6F4EA',               fg: '#0F7B3E',        label: 'Completed' },
    CANCELLED:     { bg: '#FBE9E9',               fg: '#D62828',        label: 'Cancelled' },
    COUNTERSIGNED: { bg: '#EAF1FE',               fg: 'var(--mp-blue)', label: 'Countersigned' },
};

const MILESTONE_STYLE = {
    PENDING:  { bg: '#FEF4E2', fg: '#B8770A', label: 'Pending' },
    APPROVED: { bg: '#EAF1FE', fg: 'var(--mp-blue)', label: 'Approved' },
    RELEASED: { bg: '#E6F4EA', fg: '#0F9D58', label: 'Released' },
    DISPUTED: { bg: '#FBE9E9', fg: '#D62828', label: 'Disputed' },
};

const DEPOSIT_STYLE = {
    UNFUNDED: { bg: 'var(--surface-subtle)', fg: 'var(--text-3)', label: 'Not funded' },
    FUNDED:   { bg: '#EAF1FE', fg: 'var(--mp-blue)', label: 'Funded' },
    RELEASED: { bg: '#E6F4EA', fg: '#0F9D58', label: 'Released' },
};

const FILTER_TABS = [
    { key: 'ALL',       label: 'All' },
    { key: 'SIGNED',    label: 'Signed' },
    { key: 'ACTIVE',    label: 'Active' },
    { key: 'COMPLETED', label: 'Completed' },
    { key: 'CANCELLED', label: 'Cancelled' },
];

function ngn(v) {
    const n = Number(v ?? 0);
    if (!Number.isFinite(n)) return '—';
    return `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso) {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function Badge({ style, label }) {
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '2px 10px', borderRadius: 20,
            fontSize: 12, fontWeight: 600,
            background: style.bg, color: style.fg,
        }}>
            {label}
        </span>
    );
}

/* ─── Page ────────────────────────────────────────────── */

export default function VendorContractsPage() {
    const [filter, setFilter] = useState('ALL');
    const [search, setSearch] = useState('');
    const contractsQ = useGetVendorContractsQuery();
    const allContracts = contractsQ.data ?? [];

    const filtered = allContracts.filter((c) => {
        if (filter !== 'ALL' && c.status !== filter) return false;
        if (search.trim()) {
            const q = search.toLowerCase();
            return (
                (c.title ?? '').toLowerCase().includes(q) ||
                (c.eventName ?? '').toLowerCase().includes(q) ||
                (c.organiserName ?? '').toLowerCase().includes(q)
            );
        }
        return true;
    });

    const totalActive   = allContracts.filter(c => c.status === 'ACTIVE').length;
    const totalEarned   = allContracts
        .filter(c => c.status === 'ACTIVE' || c.status === 'COMPLETED')
        .reduce((s, c) => s + Number(c.releasedAmount ?? 0), 0);
    const outstanding   = allContracts
        .filter(c => c.status === 'ACTIVE')
        .reduce((s, c) => s + Number(c.outstandingBalance ?? 0), 0);

    return (
        <div className="mp-page-wrap" style={{ padding: '32px 40px', maxWidth: 900, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: 28 }}>
                <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: 'var(--text-1)' }}>
                    My Contracts
                </h1>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--text-2)' }}>
                    All contracts you have with event organisers.
                </p>
            </div>

            {/* Summary */}
            {allContracts.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
                    <StatCard label="Active contracts" value={totalActive} accent="blue" />
                    <StatCard label="Total earned" value={ngn(totalEarned)} accent="success" />
                    <StatCard label="Outstanding" value={ngn(outstanding)} accent="neutral" />
                </div>
            )}

            {/* Search + filter */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
                    <Icons.search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
                    <input
                        type="search"
                        placeholder="Search by title, event or organiser…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px 9px 32px', fontSize: 14, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface-elevated)', color: 'var(--text-1)', boxSizing: 'border-box', outline: 'none' }}
                    />
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {FILTER_TABS.map(t => (
                        <button key={t.key} onClick={() => setFilter(t.key)} style={{
                            padding: '6px 14px', borderRadius: 99, border: 0, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                            background: filter === t.key ? 'var(--mp-blue)' : 'var(--surface-subtle)',
                            color: filter === t.key ? 'white' : 'var(--text-2)',
                        }}>
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Loading */}
            {contractsQ.isLoading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[1, 2, 3].map(k => (
                        <div key={k} style={{ background: 'var(--surface-elevated)', borderRadius: 12, border: '1px solid var(--border)', height: 80, animation: 'pulse 1.4s ease-in-out infinite' }} />
                    ))}
                </div>
            )}

            {contractsQ.isError && (
                <ErrorBlock message="Could not load contracts." onRetry={contractsQ.refetch} />
            )}

            {!contractsQ.isLoading && !contractsQ.isError && filtered.length === 0 && (
                <div style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: 12, padding: 56, textAlign: 'center' }}>
                    <Icons.lock size={32} style={{ color: 'var(--text-3)', marginBottom: 12 }} />
                    <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: 16, color: 'var(--text-1)' }}>
                        {allContracts.length === 0 ? 'No contracts yet' : 'No contracts match your filter'}
                    </p>
                    <p style={{ fontSize: 14, color: 'var(--text-2)', margin: 0 }}>
                        {allContracts.length === 0
                            ? 'Contracts are created by event organisers after your application is accepted.'
                            : 'Try adjusting your search or filter.'}
                    </p>
                </div>
            )}

            {!contractsQ.isLoading && filtered.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {filtered.map(c => <ContractCard key={c.id ?? c.contractId} contract={c} />)}
                </div>
            )}
        </div>
    );
}

/* ─── StatCard ────────────────────────────────────────── */

function StatCard({ label, value, accent }) {
    const styles = {
        blue:    { bg: '#EAF1FE', fg: 'var(--mp-blue)' },
        success: { bg: '#E6F4EA', fg: '#0F9D58' },
        neutral: { bg: 'white',   fg: 'var(--text-1)' },
    }[accent] ?? { bg: 'white', fg: 'var(--text-1)' };
    return (
        <div style={{ background: styles.bg, border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: styles.fg }}>{value}</div>
        </div>
    );
}

/* ─── ContractCard ────────────────────────────────────── */

function ContractCard({ contract: c }) {
    const navigate = useNavigate();
    const [expanded, setExpanded] = useState(false);
    const s  = STATUS_STYLE[c.status] ?? STATUS_STYLE.DRAFT;
    const ds = c.depositStatus ? (DEPOSIT_STYLE[c.depositStatus] ?? DEPOSIT_STYLE.UNFUNDED) : null;
    const milestones = c.milestones ?? [];

    return (
        <div style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            {/* header */}
            <div
                role="button" tabIndex={0}
                onClick={() => setExpanded(x => !x)}
                onKeyDown={(e) => e.key === 'Enter' && setExpanded(x => !x)}
                style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', cursor: 'pointer', borderBottom: expanded ? '1px solid var(--border)' : 'none' }}
            >
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-1)' }}>{c.title}</span>
                        <Badge style={s} label={s.label} />
                        {ds && <Badge style={ds} label={ds.label} />}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 3 }}>
                        Event: <strong>{c.eventName ?? '—'}</strong>
                        {c.organiserName && <> · Organiser: <strong>{c.organiserName}</strong></>}
                        {' · '}{ngn(c.amount ?? c.totalValue)}
                        {fmtDate(c.signedAt) && <> · Signed {fmtDate(c.signedAt)}</>}
                    </div>
                </div>
                <Icons.chevronD size={16} style={{ color: 'var(--text-3)', flexShrink: 0, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </div>

            {/* expanded */}
            {expanded && (
                <div style={{ padding: '20px 20px 24px' }}>
                    {/* money summary */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20, background: 'var(--surface-subtle)', borderRadius: 10, padding: '14px 16px' }}>
                        <MoneyRow label="Contract value"  value={ngn(c.amount ?? c.totalValue)} />
                        <MoneyRow label="Released to you" value={ngn(c.releasedAmount)} accent="success" />
                        <MoneyRow label="Outstanding"     value={ngn(c.outstandingBalance)} />
                    </div>

                    {/* timestamps */}
                    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: milestones.length ? 20 : 0 }}>
                        {c.signedAt    && <Chip label="Signed"    val={fmtDate(c.signedAt)} />}
                        {c.activatedAt && <Chip label="Activated" val={fmtDate(c.activatedAt)} />}
                        {c.fundedAt    && <Chip label="Funded"    val={fmtDate(c.fundedAt)} />}
                        {c.completedAt && <Chip label="Completed" val={fmtDate(c.completedAt)} />}
                        {c.cancelledAt && <Chip label="Cancelled" val={fmtDate(c.cancelledAt)} />}
                    </div>

                    {/* milestones */}
                    {milestones.length > 0 && (
                        <div>
                            <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>
                                Milestones ({milestones.length})
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {milestones.map((m, i) => {
                                    const ms = MILESTONE_STYLE[m.status] ?? MILESTONE_STYLE.PENDING;
                                    return (
                                        <div key={m.id ?? i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8, background: 'var(--surface-subtle)', flexWrap: 'wrap' }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-1)' }}>{m.title}</div>
                                                {m.description && <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{m.description}</div>}
                                                {m.disputeReason && <div style={{ fontSize: 12, color: '#D62828', marginTop: 2 }}>Dispute: {m.disputeReason}</div>}
                                                {m.releasedAt && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Released {fmtDate(m.releasedAt)}</div>}
                                            </div>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', whiteSpace: 'nowrap' }}>{ngn(m.amount)}</div>
                                            <Badge style={ms} label={ms.label} />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* actions */}
                    <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                        <Button variant="secondary" size="sm" onClick={() => navigate('/messages')}>
                            Message organiser
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

function MoneyRow({ label, value, accent }) {
    const color = accent === 'success' ? '#0F9D58' : 'var(--text-1)';
    return (
        <div style={{ fontSize: 13 }}>
            <div style={{ color: 'var(--text-2)', marginBottom: 2 }}>{label}</div>
            <div style={{ fontWeight: 700, fontSize: 15, color }}>{value}</div>
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

function ErrorBlock({ message, onRetry }) {
    return (
        <div style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: 12, padding: 40, textAlign: 'center' }}>
            <Icons.alert size={28} style={{ color: 'var(--error)' }} />
            <p style={{ marginTop: 8, color: 'var(--text-2)', fontSize: 14 }}>{message}</p>
            <Button variant="secondary" size="sm" onClick={onRetry} style={{ marginTop: 12 }}>Retry</Button>
        </div>
    );
}
