import { useState } from 'react';
import {
    useGetBudgetSummaryQuery,
    useCreateBudgetMutation,
    useUpdateBudgetMutation,
    useAddLineItemMutation,
    useMarkLineItemPaidMutation,
    useDeleteLineItemMutation,
} from '../budgetApi';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { Icons } from '@/components/ui/Icon';

const CATEGORIES = [
    { id: 'VENUE',     label: 'Venue' },
    { id: 'CATERING',  label: 'Catering' },
    { id: 'AV',        label: 'A/V' },
    { id: 'MARKETING', label: 'Marketing' },
    { id: 'SECURITY',  label: 'Security' },
    { id: 'STAFFING',  label: 'Staffing' },
    { id: 'OTHER',     label: 'Other' },
];
const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]));

function ngn(amount) {
    const n = Number(amount ?? 0);
    if (!Number.isFinite(n)) return '₦0';
    return `₦${n.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
}

function ngnK(amount) {
    const n = Number(amount ?? 0);
    if (!Number.isFinite(n)) return '₦0';
    if (Math.abs(n) >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
    if (Math.abs(n) >= 1_000)     return `₦${Math.round(n / 1_000)}K`;
    return `₦${n.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
}

/* ─── Tab entry point ─────────────────────────────── */
export default function BudgetTab({ eventId }) {
    const summary = useGetBudgetSummaryQuery(eventId);

    // 404 → budget not yet created. We can't tell "no budget" from "real
    // error" purely from RTK Query, so we check the message.
    const notFound =
        summary.isError &&
        (summary.error?.status === 404 ||
            /not found/i.test(summary.error?.data?.message ?? ''));

    if (summary.isLoading) return <Skeleton />;

    if (summary.isError && !notFound) {
        return (
            <div style={{
                background: 'white', border: '1px solid var(--border)',
                borderRadius: 12, padding: 40, textAlign: 'center',
            }}>
                <Icons.alert size={28} style={{ color: 'var(--error)' }} />
                <p className="body-sm" style={{ marginTop: 8, color: 'var(--text-2)' }}>
                    Could not load the budget.
                </p>
                <Button variant="secondary" size="sm" onClick={summary.refetch} style={{ marginTop: 12 }}>
                    Retry
                </Button>
            </div>
        );
    }

    if (notFound || !summary.data) {
        return <BudgetSetup eventId={eventId} onCreated={summary.refetch} />;
    }

    return <BudgetView eventId={eventId} summary={summary.data} />;
}

/* ─── First-run setup ─────────────────────────────── */
function BudgetSetup({ eventId, onCreated }) {
    const [createBudget, state] = useCreateBudgetMutation();
    const [totalBudget, setTotalBudget] = useState('');
    const [notes, setNotes]             = useState('');
    const [error, setError]             = useState('');

    async function submit() {
        const amount = Number(totalBudget);
        if (!Number.isFinite(amount) || amount <= 0) {
            setError('Enter a budget amount.');
            return;
        }
        setError('');
        try {
            await createBudget({
                eventId,
                totalBudget: amount,
                notes: notes.trim() || null,
            }).unwrap();
            onCreated?.();
        } catch (err) {
            setError(err?.data?.message || 'Could not create budget.');
        }
    }

    return (
        <div style={{
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 32,
            maxWidth: 520,
            margin: '0 auto',
        }}>
            <Icons.wallet size={28} style={{ color: 'var(--mp-blue)' }} />
            <h3 className="mp-h3" style={{ margin: '12px 0 4px', color: 'var(--text-1)' }}>
                Set your budget ceiling
            </h3>
            <p className="body-sm" style={{ color: 'var(--text-2)', margin: '0 0 20px' }}>
                EventNest tracks expenses against this cap and pings you at 80% spend.
                You can change it any time.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Input
                    label="Total budget (₦)"
                    type="number"
                    min="1"
                    value={totalBudget}
                    onChange={(e) => { setTotalBudget(e.target.value); setError(''); }}
                    placeholder="1500000"
                />
                <Input
                    label="Notes (optional)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="What this budget covers"
                />
            </div>
            {error && (
                <div role="alert" style={{
                    marginTop: 14,
                    padding: '10px 12px',
                    background: 'var(--error-bg, #FBE9E9)',
                    color: 'var(--error)',
                    borderRadius: 8,
                    fontSize: 13,
                }}>
                    {error}
                </div>
            )}
            <Button
                variant="primary"
                size="md"
                onClick={submit}
                disabled={state.isLoading}
                style={{ marginTop: 18 }}
            >
                {state.isLoading ? 'Creating…' : 'Create budget'}
            </Button>
        </div>
    );
}

/* ─── Main view ───────────────────────────────────── */
function BudgetView({ eventId, summary }) {
    const [updateBudget, updateState] = useUpdateBudgetMutation();
    const [addLineItem, addState]     = useAddLineItemMutation();
    const [markPaid, paidState]       = useMarkLineItemPaidMutation();
    const [deleteItem, deleteState]   = useDeleteLineItemMutation();

    const [showAdjustCap, setShowAdjustCap]   = useState(false);
    const [showAddLine, setShowAddLine]       = useState(false);
    const [payingItem, setPayingItem]         = useState(null);
    const [error, setError]                   = useState('');

    const lineItems = summary.lineItems || [];
    const planned       = Number(summary.totalPlanned ?? 0);
    const paid          = Number(summary.totalActualSpend ?? 0);
    const cap           = Number(summary.totalBudget ?? 0);
    const revenue       = Number(summary.totalRevenue ?? 0);
    const net           = Number(summary.netProfit ?? (revenue - paid));
    const remaining     = Number(summary.remainingBudget ?? (cap - paid));
    const pct           = Number(summary.spendPercent ?? 0);
    const overBudget    = planned > cap;
    const thresholdHit  = !!summary.thresholdAlertTriggered;

    async function adjustCap(newCap, newNotes) {
        setError('');
        try {
            await updateBudget({
                eventId,
                totalBudget: Number(newCap),
                notes: newNotes?.trim() || null,
            }).unwrap();
            setShowAdjustCap(false);
        } catch (err) {
            setError(err?.data?.message || 'Could not update budget.');
        }
    }

    async function handleAddLine(category, description, plannedAmount) {
        setError('');
        try {
            await addLineItem({
                eventId,
                category,
                description: description.trim(),
                plannedAmount: Number(plannedAmount),
            }).unwrap();
            setShowAddLine(false);
        } catch (err) {
            setError(err?.data?.message || 'Could not add line item.');
        }
    }

    async function handlePay(actualAmount) {
        if (!payingItem) return;
        setError('');
        try {
            await markPaid({
                eventId,
                itemId: payingItem.id,
                actualAmount: Number(actualAmount),
            }).unwrap();
            setPayingItem(null);
        } catch (err) {
            setError(err?.data?.message || 'Could not mark as paid.');
        }
    }

    async function handleDelete(item) {
        setError('');
        try {
            await deleteItem({ eventId, itemId: item.id }).unwrap();
        } catch (err) {
            setError(err?.data?.message || 'Could not delete line item.');
        }
    }

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 320px',
            gap: 20,
        }}>
            {/* Left column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
                {/* Budget vs spent */}
                <div style={{
                    background: 'white',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: 22,
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: 16,
                    }}>
                        <div>
                            <h3 className="mp-h4" style={{ margin: 0, color: 'var(--text-1)' }}>
                                Total budget
                            </h3>
                            <p className="body-sm" style={{ margin: '4px 0 0', color: 'var(--text-2)' }}>
                                Cap set by you. Auto-alerts at 80%.
                            </p>
                        </div>
                        <Button size="sm" variant="secondary" onClick={() => setShowAdjustCap(true)}>
                            Adjust cap
                        </Button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
                        <span className="mp-num" style={{
                            fontSize: 38, fontWeight: 700, color: 'var(--text-1)',
                        }}>
                            {ngnK(paid)}
                        </span>
                        <span style={{ fontSize: 14, color: 'var(--text-2)' }}>
                            paid of <span className="mp-num" style={{ fontWeight: 600, color: 'var(--text-1)' }}>
                                {ngnK(cap)}
                            </span> cap
                        </span>
                    </div>
                    {/* Stacked bar: paid (green) + planned-unpaid (blue) */}
                    <div style={{
                        marginTop: 18,
                        height: 18,
                        background: 'var(--surface-subtle)',
                        borderRadius: 99,
                        overflow: 'hidden',
                        display: 'flex',
                        position: 'relative',
                    }}>
                        <div style={{
                            width: `${Math.min(100, cap > 0 ? (paid / cap) * 100 : 0)}%`,
                            background: 'var(--success)',
                        }} />
                        <div style={{
                            width: `${Math.max(0, Math.min(100 - (cap > 0 ? (paid / cap) * 100 : 0), cap > 0 ? ((planned - paid) / cap) * 100 : 0))}%`,
                            background: 'var(--mp-blue)',
                            opacity: 0.6,
                        }} />
                        {overBudget && (
                            <span style={{
                                position: 'absolute',
                                right: 6,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                fontSize: 10,
                                fontWeight: 700,
                                color: 'var(--warning)',
                                background: 'white',
                                padding: '2px 8px',
                                borderRadius: 99,
                            }}>
                                ⚠ Planned over cap
                            </span>
                        )}
                    </div>
                    <div style={{
                        display: 'flex', gap: 18, marginTop: 14,
                        fontSize: 12, color: 'var(--text-2)', flexWrap: 'wrap',
                    }}>
                        <Legend color="var(--success)" label="Paid"    value={ngnK(paid)} />
                        <Legend color="var(--mp-blue)" label="Planned (unpaid)" value={ngnK(Math.max(0, planned - paid))} dim />
                        <Legend color="transparent"    label="% spent" value={`${Math.round(pct)}%`} />
                    </div>
                </div>

                {/* P&L */}
                <div style={{
                    background: 'white',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    overflow: 'hidden',
                }}>
                    <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>Profit &amp; loss</div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                            Ticket revenue minus paid-out expenses (live).
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
                        <PLCell
                            label="Ticket revenue"
                            sub="confirmed bookings"
                            value={revenue}
                            color="var(--success)"
                            sign="+"
                        />
                        <PLCell
                            label="Paid out"
                            sub="expenses to date"
                            value={paid}
                            color="var(--text-1)"
                            sign="−"
                            border
                        />
                        <PLCell
                            label="Net (so far)"
                            sub="difference"
                            value={net}
                            color={net >= 0 ? 'var(--success)' : 'var(--error)'}
                            sign={net >= 0 ? '+' : '−'}
                            emphasis
                            border
                        />
                    </div>
                </div>

                {/* Line items */}
                <div style={{
                    background: 'white',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    overflow: 'hidden',
                }}>
                    <div style={{
                        padding: '14px 20px',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}>
                        <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>Budget line items</div>
                            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                                Plan an expense, then mark it paid when it lands.
                            </div>
                        </div>
                        <Button
                            size="sm"
                            variant="secondary"
                            icon={<Icons.plus size={14} />}
                            onClick={() => setShowAddLine(true)}
                        >
                            Add line
                        </Button>
                    </div>

                    {error && (
                        <div role="alert" style={{
                            margin: '12px 20px 0',
                            padding: '10px 12px',
                            background: 'var(--error-bg, #FBE9E9)',
                            color: 'var(--error)',
                            borderRadius: 8,
                            fontSize: 13,
                        }}>
                            {error}
                        </div>
                    )}

                    {lineItems.length === 0 ? (
                        <div style={{
                            padding: 40,
                            textAlign: 'center',
                            color: 'var(--text-3)',
                            fontSize: 14,
                        }}>
                            No line items yet. Add one to start tracking spend.
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                            <thead>
                                <tr style={{ background: 'var(--surface-subtle)' }}>
                                    {['Category', 'Description', 'Planned', 'Paid', 'Status', ''].map((h, i) => (
                                        <th
                                            key={h || `_${i}`}
                                            style={{
                                                textAlign: h === 'Planned' || h === 'Paid' ? 'right' : 'left',
                                                padding: '10px 20px',
                                                color: 'var(--text-3)',
                                                fontSize: 12,
                                                fontWeight: 600,
                                                borderBottom: '1px solid var(--border)',
                                            }}
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {lineItems.map((l, i) => (
                                    <LineRow
                                        key={l.id}
                                        item={l}
                                        isLast={i === lineItems.length - 1}
                                        onPay={() => setPayingItem(l)}
                                        onDelete={() => handleDelete(l)}
                                        deleting={deleteState.isLoading}
                                    />
                                ))}
                                <tr style={{ background: 'var(--surface-subtle)' }}>
                                    <td colSpan={2} style={{ padding: '12px 20px', fontWeight: 700, color: 'var(--text-1)' }}>
                                        Total
                                    </td>
                                    <td className="mp-num" style={{
                                        padding: '12px 20px',
                                        textAlign: 'right',
                                        fontWeight: 700,
                                        color: 'var(--text-1)',
                                    }}>
                                        {ngn(planned)}
                                    </td>
                                    <td className="mp-num" style={{
                                        padding: '12px 20px',
                                        textAlign: 'right',
                                        fontWeight: 700,
                                        color: 'var(--success)',
                                    }}>
                                        {ngn(paid)}
                                    </td>
                                    <td colSpan={2} />
                                </tr>
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Sidebar */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                height: 'fit-content',
                position: 'sticky',
                top: 24,
            }}>
                <div style={{
                    background: overBudget || thresholdHit
                        ? 'var(--warning-bg, #FEF4E2)'
                        : 'var(--mp-blue-50, #EAF1FE)',
                    border: `1px solid ${overBudget || thresholdHit ? '#E6C998' : 'var(--mp-blue-200, #C4D5F8)'}`,
                    borderRadius: 12,
                    padding: 18,
                }}>
                    <Icons.alert
                        size={20}
                        style={{ color: overBudget || thresholdHit ? 'var(--warning)' : 'var(--mp-blue)' }}
                    />
                    <div className="mp-h4" style={{ marginTop: 10, color: 'var(--text-1)' }}>
                        {overBudget
                            ? 'Planned spend over cap'
                            : thresholdHit
                                ? '80% threshold reached'
                                : 'On track'}
                    </div>
                    <p className="body-sm" style={{ color: 'var(--text-2)', marginTop: 6 }}>
                        {overBudget
                            ? `Planned (${ngnK(planned)}) is above your cap (${ngnK(cap)}). Drop a line or raise the cap.`
                            : thresholdHit
                                ? `You've spent ${Math.round(pct)}% of your ${ngnK(cap)} cap.`
                                : `You have ${ngnK(remaining)} of room left under the cap.`}
                    </p>
                </div>

                {summary.notes && (
                    <div style={{
                        background: 'white',
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                        padding: 18,
                    }}>
                        <div style={{
                            fontSize: 12, fontWeight: 600,
                            color: 'var(--text-3)', letterSpacing: 0.3,
                        }}>
                            NOTES
                        </div>
                        <p className="body-sm" style={{ color: 'var(--text-2)', marginTop: 6, whiteSpace: 'pre-wrap' }}>
                            {summary.notes}
                        </p>
                    </div>
                )}

                <div style={{
                    background: 'white',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: 18,
                }}>
                    <div className="mp-h4" style={{ margin: 0, color: 'var(--text-1)' }}>
                        Status legend
                    </div>
                    <ul style={{
                        margin: '10px 0 0',
                        padding: 0,
                        listStyle: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        fontSize: 13,
                        color: 'var(--text-2)',
                    }}>
                        <li>
                            <strong style={{ color: 'var(--mp-blue)' }}>Planned</strong>
                            {' '}— added to the budget, not paid yet
                        </li>
                        <li>
                            <strong style={{ color: 'var(--success)' }}>Paid</strong>
                            {' '}— locked in with the actual amount spent
                        </li>
                    </ul>
                </div>
            </div>

            <AdjustCapModal
                open={showAdjustCap}
                onClose={() => setShowAdjustCap(false)}
                onSubmit={adjustCap}
                initialCap={cap}
                initialNotes={summary.notes || ''}
                saving={updateState.isLoading}
            />
            <AddLineModal
                open={showAddLine}
                onClose={() => setShowAddLine(false)}
                onSubmit={handleAddLine}
                saving={addState.isLoading}
            />
            <PayLineModal
                item={payingItem}
                onClose={() => setPayingItem(null)}
                onSubmit={handlePay}
                saving={paidState.isLoading}
            />
        </div>
    );
}

/* ─── Subcomponents ───────────────────────────────── */

function Legend({ color, label, value, dim }) {
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {color !== 'transparent' && (
                <span style={{
                    width: 10, height: 10,
                    background: color,
                    borderRadius: 3,
                    opacity: dim ? 0.6 : 1,
                }} />
            )}
            {label}{' '}
            <strong className="mp-num" style={{ color: 'var(--text-1)' }}>{value}</strong>
        </span>
    );
}

function PLCell({ label, sub, value, color, sign, emphasis, border }) {
    return (
        <div style={{
            padding: '14px 20px',
            borderLeft: border ? '1px solid var(--border)' : 0,
            background: emphasis ? 'var(--surface-subtle)' : 'transparent',
        }}>
            <div style={{
                fontSize: 12,
                color: 'var(--text-3)',
                fontWeight: 600,
                letterSpacing: 0.3,
            }}>
                {label.toUpperCase()}
            </div>
            <div className="mp-num" style={{
                fontSize: 20,
                fontWeight: 700,
                color,
                marginTop: 4,
            }}>
                {sign}{ngn(Math.abs(value))}
            </div>
            <div style={{
                fontSize: 11,
                color: 'var(--text-3)',
                marginTop: 2,
            }}>
                {sub}
            </div>
        </div>
    );
}

function LineRow({ item, isLast, onPay, onDelete, deleting }) {
    const isPaid = item.status === 'PAID';
    const statusStyle = isPaid
        ? { bg: '#E6F4EA', fg: '#0F9D58', label: 'PAID' }
        : { bg: '#EAF1FE', fg: '#0247c7', label: 'PLANNED' };
    return (
        <tr style={{ borderBottom: isLast ? 0 : '1px solid var(--border)' }}>
            <td style={{ padding: '12px 20px', fontWeight: 600, color: 'var(--text-1)' }}>
                {CATEGORY_LABEL[item.category] || item.category}
            </td>
            <td style={{ padding: '12px 20px', color: 'var(--text-2)' }}>
                {item.description}
            </td>
            <td className="mp-num" style={{ padding: '12px 20px', textAlign: 'right', color: 'var(--text-1)' }}>
                {ngn(item.plannedAmount)}
            </td>
            <td className="mp-num" style={{ padding: '12px 20px', textAlign: 'right' }}>
                {isPaid ? (
                    <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                        {ngn(item.actualAmount)}
                    </span>
                ) : (
                    <span style={{ color: 'var(--text-3)' }}>—</span>
                )}
            </td>
            <td style={{ padding: '12px 20px' }}>
                <span style={{
                    padding: '3px 9px',
                    background: statusStyle.bg,
                    color: statusStyle.fg,
                    fontSize: 11,
                    fontWeight: 600,
                    borderRadius: 99,
                }}>
                    {statusStyle.label}
                </span>
            </td>
            <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                {isPaid ? (
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>—</span>
                ) : (
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                        <Button size="sm" variant="primary" onClick={onPay}>
                            Mark paid
                        </Button>
                        <button
                            onClick={onDelete}
                            disabled={deleting}
                            aria-label="Delete line item"
                            style={{
                                width: 32, height: 32, borderRadius: 8,
                                border: '1px solid var(--border)',
                                background: 'white',
                                cursor: 'pointer',
                                display: 'grid',
                                placeItems: 'center',
                                color: 'var(--error)',
                            }}
                        >
                            <Icons.x size={14} />
                        </button>
                    </div>
                )}
            </td>
        </tr>
    );
}

/* ─── Modals ──────────────────────────────────────── */

function AdjustCapModal({ open, onClose, onSubmit, initialCap, initialNotes, saving }) {
    const [cap, setCap]     = useState(String(initialCap || ''));
    const [notes, setNotes] = useState(initialNotes || '');
    return (
        <Modal open={open} onClose={onClose} width={440} label="Adjust budget cap">
            <div style={{ padding: 24 }}>
                <h3 className="mp-h3" style={{ margin: 0, color: 'var(--text-1)' }}>
                    Adjust budget cap
                </h3>
                <p className="body-sm" style={{ color: 'var(--text-2)', marginTop: 6 }}>
                    The cap is your spending ceiling. Spend is tracked against it live.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 18 }}>
                    <Input
                        label="Total budget (₦)"
                        type="number"
                        min="1"
                        value={cap}
                        onChange={(e) => setCap(e.target.value)}
                    />
                    <Input
                        label="Notes (optional)"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
                    <Button variant="ghost" size="md" onClick={onClose} disabled={saving}>Cancel</Button>
                    <Button
                        variant="primary"
                        size="md"
                        onClick={() => onSubmit(cap, notes)}
                        disabled={saving || !cap || Number(cap) <= 0}
                    >
                        {saving ? 'Saving…' : 'Save'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

function AddLineModal({ open, onClose, onSubmit, saving }) {
    const [category, setCategory]   = useState('VENUE');
    const [description, setDesc]    = useState('');
    const [plannedAmount, setAmt]   = useState('');

    function reset() {
        setCategory('VENUE');
        setDesc('');
        setAmt('');
    }

    function close() {
        reset();
        onClose();
    }

    function submit() {
        onSubmit(category, description, plannedAmount);
        reset();
    }

    return (
        <Modal open={open} onClose={close} width={460} label="Add line item">
            <div style={{ padding: 24 }}>
                <h3 className="mp-h3" style={{ margin: 0, color: 'var(--text-1)' }}>
                    Add line item
                </h3>
                <p className="body-sm" style={{ color: 'var(--text-2)', marginTop: 6 }}>
                    Plan an expense up front, then mark it paid when the money goes out.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 18 }}>
                    <label style={{ display: 'block' }}>
                        <span style={{
                            display: 'block',
                            fontSize: 14, fontWeight: 500,
                            color: 'var(--text-1)', marginBottom: 6,
                        }}>
                            Category
                        </span>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 14px',
                                fontFamily: 'inherit',
                                fontSize: 15,
                                border: '1px solid var(--border)',
                                borderRadius: 8,
                                background: 'white',
                                color: 'var(--text-1)',
                                cursor: 'pointer',
                            }}
                        >
                            {CATEGORIES.map((c) => (
                                <option key={c.id} value={c.id}>{c.label}</option>
                            ))}
                        </select>
                    </label>
                    <Input
                        label="Description"
                        value={description}
                        onChange={(e) => setDesc(e.target.value)}
                        placeholder="e.g. Hall A rental"
                    />
                    <Input
                        label="Planned amount (₦)"
                        type="number"
                        min="1"
                        value={plannedAmount}
                        onChange={(e) => setAmt(e.target.value)}
                        placeholder="500000"
                    />
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
                    <Button variant="ghost" size="md" onClick={close} disabled={saving}>Cancel</Button>
                    <Button
                        variant="primary"
                        size="md"
                        onClick={submit}
                        disabled={saving || !description.trim() || !plannedAmount || Number(plannedAmount) <= 0}
                    >
                        {saving ? 'Adding…' : 'Add line'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

function PayLineModal({ item, onClose, onSubmit, saving }) {
    const [actualAmount, setActual] = useState('');

    // Seed the input with the planned amount on first open.
    if (item && actualAmount === '' && item.plannedAmount) {
        setActual(String(item.plannedAmount));
    }
    function close() {
        setActual('');
        onClose();
    }
    function submit() {
        onSubmit(actualAmount);
        setActual('');
    }

    return (
        <Modal open={!!item} onClose={close} width={420} label="Mark as paid">
            {item && (
                <div style={{ padding: 24 }}>
                    <h3 className="mp-h3" style={{ margin: 0, color: 'var(--text-1)' }}>
                        Mark as paid
                    </h3>
                    <p className="body-sm" style={{ color: 'var(--text-2)', marginTop: 6 }}>
                        Record the actual amount you paid for{' '}
                        <strong>{item.description}</strong> ({CATEGORY_LABEL[item.category] || item.category}).
                        Planned: {ngn(item.plannedAmount)}.
                    </p>
                    <div style={{ marginTop: 18 }}>
                        <Input
                            label="Actual amount (₦)"
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={actualAmount}
                            onChange={(e) => setActual(e.target.value)}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
                        <Button variant="ghost" size="md" onClick={close} disabled={saving}>Cancel</Button>
                        <Button
                            variant="primary"
                            size="md"
                            onClick={submit}
                            disabled={saving || !actualAmount || Number(actualAmount) <= 0}
                        >
                            {saving ? 'Saving…' : 'Mark paid'}
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    );
}

function Skeleton() {
    const card = {
        height: 180,
        background: 'white',
        border: '1px solid var(--border)',
        borderRadius: 12,
        animation: 'mp-flash 1.6s ease-in-out infinite',
    };
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={card} />
                <div style={card} />
                <div style={{ ...card, opacity: 0.7 }} />
            </div>
            <div style={{ ...card, opacity: 0.5 }} />
        </div>
    );
}
