import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useGetMyTicketsQuery } from '../ticketsApi';
import { formatEventDate } from '@/utils/dateFormat';
import Button from '@/components/ui/Button';
import TopNav from '@/components/ui/TopNav';
import Modal from '@/components/ui/Modal';
import QrPattern from '@/components/ui/QrPattern';
import TicketCard from '@/components/ui/TicketCard';
import { StatusBadge } from '@/components/ui/Badge';
import { Icons } from '@/components/ui/Icon';

/* ── Helpers ──────────────────────────────────────────── */

function eventStartMs(ticket) {
    if (!ticket.eventStartTime) return 0;
    const t = new Date(ticket.eventStartTime).getTime();
    return Number.isNaN(t) ? 0 : t;
}

function dayOffset(ticket, nowMs) {
    const ms = eventStartMs(ticket);
    if (!ms) return 0;
    return Math.round((ms - nowMs) / 86_400_000);
}

/* "May 2026" — used as the month-group label. */
function monthLabel(iso) {
    if (!iso) return 'Unscheduled';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return 'Unscheduled';
    return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

function isUpcoming(ticket, nowMs) {
    return ticket.status === 'VALID' && eventStartMs(ticket) >= nowMs;
}

/* Two-level grouping: first by month label (preserving sort order),
   then within each month by bookingId so multi-seat purchases stay
   together as a single card. */
function groupByMonthAndBooking(list) {
    const monthOrder = [];
    const months = {};
    for (const t of list) {
        const key = monthLabel(t.eventStartTime);
        if (!months[key]) {
            months[key] = { key, bookingOrder: [], bookings: {} };
            monthOrder.push(key);
        }
        const bk = t.bookingId || t.id;
        const m = months[key];
        if (!m.bookings[bk]) {
            m.bookings[bk] = { key: bk, items: [] };
            m.bookingOrder.push(bk);
        }
        m.bookings[bk].items.push(t);
    }
    return monthOrder.map((mk) => ({
        key: mk,
        bookings: months[mk].bookingOrder.map((bk) => months[mk].bookings[bk]),
        count: months[mk].bookingOrder.reduce(
            (s, bk) => s + months[mk].bookings[bk].items.length, 0,
        ),
    }));
}

/* ── Booking card (multi-seat) ────────────────────────── */

function BookingCard({ booking, onShowQr }) {
    const [open, setOpen] = useState(false);
    const tickets = booking.items;
    const first = tickets[0];
    const muted = first.status === 'USED' || first.status === 'REFUNDED';
    const usedCount = tickets.filter((t) => t.status === 'USED').length;
    const sameTier = tickets.every((t) => t.tierName === first.tierName);

    return (
        <div style={{
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: 'var(--shadow-card)',
            overflow: 'hidden',
            opacity: muted ? 0.78 : 1,
        }}>
            {/* Header row */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 16,
                alignItems: 'center',
                padding: 20,
            }}>
                <div style={{ minWidth: 0 }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        marginBottom: 8, flexWrap: 'wrap',
                    }}>
                        <StatusBadge status={first.status} size="sm" />
                        {first.bookingId && (
                            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                                · {String(first.bookingId).slice(0, 8)}
                            </span>
                        )}
                        {first.status === 'VALID' && usedCount > 0 && (
                            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)' }}>
                                · {usedCount} used
                            </span>
                        )}
                    </div>
                    <h3 className="mp-h4" style={{ margin: 0, color: 'var(--text-1)' }}>
                        {first.eventTitle}
                    </h3>
                    <div style={{
                        display: 'flex', gap: 18, flexWrap: 'wrap',
                        marginTop: 10, fontSize: 13, color: 'var(--text-2)',
                    }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <Icons.calendar size={14} style={{ color: 'var(--text-3)' }} />
                            {formatEventDate(first.eventStartTime)}
                        </span>
                        {first.eventVenue && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                <Icons.pin size={14} style={{ color: 'var(--text-3)' }} />
                                {first.eventVenue}
                            </span>
                        )}
                        {sameTier && first.tierName && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                <Icons.ticket size={14} style={{ color: 'var(--text-3)' }} />
                                {first.tierName}
                            </span>
                        )}
                    </div>
                </div>

                {/* Seat-count tile */}
                <div style={{
                    background: muted ? 'var(--surface-subtle)' : 'var(--mp-navy)',
                    color: muted ? 'var(--text-2)' : 'white',
                    padding: '16px 22px',
                    borderRadius: 12,
                    textAlign: 'center',
                    minWidth: 130,
                }}>
                    <div className="mp-num" style={{
                        fontSize: 30, fontWeight: 700, lineHeight: 1,
                    }}>
                        {tickets.length}
                    </div>
                    <div style={{
                        fontSize: 11, fontWeight: 600, letterSpacing: 0.4,
                        marginTop: 6, opacity: 0.7,
                    }}>
                        TICKETS
                    </div>
                </div>
            </div>

            {/* Toggle */}
            <button
                onClick={() => setOpen((o) => !o)}
                style={{
                    width: '100%',
                    background: open ? 'var(--surface-subtle)' : 'transparent',
                    border: 0,
                    borderTop: '1px solid var(--border)',
                    padding: '12px 20px',
                    fontFamily: 'inherit',
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text-2)',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}
                aria-expanded={open}
            >
                <span>{open ? 'Hide seats' : `View ${tickets.length} seats`}</span>
                <span style={{
                    transform: open ? 'rotate(180deg)' : 'none',
                    transition: 'transform var(--motion-fast)',
                    display: 'inline-flex',
                }}>
                    <Icons.chevronD size={14} />
                </span>
            </button>

            {/* Expanded seats */}
            {open && (
                <div style={{ background: 'var(--surface-subtle)', borderTop: '1px solid var(--border)' }}>
                    {tickets.map((t, i) => {
                        const tMuted = t.status === 'USED' || t.status === 'REFUNDED';
                        return (
                            <div key={t.id} style={{
                                display: 'grid',
                                gridTemplateColumns: 'auto 1fr auto auto',
                                gap: 14,
                                alignItems: 'center',
                                padding: '12px 20px',
                                borderBottom: i < tickets.length - 1 ? '1px solid var(--border)' : 0,
                            }}>
                                <div className="mp-num" style={{
                                    fontSize: 16,
                                    fontWeight: 700,
                                    color: 'var(--text-1)',
                                    background: 'white',
                                    border: '1px solid var(--border)',
                                    borderRadius: 8,
                                    padding: '6px 12px',
                                    minWidth: 76,
                                    textAlign: 'center',
                                    textDecoration: tMuted ? 'line-through' : 'none',
                                }}>
                                    {t.seatNumber ?? '—'}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    {!sameTier && t.tierName && (
                                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>
                                            {t.tierName}
                                        </div>
                                    )}
                                    <div style={{
                                        fontSize: 12,
                                        color: 'var(--text-3)',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}>
                                        {t.status === 'USED' && t.checkedInAt
                                            ? `Checked in ${formatEventDate(t.checkedInAt)}`
                                            : `QR · ${t.shortCode || (t.qrCode || t.id).toString().slice(0, 8)}`}
                                    </div>
                                </div>
                                <StatusBadge status={t.status} size="sm" />
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => onShowQr(t)}
                                    disabled={tMuted}
                                >
                                    Show QR
                                </Button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

/* ── Page ─────────────────────────────────────────────── */

export default function TicketsPage() {
    const navigate = useNavigate();
    const tickets = useGetMyTicketsQuery();
    const [active, setActive] = useState(null);
    const [tab, setTab] = useState('upcoming'); // 'upcoming' | 'archive'
    const [sort, setSort] = useState('soonest');

    // Anchor "now" once per render so countdowns and partitioning stay
    // consistent across re-renders triggered by sort/tab changes.
    const [nowMs] = useState(() => Date.now());

    const allTickets = useMemo(() => tickets.data ?? [], [tickets.data]);

    const upcoming = useMemo(
        () => allTickets.filter((t) => isUpcoming(t, nowMs)),
        [allTickets, nowMs],
    );
    const archive = useMemo(
        () => allTickets.filter((t) => !isUpcoming(t, nowMs)),
        [allTickets, nowMs],
    );

    const sortOptions = tab === 'upcoming'
        ? [['soonest', 'Soonest first'], ['latest', 'Latest first']]
        : [['recent',  'Most recent'],   ['oldest', 'Oldest first']];

    // Reset sort to a valid option for the active tab if the selection
    // doesn't exist in the new tab's option list.
    const currentSort = sortOptions.find(([k]) => k === sort) ? sort : sortOptions[0][0];

    const sortedList = useMemo(() => {
        const list = tab === 'upcoming' ? [...upcoming] : [...archive];
        list.sort((a, b) => {
            const av = eventStartMs(a);
            const bv = eventStartMs(b);
            if (currentSort === 'soonest' || currentSort === 'oldest') return av - bv;
            return bv - av;
        });
        return list;
    }, [tab, upcoming, archive, currentSort]);

    const grouped = useMemo(() => groupByMonthAndBooking(sortedList), [sortedList]);

    // "Next up" — the soonest upcoming ticket, regardless of current sort.
    const next = useMemo(() => {
        if (upcoming.length === 0) return null;
        return [...upcoming].sort((a, b) => eventStartMs(a) - eventStartMs(b))[0];
    }, [upcoming]);

    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            <TopNav />
            <div style={{ maxWidth: 880, margin: '0 auto', padding: '32px 24px 80px' }}>
                <h1 className="mp-h1" style={{ margin: 0, color: 'var(--text-1)' }}>My tickets</h1>
                <p className="body" style={{ margin: '8px 0 0', color: 'var(--text-2)' }}>
                    Tap any ticket to display the QR at the gate. Keep your screen brightness up.
                </p>

                {/* Next-up banner */}
                {next && (
                    <div style={{
                        marginTop: 20,
                        padding: '16px 20px',
                        background: 'var(--mp-navy)',
                        color: 'white',
                        borderRadius: 12,
                        display: 'grid',
                        gridTemplateColumns: '1fr auto',
                        gap: 16,
                        alignItems: 'center',
                    }}>
                        <div style={{ minWidth: 0 }}>
                            <div style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: 'rgba(255,255,255,0.65)',
                                letterSpacing: 0.4,
                            }}>
                                NEXT UP
                            </div>
                            <div className="mp-h4" style={{ color: 'white', marginTop: 4 }}>
                                {next.eventTitle}
                            </div>
                            <div style={{
                                fontSize: 13,
                                color: 'rgba(255,255,255,0.75)',
                                marginTop: 4,
                            }}>
                                {formatEventDate(next.eventStartTime)}
                                {next.eventVenue ? ` · ${next.eventVenue}` : ''}
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div className="mp-num" style={{
                                fontSize: 30, fontWeight: 700, lineHeight: 1,
                            }}>
                                {Math.max(0, dayOffset(next, nowMs))}
                            </div>
                            <div style={{
                                fontSize: 11,
                                color: 'rgba(255,255,255,0.65)',
                                fontWeight: 600,
                                marginTop: 4,
                                letterSpacing: 0.4,
                            }}>
                                {dayOffset(next, nowMs) === 1 ? 'DAY AWAY' : 'DAYS AWAY'}
                            </div>
                        </div>
                    </div>
                )}

                {/* Tabs + sort */}
                {!tickets.isLoading && !tickets.isError && allTickets.length > 0 && (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: 24,
                        marginBottom: 16,
                        borderBottom: '1px solid var(--border)',
                        flexWrap: 'wrap',
                        gap: 12,
                    }}>
                        <div style={{ display: 'flex', gap: 0 }}>
                            {[
                                ['upcoming', 'Upcoming', upcoming.length, null],
                                ['archive',  'Archive',  archive.length,  <Icons.clock size={14} key="i" />],
                            ].map(([id, label, n, icon]) => {
                                const activeTab = tab === id;
                                return (
                                    <button
                                        key={id}
                                        onClick={() => setTab(id)}
                                        style={{
                                            background: 'transparent',
                                            border: 0,
                                            padding: '12px 18px',
                                            color: activeTab ? 'var(--mp-blue)' : 'var(--text-2)',
                                            borderBottom: `2px solid ${activeTab ? 'var(--mp-blue)' : 'transparent'}`,
                                            marginBottom: -1,
                                            fontWeight: activeTab ? 600 : 500,
                                            fontSize: 14,
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 8,
                                        }}
                                    >
                                        {icon}
                                        {label}
                                        <span className="mp-num" style={{
                                            fontSize: 11,
                                            padding: '2px 7px',
                                            borderRadius: 99,
                                            fontWeight: 600,
                                            background: activeTab ? 'var(--mp-blue-50, #EAF1FE)' : 'var(--surface-subtle)',
                                            color: activeTab ? 'var(--mp-blue)' : 'var(--text-3)',
                                        }}>
                                            {n}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        <div style={{
                            display: 'flex',
                            gap: 8,
                            alignItems: 'center',
                            paddingBottom: 8,
                        }}>
                            <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>
                                Sort by
                            </span>
                            <select
                                value={currentSort}
                                onChange={(e) => setSort(e.target.value)}
                                aria-label="Sort tickets"
                                style={{
                                    fontFamily: 'inherit',
                                    fontSize: 13,
                                    fontWeight: 500,
                                    padding: '7px 10px',
                                    borderRadius: 8,
                                    border: '1px solid var(--border)',
                                    background: 'white',
                                    color: 'var(--text-1)',
                                    cursor: 'pointer',
                                }}
                            >
                                {sortOptions.map(([k, l]) => (
                                    <option key={k} value={k}>{l}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                {/* States */}
                {tickets.isLoading && <SkeletonList />}
                {tickets.isError && <ErrorState onRetry={tickets.refetch} />}

                {tickets.isSuccess && allTickets.length === 0 && (
                    <EmptyState onBrowse={() => navigate('/events')} mode="bootstrap" />
                )}

                {tickets.isSuccess && allTickets.length > 0 && sortedList.length === 0 && (
                    <EmptyState
                        onBrowse={() => navigate('/events')}
                        mode={tab === 'upcoming' ? 'no-upcoming' : 'no-archive'}
                    />
                )}

                {/* List */}
                {tickets.isSuccess && sortedList.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                        {grouped.map((g) => (
                            <div key={g.key}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'baseline',
                                    justifyContent: 'space-between',
                                    marginBottom: 10,
                                    paddingBottom: 8,
                                    borderBottom: '1px dashed var(--border)',
                                }}>
                                    <span style={{
                                        fontSize: 12,
                                        fontWeight: 700,
                                        color: 'var(--text-3)',
                                        letterSpacing: 0.6,
                                        textTransform: 'uppercase',
                                    }}>
                                        {g.key}
                                    </span>
                                    <span className="mp-num" style={{ fontSize: 12, color: 'var(--text-3)' }}>
                                        {g.count} ticket{g.count !== 1 ? 's' : ''}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    {g.bookings.map((b) => (
                                        b.items.length === 1 ? (
                                            <TicketCard
                                                key={b.key}
                                                ticket={b.items[0]}
                                                eventStartTime={b.items[0].eventStartTime}
                                                venue={b.items[0].eventVenue}
                                                onShowQr={setActive}
                                            />
                                        ) : (
                                            <BookingCard
                                                key={b.key}
                                                booking={b}
                                                onShowQr={setActive}
                                            />
                                        )
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Modal open={!!active} onClose={() => setActive(null)} width={400} label="Ticket QR code">
                {active && <QrModalContent ticket={active} onClose={() => setActive(null)} />}
            </Modal>
        </div>
    );
}

/* ── QR modal ─────────────────────────────────────────── */

function QrModalContent({ ticket, onClose }) {
    return (
        <div>
            <div style={{
                padding: '20px 24px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)' }}>
                        BOARDING PASS
                    </div>
                    <div className="mp-h4" style={{ color: 'var(--text-1)', marginTop: 2 }}>
                        {ticket.eventTitle}
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close QR"
                    style={{
                        background: 'var(--surface-subtle)',
                        border: 0,
                        padding: 8,
                        borderRadius: 8,
                        color: 'var(--text-2)',
                        cursor: 'pointer',
                    }}
                >
                    <Icons.x size={16} />
                </button>
            </div>

            <div className="mp-grid-stack" style={{
                padding: 24,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 16,
            }}>
                <div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Seat</div>
                    <div className="mp-num" style={{
                        fontSize: 28,
                        fontWeight: 700,
                        color: 'var(--mp-blue)',
                        marginTop: 4,
                    }}>
                        {ticket.seatNumber ?? '—'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
                        {ticket.tierName}
                    </div>
                </div>
                <div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Gate opens</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', marginTop: 4 }}>
                        {ticket.eventStartTime ? formatEventDate(ticket.eventStartTime) : '—'}
                    </div>
                    {ticket.eventVenue && (
                        <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
                            {ticket.eventVenue}
                        </div>
                    )}
                </div>
            </div>

            <div style={{
                padding: 24,
                paddingTop: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
            }}>
                <div style={{ padding: 14, background: 'var(--surface-subtle)', borderRadius: 12 }}>
                    <QrPattern size={200} seed={ticket.qrCode || ticket.id} />
                </div>
                <div className="mp-num" style={{
                    fontSize: 12,
                    color: 'var(--text-3)',
                    letterSpacing: '0.06em',
                }}>
                    {ticket.shortCode || ticket.qrCode || ticket.id}
                </div>
            </div>
        </div>
    );
}

/* ── States ───────────────────────────────────────────── */

function EmptyState({ onBrowse, mode = 'bootstrap' }) {
    const copy = {
        bootstrap: {
            title: 'No tickets yet',
            body: "Once you book a seat, it'll show up here with a scannable QR code.",
            cta: true,
        },
        'no-upcoming': {
            title: 'No upcoming tickets',
            body: 'Find something happening — events are publishing all the time.',
            cta: true,
        },
        'no-archive': {
            title: 'Archive is empty',
            body: 'Past, used, and refunded tickets show up here.',
            cta: false,
        },
    }[mode];

    return (
        <div data-testid="tickets-empty" style={{
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 50,
            textAlign: 'center',
        }}>
            <div style={{
                width: 52, height: 52, borderRadius: 99,
                margin: '0 auto 14px',
                background: 'var(--surface-subtle)',
                display: 'grid', placeItems: 'center',
                color: 'var(--text-3)',
            }}>
                <Icons.ticket size={20} />
            </div>
            <div className="mp-h4" style={{ color: 'var(--text-1)', margin: 0 }}>
                {copy.title}
            </div>
            <p className="body-sm" style={{ color: 'var(--text-2)', marginTop: 6 }}>
                {copy.body}
            </p>
            {copy.cta && (
                <Button variant="primary" size="md" onClick={onBrowse} style={{ marginTop: 16 }}>
                    Browse events
                </Button>
            )}
        </div>
    );
}

function ErrorState({ onRetry }) {
    return (
        <div role="alert" style={{
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 40,
            textAlign: 'center',
            marginTop: 20,
        }}>
            <Icons.alert size={32} style={{ color: 'var(--error)' }} />
            <h2 className="mp-h3" style={{ marginTop: 12, color: 'var(--text-1)' }}>
                Could not load tickets
            </h2>
            <p className="body" style={{ marginTop: 6, color: 'var(--text-2)' }}>
                Check your connection and try again.
            </p>
            <Button variant="secondary" size="md" onClick={onRetry} style={{ marginTop: 16 }}>
                Retry
            </Button>
        </div>
    );
}

function SkeletonList() {
    const skeleton = {
        height: 130,
        background: 'white',
        border: '1px solid var(--border)',
        borderRadius: 12,
        animation: 'mp-flash 1.6s ease-in-out infinite',
    };
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 20 }}>
            <div style={skeleton} />
            <div style={skeleton} />
            <div style={skeleton} />
        </div>
    );
}
