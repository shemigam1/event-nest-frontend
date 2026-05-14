import { useNavigate, useParams } from 'react-router';
import { useSelector } from 'react-redux';
import {
    useGetEventByIdQuery,
    useGetEventTiersQuery,
} from '../eventsApi';
import { selectIsAuthenticated, selectCurrentUserId } from '@/features/auth/authSlice';
import { formatEventDate } from '@/utils/dateFormat';
import Button from '@/components/ui/Button';
import CapacityBar from '@/components/ui/CapacityBar';
import TopNav from '@/components/ui/TopNav';
import { StatusBadge } from '@/components/ui/Badge';
import { Icons } from '@/components/ui/Icon';

export default function EventDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const currentUserId = useSelector(selectCurrentUserId);

    const event = useGetEventByIdQuery(id);
    const tiersQuery = useGetEventTiersQuery(id);

    const handleBook = () => {
        if (!isAuthenticated) {
            navigate('/login', { state: { from: `/events/${id}/book` } });
        } else {
            navigate(`/events/${id}/book`);
        }
    };

    if (event.isLoading) return <PageShell><DetailSkeleton /></PageShell>;
    if (event.isError || !event.data) return <PageShell><NotFound onBack={() => navigate('/events')} /></PageShell>;

    const e = event.data;
    const tiers = tiersQuery.data ?? [];
    const totalCap = tiers.reduce((s, t) => s + (t.totalCapacity ?? 0), 0);
    const availableCap = tiers.reduce((s, t) => s + (t.availableCapacity ?? 0), 0);
    const totalSold = totalCap - availableCap;
    const allSoldOut = tiers.length > 0 && availableCap === 0;
    const isOwnEvent = Boolean(currentUserId && e.createdBy && currentUserId === e.createdBy);
    const cantBook = e.status !== 'PUBLISHED' || allSoldOut || isOwnEvent;

    return (
        <PageShell>
            <div
                className="mp-placeholder"
                data-label="EVENT IMAGE"
                style={{ height: 320 }}
                aria-hidden="true"
            />

            <div style={{ maxWidth: 1200, margin: '-80px auto 0', padding: '0 24px 64px', position: 'relative' }}>
                <div className="mp-detail-grid" style={{
                    background: 'white',
                    border: '1px solid var(--border)',
                    borderRadius: 16,
                    boxShadow: 'var(--shadow-elevated)',
                    padding: 32,
                    display: 'grid',
                    gridTemplateColumns: '1fr 360px',
                    gap: 40,
                }}>
                    {/* Left: details */}
                    <div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
                            <StatusBadge status={e.status} />
                        </div>

                        <h1 className="mp-h1" style={{ margin: 0, color: 'var(--text-1)' }}>
                            {e.title}
                        </h1>

                        {(e.organizer || e.createdBy) && (
                            <p className="body" style={{ marginTop: 8, color: 'var(--text-2)' }}>
                                Hosted by{' '}
                                <strong style={{ color: 'var(--text-1)', fontWeight: 600 }}>
                                    {e.organizer
                                        ? `${e.organizer.firstName} ${e.organizer.lastName}`
                                        : `Organiser · ${String(e.createdBy).slice(0, 8)}`}
                                </strong>
                            </p>
                        )}

                        <div className="mp-grid-stack" style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 16,
                            marginTop: 24,
                        }}>
                            <InfoTile icon={<Icons.calendar size={18} />} label="When" value={formatEventDate(e.startTime)} />
                            <InfoTile icon={<Icons.pin size={18} />} label="Where" value={e.venue} />
                        </div>

                        <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
                            <h3 className="mp-h4" style={{ margin: 0, color: 'var(--text-1)' }}>About this event</h3>
                            <p className="body" style={{ marginTop: 12, color: 'var(--text-2)', whiteSpace: 'pre-wrap' }}>
                                {e.description || 'Details to be announced.'}
                            </p>
                        </div>
                    </div>

                    {/* Right: booking aside */}
                    <aside>
                        <div
                            data-testid="booking-aside"
                            style={{
                                background: 'var(--surface-subtle)',
                                border: '1px solid var(--border)',
                                borderRadius: 12,
                                padding: 20,
                                position: 'sticky',
                                top: 120,
                            }}
                        >
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 12,
                            }}>
                                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>Tickets</span>
                                {e.status === 'PUBLISHED' && (
                                    <span style={{
                                        display: 'inline-flex',
                                        gap: 6,
                                        alignItems: 'center',
                                        fontSize: 12,
                                        color: 'var(--success)',
                                        fontWeight: 600,
                                    }}>
                                        <span className="mp-live-dot" />Live
                                    </span>
                                )}
                            </div>

                            {totalCap > 0 && (
                                <CapacityBar sold={totalSold} total={totalCap} label="Total capacity" />
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
                                {tiersQuery.isLoading && <TierSkeletonList />}
                                {!tiersQuery.isLoading && tiers.length === 0 && (
                                    <div style={{
                                        padding: 14,
                                        background: 'white',
                                        border: '1px solid var(--border)',
                                        borderRadius: 10,
                                        fontSize: 13,
                                        color: 'var(--text-3)',
                                        textAlign: 'center',
                                    }}>
                                        Tiers not yet announced.
                                    </div>
                                )}
                                {tiers.map((t) => (
                                    <TierRow key={t.id} tier={t} />
                                ))}
                            </div>

                            <Button
                                size="lg"
                                variant="primary"
                                style={{ width: '100%', marginTop: 16 }}
                                iconRight={!isOwnEvent && <Icons.arrowR size={16} />}
                                onClick={handleBook}
                                disabled={cantBook}
                            >
                                {isOwnEvent
                                    ? 'Your event'
                                    : allSoldOut
                                        ? 'Sold out'
                                        : e.status !== 'PUBLISHED'
                                            ? 'Not on sale'
                                            : 'Book seats'}
                            </Button>

                            {isOwnEvent && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    justifyContent: 'center',
                                    fontSize: 12,
                                    color: 'var(--text-3)',
                                    marginTop: 12,
                                }}>
                                    <Icons.alert size={14} /> Organisers cannot book their own events
                                </div>
                            )}

                            {!isOwnEvent && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    justifyContent: 'center',
                                    fontSize: 12,
                                    color: 'var(--text-3)',
                                    marginTop: 12,
                                }}>
                                    <Icons.shield size={14} /> Assigned seats · No overbooking
                                </div>
                            )}
                        </div>
                    </aside>
                </div>
            </div>
        </PageShell>
    );
}

function PageShell({ children }) {
    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            <TopNav />
            {children}
        </div>
    );
}

function InfoTile({ icon, label, value }) {
    return (
        <div style={{ display: 'flex', gap: 12 }}>
            <span style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'var(--mp-blue-50)',
                color: 'var(--mp-blue)',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
            }}>
                {icon}
            </span>
            <div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{label}</div>
                <div style={{ fontSize: 14, color: 'var(--text-1)', fontWeight: 500, marginTop: 2 }}>
                    {value}
                </div>
            </div>
        </div>
    );
}

function TierRow({ tier }) {
    const sold = (tier.totalCapacity ?? 0) - (tier.availableCapacity ?? 0);
    const left = tier.availableCapacity ?? 0;
    const isSoldOut = left === 0 && (tier.totalCapacity ?? 0) > 0;
    return (
        <div style={{
            padding: 14,
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: 10,
            opacity: isSoldOut ? 0.6 : 1,
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{tier.name}</span>
                <span className="mp-num" style={{ fontWeight: 600, color: 'var(--text-1)' }}>
                    {Number(tier.price) === 0 ? 'Free' : `₦${Number(tier.price).toLocaleString()}`}
                </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                {isSoldOut
                    ? 'Sold out'
                    : `${left} of ${tier.totalCapacity} left · ${sold} sold`}
            </div>
        </div>
    );
}

function TierSkeletonList() {
    const skeleton = {
        height: 56,
        background: 'var(--surface-subtle)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        animation: 'mp-flash 1.6s ease-in-out infinite',
    };
    return (
        <>
            <div style={skeleton} />
            <div style={skeleton} />
        </>
    );
}

function DetailSkeleton() {
    return (
        <div>
            <div className="mp-placeholder" style={{ height: 320 }} />
            <div style={{ maxWidth: 1200, margin: '-80px auto 0', padding: '0 24px 64px' }}>
                <div style={{
                    background: 'white',
                    borderRadius: 16,
                    padding: 32,
                    boxShadow: 'var(--shadow-elevated)',
                    height: 360,
                    animation: 'mp-flash 1.6s ease-in-out infinite',
                }} />
            </div>
        </div>
    );
}

function NotFound({ onBack }) {
    return (
        <div style={{ maxWidth: 720, margin: '64px auto', padding: '0 24px', textAlign: 'center' }}>
            <Icons.alert size={32} style={{ color: 'var(--error)' }} />
            <h2 className="mp-h3" style={{ marginTop: 12, color: 'var(--text-1)' }}>
                Event not found
            </h2>
            <p className="body" style={{ marginTop: 6, color: 'var(--text-2)' }}>
                The event you&apos;re looking for may have been removed or is no longer available.
            </p>
            <Button variant="secondary" size="md" onClick={onBack} style={{ marginTop: 16 }}>
                Browse events
            </Button>
        </div>
    );
}
