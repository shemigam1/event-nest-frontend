import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { logout, selectCurrentUser, selectAuthEmail } from '@/features/auth/authSlice';
import { useGetOrganizerEventsQuery } from '../organizerApi';
import {
    useDeleteEventMutation,
    useWithdrawEventMutation,
} from '@/features/events/eventsApi';
import TopNav from '@/components/ui/TopNav';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { RoleBadge, StatusBadge } from '@/components/ui/Badge';
import { Icons } from '@/components/ui/Icon';

/* ─── Status mapping ──────────────────────────────────
   Backend doesn't have a separate REJECTED status — a rejection is modelled
   as `status=DRAFT` + non-null `rejectionReason`. We derive the UI status
   here so the design's tabs (DRAFT vs REJECTED) work cleanly. */
function uiStatus(event) {
    if (event.status === 'DRAFT' && event.rejectionReason) return 'REJECTED';
    return event.status;
}

const MONTHS_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const MONTHS_FULL  = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS_FULL    = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function eventDateBits(startTime) {
    if (!startTime) return { month: '—', day: '—', label: '' };
    const d = new Date(startTime);
    if (Number.isNaN(d.getTime())) return { month: '—', day: '—', label: '' };
    const hours = d.getHours();
    const mins  = d.getMinutes().toString().padStart(2, '0');
    const ampm  = hours >= 12 ? 'PM' : 'AM';
    const h     = hours % 12 || 12;
    return {
        month: MONTHS_SHORT[d.getMonth()],
        day:   d.getDate(),
        label: `${DAYS_FULL[d.getDay()]} ${d.getDate()} ${MONTHS_FULL[d.getMonth()]} · ${h}:${mins} ${ampm}`,
    };
}

/* "3 days ago" / "5 hours ago" / "12 minutes ago" — anchored to `nowMs` so
   the value is stable for the render and doesn't violate React purity. */
function relativeTime(iso, nowMs) {
    if (!iso) return '';
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return '';
    const diffMs = Math.max(0, nowMs - t);
    const m = Math.floor(diffMs / 60_000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m} min${m === 1 ? '' : 's'} ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
    const d = Math.floor(h / 24);
    if (d < 30) return `${d} day${d === 1 ? '' : 's'} ago`;
    const mo = Math.floor(d / 30);
    return `${mo} month${mo === 1 ? '' : 's'} ago`;
}

function hoursSince(iso, nowMs) {
    if (!iso) return 0;
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return 0;
    return Math.max(0, Math.floor((nowMs - t) / 3_600_000));
}

function tierTotals(event) {
    const tiers = event.tiers || [];
    const cap = tiers.reduce((s, t) => s + (t.totalCapacity || 0), 0);
    const sold = tiers.reduce(
        (s, t) => s + ((t.totalCapacity || 0) - (t.availableCapacity || 0)),
        0,
    );
    return { sold, cap };
}

/* ─── Tile ────────────────────────────────────────── */
function Tile({ label, value, sub, icon, accent }) {
    return (
        <div style={{
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 18,
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
            }}>
                <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>
                    {label}
                </span>
                {icon && <span style={{ color: 'var(--text-3)' }}>{icon}</span>}
            </div>
            <div className="mp-num" style={{
                fontSize: 26,
                fontWeight: 700,
                lineHeight: 1,
                color: accent || 'var(--text-1)',
            }}>
                {value}
            </div>
            {sub && (
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>
                    {sub}
                </div>
            )}
        </div>
    );
}

/* ─── Confirmation dialogs ───────────────────────── */
function ConfirmDialog({ open, title, message, confirmLabel, confirmVariant = 'destructive', loading, onConfirm, onDismiss }) {
    if (!open) return null;
    return (
        <div
            role="dialog"
            aria-label={title}
            onClick={onDismiss}
            style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: 'rgba(2,16,45,0.55)',
                display: 'grid', placeItems: 'center', padding: 20,
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: '100%', maxWidth: 420, background: 'white',
                    borderRadius: 16, padding: 28, boxShadow: 'var(--shadow-modal)',
                }}
            >
                <h2 className="mp-h3" style={{ margin: '0 0 8px', color: 'var(--text-1)' }}>{title}</h2>
                <div className="body-sm" style={{ margin: '0 0 24px', color: 'var(--text-2)' }}>
                    {message}
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <Button variant="ghost" size="md" onClick={onDismiss} disabled={loading}>Cancel</Button>
                    <Button variant={confirmVariant} size="md" onClick={onConfirm} disabled={loading}>
                        {loading ? 'Working…' : confirmLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
}

/* ─── Rejection reason modal ──────────────────────── */
function RejectionModal({ event, onDismiss, onEdit, nowMs }) {
    if (!event) return null;
    return (
        <div
            role="dialog"
            aria-label="Rejection reason"
            onClick={onDismiss}
            style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: 'rgba(2,16,45,0.55)',
                display: 'grid', placeItems: 'center', padding: 20,
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: '100%', maxWidth: 520, background: 'white',
                    borderRadius: 16, padding: 28, boxShadow: 'var(--shadow-modal)',
                }}
            >
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <StatusBadge status="REJECTED" />
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                        Reviewed {relativeTime(event.updatedAt, nowMs)}
                    </span>
                </div>
                <h3 className="mp-h3" style={{ margin: 0, color: 'var(--text-1)' }}>{event.title}</h3>
                <p className="body-sm" style={{ color: 'var(--text-2)', margin: '4px 0 18px' }}>
                    {event.venue} · {eventDateBits(event.startTime).label}
                </p>
                <div style={{
                    padding: 14,
                    background: 'var(--danger-bg, #FBE9E9)',
                    border: '1px solid #F4C5C5',
                    borderRadius: 10,
                    color: 'var(--text-1)',
                    fontSize: 14,
                    lineHeight: 1.5,
                }}>
                    <div style={{
                        fontSize: 12, fontWeight: 600,
                        color: 'var(--error)', marginBottom: 6, letterSpacing: 0.3,
                    }}>
                        ADMIN NOTE
                    </div>
                    {event.rejectionReason}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
                    <Button variant="ghost" size="md" onClick={onDismiss}>Close</Button>
                    <Button variant="primary" size="md" onClick={() => onEdit(event)}>
                        Edit & re-submit
                    </Button>
                </div>
            </div>
        </div>
    );
}

/* ─── Row ─────────────────────────────────────────── */
function SubmissionRow({ event, nowMs, onManage, onEdit, onDiscard, onWithdraw, onViewRejection, busy }) {
    const status = uiStatus(event);
    const { sold, cap } = tierTotals(event);
    const pct = cap ? Math.round((sold / cap) * 100) : 0;
    const muted = status === 'CANCELLED' || status === 'REJECTED';
    const date = eventDateBits(event.startTime);

    let meta = null;
    if (status === 'PUBLISHED') {
        meta = <>Approved · live now</>;
    } else if (status === 'PENDING_APPROVAL') {
        const hrs = hoursSince(event.updatedAt, nowMs);
        meta = (
            <>
                Submitted {relativeTime(event.updatedAt, nowMs)} · waiting{' '}
                <span style={{ color: 'var(--warning)', fontWeight: 600 }}>{hrs}h</span> for admin review
            </>
        );
    } else if (status === 'DRAFT') {
        meta = <>Last edited {relativeTime(event.updatedAt, nowMs)} · not yet submitted</>;
    } else if (status === 'REJECTED') {
        meta = <>Reviewed {relativeTime(event.updatedAt, nowMs)} · needs revision</>;
    } else if (status === 'CANCELLED') {
        meta = <>Cancelled {relativeTime(event.updatedAt, nowMs)}</>;
    }

    let actions = null;
    if (status === 'PUBLISHED') {
        actions = (
            <>
                <Button size="sm" variant="secondary" onClick={() => window.open(`/events/${event.id}`, '_blank')}>
                    Public page
                </Button>
                <Button size="sm" variant="primary" onClick={() => onManage(event)} iconRight={<Icons.arrowR size={13}/>}>
                    Manage
                </Button>
            </>
        );
    } else if (status === 'PENDING_APPROVAL') {
        actions = (
            <>
                <Button size="sm" variant="ghost" onClick={() => onWithdraw(event)} disabled={busy}>
                    Withdraw
                </Button>
                <Button size="sm" variant="secondary" onClick={() => onManage(event)}>
                    Preview
                </Button>
            </>
        );
    } else if (status === 'DRAFT') {
        actions = (
            <>
                <Button size="sm" variant="ghost" onClick={() => onDiscard(event)}>
                    Discard
                </Button>
                <Button size="sm" variant="primary" onClick={() => onEdit(event)}>
                    Continue editing
                </Button>
            </>
        );
    } else if (status === 'REJECTED') {
        actions = (
            <>
                <Button size="sm" variant="secondary" onClick={() => onViewRejection(event)}>
                    View reason
                </Button>
                <Button size="sm" variant="primary" onClick={() => onEdit(event)}>
                    Edit &amp; resubmit
                </Button>
            </>
        );
    } else if (status === 'CANCELLED') {
        actions = (
            <Button size="sm" variant="secondary" onClick={() => onManage(event)}>
                View summary
            </Button>
        );
    }

    return (
        <div style={{
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: 12,
            opacity: muted ? 0.78 : 1,
        }}>
            <div
                data-testid={`event-row-${event.id}`}
                className="mp-event-row"
                style={{
                    display: 'grid',
                    gridTemplateColumns: '76px 1fr 220px auto',
                    gap: 24,
                    alignItems: 'center',
                    padding: '18px 22px',
                }}
            >
                {/* Date block */}
                <div style={{
                    textAlign: 'center',
                    borderRight: '1px solid var(--border)',
                    paddingRight: 16,
                }}>
                    <div style={{
                        fontSize: 11, color: 'var(--text-3)',
                        fontWeight: 600, letterSpacing: 0.5,
                    }}>
                        {date.month}
                    </div>
                    <div className="mp-num" style={{
                        fontSize: 26, fontWeight: 700, color: 'var(--text-1)',
                        lineHeight: 1.1, marginTop: 2,
                        textDecoration: muted ? 'line-through' : 'none',
                    }}>
                        {date.day}
                    </div>
                </div>

                {/* Title + meta */}
                <div style={{ minWidth: 0 }}>
                    <div style={{
                        display: 'flex', gap: 8, alignItems: 'center',
                        marginBottom: 6, flexWrap: 'wrap',
                    }}>
                        <StatusBadge status={status} size="sm" />
                        {status === 'PUBLISHED' && pct >= 75 && (
                            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--warning)' }}>
                                · Selling fast
                            </span>
                        )}
                    </div>
                    <div style={{
                        fontWeight: 600, color: 'var(--text-1)', fontSize: 16,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                        {event.title}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 3 }}>
                        {event.venue}{date.label ? ` · ${date.label}` : ''}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>
                        {meta}
                    </div>
                </div>

                {/* Capacity / progress */}
                <div>
                    {status === 'PUBLISHED' && cap > 0 && (
                        <>
                            <div style={{
                                display: 'flex', justifyContent: 'space-between',
                                alignItems: 'baseline', marginBottom: 5,
                            }}>
                                <span className="mp-num" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
                                    {sold} / {cap}
                                </span>
                                <span className="mp-num" style={{ fontSize: 12, color: 'var(--text-3)' }}>
                                    {pct}%
                                </span>
                            </div>
                            <div style={{
                                height: 6,
                                background: 'var(--surface-subtle)',
                                borderRadius: 99,
                                overflow: 'hidden',
                            }}>
                                <div style={{
                                    height: '100%',
                                    width: `${pct}%`,
                                    background: pct >= 90 ? 'var(--warning)' : 'var(--mp-blue)',
                                    borderRadius: 99,
                                }} />
                            </div>
                        </>
                    )}
                    {status === 'PENDING_APPROVAL' && (
                        <div style={{
                            fontSize: 12, color: 'var(--text-3)',
                            display: 'inline-flex', gap: 6, alignItems: 'center',
                        }}>
                            <span style={{
                                width: 6, height: 6, borderRadius: 99,
                                background: 'var(--warning)',
                            }} />
                            In admin queue
                        </div>
                    )}
                    {status === 'DRAFT' && (
                        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                            {cap > 0 ? `${cap} seats configured` : 'Setup in progress'}
                        </div>
                    )}
                    {status === 'REJECTED' && (
                        <div style={{ fontSize: 12, color: 'var(--error)', fontWeight: 500 }}>
                            Action needed: review reason and resubmit.
                        </div>
                    )}
                    {status === 'CANCELLED' && (
                        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                            {sold > 0 ? `${sold} tickets refunded` : 'Cancelled'}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    {actions}
                </div>
            </div>
        </div>
    );
}

/* ─── Skeleton ────────────────────────────────────── */
function Skeleton() {
    const row = {
        height: 96, borderRadius: 12,
        background: 'var(--surface-subtle)',
        border: '1px solid var(--border)',
        animation: 'mp-flash 1.6s ease-in-out infinite',
    };
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={row} />
            <div style={{ ...row, opacity: 0.7 }} />
            <div style={{ ...row, opacity: 0.4 }} />
        </div>
    );
}

/* ─── Page ────────────────────────────────────────── */
const TABS = [
    ['all',              'All'],
    ['DRAFT',            'Drafts'],
    ['PENDING_APPROVAL', 'Pending'],
    ['PUBLISHED',        'Published'],
    ['REJECTED',         'Rejected'],
    ['CANCELLED',        'Cancelled'],
];

export default function OrganizerConsolePage() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const user  = useSelector(selectCurrentUser);
    const email = useSelector(selectAuthEmail);
    const firstName = user?.firstName ?? email?.split('@')[0] ?? '';

    const { data: events = [], isLoading, isError, error, refetch } = useGetOrganizerEventsQuery();
    const isAuthError = isError && (error?.status === 401 || error?.status === 403);

    useEffect(() => {
        if (isAuthError) {
            dispatch(logout());
            navigate('/login', { replace: true });
        }
    }, [isAuthError, dispatch, navigate]);

    const [withdrawEvent, withdrawState] = useWithdrawEventMutation();
    const [deleteEvent,   deleteState]   = useDeleteEventMutation();

    const [filter, setFilter]               = useState('all');
    const [query, setQuery]                 = useState('');
    const [pendingDelete, setPendingDelete] = useState(null);
    const [pendingWithdraw, setPendingWithdraw] = useState(null);
    const [showRejection, setShowRejection] = useState(null);
    const [actionError, setActionError]     = useState('');

    // Stable anchor for "X hours ago" labels — derived once per render of the
    // page, not per row, so reordering doesn't shift relative times.
    const [nowMs] = useState(() => Date.now());

    const counts = useMemo(() => {
        const c = { all: events.length, DRAFT: 0, PENDING_APPROVAL: 0, PUBLISHED: 0, REJECTED: 0, CANCELLED: 0 };
        for (const e of events) {
            const s = uiStatus(e);
            if (c[s] !== undefined) c[s] += 1;
        }
        return c;
    }, [events]);

    const totalSold = useMemo(() => events.reduce(
        (sum, e) => sum + (e.status === 'PUBLISHED' ? tierTotals(e).sold : 0),
        0,
    ), [events]);

    const needsAction = counts.DRAFT + counts.REJECTED;

    const filtered = useMemo(() => events.filter((e) => {
        if (filter !== 'all' && uiStatus(e) !== filter) return false;
        if (query) {
            const q = query.toLowerCase();
            if (!e.title?.toLowerCase().includes(q) && !e.venue?.toLowerCase().includes(q)) {
                return false;
            }
        }
        return true;
    }), [events, filter, query]);

    async function handleWithdraw() {
        if (!pendingWithdraw) return;
        setActionError('');
        try {
            await withdrawEvent(pendingWithdraw.id).unwrap();
            setPendingWithdraw(null);
        } catch (err) {
            setActionError(err?.data?.message || 'Could not withdraw. Please try again.');
        }
    }

    async function handleDelete() {
        if (!pendingDelete) return;
        setActionError('');
        try {
            await deleteEvent(pendingDelete.id).unwrap();
            setPendingDelete(null);
        } catch (err) {
            setActionError(err?.data?.message || 'Could not delete. Please try again.');
        }
    }

    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            <TopNav />

            {/* Header (white band) */}
            <div style={{ background: 'white', borderBottom: '1px solid var(--border)' }}>
                <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px 0' }}>
                    <button
                        onClick={() => navigate('/')}
                        style={{
                            background: 'none', border: 0, color: 'var(--text-2)',
                            fontSize: 14, padding: 0, marginBottom: 14, cursor: 'pointer',
                            display: 'inline-flex', gap: 6, alignItems: 'center',
                        }}
                    >
                        <Icons.arrowL size={14} /> Dashboard
                    </button>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr auto',
                        gap: 24, alignItems: 'flex-end', flexWrap: 'wrap',
                    }}>
                        <div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                                <RoleBadge role="ORGANISER" />
                            </div>
                            <h1 className="mp-h1" style={{ margin: 0, color: 'var(--text-1)' }}>My events</h1>
                            <p className="body" style={{ margin: '6px 0 0', color: 'var(--text-2)' }}>
                                {firstName ? `Welcome back, ${firstName}. ` : ''}
                                Everything you&apos;ve submitted — drafts, pending review, live, and past.
                            </p>
                        </div>
                        <Button
                            variant="primary"
                            size="md"
                            icon={<Icons.plus size={15} />}
                            onClick={() => navigate('/events/new')}
                        >
                            Create event
                        </Button>
                    </div>

                    {/* Tiles */}
                    <div className="mp-stat-grid" style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: 16,
                        margin: '24px 0 0',
                    }}>
                        <Tile
                            label="Total submissions"
                            value={isLoading ? '—' : counts.all}
                            icon={<Icons.spark size={16} />}
                        />
                        <Tile
                            label="Live now"
                            value={isLoading ? '—' : counts.PUBLISHED}
                            sub={`${totalSold.toLocaleString()} tickets sold`}
                            accent="var(--success)"
                        />
                        <Tile
                            label="Awaiting review"
                            value={isLoading ? '—' : counts.PENDING_APPROVAL}
                            icon={<Icons.inbox size={16} />}
                            accent={counts.PENDING_APPROVAL > 0 ? 'var(--warning)' : undefined}
                        />
                        <Tile
                            label="Needs your action"
                            value={isLoading ? '—' : needsAction}
                            sub={`${counts.DRAFT} draft · ${counts.REJECTED} rejected`}
                        />
                    </div>

                    {/* Tabs */}
                    <div className="mp-tab-scroll" style={{
                        display: 'flex',
                        gap: 0,
                        marginTop: 24,
                        overflowX: 'auto',
                    }}>
                        {TABS.map(([id, label]) => {
                            const n = id === 'all' ? counts.all : counts[id];
                            const active = filter === id;
                            return (
                                <button
                                    key={id}
                                    onClick={() => setFilter(id)}
                                    style={{
                                        background: 'transparent',
                                        border: 0,
                                        padding: '12px 18px',
                                        color: active ? 'var(--mp-blue)' : 'var(--text-2)',
                                        borderBottom: `2px solid ${active ? 'var(--mp-blue)' : 'transparent'}`,
                                        fontWeight: active ? 600 : 500,
                                        fontSize: 14,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {label}
                                    <span className="mp-num" style={{
                                        fontSize: 11,
                                        padding: '2px 7px',
                                        borderRadius: 99,
                                        fontWeight: 600,
                                        background: active ? 'var(--mp-blue-50, #EAF1FE)' : 'var(--surface-subtle)',
                                        color: active ? 'var(--mp-blue)' : 'var(--text-3)',
                                    }}>
                                        {n}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Body */}
            <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 24px 80px' }}>
                <div style={{ marginBottom: 16, maxWidth: 360 }}>
                    <Input
                        placeholder="Search by title or venue"
                        icon={<Icons.search size={18} />}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>

                {actionError && (
                    <div role="alert" style={{
                        margin: '0 0 16px',
                        padding: '10px 16px',
                        background: 'var(--error-bg, #FBE9E9)',
                        color: 'var(--error)',
                        borderRadius: 10,
                        fontSize: 14,
                    }}>
                        {actionError}
                    </div>
                )}

                {isLoading && <Skeleton />}

                {isError && !isAuthError && (
                    <div style={{
                        background: 'white',
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                        padding: 40,
                        textAlign: 'center',
                    }}>
                        <Icons.alert size={28} style={{ color: 'var(--error)' }} />
                        <p className="body-sm" style={{ marginTop: 8, color: 'var(--text-2)' }}>
                            Could not load your events.
                        </p>
                        <Button variant="secondary" size="sm" onClick={refetch} style={{ marginTop: 12 }}>
                            Retry
                        </Button>
                    </div>
                )}

                {!isLoading && !isError && filtered.length === 0 && (
                    <div style={{
                        background: 'white',
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                        padding: 60,
                        textAlign: 'center',
                    }}>
                        <div style={{
                            width: 56, height: 56, borderRadius: 99,
                            margin: '0 auto 14px',
                            background: 'var(--surface-subtle)',
                            display: 'grid', placeItems: 'center',
                            color: 'var(--text-3)',
                        }}>
                            <Icons.inbox size={22} />
                        </div>
                        <div className="mp-h4" style={{ color: 'var(--text-1)', margin: 0 }}>
                            Nothing here yet
                        </div>
                        <div className="body" style={{ color: 'var(--text-2)', marginTop: 6 }}>
                            {filter === 'all'
                                ? 'When you create or submit an event it shows up here.'
                                : `No events match “${TABS.find(([id]) => id === filter)?.[1]}”.`}
                        </div>
                        {filter === 'all' && (
                            <Button
                                variant="primary"
                                size="sm"
                                icon={<Icons.plus size={14} />}
                                onClick={() => navigate('/events/new')}
                                style={{ marginTop: 18 }}
                            >
                                Create your first event
                            </Button>
                        )}
                    </div>
                )}

                {!isLoading && !isError && filtered.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {filtered.map((e) => (
                            <SubmissionRow
                                key={e.id}
                                event={e}
                                nowMs={nowMs}
                                onManage={(ev) => navigate(`/organiser/events/${ev.id}`)}
                                onEdit={(ev) => navigate(`/events/${ev.id}/edit`)}
                                onDiscard={(ev) => setPendingDelete(ev)}
                                onWithdraw={(ev) => setPendingWithdraw(ev)}
                                onViewRejection={(ev) => setShowRejection(ev)}
                                busy={withdrawState.isLoading}
                            />
                        ))}
                    </div>
                )}
            </div>

            <ConfirmDialog
                open={!!pendingDelete}
                title="Discard draft?"
                message={
                    <>
                        <strong>{pendingDelete?.title}</strong> will be permanently deleted. This cannot be undone.
                    </>
                }
                confirmLabel="Discard"
                loading={deleteState.isLoading}
                onConfirm={handleDelete}
                onDismiss={() => setPendingDelete(null)}
            />

            <ConfirmDialog
                open={!!pendingWithdraw}
                title="Withdraw from review?"
                message={
                    <>
                        <strong>{pendingWithdraw?.title}</strong> will be moved back to drafts so you can edit it. You&apos;ll need to re-submit when you&apos;re ready.
                    </>
                }
                confirmLabel="Withdraw"
                confirmVariant="primary"
                loading={withdrawState.isLoading}
                onConfirm={handleWithdraw}
                onDismiss={() => setPendingWithdraw(null)}
            />

            <RejectionModal
                event={showRejection}
                nowMs={nowMs}
                onDismiss={() => setShowRejection(null)}
                onEdit={(ev) => {
                    setShowRejection(null);
                    navigate(`/events/${ev.id}/edit`);
                }}
            />
        </div>
    );
}
