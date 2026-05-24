import { useEffect, useState } from 'react';
import {
    useGetPoolQuery,
    useCreatePoolMutation,
    useUpdatePoolMutation,
    useListContributionsQuery,
} from '../contributionsApi';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Icons } from '@/components/ui/Icon';
import { formatNaira, nairaToKobo } from '@/utils/currency';
import { formatEventDate } from '@/utils/dateFormat';

/* ────────────────────────────────────────────────────────────────────────────
   ContributionPoolsTab — crowd-funded budget for the event.

   Flow:
     1. If no pool exists → render the "create pool" form (requires the event
        to have contributionsEnabled in its EventConfig).
     2. If a pool exists → render the summary card (goal, current, progress,
        toggles) + a paginated contributor list (organiser-only view; even
        anonymous contributors are shown as "Anonymous Guest" with the actual
        contributor identity hidden).
   ──────────────────────────────────────────────────────────────────────── */
export default function ContributionPoolsTab({ eventId }) {
    const poolQ = useGetPoolQuery(eventId, { skip: !eventId });

    if (poolQ.isLoading) return <Skeleton />;

    // 404 from the backend means "no pool created yet" — render the create form.
    const isMissing =
        poolQ.isError && (poolQ.error?.status === 404 || poolQ.error?.originalStatus === 404);

    if (isMissing) {
        return <CreatePoolCard eventId={eventId} />;
    }

    if (poolQ.isError) {
        return (
            <ErrorBlock
                message={poolQ.error?.data?.message || 'Could not load the contribution pool.'}
                onRetry={poolQ.refetch}
            />
        );
    }

    if (!poolQ.data) return <CreatePoolCard eventId={eventId} />;

    return <PoolView pool={poolQ.data} eventId={eventId} />;
}

/* ─── Pool view (exists) ───────────────────────── */

function PoolView({ pool, eventId }) {
    const [updatePool, updateState] = useUpdatePoolMutation();
    const [editing, setEditing] = useState(false);
    const [error, setError] = useState('');

    async function patch(payload) {
        setError('');
        try {
            await updatePool({ eventId, ...payload }).unwrap();
        } catch (e) {
            setError(e?.data?.message || 'Update failed.');
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <SummaryCard
                pool={pool}
                onToggleActive={() => patch({ isActive: !pool.active })}
                onTogglePublic={() => patch({ isPublic: !pool.public })}
                onEdit={() => setEditing(true)}
                busy={updateState.isLoading}
            />

            {error && <Toast kind="error" message={error} />}

            {editing && (
                <EditPoolDialog
                    pool={pool}
                    onClose={() => setEditing(false)}
                    onSave={async (payload) => {
                        await patch(payload);
                        setEditing(false);
                    }}
                    busy={updateState.isLoading}
                />
            )}

            <ContributionsList eventId={eventId} />
        </div>
    );
}

/* ─── Summary card with goal + progress + controls ──────────── */

function SummaryCard({ pool, onToggleActive, onTogglePublic, onEdit, busy }) {
    const pct = pool.progressPercent != null
        ? Math.min(100, Number(pool.progressPercent))
        : null;
    const overGoal = pool.goalAmount && Number(pool.currentAmount) >= Number(pool.goalAmount);

    return (
        <div style={{
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: 'var(--shadow-card)',
            padding: 24,
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 16,
                marginBottom: 16,
            }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <h2 className="mp-h3" style={{ margin: 0, color: 'var(--text-1)' }}>
                            {pool.title}
                        </h2>
                        <StatusPill kind={pool.active ? 'open' : 'closed'} />
                        <StatusPill kind={pool.public ? 'public' : 'private'} />
                    </div>
                    {pool.description && (
                        <p className="body-sm" style={{ marginTop: 8, color: 'var(--text-2)', textWrap: 'pretty' }}>
                            {pool.description}
                        </p>
                    )}
                </div>
                <Button size="sm" variant="secondary" onClick={onEdit} disabled={busy}>
                    Edit
                </Button>
            </div>

            {/* Money progress */}
            <div style={{
                background: 'var(--surface-subtle)',
                borderRadius: 10,
                padding: 16,
                marginBottom: 16,
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                    <span className="mp-num" style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-1)' }}>
                        {formatNaira(pool.currentAmount)}
                    </span>
                    {pool.goalAmount && (
                        <span className="mp-num" style={{ fontSize: 13, color: 'var(--text-3)' }}>
                            of {formatNaira(pool.goalAmount)} goal
                        </span>
                    )}
                </div>
                {pct != null && (
                    <>
                        <div style={{
                            height: 8,
                            borderRadius: 99,
                            background: 'var(--border)',
                            overflow: 'hidden',
                        }}>
                            <div style={{
                                height: '100%',
                                width: `${pct}%`,
                                background: overGoal ? 'var(--success)' : 'var(--mp-blue)',
                                transition: 'width var(--motion-default)',
                            }} />
                        </div>
                        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-3)' }}>
                            {pct.toFixed(1)}% funded · {pool.contributorCount} contributor{pool.contributorCount !== 1 ? 's' : ''}
                        </div>
                    </>
                )}
                {pct == null && (
                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                        Open-ended pool · {pool.contributorCount} contributor{pool.contributorCount !== 1 ? 's' : ''}
                    </div>
                )}
            </div>

            {/* Quick toggles */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Button size="sm" variant={pool.active ? 'ghost' : 'primary'} onClick={onToggleActive} disabled={busy}>
                        {pool.active ? 'Close pool' : 'Reopen pool'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={onTogglePublic} disabled={busy}>
                        {pool.public ? 'Hide from guests' : 'Show to guests'}
                    </Button>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 }}>
                    {pool.public
                        ? 'Currently visible on the public event page — anyone can see and contribute.'
                        : 'Currently hidden from the public event page — only signed-in attendees can contribute via the event link.'}
                </p>
            </div>
        </div>
    );
}

function StatusPill({ kind }) {
    const map = {
        open:    { bg: 'var(--success-bg)',     fg: 'var(--success)', label: 'Open' },
        closed:  { bg: 'var(--surface-subtle)', fg: 'var(--text-3)',  label: 'Closed' },
        public:  { bg: 'var(--mp-blue-50)',     fg: 'var(--mp-blue)', label: 'Public' },
        private: { bg: 'var(--surface-subtle)', fg: 'var(--text-3)',  label: 'Private' },
    };
    const s = map[kind];
    return (
        <span style={{
            padding: '2px 10px',
            borderRadius: 99,
            background: s.bg,
            color: s.fg,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.02em',
        }}>
            {s.label}
        </span>
    );
}

/* ─── Create pool card (no pool yet) ───────────────────────── */

function CreatePoolCard({ eventId }) {
    const [createPool, createState] = useCreatePoolMutation();
    const [form, setForm] = useState({
        title: '',
        description: '',
        goalAmount: '',
        isPublic: true,
    });
    const [error, setError] = useState('');

    async function submit(e) {
        e.preventDefault();
        setError('');
        const title = form.title.trim();
        if (!title) { setError('Title is required.'); return; }
        const goalNaira = form.goalAmount === '' ? null : Number(form.goalAmount);
        if (goalNaira != null && (!Number.isFinite(goalNaira) || goalNaira <= 0)) {
            setError('Goal must be a positive number, or left blank for open-ended.');
            return;
        }
        try {
            await createPool({
                eventId,
                title,
                description: form.description.trim() || null,
                // Input is in naira; backend stores kobo
                goalAmount: goalNaira != null ? nairaToKobo(goalNaira) : null,
                isPublic: form.isPublic,
            }).unwrap();
        } catch (e) {
            setError(e?.data?.message || 'Could not create pool. Is the contributions feature enabled?');
        }
    }

    return (
        <div style={{
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: 'var(--shadow-card)',
            padding: 28,
        }}>
            <h2 className="mp-h3" style={{ margin: 0, color: 'var(--text-1)' }}>
                Set up a contribution pool
            </h2>
            <p className="body-sm" style={{ marginTop: 8, color: 'var(--text-2)', textWrap: 'pretty' }}>
                Friends and guests can chip in toward the event budget. Set a goal or leave it open-ended.
                Requires the <em>Contributions</em> feature to be enabled in event settings.
            </p>

            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 20 }}>
                <Input
                    label="Title"
                    placeholder={"e.g. \"Help fund Temi's 30th\""}
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                />
                <Input
                    label="Description (optional)"
                    placeholder="A short blurb shown next to the pool"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
                <Input
                    label="Goal amount (₦, optional)"
                    type="number"
                    placeholder="e.g. 500000"
                    value={form.goalAmount}
                    onChange={(e) => setForm({ ...form, goalAmount: e.target.value })}
                    min="0"
                    step="0.01"
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--text-2)' }}>
                    <input
                        type="checkbox"
                        checked={form.isPublic}
                        onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
                    />
                    Show this pool publicly on the event page
                </label>

                {error && <Toast kind="error" message={error} />}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                    <Button type="submit" variant="primary" size="md" disabled={createState.isLoading}>
                        {createState.isLoading ? 'Creating…' : 'Create pool'}
                    </Button>
                </div>
            </form>
        </div>
    );
}

/* ─── Edit pool dialog ───────────────────────── */

function EditPoolDialog({ pool, onClose, onSave, busy }) {
    const [form, setForm] = useState({
        title: pool.title || '',
        description: pool.description || '',
        // pool.goalAmount is in kobo; show it to the user in naira
        goalAmount: pool.goalAmount != null ? Number(pool.goalAmount) / 100 : '',
        clearGoal: false,
    });

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    function submit(e) {
        e.preventDefault();
        const payload = {
            title: form.title.trim() || undefined,
            description: form.description.trim() || undefined,
        };
        if (form.clearGoal) {
            payload.clearGoal = true;
        } else if (form.goalAmount !== '') {
            const n = Number(form.goalAmount);
            // Convert naira input to kobo for the backend
            if (Number.isFinite(n) && n > 0) payload.goalAmount = nairaToKobo(n);
        }
        onSave(payload);
    }

    return (
        <div onClick={onClose} role="dialog" aria-label="Edit contribution pool" style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(2,16,45,0.55)',
            display: 'grid', placeItems: 'center',
            padding: 20,
        }}>
            <div onClick={(e) => e.stopPropagation()} style={{
                width: '100%', maxWidth: 460,
                background: 'var(--surface-elevated)',
                borderRadius: 16,
                boxShadow: 'var(--shadow-modal)',
                padding: 24,
            }}>
                <h3 className="mp-h3" style={{ margin: 0, color: 'var(--text-1)' }}>Edit pool</h3>
                <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
                    <Input
                        label="Title"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                    />
                    <Input
                        label="Description"
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                    <Input
                        label="Goal amount (₦)"
                        type="number"
                        value={form.goalAmount}
                        onChange={(e) => setForm({ ...form, goalAmount: e.target.value, clearGoal: false })}
                        disabled={form.clearGoal}
                        min="0"
                        step="0.01"
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-2)' }}>
                        <input
                            type="checkbox"
                            checked={form.clearGoal}
                            onChange={(e) => setForm({ ...form, clearGoal: e.target.checked })}
                        />
                        Remove goal (open-ended pool)
                    </label>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
                        <Button type="button" variant="ghost" size="md" onClick={onClose} disabled={busy}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" size="md" disabled={busy}>
                            {busy ? 'Saving…' : 'Save changes'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ─── Contributor list ───────────────────────── */

function ContributionsList({ eventId }) {
    const [page, setPage] = useState(0);
    const pageSize = 10;
    const listQ = useListContributionsQuery({ eventId, page, size: pageSize });

    const items = listQ.data?.content ?? [];
    const total = listQ.data?.totalElements ?? 0;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));

    return (
        <div style={{
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: 'var(--shadow-card)',
            overflow: 'hidden',
        }}>
            <div style={{
                padding: '14px 20px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>Contributors</span>
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                    {listQ.isLoading ? 'Loading…' : `${total} total`}
                </span>
            </div>

            {listQ.isLoading && <ListSkeleton />}

            {!listQ.isLoading && items.length === 0 && (
                <div style={{
                    padding: 40, textAlign: 'center',
                    color: 'var(--text-3)', fontSize: 14,
                }}>
                    No contributions yet.
                </div>
            )}

            {items.map((c, i) => (
                <ContributorRow key={c.id} contribution={c} isLast={i === items.length - 1} />
            ))}

            {pageCount > 1 && (
                <div style={{
                    padding: 12, borderTop: '1px solid var(--border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                    <Button
                        size="sm" variant="ghost"
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={page === 0}
                    >
                        ← Prev
                    </Button>
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                        Page {page + 1} of {pageCount}
                    </span>
                    <Button
                        size="sm" variant="ghost"
                        onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                        disabled={page >= pageCount - 1}
                    >
                        Next →
                    </Button>
                </div>
            )}
        </div>
    );
}

function ContributorRow({ contribution, isLast }) {
    const c = contribution;
    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: 16,
            padding: '14px 20px',
            borderBottom: isLast ? 0 : '1px solid var(--border)',
            alignItems: 'center',
        }}>
            <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 14 }}>
                        {c.contributorName}
                    </span>
                    <PaymentPill status={c.paymentStatus} />
                </div>
                {c.message && (
                    <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4, textWrap: 'pretty' }}>
                        “{c.message}”
                    </div>
                )}
                {c.createdAt && (
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                        {formatEventDate(c.createdAt)}
                    </div>
                )}
            </div>
            <div className="mp-num" style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-1)' }}>
                {formatNaira(c.amount)}
            </div>
        </div>
    );
}

function PaymentPill({ status }) {
    const map = {
        CONFIRMED: { bg: 'var(--success-bg)', fg: 'var(--success)' },
        PENDING:   { bg: 'var(--warning-bg)', fg: 'var(--warning)' },
        FAILED:    { bg: 'var(--error-bg)',   fg: 'var(--error)' },
        REFUNDED:  { bg: 'var(--surface-subtle)', fg: 'var(--text-3)' },
    };
    const s = map[status] ?? map.PENDING;
    return (
        <span style={{
            padding: '2px 8px',
            borderRadius: 99,
            background: s.bg,
            color: s.fg,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.02em',
        }}>
            {status}
        </span>
    );
}

/* ─── Shared bits ───────────────────────── */

function Skeleton() {
    return (
        <div style={{
            background: 'var(--surface-elevated)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 24, minHeight: 200,
            animation: 'mp-flash 1.6s ease-in-out infinite',
        }} />
    );
}

function ListSkeleton() {
    return (
        <>
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{
                    height: 56,
                    borderBottom: '1px solid var(--border)',
                    animation: 'mp-flash 1.6s ease-in-out infinite',
                    background: 'var(--surface-subtle)',
                }} />
            ))}
        </>
    );
}

function ErrorBlock({ message, onRetry }) {
    return (
        <div style={{
            background: 'var(--surface-elevated)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 40, textAlign: 'center',
        }}>
            <Icons.alert size={28} style={{ color: 'var(--error)' }} />
            <p className="body-sm" style={{ marginTop: 8, color: 'var(--text-2)' }}>{message}</p>
            <Button variant="secondary" size="sm" onClick={onRetry} style={{ marginTop: 12 }}>
                Retry
            </Button>
        </div>
    );
}

function Toast({ kind, message }) {
    const colors = {
        error:   { bg: 'var(--error-bg)',   fg: 'var(--error)',   bd: 'var(--error)' },
        success: { bg: 'var(--success-bg)', fg: 'var(--success)', bd: 'var(--success)' },
    };
    const c = colors[kind] ?? colors.error;
    return (
        <div role="alert" style={{
            padding: '10px 14px',
            background: c.bg,
            color: c.fg,
            border: `1px solid ${c.bd}`,
            borderRadius: 8,
            fontSize: 13,
        }}>
            {message}
        </div>
    );
}
