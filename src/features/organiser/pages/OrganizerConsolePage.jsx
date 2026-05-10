import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { logout, selectCurrentUser, selectAuthEmail } from '@/features/auth/authSlice';
import { useGetOrganizerEventsQuery } from '../organizerApi';
import { useSubmitEventMutation, useDeleteEventMutation } from '@/features/events/eventsApi';
import TopNav from '@/components/ui/TopNav';
import Button from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { Icons } from '@/components/ui/Icon';
import { formatEventDate } from '@/utils/dateFormat';

const FILTERS = [
    { id: 'ALL', label: 'All' },
    { id: 'DRAFT', label: 'Draft' },
    { id: 'PENDING_APPROVAL', label: 'Pending' },
    { id: 'PUBLISHED', label: 'Published' },
];

/* ── Stat tile ───────────────────────────────────── */
function StatTile({ label, value, icon, sub }) {
    return (
        <div style={{
            background: 'white', border: '1px solid var(--border)',
            borderRadius: 12, padding: 20, boxShadow: 'var(--shadow-card)',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 13, fontWeight: 500, color: 'var(--text-2)' }}>
                {icon} {label}
            </div>
            <div className="mp-num" style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1 }}>
                {value}
            </div>
            {sub && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>{sub}</div>}
        </div>
    );
}

/* ── Delete confirmation ─────────────────────────── */
function DeleteDialog({ event, onConfirm, onDismiss, loading }) {
    if (!event) return null;
    return (
        <div
            role="dialog"
            aria-label="Delete event"
            onClick={onDismiss}
            style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(2,16,45,0.55)', display: 'grid', placeItems: 'center', padding: 20 }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{ width: '100%', maxWidth: 400, background: 'white', borderRadius: 16, padding: 28, boxShadow: 'var(--shadow-modal)' }}
            >
                <h2 className="mp-h3" style={{ margin: '0 0 8px', color: 'var(--text-1)' }}>Delete event?</h2>
                <p className="body-sm" style={{ margin: '0 0 24px', color: 'var(--text-2)' }}>
                    <strong>{event.title}</strong> will be permanently deleted. This cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <Button variant="ghost" size="md" onClick={onDismiss} disabled={loading}>Cancel</Button>
                    <Button variant="destructive" size="md" onClick={onConfirm} disabled={loading}>
                        {loading ? 'Deleting…' : 'Delete'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

/* ── Event row ───────────────────────────────────── */
function EventRow({ event, isLast, onView, onSubmit, onDelete, submitting }) {
    const sold = event.soldCount ?? 0;
    const total = event.totalCapacity ?? 0;
    const revenue = event.totalRevenue ?? 0;
    const isDraft = event.status === 'DRAFT';
    const isRejected = isDraft && event.rejectionReason;

    return (
        <div style={{ borderBottom: isLast ? 0 : '1px solid var(--border)' }}>
            {isRejected && (
                <div style={{
                    margin: '12px 20px 0',
                    padding: '10px 14px',
                    background: '#FFF8E1',
                    borderRadius: 8,
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    color: '#92400E',
                }}>
                    <Icons.alert size={14} style={{ flexShrink: 0, marginTop: 1, color: '#F59E0B' }} />
                    <span><strong>Rejected — </strong>{event.rejectionReason}</span>
                </div>
            )}
            <div
                data-testid={`event-row-${event.id}`}
                className="mp-event-row"
                style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 120px 130px auto',
                    gap: 16,
                    alignItems: 'center',
                    padding: '16px 20px',
                }}
            >
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                        <StatusBadge status={event.status} />
                        {isRejected && (
                            <span style={{ fontSize: 11, color: '#F59E0B', fontWeight: 700, letterSpacing: '0.03em' }}>
                                NEEDS REVISION
                            </span>
                        )}
                    </div>
                    <div style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 15 }}>{event.title}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 3, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Icons.pin size={12} style={{ color: 'var(--text-3)' }} />{event.venue}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Icons.calendar size={12} style={{ color: 'var(--text-3)' }} />{formatEventDate(event.startTime)}
                        </span>
                    </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                    <div className="mp-num" style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>
                        {sold.toLocaleString()}{' '}
                        <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>/ {total.toLocaleString()}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>tickets sold</div>
                </div>

                <div style={{ textAlign: 'right' }}>
                    <div className="mp-num" style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>
                        {revenue === 0 ? '—' : `₦${revenue.toLocaleString()}`}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>revenue</div>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Button size="sm" variant="secondary" onClick={() => onView(event.id)}>
                        View
                    </Button>
                    {isDraft && (
                        <Button size="sm" variant="primary" onClick={() => onSubmit(event)} disabled={submitting}>
                            Submit
                        </Button>
                    )}
                    {isDraft && (
                        <button
                            onClick={() => onDelete(event)}
                            aria-label="Delete event"
                            style={{
                                width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)',
                                background: 'white', cursor: 'pointer', display: 'grid', placeItems: 'center',
                                color: 'var(--error)',
                            }}
                        >
                            <Icons.x size={14} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ── Loading skeleton ────────────────────────────── */
function Skeleton() {
    const row = { height: 82, borderBottom: '1px solid var(--border)', background: 'var(--surface-subtle)', animation: 'mp-flash 1.6s ease-in-out infinite' };
    return (
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={row} /><div style={{ ...row, opacity: 0.7 }} /><div style={{ ...row, opacity: 0.4, borderBottom: 0 }} />
        </div>
    );
}

/* ── Page ────────────────────────────────────────── */
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
    const [submitEvent, submitState] = useSubmitEventMutation();
    const [deleteEvent, deleteState] = useDeleteEventMutation();

    const [filter, setFilter] = useState('ALL');
    const [pendingDelete, setPendingDelete] = useState(null);
    const [actionError, setActionError] = useState('');

    const filteredEvents = filter === 'ALL' ? events : events.filter((e) => e.status === filter);

    const totalRevenue = events.reduce((s, e) => s + (e.totalRevenue ?? 0), 0);
    const published = events.filter((e) => e.status === 'PUBLISHED').length;
    const pending = events.filter((e) => e.status === 'PENDING_APPROVAL').length;
    const totalSold = events.reduce((s, e) => s + (e.soldCount ?? 0), 0);

    async function handleSubmit(event) {
        setActionError('');
        try { await submitEvent(event.id).unwrap(); }
        catch (err) { setActionError(err?.data?.message || 'Could not submit. Please try again.'); }
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
            <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 80px' }}>

                {/* Header */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
                    <div>
                        <h1 className="mp-h1" style={{ margin: 0, color: 'var(--text-1)' }}>Organiser Console</h1>
                        <p className="body" style={{ margin: '6px 0 0', color: 'var(--text-2)' }}>
                            {firstName ? `Welcome back, ${firstName}. ` : ''}Manage your events and track performance.
                        </p>
                    </div>
                    <Button variant="primary" size="md" icon={<Icons.plus size={15} />} onClick={() => navigate('/events/new')}>
                        Create event
                    </Button>
                </div>

                {/* Stats */}
                <div className="mp-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
                    <StatTile label="Total events" value={isLoading ? '—' : events.length} icon={<Icons.calendar size={16} />} />
                    <StatTile label="Published" value={isLoading ? '—' : published} icon={<Icons.bolt size={16} />} />
                    <StatTile label="Tickets sold" value={isLoading ? '—' : totalSold.toLocaleString()} icon={<Icons.ticket size={16} />} />
                    <StatTile
                        label="Total revenue"
                        value={isLoading ? '—' : totalRevenue === 0 ? '₦0' : `₦${totalRevenue.toLocaleString()}`}
                        icon={<Icons.wallet size={16} />}
                        sub={pending > 0 ? `${pending} event${pending > 1 ? 's' : ''} pending approval` : null}
                    />
                </div>

                {actionError && (
                    <div role="alert" style={{ margin: '0 0 16px', padding: '10px 16px', background: 'var(--error-bg)', color: 'var(--error)', borderRadius: 10, fontSize: 14 }}>
                        {actionError}
                    </div>
                )}

                {/* Filter tabs */}
                <div className="mp-tab-scroll" style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: 4, width: 'fit-content', maxWidth: '100%' }}>
                    {FILTERS.map(({ id, label }) => {
                        const active = filter === id;
                        return (
                            <button
                                key={id}
                                onClick={() => setFilter(id)}
                                style={{
                                    height: 34, padding: '0 14px', borderRadius: 8, border: 'none',
                                    background: active ? 'var(--mp-blue)' : 'transparent',
                                    color: active ? 'white' : 'var(--text-2)',
                                    fontSize: 13, fontWeight: active ? 600 : 500, cursor: 'pointer',
                                    transition: 'all 0.15s',
                                }}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>

                {/* Events list */}
                {isLoading && <Skeleton />}

                {isError && !isAuthError && (
                    <div style={{ padding: 40, textAlign: 'center' }}>
                        <Icons.alert size={28} style={{ color: 'var(--error)' }} />
                        <p className="body-sm" style={{ marginTop: 8, color: 'var(--text-2)' }}>Could not load your events.</p>
                        <Button variant="secondary" size="sm" onClick={refetch} style={{ marginTop: 12 }}>Retry</Button>
                    </div>
                )}

                {!isLoading && !isError && (
                    <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}>
                        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 14 }}>Your events</span>
                            <span style={{ fontSize: 13, color: 'var(--text-3)' }}>
                                {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
                            </span>
                        </div>

                        {filteredEvents.length === 0 ? (
                            <div style={{ padding: 56, textAlign: 'center' }}>
                                <Icons.calendar size={32} style={{ color: 'var(--text-3)' }} />
                                <p className="mp-h4" style={{ margin: '12px 0 4px', color: 'var(--text-1)' }}>
                                    {filter === 'ALL' ? 'No events yet' : `No ${label(filter)} events`}
                                </p>
                                <p className="body-sm" style={{ color: 'var(--text-2)', margin: '0 0 20px' }}>
                                    {filter === 'ALL'
                                        ? 'Create your first event to get started.'
                                        : 'Events with this status will appear here.'}
                                </p>
                                {filter === 'ALL' && (
                                    <Button variant="primary" size="sm" icon={<Icons.plus size={14} />} onClick={() => navigate('/events/new')}>
                                        Create event
                                    </Button>
                                )}
                            </div>
                        ) : filteredEvents.map((event, i) => (
                            <EventRow
                                key={event.id}
                                event={event}
                                isLast={i === filteredEvents.length - 1}
                                onView={(id) => navigate(`/organiser/events/${id}`)}
                                onSubmit={handleSubmit}
                                onDelete={setPendingDelete}
                                submitting={submitState.isLoading}
                            />
                        ))}
                    </div>
                )}
            </div>

            <DeleteDialog
                event={pendingDelete}
                onConfirm={handleDelete}
                onDismiss={() => setPendingDelete(null)}
                loading={deleteState.isLoading}
            />
        </div>
    );
}

function label(status) {
    return { DRAFT: 'draft', PENDING_APPROVAL: 'pending', PUBLISHED: 'published' }[status] ?? status.toLowerCase();
}
