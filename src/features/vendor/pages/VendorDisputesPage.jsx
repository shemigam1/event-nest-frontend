import { useGetVendorContractsQuery } from '@/features/organiser/contractsApi';
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

export default function VendorDisputesPage() {
    const contractsQ = useGetVendorContractsQuery();
    const allContracts = contractsQ.data ?? [];

    // Flatten to disputed milestones, keeping contract context
    const disputed = allContracts.flatMap((c) => {
        const ms = (c.milestones ?? []).filter(m => m.status === 'DISPUTED');
        return ms.map(m => ({ ...m, contract: c }));
    });

    return (
        <div style={{ padding: '32px 40px', maxWidth: 860, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: 28 }}>
                <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: 'var(--text-1)' }}>
                    Disputes
                </h1>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--text-2)' }}>
                    Milestones where a dispute has been raised on your contracts.
                    Disputes are reviewed and ruled on by the EventNest admin team.
                </p>
            </div>

            {/* Info banner */}
            <div style={{
                background: '#EAF1FE', border: '1px solid #C2D9F7',
                borderRadius: 10, padding: '14px 18px', marginBottom: 28,
                display: 'flex', gap: 12, alignItems: 'flex-start',
            }}>
                <Icons.alert size={18} style={{ color: 'var(--mp-blue)', flexShrink: 0, marginTop: 1 }} />
                <div style={{ fontSize: 13, color: 'var(--mp-blue)', lineHeight: 1.5 }}>
                    <strong>How disputes work:</strong> If an organiser disputes a milestone, an EventNest admin will review
                    both sides and make a ruling. You will be notified of the outcome via your messages.
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

            {!contractsQ.isLoading && !contractsQ.isError && disputed.length === 0 && (
                <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: 56, textAlign: 'center' }}>
                    <div style={{ width: 52, height: 52, borderRadius: 99, background: '#E6F4EA', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
                        <Icons.check size={26} style={{ color: '#0F9D58' }} />
                    </div>
                    <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: 16, color: 'var(--text-1)' }}>No active disputes</p>
                    <p style={{ fontSize: 14, color: 'var(--text-2)', margin: 0 }}>
                        All your milestone payments are clear. Nothing to review here.
                    </p>
                </div>
            )}

            {!contractsQ.isLoading && disputed.length > 0 && (
                <>
                    <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--text-2)' }}>
                        {disputed.length} disputed milestone{disputed.length !== 1 ? 's' : ''} across {new Set(disputed.map(d => d.contract.id)).size} contract{new Set(disputed.map(d => d.contract.id)).size !== 1 ? 's' : ''}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {disputed.map((item, i) => (
                            <DisputeCard key={item.id ?? i} item={item} />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

/* ─── DisputeCard ─────────────────────────────────────── */

function DisputeCard({ item: m }) {
    const c = m.contract;

    return (
        <div style={{ background: 'white', border: '2px solid #FBB6B6', borderRadius: 12, overflow: 'hidden' }}>
            {/* dispute header stripe */}
            <div style={{ background: '#FBE9E9', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icons.alert size={14} style={{ color: '#D62828' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#D62828', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Disputed milestone
                </span>
            </div>

            <div style={{ padding: '16px 20px 20px' }}>
                {/* contract context */}
                <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>Contract</div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-1)', marginBottom: 2 }}>{c.title}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
                        Event: <strong>{c.eventName ?? '—'}</strong>
                        {c.organiserName && <> · Organiser: <strong>{c.organiserName}</strong></>}
                    </div>
                </div>

                {/* milestone details */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'start' }}>
                    <div>
                        <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-1)', marginBottom: 4 }}>
                            {m.title}
                        </div>
                        {m.description && (
                            <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 10 }}>
                                {m.description}
                            </div>
                        )}

                        {/* dispute reason box */}
                        {m.disputeReason && (
                            <div style={{
                                background: '#FEF4E2', border: '1px solid #F5D99B',
                                borderRadius: 8, padding: '10px 14px', marginBottom: 10,
                            }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#B8770A', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                                    Dispute reason
                                </div>
                                <div style={{ fontSize: 13, color: 'var(--text-1)', lineHeight: 1.5 }}>
                                    {m.disputeReason}
                                </div>
                            </div>
                        )}

                        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                            Pending admin review — you will be notified of the outcome.
                        </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#D62828', marginBottom: 6 }}>
                            {ngn(m.amount)}
                        </div>
                        {m.disputedAt && (
                            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                                Raised {fmtDate(m.disputedAt)}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
