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
import { Icons } from '@/components/ui/Icon';

const CATEGORY_LABELS = {
    VENUE: 'Venue', CATERING: 'Catering', ENTERTAINMENT: 'Entertainment',
    MARKETING: 'Marketing', LOGISTICS: 'Logistics', STAFFING: 'Staffing',
    TECHNOLOGY: 'Technology', DECOR: 'Decor', SECURITY: 'Security',
    PRINTING: 'Printing', TRANSPORT: 'Transport', OTHER: 'Other',
};
const CATEGORIES = Object.entries(CATEGORY_LABELS);

function ngn(v) {
    const n = Number(v ?? 0);
    if (!Number.isFinite(n)) return '₦0';
    if (n === 0) return '₦0';
    if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `₦${Math.round(n / 1_000)}K`;
    return `₦${n.toLocaleString('en-NG')}`;
}

function pct(num, denom) {
    if (!denom || denom === 0) return 0;
    return Math.min(100, Math.round((num / denom) * 100));
}

export default function BudgetTab({ eventId }) {
    const { data: summary, isLoading, isError, refetch } = useGetBudgetSummaryQuery(eventId);
    const [showCreate, setShowCreate] = useState(false);
    const [showAddItem, setShowAddItem] = useState(false);
    const [showEdit, setShowEdit] = useState(false);

    if (isLoading) return <Skeleton />;
    if (isError && !summary) {
        return (
            <NoBudgetCard onCreate={() => setShowCreate(true)} />
        );
    }

    if (!summary) {
        return (
            <>
                <NoBudgetCard onCreate={() => setShowCreate(true)} />
                {showCreate && (
                    <BudgetFormModal
                        eventId={eventId}
                        onDismiss={() => setShowCreate(false)}
                    />
                )}
            </>
        );
    }

    const spendPercent = summary.spendPercent ?? pct(Number(summary.totalPaid ?? 0), Number(summary.totalBudget ?? 0));
    const remaining = summary.totalBudget != null
        ? Number(summary.totalBudget) - Number(summary.totalExpenses ?? 0)
        : null;
    const lineItems = summary.lineItems ?? [];
    const planned   = lineItems.filter((i) => i.status === 'PLANNED');
    const committed = lineItems.filter((i) => i.status === 'COMMITTED');
    const paid      = lineItems.filter((i) => i.status === 'PAID');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Summary header */}
            <div style={{
                background: 'var(--surface-elevated)', border: '1px solid var(--border)',
                borderRadius: 12, padding: 24,
            }}>
                <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12,
                }}>
                    <div>
                        <h2 className="mp-h2" style={{ margin: 0, color: 'var(--text-1)' }}>Budget</h2>
                        {summary.notes && (
                            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-2)' }}>
                                {summary.notes}
                            </p>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <Button variant="secondary" size="md" onClick={() => setShowEdit(true)}>
                            Edit budget
                        </Button>
                        <Button variant="primary" size="md" icon={<Icons.plus size={14} />}
                            onClick={() => setShowAddItem(true)}>
                            Add expense
                        </Button>
                    </div>
                </div>

                {/* Stat grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginBottom: 20 }}>
                    <Stat label="Total budget" value={ngn(summary.totalBudget)} />
                    <Stat label="Planned spend" value={ngn(summary.totalPlanned)} />
                    <Stat label="Actual spend" value={ngn(summary.totalPaid)} accent={spendPercent > 80 ? 'error' : undefined} />
                    <Stat label="Remaining" value={remaining != null ? ngn(remaining) : '—'} accent={remaining != null && remaining < 0 ? 'error' : 'success'} />
                    <Stat label="Revenue" value={ngn(summary.totalIncome)} accent="success" />
                    <Stat label="Net P&L" value={ngn(summary.net)} accent={Number(summary.net ?? 0) >= 0 ? 'success' : 'error'} />
                </div>

                {/* Spend bar */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-3)', marginBottom: 6 }}>
                        <span>Budget utilisation</span>
                        <span className="mp-num">{spendPercent}%</span>
                    </div>
                    <div style={{
                        height: 8, background: 'var(--border)', borderRadius: 99, overflow: 'hidden',
                    }}>
                        <div style={{
                            height: '100%',
                            width: `${spendPercent}%`,
                            background: spendPercent > 80 ? 'var(--error)' : 'var(--mp-blue)',
                            borderRadius: 99,
                            transition: 'width 0.3s',
                        }} />
                    </div>
                    {summary.thresholdAlertTriggered && (
                        <div style={{
                            marginTop: 8, fontSize: 13, color: '#B8770A',
                            display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                            <Icons.alert size={14} style={{ color: '#F59E0B' }} />
                            Budget alert: 80% threshold crossed
                        </div>
                    )}
                </div>
            </div>

            {/* Line items */}
            <LineItemsCard
                title="Planned expenses"
                items={planned}
                eventId={eventId}
                canPay
                canDelete
            />

            {committed.length > 0 && (
                <LineItemsCard
                    title="Committed (escrow funded)"
                    items={committed}
                    eventId={eventId}
                />
            )}

            {paid.length > 0 && (
                <LineItemsCard
                    title="Paid expenses"
                    items={paid}
                    eventId={eventId}
                />
            )}

            {showCreate && (
                <BudgetFormModal eventId={eventId} onDismiss={() => setShowCreate(false)} />
            )}
            {showEdit && (
                <BudgetFormModal eventId={eventId} existing={summary} onDismiss={() => setShowEdit(false)} />
            )}
            {showAddItem && (
                <AddLineItemModal eventId={eventId} onDismiss={() => setShowAddItem(false)} />
            )}
        </div>
    );
}

function NoBudgetCard({ onCreate }) {
    return (
        <div style={{
            background: 'var(--surface-elevated)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 60, textAlign: 'center',
        }}>
            <div style={{
                width: 52, height: 52, borderRadius: 99, margin: '0 auto 14px',
                background: 'var(--surface-subtle)', display: 'grid',
                placeItems: 'center', color: 'var(--text-3)',
            }}>
                <Icons.wallet size={20} />
            </div>
            <div className="mp-h4" style={{ color: 'var(--text-1)', margin: 0 }}>No budget set up yet</div>
            <p className="body-sm" style={{ color: 'var(--text-2)', marginTop: 6 }}>
                Create a budget envelope to track planned expenses and actual spend.
            </p>
            <Button variant="primary" size="md" onClick={onCreate} style={{ marginTop: 16 }}>
                Set up budget
            </Button>
        </div>
    );
}

function Stat({ label, value, accent }) {
    const color = accent === 'success' ? '#0F9D58' : accent === 'error' ? 'var(--error)' : 'var(--text-1)';
    return (
        <div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>{label}</div>
            <div className="mp-num" style={{ fontSize: 22, fontWeight: 700, color, marginTop: 4 }}>
                {value}
            </div>
        </div>
    );
}

function LineItemsCard({ title, items, eventId, canPay, canDelete }) {
    const [markPaid, paidState] = useMarkLineItemPaidMutation();
    const [deleteItem, deleteState] = useDeleteLineItemMutation();
    const [payingId, setPayingId] = useState(null);
    const [payAmount, setPayAmount] = useState('');
    const [payError, setPayError] = useState('');

    async function handleMarkPaid(itemId) {
        setPayError('');
        try {
            await markPaid({ eventId, itemId, actualAmount: Number(payAmount) }).unwrap();
            setPayingId(null);
            setPayAmount('');
        } catch (err) {
            setPayError(err?.data?.message || 'Could not mark as paid.');
        }
    }

    async function handleDelete(itemId) {
        try { await deleteItem({ eventId, itemId }).unwrap(); }
        catch { /* list refetches */ }
    }

    return (
        <div style={{
            background: 'var(--surface-elevated)', border: '1px solid var(--border)',
            borderRadius: 12, overflow: 'hidden',
        }}>
            <div style={{
                padding: '14px 20px', borderBottom: '1px solid var(--border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
                <span style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 14 }}>{title}</span>
                <span style={{ fontSize: 13, color: 'var(--text-3)' }}>
                    {items.length} item{items.length !== 1 ? 's' : ''}
                </span>
            </div>

            {items.length === 0 ? (
                <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>
                    No items yet.
                </div>
            ) : items.map((item, i) => (
                <div key={item.id} style={{
                    display: 'grid', gridTemplateColumns: '1fr auto',
                    gap: 12, alignItems: 'flex-start',
                    padding: '14px 20px',
                    borderBottom: i === items.length - 1 ? 0 : '1px solid var(--border)',
                }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 500, color: 'var(--text-1)', fontSize: 14 }}>
                                {item.description}
                            </span>
                            <span style={{
                                fontSize: 11, padding: '2px 7px', borderRadius: 6,
                                background: 'var(--surface-subtle)', color: 'var(--text-2)', fontWeight: 600,
                            }}>
                                {CATEGORY_LABELS[item.category] ?? item.category}
                            </span>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 3 }}>
                            Planned: <span className="mp-num" style={{ color: 'var(--text-1)', fontWeight: 600 }}>
                                {ngn(item.plannedAmount)}
                            </span>
                            {item.actualAmount != null && item.actualAmount !== 0 && (
                                <> · Paid: <span className="mp-num" style={{ color: '#0F9D58', fontWeight: 600 }}>
                                    {ngn(item.actualAmount)}
                                </span></>
                            )}
                        </div>
                        {payingId === item.id && (
                            <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={payAmount}
                                    onChange={(e) => setPayAmount(e.target.value)}
                                    placeholder="Actual amount paid"
                                    style={{
                                        padding: '7px 10px', fontSize: 13, border: '1px solid var(--border)',
                                        borderRadius: 7, fontFamily: 'inherit', width: 180,
                                    }}
                                />
                                <Button size="sm" variant="primary"
                                    disabled={!payAmount || paidState.isLoading}
                                    onClick={() => handleMarkPaid(item.id)}>
                                    {paidState.isLoading ? 'Saving…' : 'Confirm'}
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => { setPayingId(null); setPayAmount(''); }}>
                                    Cancel
                                </Button>
                                {payError && <span style={{ fontSize: 12, color: 'var(--error)' }}>{payError}</span>}
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, paddingTop: 2 }}>
                        {canPay && payingId !== item.id && (
                            <button
                                onClick={() => { setPayingId(item.id); setPayAmount(''); setPayError(''); }}
                                style={{
                                    background: 'none', border: '1px solid var(--border)',
                                    borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
                                    fontSize: 12, color: 'var(--text-2)', fontWeight: 500,
                                }}
                            >
                                Mark paid
                            </button>
                        )}
                        {canDelete && (
                            <button
                                onClick={() => handleDelete(item.id)}
                                disabled={deleteState.isLoading}
                                style={{
                                    background: 'none', border: '1px solid var(--border)',
                                    borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
                                    fontSize: 12, color: 'var(--error)', fontWeight: 500,
                                }}
                            >
                                Delete
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

function BudgetFormModal({ eventId, existing, onDismiss }) {
    const isEdit = !!existing;
    const [createBudget, createState] = useCreateBudgetMutation();
    const [updateBudget, updateState] = useUpdateBudgetMutation();
    const [form, setForm] = useState({
        totalBudget: existing?.totalBudget ? String(existing.totalBudget) : '',
        notes: existing?.notes ?? '',
    });
    const [err, setErr] = useState('');
    const busy = createState.isLoading || updateState.isLoading;
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    async function handleSubmit(e) {
        e.preventDefault();
        setErr('');
        const body = {
            totalBudget: Number(form.totalBudget),
            notes: form.notes.trim() || undefined,
        };
        try {
            if (isEdit) { await updateBudget({ eventId, ...body }).unwrap(); }
            else { await createBudget({ eventId, ...body }).unwrap(); }
            onDismiss();
        } catch (error) {
            setErr(error?.data?.message || 'Could not save budget.');
        }
    }

    return (
        <ModalOverlay onClose={onDismiss}>
            <h3 className="mp-h3" style={{ margin: '0 0 20px', color: 'var(--text-1)' }}>
                {isEdit ? 'Edit budget' : 'Set up budget'}
            </h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Field label="Total budget (₦) *">
                    <Input type="number" min="1" step="0.01" value={form.totalBudget}
                        onChange={set('totalBudget')} placeholder="0.00" required />
                </Field>
                <Field label="Notes">
                    <textarea
                        value={form.notes} onChange={set('notes')}
                        placeholder="Optional notes or context…" rows={3}
                        style={{
                            width: '100%', padding: '9px 12px', fontSize: 14,
                            border: '1px solid var(--border)', borderRadius: 8,
                            resize: 'vertical', fontFamily: 'inherit',
                            boxSizing: 'border-box', color: 'var(--text-1)', background: 'var(--surface-elevated)',
                        }}
                    />
                </Field>
                {err && <p style={{ fontSize: 13, color: 'var(--error)', margin: 0 }}>{err}</p>}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                    <Button type="button" variant="secondary" size="md" onClick={onDismiss}>Cancel</Button>
                    <Button type="submit" variant="primary" size="md"
                        disabled={!form.totalBudget || busy}>
                        {busy ? 'Saving…' : (isEdit ? 'Save changes' : 'Create budget')}
                    </Button>
                </div>
            </form>
        </ModalOverlay>
    );
}

function AddLineItemModal({ eventId, onDismiss }) {
    const [addItem, state] = useAddLineItemMutation();
    const [form, setForm] = useState({ category: 'OTHER', description: '', plannedAmount: '' });
    const [err, setErr] = useState('');
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    async function handleSubmit(e) {
        e.preventDefault();
        setErr('');
        try {
            await addItem({
                eventId,
                category: form.category,
                description: form.description.trim(),
                plannedAmount: Number(form.plannedAmount),
            }).unwrap();
            onDismiss();
        } catch (error) {
            setErr(error?.data?.message || 'Could not add expense.');
        }
    }

    return (
        <ModalOverlay onClose={onDismiss}>
            <h3 className="mp-h3" style={{ margin: '0 0 20px', color: 'var(--text-1)' }}>
                Add planned expense
            </h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Field label="Category *">
                    <select value={form.category} onChange={set('category')}
                        style={{
                            width: '100%', padding: '9px 12px', fontSize: 14,
                            border: '1px solid var(--border)', borderRadius: 8,
                            background: 'var(--surface-elevated)', color: 'var(--text-1)', fontFamily: 'inherit',
                        }}
                    >
                        {CATEGORIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                </Field>
                <Field label="Description *">
                    <Input value={form.description} onChange={set('description')}
                        placeholder="e.g. Main stage catering" required />
                </Field>
                <Field label="Planned amount (₦) *">
                    <Input type="number" min="1" step="0.01" value={form.plannedAmount}
                        onChange={set('plannedAmount')} placeholder="0.00" required />
                </Field>
                {err && <p style={{ fontSize: 13, color: 'var(--error)', margin: 0 }}>{err}</p>}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                    <Button type="button" variant="secondary" size="md" onClick={onDismiss}>Cancel</Button>
                    <Button type="submit" variant="primary" size="md"
                        disabled={!form.description.trim() || !form.plannedAmount || state.isLoading}>
                        {state.isLoading ? 'Adding…' : 'Add expense'}
                    </Button>
                </div>
            </form>
        </ModalOverlay>
    );
}

function ModalOverlay({ onClose, children }) {
    return (
        <div
            role="dialog"
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: 'rgba(2,16,45,0.55)',
                display: 'grid', placeItems: 'center', padding: 20,
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: '100%', maxWidth: 480, background: 'var(--surface-elevated)',
                    borderRadius: 16, padding: 28, boxShadow: 'var(--shadow-modal)',
                }}
            >
                {children}
            </div>
        </div>
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

function Input(props) {
    return (
        <input
            {...props}
            style={{
                width: '100%', padding: '9px 12px', fontSize: 14,
                border: '1px solid var(--border)', borderRadius: 8,
                fontFamily: 'inherit', boxSizing: 'border-box',
                color: 'var(--text-1)', background: 'var(--surface-elevated)',
            }}
        />
    );
}

function Skeleton() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[200, 300].map((h, i) => (
                <div key={i} style={{
                    height: h, background: 'var(--surface-elevated)', border: '1px solid var(--border)',
                    borderRadius: 12, animation: 'mp-flash 1.6s ease-in-out infinite',
                    opacity: 1 - i * 0.3,
                }} />
            ))}
        </div>
    );
}
