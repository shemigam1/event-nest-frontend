import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useSelector } from 'react-redux';
import { selectCurrentUser, selectAuthEmail } from '@/features/auth/authSlice';
import {
    useGetMyBookingsQuery,
    useCancelBookingMutation,
} from '../bookingsApi';
import Button from '@/components/ui/Button';
import TopNav from '@/components/ui/TopNav';
import { StatusBadge } from '@/components/ui/Badge';
import { Icons } from '@/components/ui/Icon';
import { formatNaira } from '@/utils/currency';

/* ── Stats tile ─────────────────────────────────── */
function StatTile({ label, value, icon, sub, testId }) {
    return (
        <div data-testid={testId} style={{
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 20,
            boxShadow: 'var(--shadow-card)',
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 12,
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--text-2)',
            }}>
                {icon}
                {label}
            </div>
            <div className="mp-num" style={{
                fontSize: 28,
                fontWeight: 700,
                color: 'var(--text-1)',
                lineHeight: 1,
            }}>
                {value}
            </div>
            {sub && (
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>{sub}</div>
            )}
        </div>
    );
}

/* ── Booking row ─────────────────────────────────── */
function BookingRow({ booking, isLast, onCancel, cancelling }) {
    const d = new Date(booking.createdAt);
    const month = d.toLocaleString('en', { month: 'short' }).toUpperCase();
    const day = String(d.getDate());
    const confirmedAt = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    const isCancellable = booking.paymentStatus === 'PAID';

    return (
        <div
            data-testid={`booking-row-${booking.id}`}
            className="mp-booking-row"
            style={{
                display: 'grid',
                gridTemplateColumns: '70px 1fr auto auto',
                gap: 20,
                alignItems: 'center',
                padding: '16px 20px',
                borderBottom: isLast ? 0 : '1px solid var(--border)',
            }}
        >
            {/* Date column */}
            <div style={{
                textAlign: 'center',
                borderRight: '1px solid var(--border)',
                paddingRight: 16,
            }}>
                <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>{month}</div>
                <div className="mp-num" style={{
                    fontSize: 22, fontWeight: 700, color: 'var(--text-1)',
                    lineHeight: 1.1, marginTop: 2,
                }}>
                    {day}
                </div>
            </div>

            {/* Event info */}
            <div>
                <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>{booking.eventTitle}</div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>
                    {booking.tierName} · {booking.quantity} {booking.quantity === 1 ? 'ticket' : 'tickets'}
                    {' · '}Booked {confirmedAt}
                </div>
            </div>

            {/* Status */}
            <StatusBadge status={booking.paymentStatus} />

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8 }}>
                <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => window.location.assign('/tickets')}
                >
                    Tickets
                </Button>
                {isCancellable && (
                    <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onCancel(booking)}
                        disabled={cancelling}
                    >
                        Cancel
                    </Button>
                )}
            </div>
        </div>
    );
}

/* ── Cancel confirmation modal ─────────────────────────────────── */
function CancelDialog({ booking, onConfirm, onDismiss, loading }) {
    if (!booking) return null;
    return (
        <div
            role="dialog"
            aria-label="Cancel booking"
            onClick={onDismiss}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 1000,
                background: 'rgba(2,16,45,0.55)',
                display: 'grid',
                placeItems: 'center',
                padding: 20,
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: '100%',
                    maxWidth: 400,
                    background: 'white',
                    borderRadius: 16,
                    boxShadow: 'var(--shadow-modal)',
                    padding: 28,
                }}
            >
                <h2 className="mp-h3" style={{ margin: 0, color: 'var(--text-1)' }}>
                    Cancel this booking?
                </h2>
                <p className="body-sm" style={{ margin: '10px 0 24px', color: 'var(--text-2)' }}>
                    <strong>{booking.quantity} {booking.quantity === 1 ? 'ticket' : 'tickets'}</strong>{' '}
                    for <strong>{booking.eventTitle}</strong> will be cancelled.
                    This action cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <Button variant="ghost" size="md" onClick={onDismiss} disabled={loading}>
                        Keep booking
                    </Button>
                    <Button
                        variant="destructive"
                        size="md"
                        onClick={onConfirm}
                        disabled={loading}
                    >
                        {loading ? 'Cancelling…' : 'Yes, cancel'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

/* ── Page ─────────────────────────────────── */
export default function DashboardPage() {
    const navigate = useNavigate();
    const user = useSelector(selectCurrentUser);
    const email = useSelector(selectAuthEmail);
    const firstName = user?.firstName ?? email?.split('@')[0] ?? 'there';

    const { data: bookings = [], isLoading, isError, refetch } = useGetMyBookingsQuery();
    const [cancelBooking, cancelState] = useCancelBookingMutation();
    const [pendingCancel, setPendingCancel] = useState(null);
    const [cancelError, setCancelError] = useState('');

    const confirmed = bookings.filter((b) => b.paymentStatus === 'PAID');
    const cancelled = bookings.filter((b) => b.paymentStatus === 'REFUNDED');
    const totalTickets = confirmed.reduce((s, b) => s + (b.quantity ?? 0), 0);

    async function handleConfirmCancel() {
        setCancelError('');
        try {
            await cancelBooking({
                eventId: pendingCancel.eventId,
                bookingId: pendingCancel.id,
            }).unwrap();
            setPendingCancel(null);
        } catch (err) {
            setCancelError(err?.data?.message || 'Could not cancel. Please try again.');
        }
    }

    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            <TopNav />

            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 80px' }}>
                <h1 className="mp-h1" style={{ margin: 0, color: 'var(--text-1)' }}>
                    Welcome back, {firstName}.
                </h1>
                <p className="body" style={{ margin: '8px 0 0', color: 'var(--text-2)' }}>
                    Your bookings and tickets are all in one place.
                </p>

                {/* Stats */}
                <div className="mp-stat-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 16,
                    margin: '24px 0 32px',
                }}>
                    <StatTile
                        testId="stat-total-tickets"
                        label="Total tickets"
                        value={isLoading ? '—' : totalTickets}
                        icon={<Icons.ticket size={16} />}
                        sub={`across ${confirmed.length} booking${confirmed.length !== 1 ? 's' : ''}`}
                    />
                    <StatTile
                        testId="stat-confirmed"
                        label="Confirmed"
                        value={isLoading ? '—' : confirmed.length}
                        icon={<Icons.check size={16} />}
                    />
                    <StatTile
                        testId="stat-cancelled"
                        label="Cancelled"
                        value={isLoading ? '—' : cancelled.length}
                        icon={<Icons.x size={16} />}
                    />
                    <StatTile
                        testId="stat-browse"
                        label="Browse events"
                        value="→"
                        icon={<Icons.search size={16} />}
                        sub="Find your next event"
                    />
                </div>

                {/* Bookings table */}
                <div style={{
                    background: 'white',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    boxShadow: 'var(--shadow-card)',
                    overflow: 'hidden',
                }}>
                    <div style={{
                        padding: '16px 20px',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>My bookings</span>
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => navigate('/events')}
                            iconRight={<Icons.arrowR size={14} />}
                        >
                            Browse events
                        </Button>
                    </div>

                    {isLoading && <TableSkeleton />}

                    {isError && (
                        <div role="alert" style={{ padding: 40, textAlign: 'center' }}>
                            <Icons.alert size={28} style={{ color: 'var(--error)' }} />
                            <p className="body-sm" style={{ marginTop: 8, color: 'var(--text-2)' }}>
                                Could not load bookings.
                            </p>
                            <Button variant="secondary" size="sm" onClick={refetch} style={{ marginTop: 12 }}>
                                Retry
                            </Button>
                        </div>
                    )}

                    {!isLoading && !isError && bookings.length === 0 && (
                        <div data-testid="dashboard-empty" style={{ padding: 40, textAlign: 'center' }}>
                            <Icons.inbox size={28} style={{ color: 'var(--text-3)' }} />
                            <p className="mp-h4" style={{ margin: '12px 0 4px', color: 'var(--text-1)' }}>
                                No bookings yet
                            </p>
                            <p className="body-sm" style={{ color: 'var(--text-2)', margin: 0 }}>
                                Book a seat at an event and it&apos;ll show up here.
                            </p>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={() => navigate('/events')}
                                style={{ marginTop: 16 }}
                            >
                                Browse events
                            </Button>
                        </div>
                    )}

                    {cancelError && (
                        <div role="alert" style={{
                            margin: '0 20px',
                            padding: '10px 12px',
                            background: 'var(--error-bg)',
                            color: 'var(--error)',
                            borderRadius: 8,
                            fontSize: 13,
                        }}>
                            {cancelError}
                        </div>
                    )}

                    {!isLoading && !isError && bookings.map((b, i) => (
                        <BookingRow
                            key={b.id}
                            booking={b}
                            isLast={i === bookings.length - 1}
                            onCancel={setPendingCancel}
                            cancelling={cancelState.isLoading}
                        />
                    ))}
                </div>
            </div>

            <CancelDialog
                booking={pendingCancel}
                onConfirm={handleConfirmCancel}
                onDismiss={() => { setPendingCancel(null); setCancelError(''); }}
                loading={cancelState.isLoading}
            />
        </div>
    );
}

function TableSkeleton() {
    const row = {
        height: 80,
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface-subtle)',
        animation: 'mp-flash 1.6s ease-in-out infinite',
    };
    return (
        <>
            <div style={row} />
            <div style={{ ...row, opacity: 0.7 }} />
            <div style={{ ...row, opacity: 0.4, borderBottom: 0 }} />
        </>
    );
}
