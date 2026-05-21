import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useGetMyContractsQuery, useGetEscrowQuery } from '../contractsApi';
import Button from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icon';

/* ─── helpers ─────────────────────────────────────────── */

function ngn(v) {
    const n = Number(v ?? 0);
    if (!Number.isFinite(n)) return '—';
    return `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso) {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ─── Page ────────────────────────────────────────────── */

export default function OrganizerDisputesPage() {
    const contractsQ = useGetMyContractsQuery();
    const _cd = contractsQ.data;
    const allContracts = Array.isArray(_cd) ? _cd : (_cd?.content ?? []);

    // Only ACTIVE contracts can have escrow milestones
    const activeContracts = allContracts.filter(c => c.status === 'ACTIVE');

    return (
        <div style={{ padding: '32px 40px', maxWidth: 860, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: 28 }}>
                <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: 'var(--text-1)' }}>
                    Disputes
                </h1>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--text-2)' }}>
                    Milestones you have raised disputes on. The EventNest admin team will review and rule on each one.
                </p>
            </div>

            {/* Info banner */}
            <div style={{
                background: '#FEF4E2', border: '1px solid #F5D99B',
                borderRadius: 10, padding: '14px 18px', marginBottom: 28,
                display: 'flex', gap: 12, alignItems: 'flex-start',
            }}>
                <Icons.alert size={18} style={{ color: '#B8770A', flexShrink: 0, marginTop: 1 }} />
                <div style={{ fontSize: 13, color: '#7A5000', lineHeight: 1.5 }}>
                    <strong>Raising a dispute</strong> freezes the milestone payment until admin rules. You can raise
                    disputes on PENDING milestones from the <strong>Contracts</strong> or <strong>Account</strong> tab.
                    Use disputes only when the vendor has not delivered on agreed terms.
                </div>
            </div>

            {contractsQ.isLoading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[1, 2].map(k => (
                        <div key={k} style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border)', height: 100, animation: 'pulse 1.4s ease-in-out infinite' }} />
                    ))}
                </div>
            )}

            {contractsQ.isError && (
                <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: 40, textAlign: 'center' }}>
                    <Icons.alert size={28} style={{ color: 'var(--error)' }} />
                    <p style={{ marginTop: 8, color: 'var(--text-2)', fontSize: 14 }}>Could not load dispute data.</p>
                    <Button variant="secondary" size="sm" onClick={contractsQ.refetch} style={{ marginTop: 12 }}>Retry</Button>
                </div>
            )}

            {!contractsQ.isLoading && !contractsQ.isError && activeContracts.length === 0 && (
                <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: 56, textAlign: 'center' }}>
                    <div style={{ width: 52, height: 52, borderRadius: 99, background: '#E6F4EA', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
                        <Icons.check size={26} style={{ color: '#0F9D58' }} />
                    </div>
                    <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: 16, color: 'var(--text-1)' }}>No active disputes</p>
                    <p style={{ fontSize: 14, color: 'var(--text-2)', margin: 0 }}>
                        You have no active funded contracts. Disputes can only be raised on funded escrow milestones.
                    </p>
                </div>
            )}

            {!contractsQ.isLoading && activeContracts.length > 0 && (
                <DisputeList contracts={activeContracts} />
            )}
        </div>
    );
}

/* ─── DisputeList — checks each active contract ───────── */

function DisputeList({ contracts }) {
    const [disputedCards, setDisputedCards] = useState({});
    const totalDisputed = Object.values(disputedCards).flat().length;

    return (
        <>
            {totalDisputed === 0 && !Object.keys(disputedCards).length && null}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {contracts.map(c => (
                    <ContractDisputeLoader
                        key={c.id}
                        contract={c}
                        onDisputesFound={(items) =>
                            setDisputedCards(prev => ({ ...prev, [c.id]: items }))
                        }
                    />
                ))}
            </div>

            {/* Empty state shown after all contracts have been checked */}
            {Object.keys(disputedCards).length === contracts.length && totalDisputed === 0 && (
                <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: 56, textAlign: 'center', marginTop: 8 }}>
                    <div style={{ width: 52, height: 52, borderRadius: 99, background: '#E6F4EA', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
                        <Icons.check size={26} style={{ color: '#0F9D58' }} />
                    </div>
                    <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: 16, color: 'var(--text-1)' }}>No active disputes</p>
                    <p style={{ fontSize: 14, color: 'var(--text-2)', margin: 0 }}>
                        None of your active contract milestones are under dispute.
                    </p>
                </div>
            )}
        </>
    );
}

/* ─── ContractDisputeLoader — fetches escrow, renders disputed milestones ── */

function ContractDisputeLoader({ contract, onDisputesFound }) {
    const navigate = useNavigate();
    const escrowQ = useGetEscrowQuery(contract.id);

    const escrow = escrowQ.data;
    const disputed = (escrow?.milestones ?? []).filter(m => m.status === 'DISPUTED');

    // Notify parent once loaded
    useState(() => {
        if (!escrowQ.isLoading && !escrowQ.isError && escrow) {
            onDisputesFound(disputed);
        }
    }, [escrowQ.isLoading, escrowQ.isError, escrow]);

    if (escrowQ.isLoading) return null;
    if (escrowQ.isError || !escrow || disputed.length === 0) return null;

    return (
        <div style={{ background: 'white', border: '2px solid #FBB6B6', borderRadius: 12, overflow: 'hidden' }}>
            {/* contract header */}
            <div style={{
                background: '#FBE9E9', padding: '10px 20px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icons.alert size={14} style={{ color: '#D62828' }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#D62828', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {disputed.length} disputed milestone{disputed.length !== 1 ? 's' : ''}
                    </span>
                </div>
                <span style={{ fontSize: 12, color: '#D62828', fontWeight: 500 }}>{contract.title}</span>
            </div>

            <div style={{ padding: '14px 20px 20px' }}>
                {/* contract context row */}
                <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16 }}>
                    Vendor: <strong style={{ color: 'var(--text-1)' }}>{contract.vendorName ?? '—'}</strong>
                    {contract.eventName && <> · Event: <strong style={{ color: 'var(--text-1)' }}>{contract.eventName}</strong></>}
                </div>

                {/* disputed milestones */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {disputed.map((m, i) => (
                        <DisputedMilestoneRow key={m.id ?? i} milestone={m} />
                    ))}
                </div>

                <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                    <Button variant="secondary" size="sm" onClick={() => navigate(`/organiser/account`)}>
                        View in Account
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => navigate('/messages')}>
                        Message vendor
                    </Button>
                </div>
            </div>
        </div>
    );
}

/* ─── DisputedMilestoneRow ────────────────────────────── */

function DisputedMilestoneRow({ milestone: m }) {
    return (
        <div style={{
            display: 'grid', gridTemplateColumns: '1fr auto', gap: 12,
            padding: '12px 14px', borderRadius: 8,
            background: 'var(--surface-subtle)',
            border: '1px solid #FBB6B6',
        }}>
            <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-1)', marginBottom: 4 }}>
                    {m.title}
                </div>
                {m.description && (
                    <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 8 }}>{m.description}</div>
                )}
                {m.disputeReason && (
                    <div style={{
                        background: '#FEF4E2', border: '1px solid #F5D99B',
                        borderRadius: 6, padding: '8px 12px',
                    }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#B8770A', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>
                            Your dispute reason
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-1)', lineHeight: 1.5 }}>
                            {m.disputeReason}
                        </div>
                    </div>
                )}
                {m.disputedAt && (
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>
                        Raised {fmtDate(m.disputedAt)} · Pending admin review
                    </div>
                )}
            </div>
            <div style={{ textAlign: 'right', paddingTop: 2 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#D62828' }}>{ngn(m.amount)}</div>
                <div style={{ fontSize: 11, color: '#D62828', marginTop: 2 }}>Frozen</div>
            </div>
        </div>
    );
}
