import { useNavigate } from 'react-router';
import { useGetMyContractsQuery } from '../contractsApi';
import Button from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icon';
import { formatNaira } from '@/utils/currency';

const STATUS_STYLE = {
    DRAFT:         { bg: 'var(--surface-subtle)', fg: 'var(--text-2)',    label: 'Draft' },
    PENDING:       { bg: '#FEF4E2',               fg: '#B8770A',          label: 'Pending' },
    SIGNED:        { bg: '#EAF1FE',               fg: 'var(--mp-blue)',   label: 'Signed' },
    COUNTERSIGNED: { bg: '#EAF1FE',               fg: 'var(--mp-blue)',   label: 'Countersigned' },
    ACTIVE:        { bg: '#E6F4EA',               fg: '#0F9D58',          label: 'Active' },
    COMPLETED:     { bg: '#E6F4EA',               fg: '#0F7B3E',          label: 'Completed' },
    CANCELLED:     { bg: '#FBE9E9',               fg: '#D62828',          label: 'Cancelled' },
    DISPUTED:      { bg: '#FFF3E0',               fg: '#E65100',          label: 'Disputed' },
};

/* ── Main component ──────────────────────────────── */
export default function EscrowTab() {
    const navigate = useNavigate();
    const { data: contracts = [], isLoading, isError, refetch } = useGetMyContractsQuery();

    const totalValue  = contracts.reduce((s, c) => s + (c.amount ?? 0), 0);
    const activeCount = contracts.filter((c) => c.status === 'ACTIVE').length;
    const fundedCount = contracts.filter((c) => c.escrowStatus === 'FUNDED').length;

    if (isLoading) return <EscrowSkeleton />;

    if (isError) {
        return (
            <div style={{
                background: 'white', border: '1px solid var(--border)',
                borderRadius: 12, padding: 40, textAlign: 'center',
            }}>
                <Icons.alert size={28} style={{ color: 'var(--error)' }} />
                <p className="body-sm" style={{ marginTop: 8, color: 'var(--text-2)' }}>
                    Could not load contracts.
                </p>
                <Button variant="secondary" size="sm" onClick={refetch} style={{ marginTop: 12 }}>
                    Retry
                </Button>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: 20,
            }}>
                <div>
                    <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-1)' }}>
                        Escrow & Contracts
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
                        Track vendor payment commitments across all your events
                    </div>
                </div>
                <Button
                    variant="secondary" size="sm"
                    onClick={() => navigate('/organiser/contracts')}
                >
                    Full contracts view
                </Button>
            </div>

            {/* Stats */}
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 14, marginBottom: 24,
            }}>
                <StatTile label="Total contracts" value={contracts.length} icon={<Icons.list size={16} />} />
                <StatTile
                    label="Active"
                    value={activeCount}
                    icon={<Icons.bolt size={16} />}
                    accent={activeCount > 0 ? 'var(--mp-blue)' : undefined}
                />
                <StatTile
                    label="Total value"
                    value={formatNaira(totalValue, { zeroLabel: '₦0' })}
                    icon={<Icons.wallet size={16} />}
                />
            </div>

            {/* Empty state */}
            {contracts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '56px 24px' }}>
                    <div style={{
                        width: 56, height: 56, borderRadius: 99, margin: '0 auto 16px',
                        background: 'var(--surface-subtle)', display: 'grid',
                        placeItems: 'center', color: 'var(--text-3)',
                    }}>
                        <Icons.shield size={24} />
                    </div>
                    <div className="mp-h4" style={{ color: 'var(--text-1)', margin: 0 }}>
                        No contracts yet
                    </div>
                    <p className="body-sm" style={{ color: 'var(--text-2)', margin: '8px 0 0' }}>
                        Vendor contracts will appear here. Create one from inside any event's Vendors tab.
                    </p>
                </div>
            ) : (
                <div style={{
                    background: 'white', border: '1px solid var(--border)',
                    borderRadius: 12, overflow: 'hidden',
                }}>
                    <div style={{
                        padding: '14px 20px', borderBottom: '1px solid var(--border)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 14 }}>
                            All contracts
                        </span>
                        <span style={{ fontSize: 13, color: 'var(--text-3)' }}>
                            {contracts.length} contract{contracts.length !== 1 ? 's' : ''}
                            {fundedCount > 0 && ` · ${fundedCount} funded`}
                        </span>
                    </div>

                    {contracts.map((c, i) => (
                        <ContractRow
                            key={c.id}
                            contract={c}
                            isLast={i === contracts.length - 1}
                            onOpen={() => navigate('/organiser/contracts')}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

/* ── Contract row ────────────────────────────────── */
function ContractRow({ contract: c, isLast, onOpen }) {
    const style      = STATUS_STYLE[c.status] || STATUS_STYLE.DRAFT;
    const milestones = Array.isArray(c.milestones) ? c.milestones : [];
    const released   = milestones.filter((m) => m.status === 'RELEASED').length;

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onOpen}
            onKeyDown={(e) => e.key === 'Enter' && onOpen()}
            style={{
                display: 'grid',
                gridTemplateColumns: '1fr 130px 120px 20px',
                gap: 16, alignItems: 'center',
                padding: '16px 20px',
                borderBottom: isLast ? 0 : '1px solid var(--border)',
                cursor: 'pointer',
                transition: 'background 0.12s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-subtle)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
        >
            {/* Vendor + event */}
            <div style={{ minWidth: 0 }}>
                <div style={{
                    fontWeight: 600, fontSize: 14,
                    color: 'var(--text-1)', marginBottom: 3,
                }}>
                    {c.vendorName || 'Unknown vendor'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
                    {c.eventName || 'Unknown event'}
                </div>
                {milestones.length > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>
                        {released}/{milestones.length} milestone{milestones.length !== 1 ? 's' : ''} released
                    </div>
                )}
            </div>

            {/* Amount */}
            <div className="mp-num" style={{
                textAlign: 'right', fontWeight: 600,
                color: 'var(--text-1)', fontSize: 14,
            }}>
                {formatNaira(c.amount ?? 0, { zeroLabel: '—' })}
            </div>

            {/* Status */}
            <span style={{
                display: 'inline-block', padding: '3px 10px',
                borderRadius: 99, background: style.bg, color: style.fg,
                fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
            }}>
                {style.label}
            </span>

            {/* Chevron */}
            <Icons.chevronR size={16} style={{ color: 'var(--text-3)' }} />
        </div>
    );
}

/* ── Shared stat tile ────────────────────────────── */
function StatTile({ label, value, icon, accent }) {
    return (
        <div style={{
            background: 'white', border: '1px solid var(--border)',
            borderRadius: 12, padding: 20, boxShadow: 'var(--shadow-card)',
        }}>
            <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                marginBottom: 12, fontSize: 13, fontWeight: 500, color: 'var(--text-2)',
            }}>
                {icon} {label}
            </div>
            <div className="mp-num" style={{
                fontSize: 26, fontWeight: 700,
                color: accent || 'var(--text-1)', lineHeight: 1,
            }}>
                {value}
            </div>
        </div>
    );
}

/* ── Skeleton ────────────────────────────────────── */
function EscrowSkeleton() {
    const tile = {
        height: 90, borderRadius: 12, border: '1px solid var(--border)',
        background: 'var(--surface-subtle)', animation: 'mp-flash 1.6s ease-in-out infinite',
    };
    const row = {
        height: 82, borderBottom: '1px solid var(--border)',
        background: 'var(--surface-subtle)', animation: 'mp-flash 1.6s ease-in-out infinite',
    };
    return (
        <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
                <div style={tile} />
                <div style={{ ...tile, opacity: 0.7 }} />
                <div style={{ ...tile, opacity: 0.4 }} />
            </div>
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ ...row, height: 50 }} />
                <div style={row} />
                <div style={{ ...row, opacity: 0.6 }} />
                <div style={{ ...row, opacity: 0.3, borderBottom: 0 }} />
            </div>
        </div>
    );
}
