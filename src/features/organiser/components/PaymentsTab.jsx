import { Icons } from '@/components/ui/Icon';
import { formatNaira, formatNairaCompact } from '@/utils/currency';
import { formatEventDate } from '@/utils/dateFormat';

/* ── Main component ──────────────────────────────── */
export default function PaymentsTab({ events = [], isLoading }) {
    const totalRevenue  = events.reduce((s, e) => s + (e.totalRevenue  ?? 0), 0);
    const totalSold     = events.reduce((s, e) => s + (e.soldCount     ?? 0), 0);
    const totalCapacity = events.reduce((s, e) => s + (e.totalCapacity ?? 0), 0);
    const occupancyPct  = totalCapacity > 0
        ? Math.round((totalSold / totalCapacity) * 100) : 0;

    // Sort paid events by revenue desc; separate free events with bookings
    const paidEvents = [...events]
        .filter((e) => (e.totalRevenue ?? 0) > 0)
        .sort((a, b) => (b.totalRevenue ?? 0) - (a.totalRevenue ?? 0));

    const freeEvents = events.filter(
        (e) => (e.totalRevenue ?? 0) === 0 && (e.soldCount ?? 0) > 0
    );

    const hasData = paidEvents.length > 0 || freeEvents.length > 0;
    const topRevenue = paidEvents[0]?.totalRevenue ?? 1;

    if (isLoading) return <PaySkeleton />;

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-1)' }}>
                    Payments & Revenue
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
                    Earnings breakdown across all your events
                </div>
            </div>

            {/* Stat tiles */}
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 14, marginBottom: 24,
            }}>
                <StatTile
                    label="Total revenue"
                    value={formatNaira(totalRevenue, { zeroLabel: '₦0' })}
                    icon={<Icons.wallet size={16} />}
                />
                <StatTile
                    label="Tickets sold"
                    value={totalSold.toLocaleString()}
                    icon={<Icons.ticket size={16} />}
                />
                <StatTile
                    label="Total capacity"
                    value={totalCapacity.toLocaleString()}
                    icon={<Icons.users size={16} />}
                />
                <StatTile
                    label="Avg. occupancy"
                    value={`${occupancyPct}%`}
                    icon={<Icons.trend size={16} />}
                    accent={occupancyPct >= 80 ? '#0F9D58' : undefined}
                />
            </div>

            {/* Empty state */}
            {!hasData ? (
                <div style={{ textAlign: 'center', padding: '56px 24px' }}>
                    <div style={{
                        width: 56, height: 56, borderRadius: 99, margin: '0 auto 16px',
                        background: 'var(--surface-subtle)', display: 'grid',
                        placeItems: 'center', color: 'var(--text-3)',
                    }}>
                        <Icons.wallet size={24} />
                    </div>
                    <div className="mp-h4" style={{ color: 'var(--text-1)', margin: 0 }}>
                        No payment data yet
                    </div>
                    <p className="body-sm" style={{ color: 'var(--text-2)', margin: '8px 0 0' }}>
                        Revenue and sales data will appear here once your events start selling tickets.
                    </p>
                </div>
            ) : (
                <div style={{
                    background: 'var(--surface-elevated)', border: '1px solid var(--border)',
                    borderRadius: 12, overflow: 'hidden',
                }}>
                    {/* Table header */}
                    <div style={{
                        padding: '14px 20px', borderBottom: '1px solid var(--border)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 14 }}>
                            Revenue by event
                        </span>
                        {totalRevenue > 0 && (
                            <span className="mp-num" style={{
                                fontSize: 13, fontWeight: 700, color: 'var(--mp-blue)',
                            }}>
                                {formatNairaCompact(totalRevenue)} total
                            </span>
                        )}
                    </div>

                    {/* Paid events */}
                    {paidEvents.map((e, i) => (
                        <EventRevenueRow
                            key={e.id}
                            event={e}
                            topRevenue={topRevenue}
                            isLast={i === paidEvents.length - 1 && freeEvents.length === 0}
                        />
                    ))}

                    {/* Divider before free events */}
                    {freeEvents.length > 0 && paidEvents.length > 0 && (
                        <div style={{
                            padding: '10px 20px',
                            background: 'var(--surface-subtle)',
                            borderTop: '1px solid var(--border)',
                            fontSize: 12, color: 'var(--text-3)', fontWeight: 500,
                        }}>
                            Free events with bookings
                        </div>
                    )}

                    {freeEvents.map((e, i) => (
                        <EventRevenueRow
                            key={e.id}
                            event={e}
                            topRevenue={topRevenue}
                            isLast={i === freeEvents.length - 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

/* ── Event revenue row ───────────────────────────── */
function EventRevenueRow({ event: e, topRevenue, isLast }) {
    const revenue  = e.totalRevenue  ?? 0;
    const sold     = e.soldCount     ?? 0;
    const capacity = e.totalCapacity ?? 0;
    // Width relative to top earner (for the progress bar)
    const barPct   = topRevenue > 0 && revenue > 0
        ? Math.max(4, (revenue / topRevenue) * 100) : 0;

    return (
        <div style={{
            padding: '16px 20px',
            borderBottom: isLast ? 0 : '1px solid var(--border)',
        }}>
            {/* Top row: title + revenue */}
            <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'flex-start', gap: 16, marginBottom: revenue > 0 ? 8 : 0,
            }}>
                <div style={{ minWidth: 0 }}>
                    <div style={{
                        fontWeight: 600, fontSize: 14,
                        color: 'var(--text-1)', marginBottom: 3,
                    }}>
                        {e.title}
                    </div>
                    <div style={{
                        fontSize: 12, color: 'var(--text-2)',
                        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                    }}>
                        {e.startTime && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Icons.calendar size={11} style={{ color: 'var(--text-3)' }} />
                                {formatEventDate(e.startTime)}
                            </span>
                        )}
                        <span className="mp-num">
                            {sold.toLocaleString()}
                            {capacity > 0 && (
                                <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>
                                    /{capacity.toLocaleString()}
                                </span>
                            )}
                            {' '}tickets
                        </span>
                    </div>
                </div>
                <div className="mp-num" style={{
                    fontWeight: 700, fontSize: 15, flexShrink: 0,
                    color: revenue > 0 ? 'var(--text-1)' : 'var(--text-3)',
                }}>
                    {revenue > 0 ? formatNaira(revenue) : 'Free'}
                </div>
            </div>

            {/* Revenue progress bar (only for paid events) */}
            {barPct > 0 && (
                <div style={{
                    height: 4, background: 'var(--surface-subtle)',
                    borderRadius: 99, overflow: 'hidden',
                }}>
                    <div style={{
                        width: `${barPct}%`, height: '100%',
                        background: 'var(--mp-blue)', borderRadius: 99,
                        transition: 'width 0.5s ease',
                    }} />
                </div>
            )}
        </div>
    );
}

/* ── Shared stat tile ────────────────────────────── */
function StatTile({ label, value, icon, accent }) {
    return (
        <div style={{
            background: 'var(--surface-elevated)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 20, boxShadow: 'var(--shadow-card)',
        }}>
            <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                marginBottom: 12, fontSize: 13, fontWeight: 500, color: 'var(--text-2)',
            }}>
                {icon} {label}
            </div>
            <div className="mp-num" style={{
                fontSize: 26, fontWeight: 700,
                color: accent || 'var(--text-1)', lineHeight: 1,
            }}>
                {value}
            </div>
        </div>
    );
}

/* ── Skeleton ────────────────────────────────────── */
function PaySkeleton() {
    const tile = {
        height: 90, borderRadius: 12, border: '1px solid var(--border)',
        background: 'var(--surface-subtle)', animation: 'mp-flash 1.6s ease-in-out infinite',
    };
    const row = {
        height: 88, borderBottom: '1px solid var(--border)',
        background: 'var(--surface-subtle)', animation: 'mp-flash 1.6s ease-in-out infinite',
    };
    return (
        <div>
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
                gap: 14, marginBottom: 24,
            }}>
                {[1, 2, 3, 4].map((n) => (
                    <div key={n} style={{ ...tile, opacity: 1 - (n - 1) * 0.15 }} />
                ))}
            </div>
            <div style={{
                background: 'var(--surface-elevated)', border: '1px solid var(--border)',
                borderRadius: 12, overflow: 'hidden',
            }}>
                <div style={{ ...row, height: 50 }} />
                <div style={row} />
                <div style={{ ...row, opacity: 0.6 }} />
                <div style={{ ...row, opacity: 0.3, borderBottom: 0 }} />
            </div>
        </div>
    );
}
