import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useSelector } from 'react-redux';
import {
    useGetEventByIdQuery,
    useGetEventTiersQuery,
} from '../eventsApi';
import { selectIsAuthenticated, selectCurrentUserId } from '@/features/auth/authSlice';
import { formatEventDate } from '@/utils/dateFormat';
import { formatNaira } from '@/utils/currency';
import Button from '@/components/ui/Button';
import CapacityBar from '@/components/ui/CapacityBar';
import TopNav from '@/components/ui/TopNav';
import { StatusBadge } from '@/components/ui/Badge';
import { Icons } from '@/components/ui/Icon';
import CommentSection from '@/features/comments/components/CommentSection';

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

    // Send vendors to the dedicated apply page. That page owns the
    // profile-required gate + the pitch form; this button just routes.
    const handleVendorApply = () => {
        if (!isAuthenticated) {
            navigate('/login', { state: { from: `/vendor/apply/${id}` } });
        } else {
            navigate(`/vendor/apply/${id}`);
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
            {e.coverImageUrl ? (
                <div
                    style={{
                        height: 320,
                        backgroundImage: `url(${e.coverImageUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundColor: 'var(--surface-subtle)',
                    }}
                    role="img"
                    aria-label={e.title}
                />
            ) : (
                <div
                    className="mp-placeholder"
                    data-label="EVENT IMAGE"
                    style={{ height: 320 }}
                    aria-hidden="true"
                />
            )}

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

                        <h1 className="mp-h1" style={{ margin: 0, color: 'var(--text-1)', textWrap: 'balance' }}>
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

                        <ShareRow title={e.title} />

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
                            <p className="body" style={{ marginTop: 12, color: 'var(--text-2)', whiteSpace: 'pre-wrap', textWrap: 'pretty' }}>
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

                        {!isOwnEvent && e.status === 'PUBLISHED' && (
                            <div style={{
                                background: 'white',
                                border: '1px solid var(--border)',
                                borderRadius: 12,
                                padding: 18,
                                marginTop: 14,
                            }}>
                                <div style={{
                                    display: 'flex', gap: 10, alignItems: 'flex-start',
                                }}>
                                    <Icons.spark size={18} style={{ color: 'var(--mp-blue)', flexShrink: 0, marginTop: 2 }} />
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
                                            Vendor? Pitch this event.
                                        </div>
                                        <p style={{
                                            fontSize: 12,
                                            color: 'var(--text-2)',
                                            margin: '4px 0 10px',
                                            lineHeight: 1.5,
                                        }}>
                                            Submit a short application — service, scope, and price.
                                            The organiser reviews it and gets back to you.
                                        </p>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={handleVendorApply}
                                            iconRight={<Icons.arrowR size={13} />}
                                        >
                                            Apply as vendor
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </aside>
                </div>

                {/* Discussion thread — gated by EventConfig.commentsEnabled
                    on the backend (default true). Component renders its
                    own "module off" notice on 409. */}
                <div style={{ marginTop: 20 }}>
                    <CommentSection
                        eventId={id}
                        eventStatus={e.status}
                        canModerate={isOwnEvent}
                    />
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
                    {Number(tier.price) === 0 ? 'Free' : formatNaira(tier.price)}
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

function ShareRow({ title }) {
    const [copied, setCopied] = useState(false);
    const url = window.location.href;

    const shareX = () => {
        window.open(
            `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
            '_blank', 'noopener,noreferrer',
        );
    };

    const shareWhatsApp = () => {
        window.open(
            `https://wa.me/?text=${encodeURIComponent(`${title} — ${url}`)}`,
            '_blank', 'noopener,noreferrer',
        );
    };

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            /* clipboard unavailable */
        }
    };

    const btnStyle = {
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 12px', borderRadius: 8,
        border: '1px solid var(--border)',
        background: 'white', cursor: 'pointer',
        fontSize: 13, fontWeight: 500,
        color: 'var(--text-2)', fontFamily: 'inherit',
        transition: 'border-color 0.15s, color 0.15s',
    };

    return (
        <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
            <button type="button" style={btnStyle} onClick={shareX}
                onMouseOver={(e) => { e.currentTarget.style.borderColor = '#000'; e.currentTarget.style.color = '#000'; }}
                onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)'; }}
            >
                <XIcon />
                Share on X
            </button>
            <button type="button" style={btnStyle} onClick={shareWhatsApp}
                onMouseOver={(e) => { e.currentTarget.style.borderColor = '#25D366'; e.currentTarget.style.color = '#25D366'; }}
                onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)'; }}
            >
                <WhatsAppIcon />
                WhatsApp
            </button>
            <button type="button"
                style={{
                    ...btnStyle,
                    ...(copied ? { borderColor: 'var(--success)', color: 'var(--success)' } : {}),
                }}
                onClick={copyLink}
                onMouseOver={(e) => { if (!copied) { e.currentTarget.style.borderColor = 'var(--mp-blue)'; e.currentTarget.style.color = 'var(--mp-blue)'; } }}
                onMouseOut={(e) => { if (!copied) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)'; } }}
            >
                {copied ? <Icons.check size={14} /> : <LinkIcon />}
                {copied ? 'Copied!' : 'Copy link'}
            </button>
        </div>
    );
}

function XIcon() {
    return (
        <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
    );
}

function WhatsAppIcon() {
    return (
        <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.117.549 4.099 1.508 5.829L.055 23.433a.75.75 0 00.916.916l5.635-1.458A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.96 0-3.79-.518-5.371-1.419l-.395-.228-3.883 1.005.994-3.851-.233-.395A9.958 9.958 0 012 12c0-5.514 4.486-10 10-10s10 4.486 10 10-4.486 10-10 10zm5.472-7.618c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.074-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.457.13-.606.134-.133.298-.347.447-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.52-.075-.149-.67-1.612-.917-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.372-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.718 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
        </svg>
    );
}

function LinkIcon() {
    return (
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
        </svg>
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
