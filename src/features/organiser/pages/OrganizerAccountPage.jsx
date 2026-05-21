import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
    useGetMyContractsQuery,
    useFundEscrowMutation,
    useGetEscrowQuery,
    useAddMilestoneMutation,
    useApproveMilestoneMutation,
    useReleaseMilestoneMutation,
    useDisputeMilestoneMutation,
} from '../contractsApi';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { Icons } from '@/components/ui/Icon';

/* ─── helpers ─────────────────────────────────────────── */

const MILESTONE_STYLE = {
    PENDING:  { bg: '#FEF4E2', fg: '#B8770A', label: 'Pending' },
    APPROVED: { bg: '#EAF1FE', fg: 'var(--mp-blue)', label: 'Approved' },
    RELEASED: { bg: '#E6F4EA', fg: '#0F9D58', label: 'Released' },
    DISPUTED: { bg: '#FBE9E9', fg: '#D62828', label: 'Disputed' },
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

export default function OrganizerAccountPage() {
    const contractsQ = useGetMyContractsQuery();
    const _cd = contractsQ.data;
    const allContracts = Array.isArray(_cd) ? _cd : (_cd?.content ?? []);

    const needsFunding = allContracts.filter(c => c.status === 'SIGNED');
    const activeEscrows = allContracts.filter(c => c.status === 'ACTIVE');

    const totalLocked   = allContracts
        .filter(c => ['SIGNED', 'ACTIVE'].includes(c.status))
        .reduce((s, c) => s + Number(c.amount ?? 0), 0);
    const totalFunding  = needsFunding.reduce((s, c) => s + Number(c.amount ?? 0), 0);

    return (
        <div style={{ padding: '32px 40px', maxWidth: 900, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: 28 }}>
                <h1 className="mp-h1" style={{ margin: '0 0 4px', color: 'var(--text-1)', fontSize: 24 }}>
                    Account
                </h1>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--text-2)' }}>
                    Fund escrows and manage milestone payments across all your events.
                </p>
            </div>

            {/* Summary cards */}
            {!contractsQ.isLoading && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 36 }}>
                    <SummaryCard
                        icon={<Icons.wallet size={20} />}
                        label="Total value locked"
                        value={ngn(totalLocked)}
                        accent="blue"
                    />
                    <SummaryCard
                        icon={<Icons.alert size={20} />}
                        label="Awaiting your funding"
                        value={ngn(totalFunding)}
                        count={needsFunding.length}
                        accent={needsFunding.length > 0 ? 'warn' : 'neutral'}
                    />
                    <SummaryCard
                        icon={<Icons.check size={20} />}
                        label="Active escrows"
                        value={activeEscrows.length}
                        accent={activeEscrows.length > 0 ? 'success' : 'neutral'}
                    />
                </div>
            )}

            {contractsQ.isLoading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {[1, 2].map(k => (
                        <div key={k} style={{
                            background: 'white', borderRadius: 12, border: '1px solid var(--border)',
                            height: 100, animation: 'pulse 1.4s ease-in-out infinite',
                        }} />
                    ))}
                </div>
            )}

            {contractsQ.isError && (
                <div style={{
                    background: 'white', border: '1px solid var(--border)',
                    borderRadius: 12, padding: 40, textAlign: 'center',
                }}>
                    <Icons.alert size={28} style={{ color: 'var(--error)' }} />
                    <p style={{ marginTop: 8, color: 'var(--text-2)', fontSize: 14 }}>Could not load account data.</p>
                    <Button variant="secondary" size="sm" onClick={contractsQ.refetch} style={{ marginTop: 12 }}>Retry</Button>
                </div>
            )}

            {!contractsQ.isLoading && !contractsQ.isError && (
                <>
                    {/* ── Needs funding ── */}
                    <Section
                        title="Needs funding"
                        subtitle="These contracts are signed and ready — fund the escrow to activate them."
                        accent="warn"
                        empty={needsFunding.length === 0}
                        emptyText="No contracts waiting for funding."
                    >
                        {needsFunding.map(c => <FundingCard key={c.id} contract={c} />)}
                    </Section>

                    {/* ── Active escrows ── */}
                    <Section
                        title="Active escrows"
                        subtitle="Review and release milestone payments as work is completed."
                        accent="success"
                        empty={activeEscrows.length === 0}
                        emptyText="No active escrows yet. Fund a signed contract to get started."
                    >
                        {activeEscrows.map(c => <EscrowCard key={c.id} contract={c} />)}
                    </Section>
                </>
            )}
        </div>
    );
}

/* ─── Section wrapper ─────────────────────────────────── */

function Section({ title, subtitle, accent, empty, emptyText, children }) {
    const accentColor = {
        warn:    'var(--warning, #B8770A)',
        success: 'var(--success, #0F9D58)',
        blue:    'var(--mp-blue)',
    }[accent] ?? 'var(--text-1)';

    return (
        <div style={{ marginBottom: 40 }}>
            <div style={{ marginBottom: 16 }}>
                <h2 style={{ margin: '0 0 2px', fontSize: 17, fontWeight: 700, color: 'var(--text-1)' }}>
                    <span style={{ color: accentColor }}>·</span> {title}
                </h2>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)' }}>{subtitle}</p>
            </div>
            {empty ? (
                <div style={{
                    background: 'var(--surface-subtle)', borderRadius: 12,
                    padding: '24px 28px', fontSize: 14, color: 'var(--text-3)',
                }}>
                    {emptyText}
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {children}
                </div>
            )}
        </div>
    );
}

/* ─── SummaryCard ─────────────────────────────────────── */

function SummaryCard({ icon, label, value, count, accent }) {
    const styles = {
        blue:    { bg: 'var(--mp-blue)', iconBg: 'rgba(255,255,255,0.2)', valColor: 'white', textColor: 'rgba(255,255,255,0.85)', cardBorder: 'transparent' },
        warn:    { bg: '#FEF4E2', iconBg: 'rgba(184,119,10,0.12)', valColor: '#B8770A', textColor: 'var(--text-2)', cardBorder: '#F5D99B' },
        success: { bg: '#E6F4EA', iconBg: 'rgba(15,157,88,0.12)', valColor: '#0F9D58', textColor: 'var(--text-2)', cardBorder: '#B7DFC5' },
        neutral: { bg: 'white', iconBg: 'var(--surface-subtle)', valColor: 'var(--text-1)', textColor: 'var(--text-2)', cardBorder: 'var(--border)' },
    }[accent] ?? { bg: 'white', iconBg: 'var(--surface-subtle)', valColor: 'var(--text-1)', textColor: 'var(--text-2)', cardBorder: 'var(--border)' };

    return (
        <div style={{ background: styles.bg, border: `1px solid ${styles.cardBorder}`, borderRadius: 14, padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ display: 'inline-flex', padding: 8, borderRadius: 8, background: styles.iconBg, color: styles.valColor }}>
                    {icon}
                </span>
                <span style={{ fontSize: 13, color: styles.textColor, fontWeight: 500 }}>{label}</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: styles.valColor }}>
                {value}
                {count != null && <span style={{ fontSize: 14, fontWeight: 500, marginLeft: 6 }}>({count})</span>}
            </div>
        </div>
    );
}

/* ─── FundingCard (SIGNED contracts) ─────────────────── */

function FundingCard({ contract }) {
    const navigate = useNavigate();
    const [showPayModal, setShowPayModal] = useState(false);

    return (
        <div style={{
            background: 'white', border: '1px solid #F5D99B',
            borderRadius: 12, padding: '18px 20px',
            display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        }}>
            <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)', marginBottom: 3 }}>
                    {contract.title}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
                    Vendor: <strong>{contract.vendorName ?? '—'}</strong>
                    {contract.eventName && <> · <strong>{contract.eventName}</strong></>}
                </div>
                {contract.terms && (
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4, maxWidth: 420, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {contract.terms}
                    </div>
                )}
            </div>
            <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#B8770A', marginBottom: 8 }}>
                    {ngn(contract.amount)}
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    {contract.conversationId && (
                        <Button variant="secondary" size="sm"
                            onClick={() => navigate(`/messages?c=${contract.conversationId}`)}>
                            Message
                        </Button>
                    )}
                    <Button variant="primary" size="sm" onClick={() => setShowPayModal(true)}>
                        Fund escrow
                    </Button>
                </div>
            </div>

            {showPayModal && (
                <PaymentModal contract={contract} onDismiss={() => setShowPayModal(false)} />
            )}
        </div>
    );
}

/* ─── PaymentModal — simulated payment ───────────────── */

function PaymentModal({ contract, onDismiss }) {
    const [fundEscrow, state] = useFundEscrowMutation();
    const [step, setStep] = useState('review'); // 'review' | 'processing' | 'done' | 'error'
    const [errMsg, setErrMsg] = useState('');

    async function confirmPayment() {
        setStep('processing');
        try {
            await fundEscrow(contract.id).unwrap();
            setStep('done');
        } catch (e) {
            setErrMsg(e?.data?.message ?? 'Payment failed. Please try again.');
            setStep('error');
        }
    }

    return (
        <Modal open onClose={step === 'processing' ? undefined : onDismiss} label="Fund escrow" width={460}>
            <div style={{ padding: 28 }}>

                {step === 'review' && (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                            <div style={{
                                width: 48, height: 48, borderRadius: 12,
                                background: '#EAF1FE', display: 'grid', placeItems: 'center',
                            }}>
                                <Icons.wallet size={22} style={{ color: 'var(--mp-blue)' }} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-1)' }}>
                                    Fund escrow
                                </h3>
                                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)' }}>
                                    Simulated payment — no real money is transferred.
                                </p>
                            </div>
                        </div>

                        {/* contract summary */}
                        <div style={{
                            background: 'var(--surface-subtle)', borderRadius: 10,
                            padding: '14px 16px', marginBottom: 20,
                        }}>
                            <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 2 }}>Contract</div>
                            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)', marginBottom: 8 }}>
                                {contract.title}
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
                                Vendor: <strong style={{ color: 'var(--text-1)' }}>{contract.vendorName ?? '—'}</strong>
                            </div>
                            {contract.eventName && (
                                <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
                                    Event: <strong style={{ color: 'var(--text-1)' }}>{contract.eventName}</strong>
                                </div>
                            )}
                        </div>

                        {/* amount breakdown */}
                        <div style={{
                            border: '1px solid var(--border)', borderRadius: 10,
                            overflow: 'hidden', marginBottom: 24,
                        }}>
                            <div style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '12px 16px', borderBottom: '1px solid var(--border)',
                                fontSize: 13, color: 'var(--text-2)',
                            }}>
                                <span>Escrow amount</span>
                                <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{ngn(contract.amount)}</span>
                            </div>
                            <div style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '12px 16px',
                                fontSize: 14, fontWeight: 700, color: 'var(--text-1)',
                                background: 'var(--surface-subtle)',
                            }}>
                                <span>Total to fund</span>
                                <span style={{ color: 'var(--mp-blue)', fontSize: 18 }}>{ngn(contract.amount)}</span>
                            </div>
                        </div>

                        {/* simulated bank details */}
                        <div style={{
                            background: '#F0F7FF', border: '1px solid #C2D9F7',
                            borderRadius: 10, padding: '14px 16px', marginBottom: 24,
                        }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--mp-blue)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Simulated bank transfer
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: 13 }}>
                                <div>
                                    <div style={{ color: 'var(--text-3)', marginBottom: 2 }}>Bank name</div>
                                    <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>EventNest Escrow Bank</div>
                                </div>
                                <div>
                                    <div style={{ color: 'var(--text-3)', marginBottom: 2 }}>Account number</div>
                                    <div style={{ fontWeight: 600, color: 'var(--text-1)', fontFamily: 'monospace' }}>0123456789</div>
                                </div>
                                <div>
                                    <div style={{ color: 'var(--text-3)', marginBottom: 2 }}>Account name</div>
                                    <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>EventNest Escrow</div>
                                </div>
                                <div>
                                    <div style={{ color: 'var(--text-3)', marginBottom: 2 }}>Reference</div>
                                    <div style={{ fontWeight: 600, color: 'var(--text-1)', fontFamily: 'monospace', fontSize: 12 }}>
                                        {contract.id?.slice(0, 12)?.toUpperCase() ?? 'ESC-REF'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <Button type="button" variant="secondary" size="md" onClick={onDismiss}>Cancel</Button>
                            <Button type="button" variant="primary" size="md" onClick={confirmPayment}>
                                Confirm & fund escrow
                            </Button>
                        </div>
                    </>
                )}

                {step === 'processing' && (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <div style={{
                            width: 48, height: 48, borderRadius: 99,
                            border: '3px solid var(--mp-blue)',
                            borderTopColor: 'transparent',
                            animation: 'spin 0.8s linear infinite',
                            margin: '0 auto 16px',
                        }} />
                        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)', margin: '0 0 4px' }}>Processing…</p>
                        <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0 }}>Funding escrow for {contract.title}</p>
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                )}

                {step === 'done' && (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <div style={{
                            width: 56, height: 56, borderRadius: 99,
                            background: '#E6F4EA', display: 'grid', placeItems: 'center',
                            margin: '0 auto 16px',
                        }}>
                            <Icons.check size={28} style={{ color: '#0F9D58' }} />
                        </div>
                        <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', margin: '0 0 4px' }}>Escrow funded!</p>
                        <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '0 0 24px' }}>
                            {ngn(contract.amount)} has been locked in escrow for <strong>{contract.title}</strong>.
                            The contract is now active.
                        </p>
                        <Button variant="primary" size="md" onClick={onDismiss}>Done</Button>
                    </div>
                )}

                {step === 'error' && (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <div style={{
                            width: 56, height: 56, borderRadius: 99,
                            background: '#FBE9E9', display: 'grid', placeItems: 'center',
                            margin: '0 auto 16px',
                        }}>
                            <Icons.alert size={28} style={{ color: '#D62828' }} />
                        </div>
                        <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', margin: '0 0 4px' }}>Payment failed</p>
                        <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '0 0 24px' }}>{errMsg}</p>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                            <Button variant="secondary" size="md" onClick={onDismiss}>Close</Button>
                            <Button variant="primary" size="md" onClick={() => setStep('review')}>Try again</Button>
                        </div>
                    </div>
                )}

            </div>
        </Modal>
    );
}

/* ─── EscrowCard (ACTIVE contracts) ──────────────────── */

function EscrowCard({ contract }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div style={{ background: 'white', border: '1px solid #B7DFC5', borderRadius: 12, overflow: 'hidden' }}>
            <div
                role="button" tabIndex={0}
                onClick={() => setExpanded(x => !x)}
                onKeyDown={(e) => e.key === 'Enter' && setExpanded(x => !x)}
                style={{
                    display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px',
                    cursor: 'pointer', borderBottom: expanded ? '1px solid var(--border)' : 'none',
                }}
            >
                <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: '#E6F4EA', display: 'grid', placeItems: 'center', flexShrink: 0,
                }}>
                    <Icons.wallet size={18} style={{ color: '#0F9D58' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)', marginBottom: 2 }}>
                        {contract.title}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
                        Vendor: <strong>{contract.vendorName ?? '—'}</strong>
                        {contract.eventName && <> · <strong>{contract.eventName}</strong></>}
                        {' · '}{ngn(contract.amount)} funded
                        {fmtDate(contract.fundedAt) && <> · Funded {fmtDate(contract.fundedAt)}</>}
                    </div>
                </div>
                <Icons.chevronD
                    size={16}
                    style={{ color: 'var(--text-3)', flexShrink: 0, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                />
            </div>

            {expanded && (
                <div style={{ padding: '20px 20px 24px' }}>
                    <EscrowPanel contractId={contract.id} contractStatus={contract.status} />
                </div>
            )}
        </div>
    );
}

/* ─── EscrowPanel ─────────────────────────────────────── */

function EscrowPanel({ contractId, contractStatus }) {
    const [showAdd, setShowAdd] = useState(false);
    const [disputing, setDisputing] = useState(null);
    const escrowQ = useGetEscrowQuery(contractId);
    const [approve, approveState]   = useApproveMilestoneMutation();
    const [release, releaseState]   = useReleaseMilestoneMutation();
    const [dispute, disputeState]   = useDisputeMilestoneMutation();
    const [err, setErr] = useState('');

    const escrow     = escrowQ.data;
    const canAddMilestone = ['FUNDED', 'ACTIVE'].includes(contractStatus);
    const canRelease      = contractStatus === 'ACTIVE';

    async function act(fn, label) {
        setErr('');
        try { await fn().unwrap(); }
        catch (e) { setErr(e?.data?.message ?? `Failed to ${label}`); }
    }

    if (escrowQ.isLoading) return (
        <div style={{ height: 60, background: 'var(--surface-subtle)', borderRadius: 8, animation: 'pulse 1.4s ease-in-out infinite' }} />
    );
    if (escrowQ.isError || !escrow) return (
        <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Escrow data unavailable.</div>
    );

    const milestones = escrow.milestones ?? [];
    const busy = approveState.isLoading || releaseState.isLoading || disputeState.isLoading;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                    <EscrowStat label="Total"    value={ngn(escrow.totalAmount)} />
                    <EscrowStat label="Released" value={ngn(escrow.releasedAmount)} accent="success" />
                    <EscrowStat label="Pending"  value={ngn(escrow.pendingAmount)} />
                </div>
                {canAddMilestone && (
                    <Button variant="secondary" size="sm" onClick={() => setShowAdd(true)}>+ Add milestone</Button>
                )}
            </div>

            {milestones.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>No milestones added yet.</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {milestones.map((m) => (
                        <MilestoneRow key={m.id} milestone={m} canRelease={canRelease} busy={busy}
                            onApprove={() => act(() => approve({ contractId, milestoneId: m.id }), 'approve milestone')}
                            onRelease={() => act(() => release({ contractId, milestoneId: m.id }), 'release milestone')}
                            onDispute={() => setDisputing(m)}
                        />
                    ))}
                </div>
            )}

            {err && <p style={{ fontSize: 13, color: 'var(--error)', margin: '8px 0 0' }}>{err}</p>}

            {showAdd && <AddMilestoneModal contractId={contractId} onDismiss={() => setShowAdd(false)} />}
            {disputing && (
                <DisputeReasonModal milestone={disputing} busy={disputeState.isLoading}
                    onDismiss={() => setDisputing(null)}
                    onSubmit={async (reason) => {
                        setErr('');
                        try {
                            await dispute({ contractId, milestoneId: disputing.id, reason }).unwrap();
                            setDisputing(null);
                        } catch (e) {
                            setErr(e?.data?.message ?? 'Failed to raise dispute');
                        }
                    }}
                />
            )}
        </div>
    );
}

function EscrowStat({ label, value, accent }) {
    const color = accent === 'success' ? '#0F9D58' : 'var(--text-1)';
    return (
        <div style={{ fontSize: 13 }}>
            <div style={{ color: 'var(--text-2)', marginBottom: 1 }}>{label}</div>
            <div style={{ fontWeight: 600, color }}>{value}</div>
        </div>
    );
}

/* ─── MilestoneRow ────────────────────────────────────── */

function MilestoneRow({ milestone: m, canRelease, busy, onApprove, onRelease, onDispute }) {
    const ms = MILESTONE_STYLE[m.status] ?? MILESTONE_STYLE.PENDING;
    const ngn2 = (v) => {
        const n = Number(v ?? 0);
        return Number.isFinite(n) ? `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';
    };
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
            borderRadius: 8, background: 'var(--surface-subtle)', flexWrap: 'wrap',
        }}>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-1)' }}>{m.title}</div>
                {m.description && <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{m.description}</div>}
                {m.disputeReason && <div style={{ fontSize: 12, color: '#D62828', marginTop: 2 }}>Dispute: {m.disputeReason}</div>}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', whiteSpace: 'nowrap' }}>{ngn2(m.amount)}</div>
            <Badge style={ms} label={ms.label} />
            {m.status === 'PENDING' && (
                <>
                    <Button variant="secondary" size="sm" disabled={busy} onClick={onApprove}>Approve</Button>
                    <Button variant="destructive" size="sm" disabled={busy} onClick={onDispute}>Raise dispute</Button>
                </>
            )}
            {m.status === 'APPROVED' && canRelease && (
                <Button variant="primary" size="sm" disabled={busy} onClick={onRelease}>Release</Button>
            )}
            {m.releasedAt && <span style={{ fontSize: 12, color: 'var(--text-2)' }}>Released {fmtDate(m.releasedAt)}</span>}
        </div>
    );
}

/* ─── AddMilestoneModal ───────────────────────────────── */

function AddMilestoneModal({ contractId, onDismiss }) {
    const [addMilestone, state] = useAddMilestoneMutation();
    const [form, setForm] = useState({ title: '', description: '', amount: '' });
    const [err, setErr] = useState('');
    const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
    const canSubmit = form.title.trim() && Number(form.amount) >= 1;

    async function handleSubmit(e) {
        e.preventDefault(); setErr('');
        try {
            await addMilestone({ contractId, title: form.title.trim(), description: form.description.trim() || undefined, amount: Number(form.amount) }).unwrap();
            onDismiss();
        } catch (e) { setErr(e?.data?.message ?? 'Failed to add milestone'); }
    }

    return (
        <Modal open onClose={onDismiss} label="Add milestone" width={440}>
            <div style={{ padding: 24 }}>
                <h3 className="mp-h3" style={{ margin: '0 0 20px', color: 'var(--text-1)' }}>Add milestone</h3>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <Field label="Title *"><Input value={form.title} onChange={set('title')} placeholder="e.g. Pre-event setup" required /></Field>
                    <Field label="Amount (₦) *"><Input type="number" min="1" step="0.01" value={form.amount} onChange={set('amount')} placeholder="0.00" required /></Field>
                    <Field label="Description">
                        <textarea value={form.description} onChange={set('description')} rows={3}
                            placeholder="What the vendor needs to deliver…"
                            style={{ width: '100%', padding: '9px 12px', fontSize: 14, border: '1px solid var(--border)', borderRadius: 8, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', color: 'var(--text-1)', background: 'white' }} />
                    </Field>
                    {err && <p style={{ fontSize: 13, color: 'var(--error)', margin: 0 }}>{err}</p>}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                        <Button type="button" variant="secondary" size="md" onClick={onDismiss}>Cancel</Button>
                        <Button type="submit" variant="primary" size="md" disabled={!canSubmit || state.isLoading}>
                            {state.isLoading ? 'Adding…' : 'Add milestone'}
                        </Button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}

/* ─── DisputeReasonModal ──────────────────────────────── */

function DisputeReasonModal({ milestone, onSubmit, onDismiss, busy }) {
    const [reason, setReason] = useState('');
    const canSubmit = reason.trim().length >= 10;
    return (
        <Modal open onClose={onDismiss} label="Raise dispute" width={440}>
            <div style={{ padding: 24 }}>
                <h3 className="mp-h3" style={{ margin: '0 0 6px', color: 'var(--text-1)' }}>Raise a dispute</h3>
                <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '0 0 20px' }}>
                    Milestone: <strong>{milestone.title}</strong>
                </p>
                <form onSubmit={(e) => { e.preventDefault(); if (canSubmit) onSubmit(reason.trim()); }}
                    style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <Field label="Reason *">
                        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} required
                            placeholder="Describe why you are disputing this milestone (min. 10 characters)…"
                            style={{ width: '100%', padding: '9px 12px', fontSize: 14, border: '1px solid var(--border)', borderRadius: 8, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', color: 'var(--text-1)', background: 'white' }} />
                    </Field>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                        <Button type="button" variant="secondary" size="md" onClick={onDismiss}>Cancel</Button>
                        <Button type="submit" variant="destructive" size="md" disabled={!canSubmit || busy}>
                            {busy ? 'Submitting…' : 'Submit dispute'}
                        </Button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}

function Field({ label, children }) {
    return (
        <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 6 }}>
                {label}
            </label>
            {children}
        </div>
    );
}
