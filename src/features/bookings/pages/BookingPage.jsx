import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import { useSelector } from 'react-redux';
import {
    useGetEventByIdQuery,
    useGetEventTiersQuery,
} from '@/features/events/eventsApi';
import { useCreateBookingMutation } from '../bookingsApi';
import { selectCurrentUserId } from '@/features/auth/authSlice';
import { formatEventDate } from '@/utils/dateFormat';
import { formatNaira } from '@/utils/currency';
import Button from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icon';
import AddToCalendar from '@/components/ui/AddToCalendar';

const MAX_PER_BOOKING = 20;

export default function BookingPage() {
    const { id: eventId } = useParams();
    const navigate = useNavigate();

    const currentUserId = useSelector(selectCurrentUserId);
    const event = useGetEventByIdQuery(eventId);
    const tiersQuery = useGetEventTiersQuery(eventId);
    const [createBooking, createState] = useCreateBookingMutation();

    const tiers = tiersQuery.data ?? [];
    const availableTiers = useMemo(
        () => tiers.filter((t) => (t.availableCapacity ?? 0) > 0),
        [tiers]
    );

    const [step, setStep] = useState(0);
    const [tierId, setTierId] = useState(null);
    const [qty, setQty] = useState(1);
    const [errorMessage, setErrorMessage] = useState('');
    const [booking, setBooking] = useState(null);

    useEffect(() => {
        if (!tierId && availableTiers.length > 0) setTierId(availableTiers[0].id);
    }, [availableTiers, tierId]);

    const tier = tiers.find((t) => t.id === tierId);
    const left = tier?.availableCapacity ?? 0;
    const cap = Math.max(1, Math.min(MAX_PER_BOOKING, left));
    const total = (Number(tier?.price ?? 0)) * qty;

    useEffect(() => {
        if (qty > cap) setQty(cap);
    }, [cap, qty]);

    if (event.isLoading || tiersQuery.isLoading) {
        return <PageShell><CardSkeleton /></PageShell>;
    }
    if (event.isError || !event.data) {
        return (
            <PageShell>
                <Card>
                    <Empty
                        title="Event not found"
                        body="The event you're trying to book may have been removed."
                        cta={{ label: 'Browse events', onClick: () => navigate('/events') }}
                    />
                </Card>
            </PageShell>
        );
    }
    if (event.data.status !== 'PUBLISHED') {
        return (
            <PageShell>
                <Card>
                    <Empty
                        title="Not on sale"
                        body="This event is not currently accepting bookings."
                        cta={{ label: 'Back to event', onClick: () => navigate(`/events/${eventId}`) }}
                    />
                </Card>
            </PageShell>
        );
    }
    if (currentUserId && event.data.createdBy && currentUserId === event.data.createdBy) {
        return (
            <PageShell>
                <Card>
                    <Empty
                        title="You can't book your own event"
                        body="Organisers are not permitted to purchase tickets for events they created."
                        cta={{ label: 'Back to event', onClick: () => navigate(`/events/${eventId}`) }}
                    />
                </Card>
            </PageShell>
        );
    }
    if (availableTiers.length === 0 && step < 3) {
        return (
            <PageShell>
                <Card>
                    <Empty
                        title="Sold out"
                        body="Every tier for this event is sold out. Check back if seats become available."
                        cta={{ label: 'Back to event', onClick: () => navigate(`/events/${eventId}`) }}
                    />
                </Card>
            </PageShell>
        );
    }

    async function confirm() {
        setErrorMessage('');
        try {
            const result = await createBooking({ eventId, tierId, quantity: qty }).unwrap();
            setBooking(result);
            setStep(3);
        } catch (err) {
            setErrorMessage(err?.data?.message || 'Could not complete the booking. Please try again.');
        }
    }

    return (
        <PageShell>
            <Link
                to={`/events/${eventId}`}
                style={{
                    color: 'var(--text-2)', fontSize: 14,
                    display: 'inline-flex', gap: 6, alignItems: 'center',
                    marginBottom: 20, textDecoration: 'none',
                }}
            >
                <Icons.arrowL size={16} /> Back to event
            </Link>

            {step < 3 && <Stepper step={step} />}

            <Card>
                {step === 0 && (
                    <TierStep
                        eventTitle={event.data.title}
                        tiers={tiers}
                        tierId={tierId}
                        onSelect={setTierId}
                        onContinue={() => setStep(1)}
                    />
                )}

                {step === 1 && tier && (
                    <QuantityStep
                        tier={tier}
                        qty={qty}
                        cap={cap}
                        total={total}
                        onDec={() => setQty((q) => Math.max(1, q - 1))}
                        onInc={() => setQty((q) => Math.min(cap, q + 1))}
                        onBack={() => setStep(0)}
                        onContinue={() => setStep(2)}
                    />
                )}

                {step === 2 && tier && (
                    <ReviewStep
                        event={event.data}
                        tier={tier}
                        qty={qty}
                        total={total}
                        submitting={createState.isLoading}
                        errorMessage={errorMessage}
                        onBack={() => setStep(1)}
                        onConfirm={confirm}
                    />
                )}

                {step === 3 && booking && (
                    <SuccessStep
                        eventTitle={event.data.title}
                        eventStartTime={event.data.startTime}
                        venue={event.data.venueName ?? event.data.venue}
                        booking={booking}
                        onTickets={() => navigate(`/events/${eventId}`)}
                        onMore={() => navigate('/events')}
                    />
                )}
            </Card>
        </PageShell>
    );
}

/* ── Layout helpers ─────────────────────────────────────── */

function PageShell({ children }) {
    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            <div className="mp-page-wrap" style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px 80px' }}>
                {children}
            </div>
        </div>
    );
}

function Card({ children }) {
    return (
        <div className="mp-card-pad" style={{
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            boxShadow: 'var(--shadow-card)',
            padding: 28,
        }}>
            {children}
        </div>
    );
}

function CardSkeleton() {
    return (
        <Card>
            <div style={{
                height: 320,
                background: 'var(--surface-subtle)',
                borderRadius: 12,
                animation: 'mp-flash 1.6s ease-in-out infinite',
            }} />
        </Card>
    );
}

function Empty({ title, body, cta }) {
    return (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Icons.alert size={32} style={{ color: 'var(--text-3)' }} />
            <h2 className="mp-h3" style={{ marginTop: 12, color: 'var(--text-1)' }}>{title}</h2>
            <p className="body" style={{ marginTop: 6, color: 'var(--text-2)' }}>{body}</p>
            <Button variant="secondary" size="md" onClick={cta.onClick} style={{ marginTop: 16 }}>
                {cta.label}
            </Button>
        </div>
    );
}

/* ── Stepper ─────────────────────────────────────── */

function Stepper({ step }) {
    const labels = ['Select tier', 'Choose quantity', 'Review'];
    return (
        <div data-testid="booking-stepper" className="mp-tab-scroll" style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 24,
        }}>
            {labels.map((label, i) => (
                <StepDot key={label} index={i} step={step} label={label} isLast={i === labels.length - 1} />
            ))}
        </div>
    );
}

function StepDot({ index, step, label, isLast }) {
    const active = index <= step;
    return (
        <>
            <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                color: active ? 'var(--text-1)' : 'var(--text-3)',
            }}>
                <div style={{
                    width: 24, height: 24, borderRadius: 99,
                    background: active ? 'var(--mp-blue)' : 'var(--surface-subtle)',
                    border: active ? '0' : '1px solid var(--border)',
                    color: active ? 'white' : 'var(--text-3)',
                    display: 'grid', placeItems: 'center',
                    fontSize: 12, fontWeight: 600,
                }}>
                    {index < step ? <Icons.check size={12} /> : index + 1}
                </div>
                <span style={{ fontSize: 13, fontWeight: index === step ? 600 : 500 }}>{label}</span>
            </div>
            {!isLast && (
                <div style={{
                    flex: 1,
                    height: 1,
                    background: index < step ? 'var(--mp-blue)' : 'var(--border)',
                }} />
            )}
        </>
    );
}

/* ── Step 0: Tier select ─────────────────────────────────────── */

function TierStep({ eventTitle, tiers, tierId, onSelect, onContinue }) {
    const canContinue = Boolean(tierId);
    return (
        <>
            <Eyebrow>BOOKING FOR</Eyebrow>
            <h2 className="mp-h3" style={{ margin: '4px 0 24px', color: 'var(--text-1)' }}>{eventTitle}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {tiers.map((t) => {
                    const left = t.availableCapacity ?? 0;
                    const isSoldOut = left === 0;
                    const selected = tierId === t.id;
                    return (
                        <button
                            key={t.id}
                            type="button"
                            disabled={isSoldOut}
                            onClick={() => onSelect(t.id)}
                            data-testid={`tier-${t.id}`}
                            aria-pressed={selected}
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '24px 1fr auto',
                                gap: 14,
                                alignItems: 'center',
                                padding: 16,
                                textAlign: 'left',
                                background: selected ? 'var(--mp-blue-50)' : 'var(--surface-elevated)',
                                border: `1px solid ${selected ? 'var(--mp-blue)' : 'var(--border)'}`,
                                borderRadius: 12,
                                opacity: isSoldOut ? 0.5 : 1,
                                cursor: isSoldOut ? 'not-allowed' : 'pointer',
                                transition: 'all var(--motion-fast)',
                            }}
                        >
                            <Radio selected={selected} />
                            <div>
                                <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>{t.name}</div>
                                <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>
                                    {isSoldOut ? 'Sold out' : `${left} of ${t.totalCapacity} available`}
                                </div>
                            </div>
                            <div className="mp-num" style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-1)' }}>
                                {Number(t.price) === 0 ? 'Free' : formatNaira(t.price)}
                            </div>
                        </button>
                    );
                })}
            </div>
            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                    variant="primary"
                    size="lg"
                    iconRight={<Icons.arrowR size={16} />}
                    onClick={onContinue}
                    disabled={!canContinue}
                >
                    Continue
                </Button>
            </div>
        </>
    );
}

function Radio({ selected }) {
    return (
        <span style={{
            width: 18, height: 18, borderRadius: 99,
            border: `2px solid ${selected ? 'var(--mp-blue)' : 'var(--border-strong)'}`,
            background: selected ? 'var(--mp-blue)' : 'transparent',
            position: 'relative',
            display: 'inline-block',
        }}>
            {selected && (
                <span style={{
                    position: 'absolute', inset: 3, borderRadius: 99, background: 'var(--surface-elevated)',
                }} />
            )}
        </span>
    );
}

/* ── Step 1: Quantity ─────────────────────────────────────── */

function QuantityStep({ tier, qty, cap, total, onDec, onInc, onBack, onContinue }) {
    return (
        <>
            <Eyebrow>HOW MANY SEATS</Eyebrow>
            <h2 className="mp-h3" style={{ margin: '4px 0 6px', color: 'var(--text-1)' }}>Pick a quantity</h2>
            <p style={{ fontSize: 14, color: 'var(--text-2)', margin: 0 }}>
                Seats are auto-assigned in sequence.
            </p>

            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 32,
                padding: 32,
                background: 'var(--surface-subtle)',
                borderRadius: 12,
                border: '1px solid var(--border)',
                marginTop: 20,
            }}>
                <StepperButton onClick={onDec} disabled={qty <= 1} aria-label="Decrease quantity">−</StepperButton>
                <div style={{ textAlign: 'center', minWidth: 100 }}>
                    <div className="mp-num mp-qty-display" data-testid="qty-display" style={{
                        fontSize: 56, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1,
                    }}>
                        {qty}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 6 }}>
                        {qty === 1 ? 'ticket' : 'tickets'}
                    </div>
                </div>
                <StepperButton onClick={onInc} disabled={qty >= cap} aria-label="Increase quantity">+</StepperButton>
            </div>

            <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', marginTop: 8 }}>
                Max {MAX_PER_BOOKING} per booking · {tier.availableCapacity} left in {tier.name}
            </div>

            <div style={{
                marginTop: 24,
                padding: 16,
                background: 'var(--surface-subtle)',
                borderRadius: 12,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <span style={{ fontSize: 14, color: 'var(--text-2)' }}>{qty} × {tier.name}</span>
                <span className="mp-num" style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-1)' }}>
                    {Number(tier.price) === 0 ? 'Free' : formatNaira(total)}
                </span>
            </div>

            <div className="mp-actions-row" style={{ marginTop: 24, display: 'flex', gap: 10, justifyContent: 'space-between' }}>
                <Button variant="ghost" size="lg" icon={<Icons.arrowL size={16} />} onClick={onBack}>Back</Button>
                <Button variant="primary" size="lg" iconRight={<Icons.arrowR size={16} />} onClick={onContinue}>Review</Button>
            </div>
        </>
    );
}

function StepperButton({ children, ...rest }) {
    return (
        <button
            type="button"
            {...rest}
            style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                border: '1px solid var(--border)',
                background: 'var(--surface-elevated)',
                fontSize: 22,
                fontWeight: 600,
                color: 'var(--text-1)',
                cursor: rest.disabled ? 'not-allowed' : 'pointer',
                opacity: rest.disabled ? 0.4 : 1,
            }}
        >
            {children}
        </button>
    );
}

/* ── Step 2: Review ─────────────────────────────────────── */

function ReviewStep({ event, tier, qty, total, submitting, errorMessage, onBack, onConfirm }) {
    return (
        <>
            <Eyebrow>REVIEW &amp; CONFIRM</Eyebrow>
            <h2 className="mp-h3" style={{ margin: '4px 0 24px', color: 'var(--text-1)' }}>Almost there</h2>

            <div style={{ border: '1px solid var(--border)', borderRadius: 12 }}>
                <ReviewRow label="Event" value={event.title} sub={`${formatEventDate(event.startTime)} · ${event.venue}`} />
                <ReviewRow label="Tier" value={tier.name} />
                <ReviewRow label="Quantity" value={String(qty)} />
                <div style={{
                    padding: 16,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid var(--border)',
                    background: 'var(--surface-subtle)',
                    borderRadius: '0 0 12px 12px',
                }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>Total</span>
                    <span className="mp-num" data-testid="total-amount" style={{
                        fontWeight: 700, fontSize: 22, color: 'var(--text-1)',
                    }}>
                        {Number(tier.price) === 0 ? 'Free' : formatNaira(total)}
                    </span>
                </div>
            </div>


            {errorMessage && (
                <div role="alert" style={{
                    marginTop: 16,
                    padding: '10px 12px',
                    background: 'var(--error-bg)',
                    color: 'var(--error)',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 500,
                }}>
                    {errorMessage}
                </div>
            )}

            <div className="mp-actions-row" style={{ marginTop: 24, display: 'flex', gap: 10, justifyContent: 'space-between' }}>
                <Button variant="ghost" size="lg" icon={<Icons.arrowL size={16} />} onClick={onBack} disabled={submitting}>Back</Button>
                <Button variant="primary" size="lg" onClick={onConfirm} disabled={submitting}>
                    {submitting ? 'Confirming…' : 'Confirm booking'}
                </Button>
            </div>
        </>
    );
}

function ReviewRow({ label, value, sub }) {
    return (
        <div style={{
            padding: 16,
            borderBottom: '1px solid var(--border)',
        }}>
            <div style={{ fontSize: 13, color: 'var(--text-3)' }}>{label}</div>
            <div style={{ fontWeight: 600, color: 'var(--text-1)', marginTop: 2 }}>{value}</div>
            {sub && <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>{sub}</div>}
        </div>
    );
}

/* ── Step 3: Success ─────────────────────────────────────── */

function SuccessStep({ eventTitle, eventStartTime, venue, booking, onTickets, onMore }) {
    const seats = (booking.tickets ?? []).map((t) => t.seatNumber).filter(Boolean);
    const qty = booking.quantity ?? seats.length;
    return (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{
                width: 64, height: 64, margin: '0 auto', borderRadius: 99,
                background: 'var(--success-bg)', color: 'var(--success)',
                display: 'grid', placeItems: 'center',
            }}>
                <Icons.check size={28} />
            </div>
            <h2 className="mp-h2" style={{ margin: '20px 0 0', color: 'var(--text-1)' }}>
                You&apos;re booked.
            </h2>
            <p className="body" style={{ color: 'var(--text-2)', maxWidth: 400, margin: '8px auto 0' }}>
                {qty} {qty === 1 ? 'ticket' : 'tickets'} for <strong>{eventTitle}</strong>.
                Confirmation has been sent to your email.
            </p>

            {seats.length > 0 && (
                <div style={{
                    marginTop: 28, padding: 20,
                    background: 'var(--surface-subtle)', borderRadius: 12, textAlign: 'left',
                }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 12 }}>
                        Your seats
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {seats.map((s) => (
                            <span
                                key={s}
                                className="mp-num"
                                data-testid={`seat-${s}`}
                                style={{
                                    fontSize: 16, fontWeight: 700,
                                    padding: '8px 14px',
                                    background: 'var(--mp-blue)', color: 'white',
                                    borderRadius: 8,
                                }}
                            >
                                {s}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Add to calendar */}
            {eventStartTime && (
                <div style={{
                    marginTop: 24, padding: '16px 20px',
                    background: 'var(--surface-subtle)',
                    border: '1px solid var(--border)',
                    borderRadius: 12, textAlign: 'left',
                }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 10 }}>
                        Add to your calendar
                    </div>
                    <AddToCalendar
                        title={eventTitle}
                        startTime={eventStartTime}
                        venue={venue}
                    />
                </div>
            )}

            <div className="mp-actions-row" style={{ marginTop: 24, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button variant="primary" size="lg" icon={<Icons.ticket size={16} />} onClick={onTickets}>
                    View tickets
                </Button>
                <Button variant="secondary" size="lg" onClick={onMore}>
                    Browse more
                </Button>
            </div>
        </div>
    );
}

function Eyebrow({ children }) {
    return (
        <span style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-3)',
            letterSpacing: '0.05em',
        }}>
            {children}
        </span>
    );
}
