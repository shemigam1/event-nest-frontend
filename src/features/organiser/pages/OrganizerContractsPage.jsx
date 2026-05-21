import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
    useGetMyContractsQuery,
    useRescindContractMutation,
    useCancelContractMutation,
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

const FILTER_TABS = [
    { key: 'ALL',       label: 'All' },
    { key: 'DRAFT',     label: 'Draft' },
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

export default function OrganizerContractsPage() {
    const [activeFilter, setActiveFilter] = useState('ALL');
    const [search, setSearch] = useState('');
    const contractsQ = useGetMyContractsQuery();
    const _cd = contractsQ.data;
    const allContracts = Array.isArray(_cd) ? _cd : (_cd?.content ?? []);

    const filtered = allContracts.filter((c) => {
        if (activeFilter !== 'ALL' && c.status !== activeFilter) return false;
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            return (
                (c.title ?? '').toLowerCase().includes(q) ||
                (c.vendorName ?? '').toLowerCase().includes(q) ||
                (c.eventName ?? '').toLowerCase().includes(q)
            );
        }
        return true;
    });

    // Summary counts
    const totalActive    = allContracts.filter(c => c.status === 'ACTIVE').length;
    const totalSigned    = allContracts.filter(c => c.status === 'SIGNED').length;
    const totalValue     = allContracts.reduce((s, c) => s + Number(c.amount ?? 0), 0);

    return (
        <div style={{ padding: '32px 40px', maxWidth: 900, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: 28 }}>
                <h1 className="mp-h1" style={{ margin: '0 0 4px', color: 'var(--text-1)', fontSize: 24 }}>
                    Contracts
                </h1>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--text-2)' }}>
                    All vendor contracts across your events.
                </p>
            </div>

            {/* Summary strip */}
            {allContracts.length > 0 && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 16,
                    marginBottom: 28,
                }}>
                    <StatCard label="Total contracts" value={allContracts.length} />
                    <StatCard label="Awaiting funding" value={totalSigned} accent={totalSigned > 0 ? 'warn' : null} />
                    <StatCard label="Active escrows" value={totalActive} accent={totalActive > 0 ? 'success' : null} />
                </div>
            )}

            {/* Search + filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
                    <Icons.search size={15} style={{
                        position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                        color: 'var(--text-3)', pointerEvents: 'none',
                    }} />
                    <input
                        type="search"
                        placeholder="Search by title, vendor or event…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{
                            width: '100%', padding: '9px 12px 9px 32px',
                            fontSize: 14, border: '1px solid var(--border)',
                            borderRadius: 8, background: 'white',
                            color: 'var(--text-1)', boxSizing: 'border-box',
                            outline: 'none',
                        }}
                    />
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {FILTER_TABS.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setActiveFilter(t.key)}
                            style={{
                                padding: '6px 14px', borderRadius: 99, border: 0,
                                fontSize: 13, fontWeight: 500, cursor: 'pointer',
                                background: activeFilter === t.key ? 'var(--mp-blue)' : 'var(--surface-subtle)',
                                color: activeFilter === t.key ? 'white' : 'var(--text-2)',
                            }}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Loading */}
            {contractsQ.isLoading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[1, 2, 3].map((k) => (
                        <div key={k} style={{
                            background: 'white', borderRadius: 12, border: '1px solid var(--border)',
                            height: 80, animation: 'pulse 1.4s ease-in-out infinite',
                        }} />
                    ))}
                </div>
            )}

            {/* Error */}
            {contractsQ.isError && (
                <div style={{
                    background: 'white', border: '1px solid var(--border)',
                    borderRadius: 12, padding: 40, textAlign: 'center',
                }}>
                    <Icons.alert size={28} style={{ color: 'var(--error)' }} />
                    <p style={{ marginTop: 8, color: 'var(--text-2)', fontSize: 14 }}>Could not load contracts.</p>
                    <Button variant="secondary" size="sm" onClick={contractsQ.refetch} style={{ marginTop: 12 }}>
                        Retry
                    </Button>
                </div>
            )}

            {/* Empty */}
            {!contractsQ.isLoading && !contractsQ.isError && filtered.length === 0 && (
                <div style={{
                    background: 'white', border: '1px solid var(--border)',
                    borderRadius: 12, padding: 56, textAlign: 'center',
                }}>
                    <Icons.list size={32} style={{ color: 'var(--text-3)', marginBottom: 12 }} />
                    <p className="mp-h3" style={{ margin: '0 0 4px', color: 'var(--text-1)' }}>
                        {allContracts.length === 0 ? 'No contracts yet' : 'No contracts match your filter'}
                    </p>
                    <p style={{ fontSize: 14, color: 'var(--text-2)', margin: 0 }}>
                        {allContracts.length === 0
                            ? 'Contracts are created from within an event workspace, under the Contracts tab.'
                            : 'Try adjusting your search or filter.'}
                    </p>
                </div>
            )}

            {/* Contract list */}
            {!contractsQ.isLoading && filtered.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {filtered.map((c) => (
                        <ContractCard key={c.id} contract={c} />
                    ))}
                </div>
            )}
        </div>
    );
}

/* ─── StatCard ────────────────────────────────────────── */

function StatCard({ label, value, accent }) {
    const colors = {
        success: { bg: '#E6F4EA', fg: '#0F9D58' },
        warn:    { bg: '#FEF4E2', fg: '#B8770A' },
    };
    const c = colors[accent] ?? { bg: 'white', fg: 'var(--text-1)' };
    return (
        <div style={{
            background: c.bg, border: '1px solid var(--border)',
            borderRadius: 12, padding: '16px 20px',
        }}>
            <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: c.fg }}>{value}</div>
        </div>
    );
}

/* ─── ContractCard ────────────────────────────────────── */

function ContractCard({ contract }) {
    const navigate = useNavigate();
    const [expanded, setExpanded] = useState(false);
    const [editing, setEditing] = useState(false);
    const [err, setErr] = useState('');

    const [fundEscrow, fundState]   = useFundEscrowMutation();
    const [rescind, rescindState]   = useRescindContractMutation();
    const [cancel, cancelState]     = useCancelContractMutation();

    const busy = fundState.isLoading || rescindState.isLoading || cancelState.isLoading;
    const s    = STATUS_STYLE[contract.status] ?? STATUS_STYLE.DRAFT;
    const isDone    = contract.status === 'COMPLETED' || contract.status === 'CANCELLED';
    const hasEscrow = ['ACTIVE', 'COMPLETED', 'CANCELLED'].includes(contract.status);

    async function run(action, label) {
        setErr('');
        try { await action().unwrap(); }
        catch (e) { setErr(e?.data?.message ?? `Failed to ${label}`); }
    }

    return (
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            {/* header */}
            <div
                role="button" tabIndex={0}
                onClick={() => setExpanded(x => !x)}
                onKeyDown={(e) => e.key === 'Enter' && setExpanded(x => !x)}
                style={{
                    display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px',
                    cursor: 'pointer', borderBottom: expanded ? '1px solid var(--border)' : 'none',
                }}
            >
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span className="mp-h3" style={{ margin: 0, color: 'var(--text-1)', fontSize: 15 }}>
                            {contract.title}
                        </span>
                        <Badge style={s} label={s.label} />
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 3 }}>
                        Vendor: <strong>{contract.vendorName ?? '—'}</strong>
                        {contract.eventName && <> · Event: <strong>{contract.eventName}</strong></>}
                        {' · '}{ngn(contract.amount)}
                        {fmtDate(contract.createdAt) && <> · {fmtDate(contract.createdAt)}</>}
                    </div>
                </div>
                <Icons.chevronD
                    size={16}
                    style={{
                        color: 'var(--text-3)', flexShrink: 0,
                        transform: expanded ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s',
                    }}
                />
            </div>

            {/* expanded body */}
            {expanded && (
                <div style={{ padding: '20px 20px 24px' }}>
                    {contract.description && (
                        <p style={{ fontSize: 14, color: 'var(--text-2)', margin: '0 0 8px' }}>
                            {contract.description}
                        </p>
                    )}
                    {contract.terms && (
                        <div style={{
                            background: 'var(--surface-subtle)', borderRadius: 8,
                            padding: '12px 14px', fontSize: 13, color: 'var(--text-2)',
                            margin: '0 0 16px', whiteSpace: 'pre-wrap',
                        }}>
                            <strong style={{ color: 'var(--text-1)', display: 'block', marginBottom: 4 }}>Terms</strong>
                            {contract.terms}
                        </div>
                    )}

                    {/* timestamps */}
                    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 16 }}>
                        {contract.signedAt    && <Chip label="Signed"    val={fmtDate(contract.signedAt)} />}
                        {contract.fundedAt    && <Chip label="Funded"    val={fmtDate(contract.fundedAt)} />}
                        {contract.completedAt && <Chip label="Completed" val={fmtDate(contract.completedAt)} />}
                    </div>

                    {/* actions */}
                    {!isDone && (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: err ? 8 : 0 }}>
                            {contract.status === 'SIGNED' && (
                                <>
                                    <Button variant="primary" size="sm" disabled={busy}
                                        onClick={() => run(() => fundEscrow(contract.id), 'fund escrow')}>
                                        {fundState.isLoading ? 'Funding…' : 'Fund escrow'}
                                    </Button>
                                    <Button variant="secondary" size="sm" disabled={busy}
                                        onClick={() => run(() => rescind(contract.id), 'rescind')}>
                                        {rescindState.isLoading ? 'Rescinding…' : 'Rescind'}
                                    </Button>
                                </>
                            )}
                            {contract.conversationId && (
                                <Button variant="secondary" size="sm"
                                    onClick={() => navigate(`/messages?c=${contract.conversationId}`)}>
                                    Message vendor
                                </Button>
                            )}
                            <Button variant="destructive" size="sm" disabled={busy}
                                onClick={() => run(() => cancel(contract.id), 'cancel')}>
                                {cancelState.isLoading ? 'Cancelling…' : 'Cancel'}
                            </Button>
                        </div>
                    )}
                    {isDone && contract.conversationId && (
                        <Button variant="secondary" size="sm" style={{ marginBottom: err ? 8 : 0 }}
                            onClick={() => navigate(`/messages?c=${contract.conversationId}`)}>
                            Message vendor
                        </Button>
                    )}
                    {err && <p style={{ fontSize: 13, color: 'var(--error)', margin: '6px 0 0' }}>{err}</p>}

                    {/* escrow */}
                    {hasEscrow && <EscrowPanel contractId={contract.id} contractStatus={contract.status} />}
                </div>
            )}
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
        <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 16,
            height: 60, background: 'var(--surface-subtle)', borderRadius: 8,
            animation: 'pulse 1.4s ease-in-out infinite' }} />
    );
    if (escrowQ.isError || !escrow) return (
        <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 16,
            fontSize: 13, color: 'var(--text-2)' }}>Escrow data unavailable.</div>
    );

    const milestones = escrow.milestones ?? [];
    const busy = approveState.isLoading || releaseState.isLoading || disputeState.isLoading;

    return (
        <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>Escrow account</h4>
                {canAddMilestone && (
                    <Button variant="secondary" size="sm" onClick={() => setShowAdd(true)}>+ Add milestone</Button>
                )}
            </div>

            <div style={{ display: 'flex', gap: 24, marginBottom: 16, flexWrap: 'wrap' }}>
                <EscrowStat label="Total"    value={ngn(escrow.totalAmount)} />
                <EscrowStat label="Released" value={ngn(escrow.releasedAmount)} accent="success" />
                <EscrowStat label="Pending"  value={ngn(escrow.pendingAmount)} />
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
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', whiteSpace: 'nowrap' }}>{ngn(m.amount)}</div>
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

/* ─── Field wrapper ───────────────────────────────────── */

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
