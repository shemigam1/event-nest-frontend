import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import VenueAutocomplete from '@/components/ui/VenueAutocomplete';
import { Icons } from '@/components/ui/Icon';
import { useCreateEventMutation, useSubmitEventMutation, usePresignCoverImageMutation } from '../eventsApi';
import { useCreateTierMutation } from '../tiersApi';
import CoverImageField from '../components/CoverImageField';

/* EventCategory enum from backend (event-nest-backend). Keep this list
   in sync with EventCategory.java — additions on either side need to
   match or the dropdown will silently drop a valid value. */
const EVENT_CATEGORIES = [
    ['MUSIC',          'Music'],
    ['ARTS',           'Arts'],
    ['SPORTS',         'Sports'],
    ['CONFERENCE',     'Conference'],
    ['WORKSHOP',       'Workshop'],
    ['FESTIVAL',       'Festival'],
    ['NETWORKING',     'Networking'],
    ['FOOD_AND_DRINK', 'Food & drink'],
    ['BIRTHDAY',       'Birthday'],
    ['WEDDING',        'Wedding'],
    ['CLUB_NIGHT',     'Club night'],
    ['COMEDY_SHOW',    'Comedy show'],
    ['FASHION_SHOW',   'Fashion show'],
    ['TECH_EVENT',     'Tech event'],
    ['RELIGIOUS',      'Religious'],
    ['CHARITY',        'Charity'],
    ['CORPORATE',      'Corporate'],
    ['EXHIBITION',     'Exhibition'],
    ['OTHER',          'Other'],
];

/* Defaults used when the organiser leaves the (optional) venue field blank
   or types a venue without picking a Place suggestion — the backend's
   CreateEventRequest has @NotBlank on venueName/city/country, so we have
   to send something. Lagos / Nigeria is the product's default market. */
const VENUE_DEFAULTS = {
    venueName: 'To be announced',
    city: 'Lagos',
    country: 'Nigeria',
};

/* Browser's IANA timezone, e.g. "Africa/Lagos". The backend requires a
   timezone but doesn't surface it in the UI — auto-detect at form mount. */
function detectTimezone() {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Lagos';
    } catch {
        return 'Africa/Lagos';
    }
}

/* ── Helpers ─────────────────────────────────────── */

/* Seating model — drives whether tiers ask for rows×seats (assigned seating)
   or a single "Total tickets" capacity (general admission). The backend
   supports both natively (CreateTierRequest.seatType is GENERAL_ADMISSION
   or NUMBERED), so the UI value flows through 1:1 at submit time. */
export const SEATING_MODES = {
    SEATED: 'SEATED',
    GENERAL: 'GENERAL_ADMISSION',
};

function newTier(seatingMode = SEATING_MODES.SEATED) {
    return {
        _id: String(Math.random()),
        name: '',
        isFree: true,
        price: '',
        // Seated fields
        rowPrefix: '',
        rowCount: '10',
        seatsPerRow: '10',
        // General-admission field
        capacity: '100',
        // Carry the chosen mode so the row knows which inputs to render.
        seatingMode,
    };
}

function toISO(date, time) {
    return `${date}T${time}:00`;
}

function validateBasics(b) {
    const errs = {};
    if (!b.title.trim()) errs.title = 'Title is required';
    if (!b.category) errs.category = 'Category is required';
    if (!b.bannerFile) errs.bannerFile = 'A cover image is required';
    // venue is optional — no validation here
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
    if (tier.seatingMode === SEATING_MODES.GENERAL) {
        // GA: just need a positive capacity number.
        const cap = parseInt(tier.capacity, 10);
        if (isNaN(cap) || cap < 1) errs.capacity = 'Min 1 ticket';
        if (cap > 100000) errs.capacity = 'Max 100,000 tickets';
    } else {
        if (!tier.rowPrefix.trim()) errs.rowPrefix = 'Required';
        const rc = parseInt(tier.rowCount, 10);
        const spr = parseInt(tier.seatsPerRow, 10);
        if (isNaN(rc) || rc < 1) errs.rowCount = 'Min 1';
        if (isNaN(spr) || spr < 1) errs.seatsPerRow = 'Min 1';
    }
    if (!tier.isFree) {
        const p = parseFloat(tier.price);
        if (isNaN(p) || p < 0) errs.price = 'Enter a valid price';
    }
    return errs;
}

/* Tier capacity helper used by both the live previews and the review summary,
   so the number you see equals the number of tickets that get created. */
export function tierCapacity(tier) {
    if (tier.seatingMode === SEATING_MODES.GENERAL) {
        return parseInt(tier.capacity, 10) || 0;
    }
    return (parseInt(tier.rowCount, 10) || 0) * (parseInt(tier.seatsPerRow, 10) || 0);
}

/* Translate a UI tier into the backend CreateTierRequest payload. Returns
   null when the tier is incomplete (mirrors the validateTier rules so we
   skip silently instead of triggering a 400 mid-loop).

   Notes for future readers:
     · price is sent as Long kobo (backend wants whole numbers, no decimals).
     · accessScope is FULL_EVENT — multi-day passes are the default. A future
       UI may want DAY_SPECIFIC tiers, which need an eventDayId. */
function buildTierPayload(t) {
    if (!t.name?.trim()) return null;
    const priceKobo = t.isFree ? 0 : Math.round((parseFloat(t.price) || 0) * 100);

    if (t.seatingMode === SEATING_MODES.GENERAL) {
        const cap = parseInt(t.capacity, 10);
        if (isNaN(cap) || cap < 1) return null;
        return {
            name: t.name.trim(),
            price: priceKobo,
            accessScope: 'FULL_EVENT',
            seatType: 'GENERAL_ADMISSION',
            totalCapacity: cap,
        };
    }

    const rc  = parseInt(t.rowCount, 10);
    const spr = parseInt(t.seatsPerRow, 10);
    if (!t.rowPrefix?.trim() || isNaN(rc) || rc < 1 || isNaN(spr) || spr < 1) return null;
    return {
        name: t.name.trim(),
        price: priceKobo,
        accessScope: 'FULL_EVENT',
        seatType: 'NUMBERED',
        rowPrefix: t.rowPrefix.trim(),
        rowCount: rc,
        seatsPerRow: spr,
    };
}

/* ── Step indicator ──────────────────────────────── */
function StepIndicator({ currentStep }) {
    const steps = ['Event basics', 'Ticket tiers', 'Review'];
    return (
        <div
            data-testid="step-indicator"
            className="mp-tab-scroll"
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

/* ── Shared toggle-card style ────────────────────── */
function ToggleCard({ selected, onClick, icon, label, desc }) {
    return (
        <button
            type="button"
            aria-pressed={selected}
            onClick={onClick}
            style={{
                flex: 1,
                padding: '12px 14px',
                borderRadius: 10,
                border: `1.5px solid ${selected ? 'var(--mp-blue)' : 'var(--border)'}`,
                background: selected ? '#eff6ff' : 'white',
                color: selected ? 'var(--mp-blue)' : 'var(--text-2)',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                transition: 'border-color 0.15s, background 0.15s',
            }}
        >
            <span style={{ marginTop: 2, flexShrink: 0 }}>{icon}</span>
            <span>
                <span style={{ display: 'block', fontWeight: 600, fontSize: 14 }}>{label}</span>
                <span style={{
                    display: 'block', fontSize: 12, marginTop: 2,
                    color: selected ? 'var(--mp-blue)' : 'var(--text-3)',
                }}>
                    {desc}
                </span>
            </span>
        </button>
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

    const inputStyle = (hasErr) => ({
        width: '100%',
        height: 44,
        padding: '0 14px',
        background: 'white',
        border: `1px solid ${hasErr ? 'var(--error)' : 'var(--border)'}`,
        borderRadius: 12,
        fontSize: 16,
        color: 'var(--text-1)',
        boxSizing: 'border-box',
    });

    return (
        <form onSubmit={submit} noValidate data-testid="step-basics">
            <h1 className="mp-h1" style={{ margin: '0 0 6px', color: 'var(--text-1)' }}>
                Create your event
            </h1>
            <p className="body" style={{ margin: '0 0 32px', color: 'var(--text-2)' }}>
                Start with the basics — you can always update details later.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Title */}
                <Input
                    label="Event title"
                    placeholder="e.g. Moniepoint Merchant Summit 2026"
                    value={data.title}
                    onChange={handle('title')}
                    error={errors.title}
                    aria-label="Event title"
                />

                {/* Category — required by backend CreateEventRequest */}
                <div>
                    <label
                        htmlFor="event-category"
                        style={{
                            display: 'block', fontSize: 14, fontWeight: 500,
                            color: 'var(--text-1)', marginBottom: 6,
                        }}
                    >
                        Category
                    </label>
                    <select
                        id="event-category"
                        value={data.category}
                        onChange={handle('category')}
                        aria-label="Category"
                        style={{
                            width: '100%', height: 44, padding: '0 14px',
                            background: 'var(--surface-elevated)',
                            border: `1px solid ${errors.category ? 'var(--error)' : 'var(--border)'}`,
                            borderRadius: 12, fontSize: 16,
                            color: data.category ? 'var(--text-1)' : 'var(--text-3)',
                            boxSizing: 'border-box', fontFamily: 'inherit',
                        }}
                    >
                        <option value="">Choose a category…</option>
                        {EVENT_CATEGORIES.map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
                    {errors.category && (
                        <span style={{ display: 'block', fontSize: 12, color: 'var(--error)', marginTop: 4 }}>
                            {errors.category}
                        </span>
                    )}
                </div>

                {/* Cover image — required */}
                <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-1)', marginBottom: 6 }}>
                        Cover image
                        <span style={{ marginLeft: 6, fontSize: 12, fontWeight: 400, color: 'var(--error)' }}>
                            Required
                        </span>
                    </div>
                    <CoverImageField
                        onPickFile={(file) => {
                            onChange({ ...data, bannerFile: file });
                            setErrors((prev) => { const { bannerFile: _, ...rest } = prev; return rest; });
                        }}
                    />
                    {errors.bannerFile && (
                        <p role="alert" style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--error)' }}>
                            {errors.bannerFile}
                        </p>
                    )}
                </div>

                {/* Description */}
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

                {/* Venue — optional. Google Places autocomplete with map
                    preview after selection. Falls back to a plain text input
                    when VITE_GOOGLE_MAPS_API_KEY isn't set.

                    Picking a suggestion populates venueName / city / country
                    / placeId / lat / lng off the Place's addressComponents.
                    Manual typing only fills `venue` (display) + `venueName`;
                    city/country are filled with VENUE_DEFAULTS at submit. */}
                <VenueAutocomplete
                    label="Venue (optional)"
                    placeholder="Search for a venue or leave blank to announce later"
                    value={data.venue}
                    onChange={(e) => onChange({
                        ...data,
                        venue: e.target.value,
                        // Keep venueName mirrored to the visible text so manual
                        // typing still flows through. Picking a place fully
                        // overwrites these via onPlaceSelect below.
                        venueName: e.target.value,
                        // Reset structured-place fields if the user edits the
                        // text after picking a suggestion (they no longer match).
                        placeId: '',
                        address: '',
                        latitude: null,
                        longitude: null,
                    })}
                    onPlaceSelect={(p) => onChange({
                        ...data,
                        venue: p.address || p.name || '',
                        venueName: p.name || p.address || '',
                        city: p.city || '',
                        country: p.country || '',
                        placeId: p.placeId || '',
                        address: p.address || '',
                        latitude: p.lat ?? null,
                        longitude: p.lng ?? null,
                    })}
                    error={errors.venue}
                />

                {/* Dates */}
                <div className="mp-date-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                        <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-1)', marginBottom: 6 }}>
                            Start date
                        </label>
                        <input type="date" value={data.startDate} onChange={handle('startDate')} min={today} aria-label="Start date" style={inputStyle(errors.startDate)} />
                        {errors.startDate && <span style={{ display: 'block', fontSize: 12, color: 'var(--error)', marginTop: 4 }}>{errors.startDate}</span>}
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-1)', marginBottom: 6 }}>
                            Start time
                        </label>
                        <input type="time" value={data.startTime} onChange={handle('startTime')} aria-label="Start time" style={inputStyle(errors.startTime)} />
                        {errors.startTime && <span style={{ display: 'block', fontSize: 12, color: 'var(--error)', marginTop: 4 }}>{errors.startTime}</span>}
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-1)', marginBottom: 6 }}>
                            End date
                        </label>
                        <input type="date" value={data.endDate} onChange={handle('endDate')} min={data.startDate || today} aria-label="End date" style={inputStyle(errors.endDate)} />
                        {errors.endDate && <span style={{ display: 'block', fontSize: 12, color: 'var(--error)', marginTop: 4 }}>{errors.endDate}</span>}
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-1)', marginBottom: 6 }}>
                            End time
                        </label>
                        <input type="time" value={data.endTime} onChange={handle('endTime')} aria-label="End time" style={inputStyle(errors.endTime)} />
                        {errors.endTime && <span style={{ display: 'block', fontSize: 12, color: 'var(--error)', marginTop: 4 }}>{errors.endTime}</span>}
                    </div>
                </div>

                {/* Visibility */}
                <div>
                    <span style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-1)', marginBottom: 8 }}>
                        Visibility
                    </span>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <ToggleCard
                            selected={data.visibility === 'PUBLIC'}
                            onClick={() => onChange({ ...data, visibility: 'PUBLIC' })}
                            icon={<Icons.users size={15} />}
                            label="Public"
                            desc="Anyone can discover and register"
                        />
                        <ToggleCard
                            selected={data.visibility === 'PRIVATE'}
                            onClick={() => onChange({ ...data, visibility: 'PRIVATE' })}
                            icon={<Icons.lock size={15} />}
                            label="Private"
                            desc="Invite-only — not listed publicly"
                        />
                    </div>
                </div>

                {/* Seating model — drives whether the next step asks for
                    rows×seats or just a total capacity. */}
                <div>
                    <span style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-1)', marginBottom: 8 }}>
                        Seating
                    </span>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <ToggleCard
                            selected={data.seatingMode === SEATING_MODES.SEATED}
                            onClick={() => onChange({ ...data, seatingMode: SEATING_MODES.SEATED })}
                            icon={<Icons.grid size={15} />}
                            label="Seated"
                            desc="Assigned seats with rows & seat numbers"
                        />
                        <ToggleCard
                            selected={data.seatingMode === SEATING_MODES.GENERAL}
                            onClick={() => onChange({ ...data, seatingMode: SEATING_MODES.GENERAL })}
                            icon={<Icons.users size={15} />}
                            label="General admission"
                            desc="No assigned seats — just a total capacity"
                        />
                    </div>
                </div>

                {/* Pricing */}
                <div>
                    <span style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-1)', marginBottom: 8 }}>
                        Pricing
                    </span>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <ToggleCard
                            selected={data.isFree === true}
                            onClick={() => onChange({ ...data, isFree: true })}
                            icon={<Icons.check size={15} />}
                            label="Free"
                            desc="No ticket cost for attendees"
                        />
                        <ToggleCard
                            selected={data.isFree === false}
                            onClick={() => onChange({ ...data, isFree: false })}
                            icon={<Icons.wallet size={15} />}
                            label="Paid"
                            desc="Set ticket prices in the next step"
                        />
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
    const capacity = tierCapacity(tier);
    const isGA = tier.seatingMode === SEATING_MODES.GENERAL;

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

            {isGA ? (
                // General admission — one capacity number, no row/seat layout.
                <Input
                    label="Total tickets"
                    type="number"
                    min="1"
                    value={tier.capacity}
                    onChange={handle('capacity')}
                    error={errors.capacity}
                    aria-label="Total tickets"
                />
            ) : (
                <div className="mp-tier-seats-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
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
            )}

            {capacity > 0 && (
                <p style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--text-2)' }}>
                    <Icons.users size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    <strong>{capacity.toLocaleString()}</strong> {isGA ? 'tickets total' : 'seats total'}
                </p>
            )}
        </div>
    );
}

/* ── Step 2: Ticket tiers ────────────────────────── */
function TiersStep({ tiers, onTiersChange, onNext, onBack, seatingMode }) {
    const [tierErrors, setTierErrors] = useState({});

    // Keep each tier's seatingMode in lockstep with the event-level choice —
    // organisers who toggle the basics step (e.g. flipped from Seated to GA
    // after looking at tiers) shouldn't end up with mixed-mode tiers.
    useEffect(() => {
        const needsSync = tiers.some((t) => t.seatingMode !== seatingMode);
        if (needsSync) {
            onTiersChange(tiers.map((t) => ({ ...t, seatingMode })));
        }
        // We deliberately only depend on seatingMode — re-running on every
        // tier edit would cause an infinite update loop.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [seatingMode]);

    function addTier() {
        // Inherit the event-level seating mode so the new row renders the
        // right inputs without an extra click.
        onTiersChange([...tiers, newTier(seatingMode)]);
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

    const isGA = seatingMode === SEATING_MODES.GENERAL;

    return (
        <form onSubmit={submit} noValidate data-testid="step-tiers">
            <h2 className="mp-h1" style={{ margin: '0 0 6px', color: 'var(--text-1)' }}>
                Set up your tickets
            </h2>
            <p className="body" style={{ margin: '0 0 28px', color: 'var(--text-2)' }}>
                {isGA
                    ? 'Define ticket tiers and how many tickets each tier sells.'
                    : 'Define seating tiers and capacity. You can add up to several tiers.'}
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
    const bannerPreview = basics.bannerFile ? URL.createObjectURL(basics.bannerFile) : null;
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

    const totalSeats = tiers.reduce((sum, t) => sum + tierCapacity(t), 0);
    const expectedRevenue = tiers.reduce((sum, t) => {
        if (t.isFree) return sum;
        return sum + tierCapacity(t) * (parseFloat(t.price) || 0);
    }, 0);
    const allFree = tiers.length > 0 && tiers.every(t => t.isFree);
    const isGA = tiers.length > 0 && tiers.every(t => t.seatingMode === SEATING_MODES.GENERAL);

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
                overflow: 'hidden',
                marginBottom: 16,
                boxShadow: 'var(--shadow-card)',
            }}>
                {bannerPreview && (
                    <div style={{ aspectRatio: '16 / 6', overflow: 'hidden', background: 'var(--surface-subtle)' }}>
                        <img
                            src={bannerPreview}
                            alt="Event cover"
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                    </div>
                )}
                <div style={{ padding: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                        <h3 className="mp-h3" style={{ margin: 0, color: 'var(--text-1)', flex: 1 }}>
                            {basics.title || 'Untitled event'}
                        </h3>
                        {/* Visibility badge */}
                        <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 99,
                            background: basics.visibility === 'PRIVATE' ? 'var(--surface-subtle)' : '#eff6ff',
                            color: basics.visibility === 'PRIVATE' ? 'var(--text-2)' : 'var(--mp-blue)',
                            border: '1px solid var(--border)',
                        }}>
                            {basics.visibility === 'PRIVATE'
                                ? <><Icons.lock size={11} /> Private</>
                                : <><Icons.users size={11} /> Public</>}
                        </span>
                        {/* Pricing badge */}
                        <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 99,
                            background: basics.isFree ? '#f0fdf4' : '#fff7ed',
                            color: basics.isFree ? '#16a34a' : '#ea580c',
                            border: '1px solid var(--border)',
                        }}>
                            {basics.isFree ? <><Icons.check size={11} /> Free</> : <><Icons.wallet size={11} /> Paid</>}
                        </span>
                    </div>
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
                        const cap = tierCapacity(tier);
                        const unit = tier.seatingMode === SEATING_MODES.GENERAL ? 'tickets' : 'seats';
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
                                        {cap > 0 ? `${cap.toLocaleString()} ${unit}` : 'Capacity TBD'}
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
                <div className="mp-grid-stack" style={{
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

            <div className="mp-actions-row" style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <Button type="button" variant="secondary" size="lg" icon={<Icons.arrowL size={16} />} onClick={onBack} disabled={submitting}>
                    Back
                </Button>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
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
                <Button variant="primary" size="lg" onClick={() => navigate('/my-events')}>
                    Go to my events
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
        category: '',          // required, EventCategory enum
        // Location — venue is one logical concept in the UI but the backend
        // wants venueName + city + country (+ optional address/placeId/lat/lng).
        // The VenueAutocomplete fills these in via onPlaceSelect; manual typing
        // populates only venueName and falls back to VENUE_DEFAULTS for the rest.
        venue: '',             // free-text display value (driven by autocomplete)
        venueName: '',
        city: '',
        country: '',
        placeId: '',
        address: '',
        latitude: null,
        longitude: null,
        // Schedule
        startDate: '',
        startTime: '',
        endDate: '',
        endTime: '',
        timezone: detectTimezone(),
        bannerFile: null,
        visibility: 'PUBLIC',
        isFree: true,
        // Default to seated so existing organisers using assigned-seating
        // venues get the familiar layout.
        seatingMode: SEATING_MODES.SEATED,
    });
    const [tiers, setTiers] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const [createEvent] = useCreateEventMutation();
    const [submitEvent] = useSubmitEventMutation();
    const [presignCover] = usePresignCoverImageMutation();
    const [createTier] = useCreateTierMutation();

    async function createEventSequence(shouldSubmit) {
        setSubmitting(true);
        setError('');
        try {
            // ── 1. Build the event payload to match CreateEventRequest on the
            //       running backend (event-nest-backend): category, venueName,
            //       city, country, timezone are required; tiers are NOT inline
            //       on this backend — they're posted to /events/{id}/tiers in
            //       a separate loop below.
            const venueName  = (basics.venueName || basics.venue || '').trim() || VENUE_DEFAULTS.venueName;
            const city       = (basics.city    || '').trim() || VENUE_DEFAULTS.city;
            const country    = (basics.country || '').trim() || VENUE_DEFAULTS.country;

            const payload = {
                title:     basics.title.trim(),
                category:  basics.category,
                venueName,
                city,
                country,
                timezone:  basics.timezone || detectTimezone(),
                startTime: toISO(basics.startDate, basics.startTime),
                endTime:   toISO(basics.endDate, basics.endTime),
                visibility: basics.visibility,
            };
            if (basics.description.trim())   payload.description = basics.description.trim();
            if (basics.address?.trim())      payload.address     = basics.address.trim();
            if (basics.placeId?.trim())      payload.placeId     = basics.placeId.trim();
            if (Number.isFinite(basics.latitude))  payload.latitude  = basics.latitude;
            if (Number.isFinite(basics.longitude)) payload.longitude = basics.longitude;

            const event = await createEvent(payload).unwrap();

            // ── 2. Upload cover image (if any) via presigned PUT.
            if (basics.bannerFile) {
                const { uploadUrl } = await presignCover({
                    eventId: event.id,
                    contentType: basics.bannerFile.type,
                }).unwrap();
                await fetch(uploadUrl, {
                    method: 'PUT',
                    headers: { 'Content-Type': basics.bannerFile.type },
                    body: basics.bannerFile,
                });
            }

            // ── 3. Create each tier separately. Backend CreateTierRequest:
            //       - price is Long in kobo (₦ × 100, rounded to int)
            //       - seatType picks the layout (GENERAL_ADMISSION vs NUMBERED)
            //       - accessScope FULL_EVENT means the ticket is valid every day
            //       Invalid tiers (missing name etc.) were already screened by
            //       validateTier when the user advanced past step 2.
            for (const t of tiers) {
                const tierPayload = buildTierPayload(t);
                if (!tierPayload) continue;
                await createTier({ eventId: event.id, ...tierPayload }).unwrap();
            }

            // ── 4. Optionally submit for admin approval (DRAFT → PENDING).
            if (shouldSubmit) {
                await submitEvent(event.id).unwrap();
                setSubmitted(true);
            }

            setStep(4);
        } catch (err) {
            // Backend's exception handler returns
            //   { success: false, message: "validation failed", errors: ["field: msg", ...] }
            // for @Valid failures — surface those field-level messages so the
            // organiser can fix the actual problem instead of just seeing
            // "validation failed".
            const data = err?.data || {};
            const fieldErrors = Array.isArray(data.errors) ? data.errors : [];
            const base = data.message || 'Something went wrong. Please try again.';
            setError(fieldErrors.length
                ? `${base}: ${fieldErrors.join('; ')}`
                : base);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px 80px' }}>
                {step < 4 && <StepIndicator currentStep={step} />}
                {step === 1 && (
                    <BasicsStep data={basics} onChange={setBasics} onNext={() => setStep(2)} />
                )}
                {step === 2 && (
                    <TiersStep
                        tiers={tiers}
                        onTiersChange={setTiers}
                        onNext={() => setStep(3)}
                        onBack={() => setStep(1)}
                        seatingMode={basics.seatingMode}
                    />
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
