import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useSelector } from 'react-redux';
import {
    useGetEventByIdQuery,
    useGetEventTiersQuery,
} from '../eventsApi';
import { useApplyAsVendorMutation } from '@/features/organiser/vendorsApi';
import { selectIsAuthenticated, selectCurrentUserId } from '@/features/auth/authSlice';
import { formatEventDate } from '@/utils/dateFormat';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
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

    const [showVendorApply, setShowVendorApply] = useState(false);

    const handleBook = () => {
        if (!isAuthenticated) {
            navigate('/login', { state: { from: `/events/${id}/book` } });
        } else {
            navigate(`/events/${id}/book`);
        }
    };

    const handleVendorApply = () => {
        if (!isAuthenticated) {
            navigate('/login', { state: { from: `/events/${id}` } });
        } else {
            setShowVendorApply(true);
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
            </div>

            <ApplyAsVendorModal
                open={showVendorApply}
                onClose={() => setShowVendorApply(false)}
                eventId={id}
                eventTitle={e.title}
            />
        </PageShell>
    );
}

/* ─── Apply-as-vendor modal ───────────────────────── */
function ApplyAsVendorModal({ open, onClose, eventId, eventTitle }) {
    const [applyAsVendor, state] = useApplyAsVendorMutation();
    const [serviceType, setServiceType]   = useState('');
    const [description, setDescription]   = useState('');
    const [proposedAmount, setAmount]     = useState('');
    const [error, setError] = useState('');
    const [submitted, setSubmitted] = useState(false);

    function close() {
        setServiceType(''); setDescription(''); setAmount('');
        setError(''); setSubmitted(false);
        onClose();
    }

    async function submit() {
        if (!serviceType.trim()) {
            setError('Tell the organiser what you do.');
            return;
        }
        setError('');
        try {
            await applyAsVendor({
                eventId,
                serviceType: serviceType.trim(),
                description: description.trim() || null,
                proposedAmount: proposedAmount ? Number(proposedAmount) : null,
            }).unwrap();
            setSubmitted(true);
        } catch (err) {
            setError(err?.data?.message || 'Could not submit application.');
        }
    }

    return (
        <Modal open={open} onClose={close} width={480} label="Apply as vendor">
            <div style={{ padding: 24 }}>
                {submitted ? (
                    <>
                        <div style={{
                            width: 56, height: 56, borderRadius: 99,
                            background: 'var(--success-bg, #E6F4EA)',
                            color: 'var(--success)',
                            display: 'grid', placeItems: 'center',
                            margin: '0 auto 14px',
                        }}>
                            <Icons.check size={26} />
                        </div>
                        <h3 className="mp-h3" style={{ margin: 0, color: 'var(--text-1)', textAlign: 'center' }}>
                            Application sent
                        </h3>
                        <p className="body-sm" style={{ color: 'var(--text-2)', marginTop: 8, textAlign: 'center' }}>
                            The organiser will review your pitch and respond. You can track
                            it from your dashboard.
                        </p>
                        <Button
                            variant="primary"
                            size="md"
                            onClick={close}
                            style={{ display: 'block', margin: '20px auto 0' }}
                        >
                            Done
                        </Button>
                    </>
                ) : (
                    <>
                        <h3 className="mp-h3" style={{ margin: 0, color: 'var(--text-1)' }}>
                            Apply as vendor
                        </h3>
                        <p className="body-sm" style={{ color: 'var(--text-2)', marginTop: 6 }}>
                            Pitching for <strong>{eventTitle}</strong>. Keep it tight — the
                            organiser only sees these three fields.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 18 }}>
                            <Input
                                label="Service type"
                                value={serviceType}
                                onChange={(e) => { setServiceType(e.target.value); setError(''); }}
                                placeholder="e.g. Catering, A/V, Security, Photography"
                            />
                            <label style={{ display: 'block' }}>
                                <span style={{
                                    display: 'block',
                                    fontSize: 14,
                                    fontWeight: 500,
                                    color: 'var(--text-1)',
                                    marginBottom: 6,
                                }}>
                                    Description <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span>
                                </span>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={4}
                                    placeholder="What you'd deliver, links to portfolio, anything that helps."
                                    style={{
                                        width: '100%',
                                        padding: 12,
                                        fontFamily: 'inherit',
                                        fontSize: 14,
                                        border: '1px solid var(--border)',
                                        borderRadius: 8,
                                        resize: 'vertical',
                                        color: 'var(--text-1)',
                                        boxSizing: 'border-box',
                                    }}
                                />
                            </label>
                            <Input
                                label="Proposed amount (₦, optional)"
                                type="number"
                                min="0"
                                value={proposedAmount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="500000"
                            />
                        </div>
                        {error && (
                            <div role="alert" style={{
                                marginTop: 14,
                                padding: '10px 12px',
                                background: 'var(--error-bg, #FBE9E9)',
                                color: 'var(--error)',
                                borderRadius: 8,
                                fontSize: 13,
                            }}>
                                {error}
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
                            <Button variant="ghost" size="md" onClick={close} disabled={state.isLoading}>
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                size="md"
                                onClick={submit}
                                disabled={state.isLoading || !serviceType.trim()}
                            >
                                {state.isLoading ? 'Submitting…' : 'Submit application'}
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
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
