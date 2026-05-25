import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
    useGetOrganizerEventByIdQuery,
    useGetEventAnalyticsQuery,
    useGetEventBookingsQuery,
} from '@/features/organiser/organizerApi';
import { Icons } from '@/components/ui/Icon';
import Button from '@/components/ui/Button';
import { formatNaira, formatNairaCompact } from '@/utils/currency';
import { formatEventDate } from '@/utils/dateFormat';

const STATUS_STYLE = {
    PAID:             { bg: '#E6F4EA', fg: '#0F9D58',        label: 'Paid' },
    PENDING_PAYMENT:  { bg: '#FEF4E2', fg: '#B8770A',        label: 'Pending' },
    FAILED:           { bg: '#FBE9E9', fg: '#D62828',        label: 'Failed' },
    REFUNDED:         { bg: '#EAF1FE', fg: 'var(--mp-blue)', label: 'Refunded' },
};

const PAGE_SIZE = 20;

export default function PaymentsTransactionsPage() {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const [page, setPage] = useState(0);

    const eventQ = useGetOrganizerEventByIdQuery(eventId, { skip: !eventId });
    const analyticsQ = useGetEventAnalyticsQuery(eventId, { skip: !eventId });
    const bookingsQ = useGetEventBookingsQuery(
        { eventId, page, size: PAGE_SIZE, paginated: true },
        { skip: !eventId },
    );

    const event = eventQ.data;
    const analytics = analyticsQ.data;
    const bookingsPage = bookingsQ.data;
    const bookings = bookingsPage?.content ?? (Array.isArray(bookingsPage) ? bookingsPage : []);
    const totalPages = bookingsPage?.totalPages ?? 1;
    const totalElements = bookingsPage?.totalElements ?? bookings.length;

    return (
        <div style={{ padding: '32px 40px', maxWidth: 1040, margin: '0 auto' }}>
            {/* Back */}
            <button
                type="button"
                onClick={() => navigate(-1)}
                style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: 'none', border: 0, padding: 0, cursor: 'pointer',
                    fontSize: 13, fontWeight: 500,
                    color: 'var(--text-2)', fontFamily: 'inherit',
                    marginBottom: 20,
                }}
                onMouseOver={(e) => { e.currentTarget.style.color = 'var(--mp-blue)'; }}
                onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-2)'; }}
            >
                <Icons.arrowL size={14} />
                Back
            </button>

            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <h1
                    className="mp-h1"
                    style={{ margin: '0 0 4px', color: 'var(--text-1)', fontSize: 24 }}
                >
                    {event?.title ?? 'Event payments'}
                </h1>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--text-2)' }}>
                    Every ticket purchase for this event, ordered most recent first.
                </p>
            </div>

            {/* Summary tiles */}
            <div
                className="mp-stat-grid"
                style={{
                    display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
                    gap: 12, marginBottom: 24,
                }}
            >
                <SummaryTile
                    label="Total revenue"
                    value={formatNaira(analytics?.totalRevenue ?? 0, { zeroLabel: '₦0' })}
                    icon={<Icons.wallet size={16} />}
                    loading={analyticsQ.isLoading}
                />
                <SummaryTile
                    label="Attendees"
                    value={(analytics?.totalAttendees ?? 0).toLocaleString()}
                    icon={<Icons.users size={16} />}
                    loading={analyticsQ.isLoading}
                />
                <SummaryTile
                    label="Paid bookings"
                    value={(analytics?.paidBookings ?? 0).toLocaleString()}
                    icon={<Icons.check size={16} />}
                    loading={analyticsQ.isLoading}
                />
                <SummaryTile
                    label="Pending"
                    value={(analytics?.pendingBookings ?? 0).toLocaleString()}
                    icon={<Icons.clock size={16} />}
                    loading={analyticsQ.isLoading}
                />
                <SummaryTile
                    label="Refunded"
                    value={(analytics?.refundedBookings ?? 0).toLocaleString()}
                    icon={<Icons.arrowL size={16} />}
                    loading={analyticsQ.isLoading}
                />
            </div>

            {/* Transactions card */}
            <div
                style={{
                    background: 'var(--surface-elevated)', border: '1px solid var(--border)',
                    borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-card)',
                }}
            >
                <div
                    style={{
                        padding: '14px 20px', borderBottom: '1px solid var(--border)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}
                >
                    <span style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 14 }}>
                        Transactions
                    </span>
                    {totalElements > 0 && (
                        <span
                            className="mp-num"
                            style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-3)' }}
                        >
                            {totalElements.toLocaleString()} total ·{' '}
                            {formatNairaCompact(analytics?.totalRevenue ?? 0)}
                        </span>
                    )}
                </div>

                {bookingsQ.isLoading && <TableSkeleton />}

                {!bookingsQ.isLoading && bookings.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                        <div
                            style={{
                                width: 56, height: 56, borderRadius: 99, margin: '0 auto 12px',
                                background: 'var(--surface-subtle)', display: 'grid',
                                placeItems: 'center', color: 'var(--text-3)',
                            }}
                        >
                            <Icons.wallet size={22} />
                        </div>
                        <div className="mp-h4" style={{ color: 'var(--text-1)', margin: 0 }}>
                            No transactions yet
                        </div>
                        <p
                            className="body-sm"
                            style={{ color: 'var(--text-2)', margin: '6px 0 0' }}
                        >
                            Once people start booking tickets for this event, they'll show up here.
                        </p>
                    </div>
                )}

                {!bookingsQ.isLoading && bookings.length > 0 && (
                    <>
                        <TxHeaderRow />
                        {bookings.map((b, i) => (
                            <TxRow
                                key={b.id}
                                booking={b}
                                isLast={i === bookings.length - 1}
                            />
                        ))}
                    </>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div
                    style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        marginTop: 16, fontSize: 13, color: 'var(--text-2)',
                    }}
                >
                    <span>
                        Page <strong>{page + 1}</strong> of {totalPages}
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <Button
                            variant="secondary"
                            size="sm"
                            disabled={page === 0 || bookingsQ.isFetching}
                            onClick={() => setPage((p) => Math.max(0, p - 1))}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            disabled={page + 1 >= totalPages || bookingsQ.isFetching}
                            onClick={() => setPage((p) => p + 1)}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}

            {/* Error states */}
            {(eventQ.isError || analyticsQ.isError || bookingsQ.isError) && (
                <div
                    style={{
                        marginTop: 16, padding: '12px 16px', borderRadius: 10,
                        background: '#FBE9E9', border: '1px solid #F4B7B7',
                        fontSize: 13, color: '#7A1F1F',
                    }}
                >
                    Some data couldn't be loaded. You may not have access to this event, or the
                    server is unreachable.
                </div>
            )}
        </div>
    );
}

/* ─── Pieces ──────────────────────────────────────── */

function SummaryTile({ label, value, icon, loading }) {
    return (
        <div
            style={{
                background: 'var(--surface-elevated)', border: '1px solid var(--border)',
                borderRadius: 12, padding: 16, boxShadow: 'var(--shadow-card)',
            }}
        >
            <div
                style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    marginBottom: 8, fontSize: 12, fontWeight: 500, color: 'var(--text-2)',
                }}
            >
                {icon} {label}
            </div>
            <div
                className="mp-num"
                style={{
                    fontSize: 22, fontWeight: 700, color: 'var(--text-1)',
                    lineHeight: 1, opacity: loading ? 0.4 : 1,
                }}
            >
                {loading ? '—' : value}
            </div>
        </div>
    );
}

function TxHeaderRow() {
    const cell = {
        fontSize: 12, fontWeight: 600, color: 'var(--text-3)',
        textTransform: 'uppercase', letterSpacing: '0.04em',
    };
    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: '1.6fr 1.2fr 0.7fr 1fr 0.9fr 1fr',
                gap: 12, padding: '10px 20px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--surface-subtle)',
            }}
        >
            <span style={cell}>Buyer</span>
            <span style={cell}>Ticket tier</span>
            <span style={{ ...cell, textAlign: 'right' }}>Qty</span>
            <span style={{ ...cell, textAlign: 'right' }}>Total</span>
            <span style={cell}>Status</span>
            <span style={{ ...cell, textAlign: 'right' }}>Date</span>
        </div>
    );
}

function TxRow({ booking: b, isLast }) {
    const style = STATUS_STYLE[b.paymentStatus] ?? STATUS_STYLE.PENDING_PAYMENT;
    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: '1.6fr 1.2fr 0.7fr 1fr 0.9fr 1fr',
                gap: 12, padding: '14px 20px',
                alignItems: 'center',
                borderBottom: isLast ? 0 : '1px solid var(--border)',
                fontSize: 13,
            }}
        >
            <div style={{ minWidth: 0 }}>
                <div
                    style={{
                        fontWeight: 600, color: 'var(--text-1)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}
                >
                    {b.attendeeName}
                </div>
                <div
                    style={{
                        fontSize: 12, color: 'var(--text-3)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}
                >
                    {b.attendeeEmail}
                </div>
            </div>
            <span style={{ color: 'var(--text-2)' }}>{b.tierName}</span>
            <span className="mp-num" style={{ textAlign: 'right', color: 'var(--text-1)' }}>
                {b.quantity}
            </span>
            <span
                className="mp-num"
                style={{
                    textAlign: 'right', fontWeight: 600, color: 'var(--text-1)',
                }}
            >
                {b.totalPrice > 0 ? formatNaira(b.totalPrice) : 'Free'}
            </span>
            <span>
                <span
                    style={{
                        display: 'inline-block', padding: '2px 10px', borderRadius: 20,
                        fontSize: 12, fontWeight: 600,
                        background: style.bg, color: style.fg,
                    }}
                >
                    {style.label}
                </span>
            </span>
            <span
                style={{
                    textAlign: 'right', fontSize: 12, color: 'var(--text-3)',
                }}
            >
                {b.createdAt ? formatEventDate(b.createdAt) : '—'}
            </span>
        </div>
    );
}

function TableSkeleton() {
    const rowStyle = {
        height: 56, borderBottom: '1px solid var(--border)',
        background: 'var(--surface-subtle)',
        animation: 'mp-flash 1.6s ease-in-out infinite',
    };
    return (
        <div>
            <div style={{ ...rowStyle, height: 40 }} />
            {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} style={{ ...rowStyle, opacity: 1 - (n - 1) * 0.12 }} />
            ))}
        </div>
    );
}
