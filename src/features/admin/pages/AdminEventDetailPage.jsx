import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import Button from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import CapacityBar from '@/components/ui/CapacityBar';
import { Icons } from '@/components/ui/Icon';
import { formatEventDate } from '@/utils/dateFormat';
import {
    useGetAdminEventByIdQuery,
    useGetAdminEventBookingsQuery,
    useCancelEventMutation,
} from '../adminApi';

/* ── Skeleton ────────────────────────────────────── */
function Skeleton() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[260, 40, 160, 280].map((h, i) => (
                <div key={i} style={{ height: h, background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: 14, animation: 'mp-flash 1.6s ease-in-out infinite', opacity: 1 - i * 0.15 }} />
            ))}
        </div>
    );
}

/* ── Tab bar ─────────────────────────────────────── */
function TabBar({ tabs, active, onChange }) {
    return (
        <div style={{
            display: 'flex', gap: 2,
            borderBottom: '1px solid var(--border)',
            marginBottom: 20,
        }}>
            {tabs.map((tab) => {
                const isActive = active === tab.id;
                const isDisabled = tab.disabled;
                return (
                    <button
                        key={tab.id}
                        disabled={isDisabled}
                        onClick={() => !isDisabled && onChange(tab.id)}
                        style={{
                            padding: '10px 18px',
                            fontSize: 14,
                            fontWeight: isActive ? 600 : 400,
                            color: isDisabled ? 'var(--text-4, var(--text-3))' : isActive ? 'var(--brand)' : 'var(--text-2)',
                            background: 'none',
                            border: 'none',
                            borderBottom: isActive ? '2px solid var(--brand)' : '2px solid transparent',
                            marginBottom: -1,
                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            transition: 'color 0.15s',
                            opacity: isDisabled ? 0.45 : 1,
                        }}
                    >
                        {tab.label}
                        {tab.count != null && (
                            <span style={{
                                fontSize: 11, fontWeight: 600,
                                padding: '1px 6px', borderRadius: 10,
                                background: isActive ? 'var(--brand-light, #EFF6FF)' : 'var(--surface-subtle)',
                                color: isActive ? 'var(--brand)' : 'var(--text-3)',
                            }}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

/* ── Page ────────────────────────────────────────── */
export default function AdminEventDetailPage() {
    const { id: eventId } = useParams();
    const navigate = useNavigate();

    const eventQuery    = useGetAdminEventByIdQuery(eventId);
    const isPublished   = eventQuery.data?.status === 'PUBLISHED';
    const bookingsQuery = useGetAdminEventBookingsQuery(eventId, { skip: !isPublished });

    const [cancelEvent, cancelState] = useCancelEventMutation();

    const [tab, setTab]               = useState('details');
    const [showCancel, setShowCancel] = useState(false);
    const [actionError, setActionError] = useState('');

    async function handleCancel() {
        setActionError('');
        try {
            await cancelEvent(eventId).unwrap();
            setShowCancel(false);
        } catch (err) {
            setActionError(err?.data?.message || 'Could not cancel. Please try again.');
        }
    }

    if (eventQuery.isLoading) {
        return <Shell><BackLink /><Skeleton /></Shell>;
    }

    if (eventQuery.isError || !eventQuery.data) {
        return (
            <Shell>
                <BackLink />
                <div style={{ padding: 48, textAlign: 'center' }}>
                    <Icons.alert size={32} style={{ color: 'var(--error)' }} />
                    <p className="mp-h3" style={{ margin: '12px 0 16px', color: 'var(--text-1)' }}>Event not found</p>
                    <Button variant="secondary" onClick={() => navigate('/admin/moderation')}>Back to moderation</Button>
                </div>
            </Shell>
        );
    }

    const event    = eventQuery.data;
    const tiers    = event?.tiers ?? [];
    const bookings = bookingsQuery.data ?? [];

    const totalCapacity = tiers.reduce((s, t) => s + (t.totalCapacity ?? 0), 0);
    const totalSold     = tiers.reduce((s, t) => s + ((t.totalCapacity ?? 0) - (t.availableCapacity ?? 0)), 0);
    const totalRevenue  = tiers.reduce((s, t) => {
        const sold = (t.totalCapacity ?? 0) - (t.availableCapacity ?? 0);
        return s + sold * Number(t.price ?? 0);
    }, 0);

    const tabs = [
        { id: 'details',  label: 'Details' },
        { id: 'bookings', label: 'Bookings', count: isPublished ? bookings.length : undefined, disabled: !isPublished },
    ];

    return (
        <Shell>
            <BackLink />

            {actionError && (
                <div role="alert" style={{ marginBottom: 16, padding: '10px 16px', background: 'var(--error-bg)', color: 'var(--error)', borderRadius: 10, fontSize: 14 }}>
                    {actionError}
                </div>
            )}

            {/* Event header */}
            <div style={{
                background: 'var(--surface-elevated)', border: '1px solid var(--border)',
                borderRadius: 16, padding: 28, marginBottom: 24, boxShadow: 'var(--shadow-card)',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                            <StatusBadge status={event.status} />
                        </div>
                        <h1 className="mp-h2" style={{ margin: '0 0 12px', color: 'var(--text-1)' }}>{event.title}</h1>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {(event.venueName || event.venue) && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-2)' }}>
                                    <Icons.pin size={15} style={{ color: 'var(--text-3)' }} />
                                    {event.venueName ?? event.venue}
                                    {(event.city || event.country) && (
                                        <span style={{ color: 'var(--text-3)' }}>· {[event.city, event.country].filter(Boolean).join(', ')}</span>
                                    )}
                                </div>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-2)' }}>
                                <Icons.calendar size={15} style={{ color: 'var(--text-3)' }} />{formatEventDate(event.startTime)}
                            </div>
                            {(event.organizerName || event.organizer || event.createdBy) && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-2)' }}>
                                    <Icons.users size={15} style={{ color: 'var(--text-3)' }} />
                                    {event.organizer
                                        ? <>Hosted by <strong style={{ color: 'var(--text-1)' }}>{event.organizer.firstName} {event.organizer.lastName}</strong> · <span style={{ color: 'var(--text-3)' }}>{event.organizer.email}</span></>
                                        : <span style={{ color: 'var(--text-1)' }}>Hosted by <strong>{event.organizerName ?? event.createdBy}</strong></span>
                                    }
                                </div>
                            )}
                        </div>
                        {event.description && (
                            <p className="body-sm" style={{ margin: '16px 0 0', color: 'var(--text-2)', lineHeight: 1.6 }}>
                                {event.description}
                            </p>
                        )}
                    </div>

                    {/* Admin actions — take-down only for published events */}
                    {isPublished && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                            <Button variant="destructive" size="md" onClick={() => setShowCancel(true)} disabled={cancelState.isLoading}>
                                Force cancel
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <TabBar tabs={tabs} active={tab} onChange={setTab} />

            {/* Details tab */}
            {tab === 'details' && (
                <>
                    {tiers.length > 0 && (
                        <div className="mp-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
                            {[
                                { label: 'Tickets sold',    value: totalSold.toLocaleString(), sub: `of ${totalCapacity.toLocaleString()}`, icon: <Icons.ticket size={15} /> },
                                { label: 'Revenue',         value: totalRevenue === 0 ? '₦0' : `₦${totalRevenue.toLocaleString()}`, icon: <Icons.wallet size={15} /> },
                                { label: 'Remaining seats', value: (totalCapacity - totalSold).toLocaleString(), icon: <Icons.scan size={15} /> },
                            ].map(({ label, value, sub, icon }) => (
                                <div key={label} style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: 12, padding: 18, boxShadow: 'var(--shadow-card)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10, fontSize: 13, fontWeight: 500, color: 'var(--text-2)' }}>
                                        {icon}{label}
                                    </div>
                                    <div className="mp-num" style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1 }}>{value}</div>
                                    {sub && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 5 }}>{sub}</div>}
                                </div>
                            ))}
                        </div>
                    )}

                    {tiers.length > 0 ? (
                        <div style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
                            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontWeight: 600, color: 'var(--text-1)', fontSize: 14 }}>
                                Ticket tiers ({tiers.length})
                            </div>
                            {tiers.map((tier, i) => {
                                const sold = (tier.totalCapacity ?? 0) - (tier.availableCapacity ?? 0);
                                const revenue = sold * Number(tier.price ?? 0);
                                return (
                                    <div key={tier.id} style={{ padding: '16px 20px', borderBottom: i === tiers.length - 1 ? 0 : '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                            <div>
                                                <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>{tier.name}</div>
                                                <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
                                                    {Number(tier.price) === 0 ? 'Free' : `₦${Number(tier.price).toLocaleString()} per ticket`}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div className="mp-num" style={{ fontWeight: 600, color: 'var(--text-1)' }}>
                                                    {revenue === 0 ? '—' : `₦${revenue.toLocaleString()}`}
                                                </div>
                                                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{sold} sold</div>
                                            </div>
                                        </div>
                                        <CapacityBar sold={sold} total={tier.totalCapacity ?? 0} />
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div style={{ padding: 48, textAlign: 'center', background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow-card)' }}>
                            <Icons.ticket size={28} style={{ color: 'var(--text-3)' }} />
                            <p className="mp-h4" style={{ margin: '12px 0 4px', color: 'var(--text-1)' }}>No ticket tiers</p>
                            <p className="body-sm" style={{ color: 'var(--text-2)', margin: 0 }}>The organiser has not added any ticket tiers yet.</p>
                        </div>
                    )}
                </>
            )}

            {/* Bookings tab */}
            {tab === 'bookings' && isPublished && (
                <div style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
                    <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 14 }}>Bookings</span>
                        <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{bookings.length} total</span>
                    </div>

                    {bookingsQuery.isLoading && (
                        <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>Loading bookings…</div>
                    )}

                    {!bookingsQuery.isLoading && bookings.length === 0 && (
                        <div style={{ padding: 48, textAlign: 'center' }}>
                            <Icons.inbox size={28} style={{ color: 'var(--text-3)' }} />
                            <p className="mp-h4" style={{ margin: '12px 0 4px', color: 'var(--text-1)' }}>No bookings yet</p>
                            <p className="body-sm" style={{ color: 'var(--text-2)', margin: 0 }}>No attendees have booked this event.</p>
                        </div>
                    )}

                    {bookings.map((booking, i) => {
                        const date = new Date(booking.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                        const isCancelled = booking.status === 'CANCELLED';
                        return (
                            <div
                                key={booking.id}
                                className="mp-org-bookings-row"
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 160px 110px 90px',
                                    gap: 16,
                                    alignItems: 'center',
                                    padding: '14px 20px',
                                    borderBottom: i === bookings.length - 1 ? 0 : '1px solid var(--border)',
                                    opacity: isCancelled ? 0.6 : 1,
                                }}
                            >
                                <div>
                                    <div style={{ fontWeight: 500, color: 'var(--text-1)' }}>{booking.attendeeName}</div>
                                    <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>{booking.attendeeEmail}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 13, color: 'var(--text-1)' }}>{booking.tierName}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                                        {booking.quantity} ticket{booking.quantity !== 1 ? 's' : ''}
                                    </div>
                                </div>
                                <div className="mp-num" style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>
                                    {booking.totalAmount === 0 ? 'Free' : `₦${booking.totalAmount.toLocaleString()}`}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end' }}>
                                    <span style={{
                                        fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                                        background: isCancelled ? 'var(--surface-subtle)' : 'var(--success-bg)',
                                        color: isCancelled ? 'var(--text-3)' : 'var(--success)',
                                    }}>
                                        {booking.status}
                                    </span>
                                    <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{date}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {showCancel && (
                <div
                    role="dialog"
                    onClick={() => setShowCancel(false)}
                    style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(2,16,45,0.55)', display: 'grid', placeItems: 'center', padding: 20 }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{ width: '100%', maxWidth: 400, background: 'var(--surface-elevated)', borderRadius: 16, boxShadow: 'var(--shadow-modal)', padding: 28 }}
                    >
                        <h2 className="mp-h3" style={{ margin: '0 0 8px', color: 'var(--text-1)' }}>Force cancel event?</h2>
                        <p className="body-sm" style={{ margin: '0 0 6px', color: 'var(--text-2)' }}>
                            <strong>{event.title}</strong> will be immediately taken down and marked as cancelled.
                        </p>
                        <p className="body-sm" style={{ margin: '0 0 24px', color: 'var(--error)' }}>
                            This cannot be undone. All existing ticket holders will be affected.
                        </p>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <Button variant="ghost" size="md" onClick={() => setShowCancel(false)} disabled={cancelState.isLoading}>
                                Cancel
                            </Button>
                            <Button variant="destructive" size="md" onClick={handleCancel} disabled={cancelState.isLoading}>
                                {cancelState.isLoading ? 'Cancelling…' : 'Force cancel'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </Shell>
    );
}

function Shell({ children }) {
    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 80px' }}>
                {children}
            </div>
        </div>
    );
}

function BackLink() {
    return (
        <Link
            to="/admin/moderation"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-2)', fontSize: 14, textDecoration: 'none', marginBottom: 24 }}
        >
            <Icons.arrowL size={16} /> Back to moderation
        </Link>
    );
}
