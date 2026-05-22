import { useNavigate } from 'react-router';
import { useGetMyContractsQuery } from '../contractsApi';
import Button from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icon';

const STATUS_STYLE = {
    DRAFT:         { bg: 'var(--surface-subtle)', fg: 'var(--text-2)',    label: 'Draft' },
    SIGNED:        { bg: '#EAF1FE',               fg: 'var(--mp-blue)',   label: 'Signed' },
    ACTIVE:        { bg: '#E6F4EA',               fg: '#0F9D58',          label: 'Active' },
    COMPLETED:     { bg: '#E6F4EA',               fg: '#0F7B3E',          label: 'Completed' },
    CANCELLED:     { bg: '#FBE9E9',               fg: '#D62828',          label: 'Cancelled' },
    COUNTERSIGNED: { bg: '#EAF1FE',               fg: 'var(--mp-blue)',   label: 'Countersigned' },
};

function ngn(v) {
    const n = Number(v ?? 0);
    if (!Number.isFinite(n)) return '—';
    return `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso) {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function StatusBadge({ status }) {
    const s = STATUS_STYLE[status] ?? STATUS_STYLE.DRAFT;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '2px 10px', borderRadius: 20,
            fontSize: 12, fontWeight: 600,
            background: s.bg, color: s.fg,
        }}>
            {s.label}
        </span>
    );
}

function ContractRow({ contract, isLast }) {
    const navigate = useNavigate();
    const eventLabel = contract.eventTitle ?? contract.eventName;
    const vendorLabel = contract.vendorBusinessName ?? contract.vendorName;

    return (
        <div style={{ borderBottom: isLast ? 0 : '1px solid var(--border)' }}>
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 120px 130px auto',
                gap: 16, alignItems: 'center',
                padding: '16px 20px',
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 15 }}>
                            {contract.title}
                        </span>
                        <StatusBadge status={contract.status} />
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
                        {eventLabel && <><Icons.calendar size={12} style={{ verticalAlign: 'middle', color: 'var(--text-3)', marginRight: 3 }} />{eventLabel} · </>}
                        {vendorLabel && <span>Vendor: <strong>{vendorLabel}</strong></span>}
                        {fmtDate(contract.createdAt) && <span style={{ color: 'var(--text-3)' }}> · {fmtDate(contract.createdAt)}</span>}
                    </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                    <div className="mp-num" style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>
                        {ngn(contract.totalValue ?? contract.amount)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>contract value</div>
                </div>

                <div style={{ textAlign: 'right' }}>
                    <div className="mp-num" style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>
                        {contract.eventId
                            ? <button
                                onClick={() => navigate(`/organiser/events/${contract.eventId}`)}
                                style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', color: 'var(--mp-blue)', fontSize: 13, fontWeight: 500 }}
                            >
                                View event
                            </button>
                            : '—'
                        }
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {contract.conversationId && (
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => navigate(`/messages?c=${contract.conversationId}`)}
                        >
                            Message
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function ContractsDashTab() {
    const { data: contracts = [], isLoading, isError, refetch } = useGetMyContractsQuery();

    if (isLoading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[1, 2, 3].map((k) => (
                    <div key={k} style={{
                        background: 'white', borderRadius: 12,
                        border: '1px solid var(--border)', height: 72,
                        animation: 'mp-flash 1.6s ease-in-out infinite',
                        opacity: 1.1 - k * 0.2,
                    }} />
                ))}
            </div>
        );
    }

    if (isError) {
        return (
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: 48, textAlign: 'center' }}>
                <Icons.alert size={28} style={{ color: 'var(--error)' }} />
                <p style={{ marginTop: 8, color: 'var(--text-2)', fontSize: 14 }}>Could not load contracts.</p>
                <Button variant="secondary" size="sm" onClick={refetch} style={{ marginTop: 12 }}>Retry</Button>
            </div>
        );
    }

    if (contracts.length === 0) {
        return (
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: 56, textAlign: 'center' }}>
                <Icons.list size={32} style={{ color: 'var(--text-3)', marginBottom: 12 }} />
                <p className="mp-h3" style={{ margin: '0 0 4px', color: 'var(--text-1)' }}>No contracts yet</p>
                <p style={{ fontSize: 14, color: 'var(--text-2)', margin: 0 }}>
                    Contracts you create with vendors will appear here.
                </p>
            </div>
        );
    }

    const active    = contracts.filter((c) => c.status === 'ACTIVE');
    const signed    = contracts.filter((c) => c.status === 'SIGNED' || c.status === 'COUNTERSIGNED');
    const draft     = contracts.filter((c) => c.status === 'DRAFT');
    const completed = contracts.filter((c) => c.status === 'COMPLETED');
    const cancelled = contracts.filter((c) => c.status === 'CANCELLED');

    return (
        <>
            {/* Summary strip */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
                {[
                    { label: 'Total', count: contracts.length, color: 'var(--text-1)' },
                    { label: 'Active',    count: active.length,    color: '#0F9D58' },
                    { label: 'Signed',    count: signed.length,    color: 'var(--mp-blue)' },
                    { label: 'Draft',     count: draft.length,     color: 'var(--text-2)' },
                    { label: 'Completed', count: completed.length, color: '#0F7B3E' },
                ].map(({ label, count, color }) => count > 0 && (
                    <div key={label} style={{
                        background: 'white', border: '1px solid var(--border)',
                        borderRadius: 10, padding: '10px 16px',
                        display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                        <span className="mp-num" style={{ fontWeight: 700, fontSize: 18, color }}>{count}</span>
                        <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{label}</span>
                    </div>
                ))}
            </div>

            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 14 }}>All contracts</span>
                    <span style={{ fontSize: 13, color: 'var(--text-3)' }}>
                        {contracts.length} contract{contracts.length !== 1 ? 's' : ''}
                    </span>
                </div>
                {contracts.map((c, i) => (
                    <ContractRow key={c.id} contract={c} isLast={i === contracts.length - 1} />
                ))}
            </div>
        </>
    );
}
