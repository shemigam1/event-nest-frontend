import { useState } from 'react';
import { useNavigate } from 'react-router';
import TopNav from '@/components/ui/TopNav';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Icons } from '@/components/ui/Icon';
import { useCreateEventMutation, useUpdateEventMutation, useSubmitEventMutation } from '../eventsApi';
import { useCreateTierMutation } from '../tiersApi';

/* ── Helpers ─────────────────────────────────────── */
function newTier() {
    return {
        _id: String(Math.random()),
        name: '',
        isFree: true,
        price: '',
        rowPrefix: '',
        rowCount: '10',
        seatsPerRow: '10',
    };
}

function toISO(date, time) {
    return `${date}T${time}:00`;
}

function validateBasics(b) {
    const errs = {};
    if (!b.title.trim()) errs.title = 'Title is required';
    if (!b.venue.trim()) errs.venue = 'Venue is required';
    if (!b.startDate) errs.startDate = 'Required';
    if (!b.startTime) errs.startTime = 'Required';
    if (!b.endDate) errs.endDate = 'Required';
    if (!b.endTime) errs.endTime = 'Required';
    if (b.startDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (new Date(b.startDate) < today) errs.startDate = 'Start date cannot be in the past';
    }
    if (b.startDate && b.startTime && b.endDate && b.endTime) {
        const start = new Date(`${b.startDate}T${b.startTime}`);
        const end = new Date(`${b.endDate}T${b.endTime}`);
        if (!errs.startDate && start <= new Date()) errs.startDate = 'Start time must be in the future';
        if (end <= start) errs.endDate = 'End must be after start';
    }
    return errs;
}

function validateTier(tier) {
    const errs = {};
    if (!tier.name.trim()) errs.name = 'Required';
    if (!tier.rowPrefix.trim()) errs.rowPrefix = 'Required';
    const rc = parseInt(tier.rowCount, 10);
    const spr = parseInt(tier.seatsPerRow, 10);
    if (isNaN(rc) || rc < 1) errs.rowCount = 'Min 1';
    if (isNaN(spr) || spr < 1) errs.seatsPerRow = 'Min 1';
    if (!tier.isFree) {
        const p = parseFloat(tier.price);
        if (isNaN(p) || p < 0) errs.price = 'Enter a valid price';
    }
    return errs;
}

/* ── Step indicator ──────────────────────────────── */
function StepIndicator({ currentStep }) {
    const steps = ['Event basics', 'Ticket tiers', 'Review'];
    return (
        <div
            data-testid="step-indicator"
            style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 40 }}
        >
            {steps.map((label, i) => {
                const n = i + 1;
                const done = n < currentStep;
                const active = n === currentStep;
                return (
                    <div key={n} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 0 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                            <div style={{
                                width: 32,
                                height: 32,
                                borderRadius: '50%',
                                display: 'grid',
                                placeItems: 'center',
                                fontSize: 13,
                                fontWeight: 700,
                                background: done || active ? 'var(--mp-blue)' : 'var(--surface-subtle)',
                                color: done || active ? 'white' : 'var(--text-3)',
                                border: active ? '2px solid var(--mp-blue)' : done ? 'none' : '1.5px solid var(--border)',
                                transition: 'all 0.2s',
                            }}>
                                {done ? <Icons.check size={14} /> : n}
                            </div>
                            <span style={{
                                fontSize: 12,
                                fontWeight: active ? 600 : 400,
                                color: active ? 'var(--mp-blue)' : done ? 'var(--text-2)' : 'var(--text-3)',
                                whiteSpace: 'nowrap',
                            }}>
                                {label}
                            </span>
                        </div>
                        {i < steps.length - 1 && (
                            <div style={{
                                flex: 1,
                                height: 2,
                                background: done ? 'var(--mp-blue)' : 'var(--border)',
                                margin: '0 8px',
                                marginBottom: 22,
                                transition: 'background 0.2s',
                            }} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

/* ── Step 1: Event basics ────────────────────────── */
function BasicsStep({ data, onChange, onNext }) {
    const [errors, setErrors] = useState({});
    const today = new Date().toISOString().split('T')[0];

    function handle(field) {
        return (e) => onChange({ ...data, [field]: e.target.value });
    }

    function submit(e) {
        e.preventDefault();
        const errs = validateBasics(data);
        if (Object.keys(errs).length) { setErrors(errs); return; }
        onNext();
    }

    return (
        <form onSubmit={submit} noValidate data-testid="step-basics">
            <h1 className="mp-h1" style={{ margin: '0 0 6px', color: 'var(--text-1)' }}>
                Create your event
            </h1>
            <p className="body" style={{ margin: '0 0 32px', color: 'var(--text-2)' }}>
                Start with the basics — you can always update details later.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <Input
                    label="Event title"
                    placeholder="e.g. Moniepoint Merchant Summit 2026"
                    value={data.title}
                    onChange={handle('title')}
                    error={errors.title}
                    aria-label="Event title"
                />

                <label style={{ display: 'block' }}>
                    <span style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-1)', marginBottom: 6 }}>
                        Description <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span>
                    </span>
                    <textarea
                        placeholder="Tell attendees what to expect…"
                        value={data.description}
                        onChange={handle('description')}
                        aria-label="Description"
                        style={{
                            width: '100%',
                            minHeight: 100,
                            padding: '10px 14px',
                            background: 'white',
                            border: '1px solid var(--border)',
                            borderRadius: 12,
                            fontSize: 16,
                            color: 'var(--text-1)',
                            resize: 'vertical',
                            fontFamily: 'inherit',
                            boxSizing: 'border-box',
                        }}
                    />
                </label>

                <Input
                    label="Venue"
                    placeholder="e.g. Eko Convention Centre, Lagos"
                    value={data.venue}
                    onChange={handle('venue')}
                    error={errors.venue}
                    icon={<Icons.pin size={16} />}
                    aria-label="Venue"
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                        <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-1)', marginBottom: 6 }}>
                            Start date
                        </label>
                        <input
                            type="date"
                            value={data.startDate}
                            onChange={handle('startDate')}
                            min={today}
                            aria-label="Start date"
                            style={{
                                width: '100%',
                                height: 44,
                                padding: '0 14px',
                                background: 'white',
                                border: `1px solid ${errors.startDate ? 'var(--error)' : 'var(--border)'}`,
                                borderRadius: 12,
                                fontSize: 16,
                                color: 'var(--text-1)',
                                boxSizing: 'border-box',
                            }}
                        />
                        {errors.startDate && (
                            <span style={{ display: 'block', fontSize: 12, color: 'var(--error)', marginTop: 4 }}>{errors.startDate}</span>
                        )}
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-1)', marginBottom: 6 }}>
                            Start time
                        </label>
                        <input
                            type="time"
                            value={data.startTime}
                            onChange={handle('startTime')}
                            aria-label="Start time"
                            style={{
                                width: '100%',
                                height: 44,
                                padding: '0 14px',
                                background: 'white',
                                border: `1px solid ${errors.startTime ? 'var(--error)' : 'var(--border)'}`,
                                borderRadius: 12,
                                fontSize: 16,
                                color: 'var(--text-1)',
                                boxSizing: 'border-box',
                            }}
                        />
                        {errors.startTime && (
                            <span style={{ display: 'block', fontSize: 12, color: 'var(--error)', marginTop: 4 }}>{errors.startTime}</span>
                        )}
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-1)', marginBottom: 6 }}>
                            End date
                        </label>
                        <input
                            type="date"
                            value={data.endDate}
                            onChange={handle('endDate')}
                            min={data.startDate || today}
                            aria-label="End date"
                            style={{
                                width: '100%',
                                height: 44,
                                padding: '0 14px',
                                background: 'white',
                                border: `1px solid ${errors.endDate ? 'var(--error)' : 'var(--border)'}`,
                                borderRadius: 12,
                                fontSize: 16,
                                color: 'var(--text-1)',
                                boxSizing: 'border-box',
                            }}
                        />
                        {errors.endDate && (
                            <span style={{ display: 'block', fontSize: 12, color: 'var(--error)', marginTop: 4 }}>{errors.endDate}</span>
                        )}
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-1)', marginBottom: 6 }}>
                            End time
                        </label>
                        <input
                            type="time"
                            value={data.endTime}
                            onChange={handle('endTime')}
                            aria-label="End time"
                            style={{
                                width: '100%',
                                height: 44,
                                padding: '0 14px',
                                background: 'white',
                                border: `1px solid ${errors.endTime ? 'var(--error)' : 'var(--border)'}`,
                                borderRadius: 12,
                                fontSize: 16,
                                color: 'var(--text-1)',
                                boxSizing: 'border-box',
                            }}
                        />
                        {errors.endTime && (
                            <span style={{ display: 'block', fontSize: 12, color: 'var(--error)', marginTop: 4 }}>{errors.endTime}</span>
                        )}
                    </div>
                </div>
            </div>

            <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end' }}>
                <Button type="submit" size="lg" variant="primary" iconRight={<Icons.arrowR size={16} />}>
                    Continue to tickets
                </Button>
            </div>
        </form>
    );
}

/* ── Tier card ───────────────────────────────────── */
function TierCard({ tier, onChange, onRemove, errors = {} }) {
    const capacity = (parseInt(tier.rowCount, 10) || 0) * (parseInt(tier.seatsPerRow, 10) || 0);

    function handle(field) {
        return (e) => onChange({ ...tier, [field]: e.target.value });
    }

    return (
        <div
            data-testid={`tier-card-${tier._id}`}
            style={{
                background: 'white',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: 20,
                boxShadow: 'var(--shadow-card)',
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ flex: 1, marginRight: 12 }}>
                    <Input
                        label="Tier name"
                        placeholder="e.g. VIP Front Row, General Admission"
                        value={tier.name}
                        onChange={handle('name')}
                        error={errors.name}
                        aria-label="Tier name"
                    />
                </div>
                <button
                    type="button"
                    onClick={onRemove}
                    aria-label="Remove tier"
                    style={{
                        marginTop: 28,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-3)',
                        padding: 4,
                    }}
                >
                    <Icons.x size={18} />
                </button>
            </div>

            {/* Free / Paid toggle */}
            <div style={{ marginBottom: 16 }}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-1)', marginBottom: 8 }}>
                    Pricing
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                    {['Free', 'Paid'].map((opt) => {
                        const isSelected = opt === 'Free' ? tier.isFree : !tier.isFree;
                        return (
                            <button
                                key={opt}
                                type="button"
                                aria-pressed={isSelected}
                                onClick={() => onChange({ ...tier, isFree: opt === 'Free', price: '' })}
                                style={{
                                    height: 36,
                                    padding: '0 16px',
                                    borderRadius: 8,
                                    border: `1px solid ${isSelected ? 'var(--mp-blue)' : 'var(--border)'}`,
                                    background: isSelected ? 'var(--mp-blue)' : 'white',
                                    color: isSelected ? 'white' : 'var(--text-2)',
                                    fontSize: 14,
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                }}
                            >
                                {opt}
                            </button>
                        );
                    })}
                </div>
            </div>

            {!tier.isFree && (
                <div style={{ marginBottom: 16 }}>
                    <Input
                        label="Price (₦)"
                        type="number"
                        placeholder="0"
                        min="0"
                        value={tier.price}
                        onChange={handle('price')}
                        error={errors.price}
                        aria-label="Price"
                    />
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <Input
                    label="Row prefix"
                    placeholder="e.g. VIP"
                    value={tier.rowPrefix}
                    onChange={handle('rowPrefix')}
                    error={errors.rowPrefix}
                    aria-label="Row prefix"
                />
                <Input
                    label="Rows"
                    type="number"
                    min="1"
                    value={tier.rowCount}
                    onChange={handle('rowCount')}
                    error={errors.rowCount}
                    aria-label="Rows"
                />
                <Input
                    label="Seats/row"
                    type="number"
                    min="1"
                    value={tier.seatsPerRow}
                    onChange={handle('seatsPerRow')}
                    error={errors.seatsPerRow}
                    aria-label="Seats per row"
                />
            </div>

            {capacity > 0 && (
                <p style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--text-2)' }}>
                    <Icons.users size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    <strong>{capacity.toLocaleString()}</strong> seats total
                </p>
            )}
        </div>
    );
}

/* ── Step 2: Ticket tiers ────────────────────────── */
function TiersStep({ tiers, onTiersChange, onNext, onBack }) {
    const [tierErrors, setTierErrors] = useState({});

    function addTier() {
        onTiersChange([...tiers, newTier()]);
    }

    function removeTier(id) {
        onTiersChange(tiers.filter(t => t._id !== id));
    }

    function updateTier(id, updated) {
        onTiersChange(tiers.map(t => t._id === id ? updated : t));
    }

    function submit(e) {
        e.preventDefault();
        const allErrors = {};
        let hasError = false;
        for (const tier of tiers) {
            const errs = validateTier(tier);
            if (Object.keys(errs).length) {
                allErrors[tier._id] = errs;
                hasError = true;
            }
        }
        if (hasError) { setTierErrors(allErrors); return; }
        onNext();
    }

    return (
        <form onSubmit={submit} noValidate data-testid="step-tiers">
            <h2 className="mp-h1" style={{ margin: '0 0 6px', color: 'var(--text-1)' }}>
                Set up your tickets
            </h2>
            <p className="body" style={{ margin: '0 0 28px', color: 'var(--text-2)' }}>
                Define seating tiers and capacity. You can add up to several tiers.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {tiers.length === 0 && (
                    <div
                        data-testid="no-tiers-placeholder"
                        style={{
                            textAlign: 'center',
                            padding: '40px 20px',
                            background: 'var(--surface-subtle)',
                            border: '1.5px dashed var(--border)',
                            borderRadius: 12,
                        }}
                    >
                        <Icons.ticket size={28} style={{ color: 'var(--text-3)', marginBottom: 8 }} />
                        <p className="body-sm" style={{ margin: 0, color: 'var(--text-2)' }}>
                            No tiers yet — add one below, or skip and add later.
                        </p>
                    </div>
                )}

                {tiers.map(tier => (
                    <TierCard
                        key={tier._id}
                        tier={tier}
                        onChange={(updated) => updateTier(tier._id, updated)}
                        onRemove={() => removeTier(tier._id)}
                        errors={tierErrors[tier._id] || {}}
                    />
                ))}
            </div>

            <button
                type="button"
                onClick={addTier}
                data-testid="add-tier-btn"
                style={{
                    marginTop: 16,
                    width: '100%',
                    height: 44,
                    background: 'none',
                    border: '1.5px dashed var(--border)',
                    borderRadius: 12,
                    color: 'var(--mp-blue)',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                }}
            >
                <Icons.plus size={16} /> Add ticket tier
            </button>

            <div style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between' }}>
                <Button type="button" variant="secondary" size="lg" icon={<Icons.arrowL size={16} />} onClick={onBack}>
                    Back
                </Button>
                <Button type="submit" size="lg" variant="primary" iconRight={<Icons.arrowR size={16} />}>
                    Review event
                </Button>
            </div>
        </form>
    );
}

/* ── Step 3: Review ──────────────────────────────── */
function ReviewStep({ basics, tiers, onBack, onSaveDraft, onSubmitForApproval, submitting, error }) {
    const start = basics.startDate && basics.startTime
        ? new Date(`${basics.startDate}T${basics.startTime}`).toLocaleString('en-GB', {
            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
          })
        : '—';
    const end = basics.endDate && basics.endTime
        ? new Date(`${basics.endDate}T${basics.endTime}`).toLocaleString('en-GB', {
            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
          })
        : '—';

    const totalSeats = tiers.reduce((sum, t) => {
        return sum + (parseInt(t.rowCount, 10) || 0) * (parseInt(t.seatsPerRow, 10) || 0);
    }, 0);
    const expectedRevenue = tiers.reduce((sum, t) => {
        if (t.isFree) return sum;
        const cap = (parseInt(t.rowCount, 10) || 0) * (parseInt(t.seatsPerRow, 10) || 0);
        return sum + cap * (parseFloat(t.price) || 0);
    }, 0);
    const allFree = tiers.length > 0 && tiers.every(t => t.isFree);

    return (
        <div data-testid="step-review">
            <h2 className="mp-h1" style={{ margin: '0 0 6px', color: 'var(--text-1)' }}>
                Review your event
            </h2>
            <p className="body" style={{ margin: '0 0 28px', color: 'var(--text-2)' }}>
                Check the details before saving or submitting for approval.
            </p>

            {/* Event summary */}
            <div style={{
                background: 'white',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: 24,
                marginBottom: 16,
                boxShadow: 'var(--shadow-card)',
            }}>
                <h3 className="mp-h3" style={{ margin: '0 0 16px', color: 'var(--text-1)' }}>
                    {basics.title || 'Untitled event'}
                </h3>
                {basics.description && (
                    <p className="body-sm" style={{ margin: '0 0 12px', color: 'var(--text-2)' }}>
                        {basics.description}
                    </p>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14, color: 'var(--text-2)' }}>
                        <Icons.pin size={15} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                        {basics.venue || '—'}
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14, color: 'var(--text-2)' }}>
                        <Icons.calendar size={15} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                        {start} → {end}
                    </div>
                </div>
            </div>

            {/* Tiers summary */}
            {tiers.length > 0 && (
                <div style={{
                    background: 'white',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    overflow: 'hidden',
                    marginBottom: 16,
                    boxShadow: 'var(--shadow-card)',
                }}>
                    <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontWeight: 600, color: 'var(--text-1)', fontSize: 14 }}>
                        Ticket tiers ({tiers.length})
                    </div>
                    {tiers.map((tier, i) => {
                        const cap = (parseInt(tier.rowCount, 10) || 0) * (parseInt(tier.seatsPerRow, 10) || 0);
                        const isLast = i === tiers.length - 1;
                        return (
                            <div key={tier._id} style={{
                                padding: '14px 20px',
                                borderBottom: isLast ? 0 : '1px solid var(--border)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}>
                                <div>
                                    <div style={{ fontWeight: 500, color: 'var(--text-1)' }}>{tier.name || 'Unnamed tier'}</div>
                                    <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
                                        {cap > 0 ? `${cap.toLocaleString()} seats` : 'Capacity TBD'}
                                    </div>
                                </div>
                                <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>
                                    {tier.isFree ? 'Free' : tier.price ? `₦${parseFloat(tier.price).toLocaleString()}` : '—'}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {tiers.length === 0 && (
                <p className="body-sm" style={{ color: 'var(--text-3)', marginBottom: 16 }}>
                    No ticket tiers added — you can add them after saving.
                </p>
            )}

            {totalSeats > 0 && (
                <div style={{
                    background: 'white',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: 20,
                    marginBottom: 16,
                    boxShadow: 'var(--shadow-card)',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 16,
                }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <span style={{
                            width: 40, height: 40, borderRadius: 10,
                            background: 'var(--mp-blue-50)', color: 'var(--mp-blue)',
                            display: 'grid', placeItems: 'center', flexShrink: 0,
                        }}>
                            <Icons.users size={18} />
                        </span>
                        <div>
                            <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>Total tickets</div>
                            <div className="mp-num" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-1)' }}>
                                {totalSeats.toLocaleString()}
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <span style={{
                            width: 40, height: 40, borderRadius: 10,
                            background: 'var(--mp-blue-50)', color: 'var(--mp-blue)',
                            display: 'grid', placeItems: 'center', flexShrink: 0,
                        }}>
                            <Icons.wallet size={18} />
                        </span>
                        <div>
                            <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>Expected revenue</div>
                            <div className="mp-num" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-1)' }}>
                                {allFree ? 'Free event' : `₦${expectedRevenue.toLocaleString()}`}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div role="alert" style={{
                    padding: '12px 16px',
                    background: 'var(--error-bg)',
                    color: 'var(--error)',
                    borderRadius: 10,
                    fontSize: 14,
                    marginBottom: 20,
                }}>
                    {error}
                </div>
            )}

            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <Button type="button" variant="secondary" size="lg" icon={<Icons.arrowL size={16} />} onClick={onBack} disabled={submitting}>
                    Back
                </Button>
                <div style={{ display: 'flex', gap: 10 }}>
                    <Button
                        type="button"
                        variant="secondary"
                        size="lg"
                        onClick={onSaveDraft}
                        disabled={submitting}
                    >
                        {submitting ? 'Saving…' : 'Save as draft'}
                    </Button>
                    <Button
                        type="button"
                        variant="primary"
                        size="lg"
                        onClick={onSubmitForApproval}
                        disabled={submitting}
                        iconRight={<Icons.arrowR size={16} />}
                    >
                        {submitting ? 'Submitting…' : 'Submit for approval'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

/* ── Step 4: Success ─────────────────────────────── */
function SuccessStep({ submitted, navigate }) {
    return (
        <div data-testid="step-success" style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: submitted ? 'var(--mp-blue)' : 'var(--surface-subtle)',
                border: submitted ? 'none' : '2px solid var(--border)',
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto 20px',
                color: submitted ? 'white' : 'var(--text-2)',
            }}>
                <Icons.check size={28} />
            </div>

            <h2 className="mp-h1" style={{ margin: '0 0 10px', color: 'var(--text-1)' }}>
                {submitted ? 'Event submitted!' : 'Draft saved!'}
            </h2>
            <p className="body" style={{ margin: '0 0 32px', color: 'var(--text-2)', maxWidth: 420, marginLeft: 'auto', marginRight: 'auto' }}>
                {submitted
                    ? 'Your event is under review. We\'ll notify you once it\'s approved and live.'
                    : 'Your event draft has been saved. Come back to add tiers and submit for approval.'
                }
            </p>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <Button variant="secondary" size="lg" onClick={() => navigate('/events')}>
                    Browse events
                </Button>
                <Button variant="primary" size="lg" onClick={() => navigate('/dashboard')}>
                    Go to dashboard
                </Button>
            </div>
        </div>
    );
}

/* ── Page ────────────────────────────────────────── */
export default function CreateEventPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [basics, setBasics] = useState({
        title: '',
        description: '',
        venue: '',
        startDate: '',
        startTime: '',
        endDate: '',
        endTime: '',
    });
    const [tiers, setTiers] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const [createEvent] = useCreateEventMutation();
    const [updateEvent] = useUpdateEventMutation();
    const [submitEvent] = useSubmitEventMutation();
    const [createTier] = useCreateTierMutation();

    async function createEventSequence(shouldSubmit) {
        setSubmitting(true);
        setError('');
        try {
            const event = await createEvent({
                title: basics.title.trim(),
                venue: basics.venue.trim(),
                startTime: toISO(basics.startDate, basics.startTime),
                endTime: toISO(basics.endDate, basics.endTime),
            }).unwrap();

            const eventId = event.id;

            if (basics.description.trim()) {
                await updateEvent({ id: eventId, description: basics.description.trim() }).unwrap();
            }

            const validTiers = tiers.filter(t => t.name.trim() && t.rowPrefix.trim() && parseInt(t.rowCount) >= 1 && parseInt(t.seatsPerRow) >= 1);
            for (const tier of validTiers) {
                await createTier({
                    eventId,
                    name: tier.name.trim(),
                    price: tier.isFree ? 0 : parseFloat(tier.price) || 0,
                    rowPrefix: tier.rowPrefix.trim(),
                    rowCount: parseInt(tier.rowCount, 10),
                    seatsPerRow: parseInt(tier.seatsPerRow, 10),
                }).unwrap();
            }

            if (shouldSubmit) {
                await submitEvent(eventId).unwrap();
                setSubmitted(true);
            }

            setStep(4);
        } catch (err) {
            setError(err?.data?.message || 'Something went wrong. Please try again.');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            <TopNav />
            <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px 80px' }}>
                {step < 4 && <StepIndicator currentStep={step} />}
                {step === 1 && (
                    <BasicsStep data={basics} onChange={setBasics} onNext={() => setStep(2)} />
                )}
                {step === 2 && (
                    <TiersStep tiers={tiers} onTiersChange={setTiers} onNext={() => setStep(3)} onBack={() => setStep(1)} />
                )}
                {step === 3 && (
                    <ReviewStep
                        basics={basics}
                        tiers={tiers}
                        onBack={() => setStep(2)}
                        onSaveDraft={() => createEventSequence(false)}
                        onSubmitForApproval={() => createEventSequence(true)}
                        submitting={submitting}
                        error={error}
                    />
                )}
                {step === 4 && (
                    <SuccessStep submitted={submitted} navigate={navigate} />
                )}
            </div>
        </div>
    );
}
