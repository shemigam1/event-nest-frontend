import { useState } from 'react';
import {
    useGetEscrowDisputesQuery,
    useRuleForVendorMutation,
    useRuleForOrganiserMutation,
    useFlagEscrowViolationMutation,
} from '../adminApi';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';

function fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-NG', {
        day: 'numeric', month: 'short', year: 'numeric',
    });
}

function ngn(kobo) {
    const n = Number(kobo ?? 0) / 100;
    if (!Number.isFinite(n)) return '—';
    return `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const DISPUTE_STATUS_STYLE = {
    OPEN:     { bg: '#FEF4E2', fg: '#B8770A', label: 'Open' },
    RESOLVED: { bg: '#E6F4EA', fg: '#0F9D58', label: 'Resolved' },
};

function Badge({ status }) {
    const s = DISPUTE_STATUS_STYLE[status] ?? DISPUTE_STATUS_STYLE.OPEN;
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

export default function AdminEscrowPage() {
    const disputesQ = useGetEscrowDisputesQuery();
    const disputes = disputesQ.data ?? [];
    const [ruling, setRuling] = useState(null);
    const [flagging, setFlagging] = useState(null);

    if (disputesQ.isLoading) {
        return (
            <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[1, 2, 3].map((k) => (
                    <div key={k} style={{
                        background: 'white', borderRadius: 12,
                        border: '1px solid var(--border)', height: 100,
                        animation: 'pulse 1.4s ease-in-out infinite',
                    }} />
                ))}
            </div>
        );
    }

    if (disputesQ.isError) {
        return (
            <div style={{ padding: 32, textAlign: 'center' }}>
                <p style={{ color: 'var(--error)', fontSize: 14 }}>Failed to load disputes.</p>
                <Button variant="secondary" size="sm" onClick={disputesQ.refetch} style={{ marginTop: 12 }}>
                    Retry
                </Button>
            </div>
        );
    }

    const open = disputes.filter((d) => d.status === 'OPEN');
    const resolved = disputes.filter((d) => d.status === 'RESOLVED');

    return (
        <div style={{ padding: '32px 28px', maxWidth: 900 }}>
            <div style={{ marginBottom: 28 }}>
                <h1 className="mp-h2" style={{ margin: 0, color: 'var(--text-1)' }}>Escrow disputes</h1>
                <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-2)' }}>
                    Review and rule on open milestone disputes between organisers and vendors.
                </p>
            </div>

            {disputes.length === 0 ? (
                <EmptyState />
            ) : (
                <>
                    {open.length > 0 && (
                        <section style={{ marginBottom: 32 }}>
                            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)', margin: '0 0 14px' }}>
                                Open disputes ({open.length})
                            </h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {open.map((d) => (
                                    <DisputeCard
                                        key={d.id}
                                        dispute={d}
                                        onRule={() => setRuling(d)}
                                        onFlag={() => setFlagging(d)}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {resolved.length > 0 && (
                        <section>
                            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-2)', margin: '0 0 14px' }}>
                                Resolved ({resolved.length})
                            </h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {resolved.map((d) => (
                                    <DisputeCard key={d.id} dispute={d} resolved />
                                ))}
                            </div>
                        </section>
                    )}
                </>
            )}

            {ruling && (
                <RulingModal
                    dispute={ruling}
                    onDismiss={() => setRuling(null)}
                />
            )}

            {flagging && (
                <FlagViolationModal
                    dispute={flagging}
                    onDismiss={() => setFlagging(null)}
                />
            )}
        </div>
    );
}

/* ─── DisputeCard ────────────────────────────────────── */

function DisputeCard({ dispute: d, onRule, onFlag, resolved }) {
    return (
        <div style={{
            background: 'white',
            border: `1px solid ${resolved ? 'var(--border)' : '#F5C0C0'}`,
            borderRadius: 12,
            padding: '18px 20px',
            opacity: resolved ? 0.75 : 1,
        }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>
                            {d.milestoneName ?? d.milestoneTitle ?? 'Milestone'}
                        </span>
                        <Badge status={d.status} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
                            {ngn(d.milestoneAmount)}
                        </span>
                    </div>

                    <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 8 }}>
                        <span>Contract: <strong>{d.contractTitle ?? d.contractId}</strong></span>
                        {d.vendorName && <span> · Vendor: <strong>{d.vendorName}</strong></span>}
                        {d.organiserName && <span> · Organiser: <strong>{d.organiserName}</strong></span>}
                        {d.eventName && <span> · Event: <strong>{d.eventName}</strong></span>}
                    </div>

                    {d.reason && (
                        <div style={{
                            background: 'var(--surface-subtle)',
                            borderRadius: 8,
                            padding: '10px 12px',
                            fontSize: 13,
                            color: 'var(--text-2)',
                            marginBottom: d.rulingNotes ? 8 : 0,
                        }}>
                            <strong style={{ color: 'var(--text-1)', display: 'block', marginBottom: 3 }}>
                                Dispute reason
                            </strong>
                            {d.reason}
                        </div>
                    )}

                    {d.rulingNotes && (
                        <div style={{
                            background: '#E6F4EA',
                            borderRadius: 8,
                            padding: '10px 12px',
                            fontSize: 13,
                            color: '#0F7B3E',
                            marginTop: 8,
                        }}>
                            <strong style={{ display: 'block', marginBottom: 3 }}>
                                Ruling notes {d.ruledInFavourOf ? `· In favour of ${d.ruledInFavourOf}` : ''}
                            </strong>
                            {d.rulingNotes}
                        </div>
                    )}

                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>
                        Raised {fmtDate(d.createdAt)}
                        {d.resolvedAt && <> · Resolved {fmtDate(d.resolvedAt)}</>}
                    </div>
                </div>

                {!resolved && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                        {onRule && (
                            <Button variant="primary" size="sm" onClick={onRule}>
                                Rule on dispute
                            </Button>
                        )}
                        {onFlag && d.contractId && (
                            <Button variant="secondary" size="sm" onClick={onFlag}>
                                Flag escrow violation
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─── RulingModal ────────────────────────────────────── */

function RulingModal({ dispute, onDismiss }) {
    const [ruleForVendor, vendorState] = useRuleForVendorMutation();
    const [ruleForOrganiser, organiserState] = useRuleForOrganiserMutation();
    const [notes, setNotes] = useState('');
    const [err, setErr] = useState('');

    const busy = vendorState.isLoading || organiserState.isLoading;
    const canSubmit = notes.trim().length >= 5;

    async function handleRule(favour) {
        setErr('');
        try {
            // API uses milestoneId as the dispute identifier in the path
            const args = { milestoneId: dispute.milestoneId ?? dispute.id, notes: notes.trim() };
            if (favour === 'vendor') {
                await ruleForVendor(args).unwrap();
            } else {
                await ruleForOrganiser(args).unwrap();
            }
            onDismiss();
        } catch (e) {
            setErr(e?.data?.message ?? 'Failed to submit ruling');
        }
    }

    return (
        <Modal open onClose={onDismiss} label="Rule on dispute" width={500}>
            <div style={{ padding: 24 }}>
                <h3 className="mp-h3" style={{ margin: '0 0 6px', color: 'var(--text-1)' }}>
                    Rule on dispute
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '0 0 16px' }}>
                    Milestone: <strong>{dispute.milestoneName ?? dispute.milestoneTitle}</strong>
                    {' · '}{ngn(dispute.milestoneAmount)}
                </p>

                {dispute.reason && (
                    <div style={{
                        background: 'var(--surface-subtle)',
                        borderRadius: 8,
                        padding: '10px 12px',
                        fontSize: 13,
                        color: 'var(--text-2)',
                        marginBottom: 20,
                    }}>
                        <strong style={{ color: 'var(--text-1)', display: 'block', marginBottom: 3 }}>
                            Dispute reason
                        </strong>
                        {dispute.reason}
                    </div>
                )}

                <div style={{ marginBottom: 20 }}>
                    <label style={{
                        display: 'block', fontSize: 13, fontWeight: 600,
                        color: 'var(--text-1)', marginBottom: 6,
                    }}>
                        Ruling notes *
                    </label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Explain your decision (min. 5 characters)…"
                        rows={4}
                        style={{
                            width: '100%', padding: '9px 12px', fontSize: 14,
                            border: '1px solid var(--border)', borderRadius: 8,
                            resize: 'vertical', fontFamily: 'inherit',
                            boxSizing: 'border-box', color: 'var(--text-1)', background: 'white',
                        }}
                    />
                </div>

                {err && (
                    <p style={{ fontSize: 13, color: 'var(--error)', margin: '0 0 12px' }}>{err}</p>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    <Button type="button" variant="secondary" size="md" onClick={onDismiss}>
                        Cancel
                    </Button>
                    <Button
                        variant="secondary"
                        size="md"
                        disabled={!canSubmit || busy}
                        onClick={() => handleRule('organiser')}
                    >
                        {organiserState.isLoading ? 'Ruling…' : 'Rule for organiser'}
                    </Button>
                    <Button
                        variant="primary"
                        size="md"
                        disabled={!canSubmit || busy}
                        onClick={() => handleRule('vendor')}
                    >
                        {vendorState.isLoading ? 'Ruling…' : 'Rule for vendor'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

/* ─── FlagViolationModal ────────────────────────────── */

function FlagViolationModal({ dispute, onDismiss }) {
    const [flagViolation, state] = useFlagEscrowViolationMutation();
    const [reason, setReason] = useState('');
    const [err, setErr] = useState('');

    const canSubmit = reason.trim().length >= 10;
    const busy = state.isLoading;

    async function handleSubmit() {
        setErr('');
        try {
            await flagViolation(dispute.contractId).unwrap();
            onDismiss();
        } catch (e) {
            setErr(e?.data?.message ?? 'Failed to flag violation');
        }
    }

    return (
        <Modal open onClose={onDismiss} label="Flag escrow violation" width={500}>
            <div style={{ padding: 24 }}>
                <h3 className="mp-h3" style={{ margin: '0 0 6px', color: 'var(--text-1)' }}>
                    Flag escrow violation
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '0 0 16px' }}>
                    This records a serious escrow breach by the vendor on contract{' '}
                    <strong>{dispute.contractTitle ?? dispute.contractId}</strong>
                    {' '}and applies a <strong style={{ color: 'var(--error)' }}>−35</strong>{' '}
                    trust-score event. Use sparingly — repeated flags will trigger an auto-suspend.
                </p>

                <div style={{
                    background: 'var(--warning-bg)',
                    border: '1px solid var(--warning)',
                    borderRadius: 8,
                    padding: '10px 12px',
                    fontSize: 12,
                    color: 'var(--text-1)',
                    marginBottom: 20,
                }}>
                    <strong>Vendor:</strong> {dispute.vendorName ?? '—'}
                    {dispute.eventName && <> · <strong>Event:</strong> {dispute.eventName}</>}
                </div>

                <div style={{ marginBottom: 20 }}>
                    <label style={{
                        display: 'block', fontSize: 13, fontWeight: 600,
                        color: 'var(--text-1)', marginBottom: 6,
                    }}>
                        Violation reason *
                    </label>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Describe the escrow violation (min. 10 characters)…"
                        rows={4}
                        style={{
                            width: '100%', padding: '9px 12px', fontSize: 14,
                            border: '1px solid var(--border)', borderRadius: 8,
                            resize: 'vertical', fontFamily: 'inherit',
                            boxSizing: 'border-box', color: 'var(--text-1)', background: 'white',
                        }}
                    />
                </div>

                {err && (
                    <p style={{ fontSize: 13, color: 'var(--error)', margin: '0 0 12px' }}>{err}</p>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    <Button type="button" variant="secondary" size="md" onClick={onDismiss}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        size="md"
                        disabled={!canSubmit || busy}
                        onClick={handleSubmit}
                    >
                        {busy ? 'Flagging…' : 'Flag violation'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

/* ─── EmptyState ─────────────────────────────────────── */

function EmptyState() {
    return (
        <div style={{
            background: 'white', border: '1px solid var(--border)',
            borderRadius: 12, padding: 64, textAlign: 'center',
        }}>
            <svg width={40} height={40} viewBox="0 0 24 24" fill="none"
                stroke="var(--text-3)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
                style={{ marginBottom: 16 }}>
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mp-h3" style={{ margin: '0 0 4px', color: 'var(--text-1)' }}>
                No disputes
            </p>
            <p style={{ fontSize: 14, color: 'var(--text-2)', margin: 0 }}>
                All escrow milestones are running smoothly.
            </p>
        </div>
    );
}
