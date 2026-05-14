import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import {
    useGetEventTiersQuery,
    useUpdateEventMutation,
    useSubmitEventMutation,
} from '../eventsApi';
import { useGetOrganizerEventByIdQuery } from '@/features/organiser/organizerApi';
import { useCreateTierMutation, useUpdateTierMutation, useDeleteTierMutation } from '../tiersApi';
import CoverImageField from '../components/CoverImageField';
import TopNav from '@/components/ui/TopNav';
import Button from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { Icons } from '@/components/ui/Icon';

/* ── Locked field ────────────────────────────────── */
function LockedField({ label, value, icon }) {
    return (
        <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-1)', marginBottom: 6 }}>
                {label}
            </div>
            <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                height: 44, padding: '0 14px',
                background: 'var(--surface-subtle)',
                border: '1px solid var(--border)',
                borderRadius: 12, fontSize: 15, color: 'var(--text-3)',
            }}>
                <Icons.lock size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                {icon && <span style={{ color: 'var(--text-3)' }}>{icon}</span>}
                {value}
            </div>
        </div>
    );
}

/* ── Tier row (published — edit name/price only) ─── */
function PublishedTierRow({ tier, eventId, isLast }) {
    const sold = (tier.totalCapacity ?? 0) - (tier.availableCapacity ?? 0);
    const hasSales = sold > 0;
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(tier.name);
    const [isFree, setIsFree] = useState(Number(tier.price) === 0);
    const [price, setPrice] = useState(String(tier.price));
    const [updateTier, { isLoading }] = useUpdateTierMutation();
    const [error, setError] = useState('');

    async function save() {
        const finalPrice = isFree ? 0 : parseFloat(price);
        if (!name.trim()) { setError('Name is required'); return; }
        if (!isFree && (isNaN(finalPrice) || finalPrice < 0)) { setError('Enter a valid price'); return; }
        try {
            await updateTier({ eventId, tierId: tier.id, name: name.trim(), price: finalPrice }).unwrap();
            setEditing(false);
            setError('');
        } catch (err) {
            setError(err?.data?.message || 'Could not save changes.');
        }
    }

    function cancel() {
        setName(tier.name);
        setIsFree(Number(tier.price) === 0);
        setPrice(String(tier.price));
        setEditing(false);
        setError('');
    }

    return (
        <div style={{ borderBottom: isLast ? 0 : '1px solid var(--border)' }}>
            <div style={{
                padding: '16px 20px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16,
            }}>
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>{tier.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 3, display: 'flex', gap: 16 }}>
                        <span>{Number(tier.price) === 0 ? 'Free' : `₦${Number(tier.price).toLocaleString()}`}</span>
                        <span>{tier.totalCapacity?.toLocaleString()} seats</span>
                        {hasSales && (
                            <span style={{ color: 'var(--text-3)' }}>{sold} sold</span>
                        )}
                    </div>
                </div>

                <div
                    title={hasSales ? `${sold} ticket${sold > 1 ? 's' : ''} sold — this tier cannot be edited` : undefined}
                    style={{ opacity: hasSales ? 0.3 : 1, pointerEvents: hasSales ? 'none' : 'auto' }}
                >
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setEditing((e) => !e)}
                        disabled={hasSales}
                    >
                        {editing ? 'Cancel edit' : 'Edit'}
                    </Button>
                </div>
            </div>

            {hasSales && (
                <div style={{ padding: '0 20px 12px', fontSize: 12, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icons.lock size={12} /> {sold} booking{sold > 1 ? 's' : ''} — tier is locked
                </div>
            )}

            {editing && !hasSales && (
                <div style={{ margin: '0 20px 16px', padding: 16, background: 'var(--surface-subtle)', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-1)', marginBottom: 4 }}>Tier name</label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            style={{
                                width: '100%', height: 38, padding: '0 12px',
                                background: 'white', border: '1px solid var(--border)',
                                borderRadius: 8, fontSize: 14, color: 'var(--text-1)', boxSizing: 'border-box',
                            }}
                        />
                    </div>
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)', marginBottom: 6 }}>Pricing</div>
                        <div style={{ display: 'flex', gap: 8, marginBottom: isFree ? 0 : 8 }}>
                            {['Free', 'Paid'].map((opt) => {
                                const sel = opt === 'Free' ? isFree : !isFree;
                                return (
                                    <button key={opt} type="button" onClick={() => { setIsFree(opt === 'Free'); setPrice(''); }}
                                        style={{
                                            height: 32, padding: '0 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500,
                                            border: `1px solid ${sel ? 'var(--mp-blue)' : 'var(--border)'}`,
                                            background: sel ? 'var(--mp-blue)' : 'white',
                                            color: sel ? 'white' : 'var(--text-2)',
                                        }}>{opt}</button>
                                );
                            })}
                        </div>
                        {!isFree && (
                            <input
                                type="number"
                                min="0"
                                placeholder="Price in ₦"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                style={{
                                    width: '100%', height: 38, padding: '0 12px',
                                    background: 'white', border: '1px solid var(--border)',
                                    borderRadius: 8, fontSize: 14, color: 'var(--text-1)', boxSizing: 'border-box',
                                }}
                            />
                        )}
                    </div>
                    {error && <p style={{ margin: 0, fontSize: 12, color: 'var(--error)' }}>{error}</p>}
                    <div style={{ display: 'flex', gap: 8 }}>
                        <Button size="sm" variant="primary" onClick={save} disabled={isLoading}>
                            {isLoading ? 'Saving…' : 'Save tier'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={cancel} disabled={isLoading}>Cancel</Button>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ── Draft tier card (full edit) ─────────────────── */
function DraftTierCard({ tier, eventId, onDelete, isLast }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState({
        name: tier.name,
        isFree: Number(tier.price) === 0,
        price: String(tier.price),
        rowCount: String(tier.rowCount ?? tier.rowPrefix ?? ''),
        seatsPerRow: String(tier.seatsPerRow ?? ''),
        rowPrefix: tier.rowPrefix ?? '',
    });
    const [updateTier, { isLoading: saving }] = useUpdateTierMutation();
    const [deleteTier, { isLoading: deleting }] = useDeleteTierMutation();
    const [error, setError] = useState('');

    function field(key) {
        return (e) => setDraft((d) => ({ ...d, [key]: e.target.value }));
    }

    async function save() {
        if (!draft.name.trim() || !draft.rowPrefix.trim()) { setError('Name and row prefix are required'); return; }
        const rc = parseInt(draft.rowCount, 10);
        const spr = parseInt(draft.seatsPerRow, 10);
        if (isNaN(rc) || rc < 1 || isNaN(spr) || spr < 1) { setError('Rows and seats per row must be at least 1'); return; }
        const finalPrice = draft.isFree ? 0 : parseFloat(draft.price) || 0;
        try {
            await updateTier({ eventId, tierId: tier.id, name: draft.name.trim(), price: finalPrice, rowPrefix: draft.rowPrefix.trim(), rowCount: rc, seatsPerRow: spr }).unwrap();
            setEditing(false);
            setError('');
        } catch (err) {
            setError(err?.data?.message || 'Could not save changes.');
        }
    }

    async function remove() {
        try { await deleteTier({ eventId, tierId: tier.id }).unwrap(); }
        catch { /* optimistic — parent will refetch */ }
    }

    const capacity = (parseInt(draft.rowCount) || 0) * (parseInt(draft.seatsPerRow) || 0);

    return (
        <div style={{
            background: 'white', border: '1px solid var(--border)',
            borderRadius: 12, overflow: 'hidden',
            marginBottom: isLast ? 0 : 10,
        }}>
            <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>{tier.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
                        {Number(tier.price) === 0 ? 'Free' : `₦${Number(tier.price).toLocaleString()}`} · {(tier.totalCapacity ?? 0).toLocaleString()} seats
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <Button size="sm" variant="secondary" onClick={() => setEditing((e) => !e)}>
                        {editing ? 'Cancel' : 'Edit'}
                    </Button>
                    <button
                        onClick={remove}
                        disabled={deleting}
                        aria-label="Delete tier"
                        style={{
                            width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)',
                            background: 'white', cursor: 'pointer', display: 'grid', placeItems: 'center',
                            color: 'var(--error)',
                        }}
                    >
                        <Icons.x size={14} />
                    </button>
                </div>
            </div>

            {editing && (
                <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="mp-grid-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-1)', marginBottom: 4 }}>Name</label>
                            <input value={draft.name} onChange={field('name')} style={inputStyle} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-1)', marginBottom: 4 }}>Row prefix</label>
                            <input value={draft.rowPrefix} onChange={field('rowPrefix')} placeholder="e.g. VIP" style={inputStyle} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-1)', marginBottom: 4 }}>Rows</label>
                            <input type="number" min="1" value={draft.rowCount} onChange={field('rowCount')} style={inputStyle} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-1)', marginBottom: 4 }}>Seats / row</label>
                            <input type="number" min="1" value={draft.seatsPerRow} onChange={field('seatsPerRow')} style={inputStyle} />
                        </div>
                    </div>

                    <div>
                        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-1)', marginBottom: 6 }}>Pricing</div>
                        <div style={{ display: 'flex', gap: 8, marginBottom: draft.isFree ? 0 : 8 }}>
                            {['Free', 'Paid'].map((opt) => {
                                const sel = opt === 'Free' ? draft.isFree : !draft.isFree;
                                return (
                                    <button key={opt} type="button" onClick={() => setDraft((d) => ({ ...d, isFree: opt === 'Free', price: '' }))}
                                        style={{
                                            height: 30, padding: '0 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500,
                                            border: `1px solid ${sel ? 'var(--mp-blue)' : 'var(--border)'}`,
                                            background: sel ? 'var(--mp-blue)' : 'white',
                                            color: sel ? 'white' : 'var(--text-2)',
                                        }}>{opt}</button>
                                );
                            })}
                        </div>
                        {!draft.isFree && (
                            <input type="number" min="0" placeholder="₦" value={draft.price} onChange={field('price')} style={inputStyle} />
                        )}
                    </div>

                    {capacity > 0 && (
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)' }}>
                            {capacity.toLocaleString()} total seats
                        </p>
                    )}
                    {error && <p style={{ margin: 0, fontSize: 12, color: 'var(--error)' }}>{error}</p>}
                    <Button size="sm" variant="primary" onClick={save} disabled={saving} style={{ alignSelf: 'flex-start' }}>
                        {saving ? 'Saving…' : 'Save tier'}
                    </Button>
                </div>
            )}
        </div>
    );
}

const inputStyle = {
    width: '100%', height: 36, padding: '0 10px',
    background: 'white', border: '1px solid var(--border)',
    borderRadius: 8, fontSize: 13, color: 'var(--text-1)', boxSizing: 'border-box',
};

/* ── Page ────────────────────────────────────────── */
export default function EditEventPage() {
    const { id: eventId } = useParams();
    const navigate = useNavigate();

    const eventQuery = useGetOrganizerEventByIdQuery(eventId);
    const tiersQuery = useGetEventTiersQuery(eventId);
    const [updateEvent, updateState] = useUpdateEventMutation();
    const [submitEvent, submitState] = useSubmitEventMutation();
    const [createTier, createTierState] = useCreateTierMutation();

    const event = eventQuery.data;
    const tiers = tiersQuery.data ?? [];
    const isPublished = event?.status === 'PUBLISHED';
    const isDraft = event?.status === 'DRAFT' || event?.status === 'PENDING_APPROVAL';

    const [description, setDescription] = useState('');
    const [title, setTitle] = useState('');
    const [venue, setVenue] = useState('');
    const [startDate, setStartDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endDate, setEndDate] = useState('');
    const [endTime, setEndTime] = useState('');
    const [formError, setFormError] = useState('');
    const [saved, setSaved] = useState(false);
    const [showAddTier, setShowAddTier] = useState(false);

    useEffect(() => {
        if (!event) return;
        // Pre-fill with pending proposed changes if any, so organiser edits the latest draft
        const pending = event.pendingUpdate?.status === 'PENDING' || event.pendingUpdate?.status === 'REJECTED'
            ? event.pendingUpdate.proposedChanges
            : null;
        setDescription(pending?.description ?? event.description ?? '');
        setTitle(pending?.title ?? event.title ?? '');
        setVenue(pending?.venue ?? event.venue ?? '');
        if (event.startTime) {
            const [d, t] = event.startTime.split('T');
            setStartDate(d ?? '');
            setStartTime((t ?? '').slice(0, 5));
        }
        if (event.endTime) {
            const [d, t] = event.endTime.split('T');
            setEndDate(d ?? '');
            setEndTime((t ?? '').slice(0, 5));
        }
    }, [event]);

    async function handleSave() {
        setFormError('');
        setSaved(false);

        const updates = { id: eventId, description };
        if (isDraft) {
            if (!title.trim()) { setFormError('Title is required'); return; }
            if (!venue.trim()) { setFormError('Venue is required'); return; }
            updates.title = title.trim();
            updates.venue = venue.trim();
            if (startDate && startTime) updates.startTime = `${startDate}T${startTime}:00`;
            if (endDate && endTime) updates.endTime = `${endDate}T${endTime}:00`;
        }

        try {
            await updateEvent(updates).unwrap();
            setSaved(true);
            setTimeout(() => setSaved(false), 4000);
        } catch (err) {
            setFormError(err?.data?.message || 'Could not save changes. Please try again.');
        }
    }

    async function handleSaveAndSubmit() {
        await handleSave();
        try {
            await submitEvent(eventId).unwrap();
            navigate(`/organiser/events/${eventId}`);
        } catch (err) {
            setFormError(err?.data?.message || 'Could not submit. Please try again.');
        }
    }

    const today = new Date().toISOString().split('T')[0];
    const submitting = updateState.isLoading || submitState.isLoading;
    const pendingUpdate = event?.pendingUpdate ?? null;

    if (eventQuery.isLoading) {
        return (
            <Shell>
                <div style={{ height: 400, background: 'white', border: '1px solid var(--border)', borderRadius: 12, animation: 'mp-flash 1.6s ease-in-out infinite' }} />
            </Shell>
        );
    }

    if (eventQuery.isError || !event) {
        return (
            <Shell>
                <div style={{ textAlign: 'center', padding: 48 }}>
                    <Icons.alert size={32} style={{ color: 'var(--error)' }} />
                    <p className="mp-h3" style={{ margin: '12px 0 16px', color: 'var(--text-1)' }}>Event not found</p>
                    <Button variant="secondary" onClick={() => navigate('/organiser')}>Back to console</Button>
                </div>
            </Shell>
        );
    }

    return (
        <Shell>
            <Link
                to={`/organiser/events/${eventId}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-2)', fontSize: 14, textDecoration: 'none', marginBottom: 24 }}
            >
                <Icons.arrowL size={16} /> Back to event
            </Link>

            {/* Page header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <StatusBadge status={event.status} />
                <h1 className="mp-h2" style={{ margin: 0, color: 'var(--text-1)' }}>Edit event</h1>
            </div>

            {/* Published — rules banner */}
            {isPublished && (
                <div style={{
                    display: 'flex', gap: 12, padding: '14px 18px',
                    background: '#EFF6FF', border: '1px solid #BFDBFE',
                    borderRadius: 12, marginBottom: 20, fontSize: 14, color: '#1E40AF',
                }}>
                    <Icons.shield size={18} style={{ flexShrink: 0, marginTop: 1, color: '#3B82F6' }} />
                    <div>
                        <strong>Editing a live event</strong>
                        <ul style={{ margin: '6px 0 0', paddingLeft: 18, lineHeight: 1.7 }}>
                            <li>Only the <strong>description</strong> and <strong>unsold tiers</strong> can be edited.</li>
                            <li><strong>Name</strong> and <strong>venue</strong> are locked.</li>
                            <li>All changes are subject to admin approval. The current live version remains unchanged until approved.</li>
                        </ul>
                    </div>
                </div>
            )}

            {/* Pending update status */}
            {pendingUpdate?.status === 'PENDING' && (
                <div style={{
                    display: 'flex', gap: 12, padding: '14px 18px', marginBottom: 16,
                    background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, fontSize: 14, color: '#1E40AF',
                }}>
                    <Icons.clock size={17} style={{ color: '#3B82F6', flexShrink: 0, marginTop: 1 }} />
                    <div>
                        <strong>You have an edit pending admin review</strong>
                        <div style={{ marginTop: 3, fontSize: 13, color: '#1D4ED8' }}>
                            The form is pre-filled with your pending proposed changes. Submitting again will replace the previous request.
                        </div>
                    </div>
                </div>
            )}
            {pendingUpdate?.status === 'REJECTED' && (
                <div style={{
                    display: 'flex', gap: 12, padding: '14px 18px', marginBottom: 16,
                    background: 'var(--error-bg)', border: '1px solid var(--error)', borderRadius: 12, fontSize: 14,
                }}>
                    <Icons.alert size={17} style={{ color: 'var(--error)', flexShrink: 0, marginTop: 1 }} />
                    <div>
                        <strong style={{ color: 'var(--error)' }}>Previous edit rejected — </strong>
                        <span style={{ color: 'var(--text-1)' }}>{pendingUpdate.rejectionReason}</span>
                        <div style={{ marginTop: 4, fontSize: 13, color: 'var(--text-2)' }}>
                            The form is pre-filled with your rejected draft. Revise and resubmit.
                        </div>
                    </div>
                </div>
            )}

            {/* Error / success */}
            {formError && (
                <div role="alert" style={{ marginBottom: 16, padding: '10px 16px', background: 'var(--error-bg)', color: 'var(--error)', borderRadius: 10, fontSize: 14 }}>
                    {formError}
                </div>
            )}
            {saved && (
                <div style={{ marginBottom: 16, padding: '10px 16px', background: 'var(--success-bg)', color: 'var(--success)', borderRadius: 10, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icons.check size={15} /> Changes saved.{isPublished ? ' Submitted for admin review — the live version is unchanged.' : ''}
                </div>
            )}

            {/* Main form card */}
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 16, padding: 28, marginBottom: 20, boxShadow: 'var(--shadow-card)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                    {/* Title */}
                    {isPublished ? (
                        <LockedField label="Event title" value={event.title} />
                    ) : (
                        <Field label="Event title" value={title} onChange={setTitle} placeholder="e.g. Tech Summit 2026" />
                    )}

                    {/* Venue */}
                    {isPublished ? (
                        <LockedField label="Venue" value={event.venue} icon={<Icons.pin size={14} />} />
                    ) : (
                        <Field label="Venue" value={venue} onChange={setVenue} placeholder="e.g. Eko Convention Centre, Lagos" />
                    )}

                    {/* Description — always editable */}
                    <div>
                        <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-1)', marginBottom: 6 }}>
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Tell attendees what to expect…"
                            style={{
                                width: '100%', minHeight: 120, padding: '10px 14px',
                                background: 'white', border: '1px solid var(--border)',
                                borderRadius: 12, fontSize: 15, color: 'var(--text-1)',
                                resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box',
                            }}
                        />
                    </div>

                    {/* Cover image — optional; uploads independently of the
                        rest of the form via the /cover-image endpoint. */}
                    <CoverImageField
                        eventId={event.id}
                        currentUrl={event.coverImageUrl}
                    />

                    {/* Dates (draft only) */}
                    {isDraft && (
                        <div className="mp-grid-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                            <DateField label="Start date" type="date" value={startDate} onChange={setStartDate} min={today} />
                            <DateField label="Start time" type="time" value={startTime} onChange={setStartTime} />
                            <DateField label="End date" type="date" value={endDate} onChange={setEndDate} min={startDate || today} />
                            <DateField label="End time" type="time" value={endTime} onChange={setEndTime} />
                        </div>
                    )}

                    {/* Dates (published — locked) */}
                    {isPublished && (
                        <div className="mp-grid-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                            <LockedField label="Start" value={event.startTime ? new Date(event.startTime).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'} icon={<Icons.calendar size={14} />} />
                            <LockedField label="End" value={event.endTime ? new Date(event.endTime).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'} />
                        </div>
                    )}
                </div>
            </div>

            {/* Tiers */}
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', marginBottom: 24, boxShadow: 'var(--shadow-card)' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 14 }}>Ticket tiers</span>
                    {isDraft && (
                        <Button size="sm" variant="secondary" icon={<Icons.plus size={13} />} onClick={() => setShowAddTier((s) => !s)}>
                            Add tier
                        </Button>
                    )}
                </div>

                {tiers.length === 0 && !showAddTier && (
                    <div style={{ padding: 32, textAlign: 'center', fontSize: 14, color: 'var(--text-3)' }}>
                        No tiers yet.
                    </div>
                )}

                {isPublished && tiers.map((tier, i) => (
                    <PublishedTierRow key={tier.id} tier={tier} eventId={eventId} isLast={i === tiers.length - 1 && !showAddTier} />
                ))}

                {isDraft && (
                    <div style={{ padding: tiers.length > 0 ? 16 : '16px 16px 0' }}>
                        {tiers.map((tier, i) => (
                            <DraftTierCard key={tier.id} tier={tier} eventId={eventId} isLast={i === tiers.length - 1} />
                        ))}
                    </div>
                )}

                {showAddTier && isDraft && (
                    <AddTierForm eventId={eventId} onDone={() => setShowAddTier(false)} />
                )}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <Button variant="secondary" size="lg" onClick={() => navigate(`/organiser/events/${eventId}`)} disabled={submitting}>
                    Cancel
                </Button>
                <Button variant="primary" size="lg" onClick={handleSave} disabled={submitting}>
                    {updateState.isLoading ? 'Saving…' : isPublished ? 'Submit for review' : 'Save draft'}
                </Button>
                {isDraft && (
                    <Button variant="primary" size="lg" iconRight={<Icons.arrowR size={15} />} onClick={handleSaveAndSubmit} disabled={submitting}>
                        {submitting ? 'Submitting…' : 'Save & submit for approval'}
                    </Button>
                )}
            </div>
        </Shell>
    );
}

/* ── Add tier inline form (draft only) ───────────── */
function AddTierForm({ eventId, onDone }) {
    const [createTier, { isLoading }] = useCreateTierMutation();
    const [form, setForm] = useState({ name: '', isFree: true, price: '', rowPrefix: '', rowCount: '10', seatsPerRow: '10' });
    const [error, setError] = useState('');

    function field(key) { return (e) => setForm((f) => ({ ...f, [key]: e.target.value })); }

    async function submit(e) {
        e.preventDefault();
        if (!form.name.trim() || !form.rowPrefix.trim()) { setError('Name and row prefix are required'); return; }
        const rc = parseInt(form.rowCount, 10);
        const spr = parseInt(form.seatsPerRow, 10);
        if (isNaN(rc) || rc < 1 || isNaN(spr) || spr < 1) { setError('Rows and seats per row must be at least 1'); return; }
        const price = form.isFree ? 0 : parseFloat(form.price) || 0;
        try {
            await createTier({ eventId, name: form.name.trim(), price, rowPrefix: form.rowPrefix.trim(), rowCount: rc, seatsPerRow: spr }).unwrap();
            onDone();
        } catch (err) {
            setError(err?.data?.message || 'Could not add tier.');
        }
    }

    return (
        <form onSubmit={submit} style={{ margin: '0 16px 16px', padding: 16, background: 'var(--surface-subtle)', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 12, border: '1px dashed var(--border)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>New tier</div>
            <div className="mp-grid-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-1)', marginBottom: 4 }}>Name</label>
                    <input value={form.name} onChange={field('name')} placeholder="e.g. VIP" style={inputStyle} />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-1)', marginBottom: 4 }}>Row prefix</label>
                    <input value={form.rowPrefix} onChange={field('rowPrefix')} placeholder="e.g. V" style={inputStyle} />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-1)', marginBottom: 4 }}>Rows</label>
                    <input type="number" min="1" value={form.rowCount} onChange={field('rowCount')} style={inputStyle} />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-1)', marginBottom: 4 }}>Seats / row</label>
                    <input type="number" min="1" value={form.seatsPerRow} onChange={field('seatsPerRow')} style={inputStyle} />
                </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: form.isFree ? 0 : 8 }}>
                {['Free', 'Paid'].map((opt) => {
                    const sel = opt === 'Free' ? form.isFree : !form.isFree;
                    return (
                        <button key={opt} type="button" onClick={() => setForm((f) => ({ ...f, isFree: opt === 'Free', price: '' }))}
                            style={{
                                height: 30, padding: '0 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500,
                                border: `1px solid ${sel ? 'var(--mp-blue)' : 'var(--border)'}`,
                                background: sel ? 'var(--mp-blue)' : 'white',
                                color: sel ? 'white' : 'var(--text-2)',
                            }}>{opt}</button>
                    );
                })}
            </div>
            {!form.isFree && (
                <input type="number" min="0" placeholder="Price in ₦" value={form.price} onChange={field('price')} style={inputStyle} />
            )}
            {error && <p style={{ margin: 0, fontSize: 12, color: 'var(--error)' }}>{error}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
                <Button type="submit" size="sm" variant="primary" disabled={isLoading}>
                    {isLoading ? 'Adding…' : 'Add tier'}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={onDone}>Cancel</Button>
            </div>
        </form>
    );
}

/* ── Simple helpers ──────────────────────────────── */
function Shell({ children }) {
    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            <TopNav />
            <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px 80px' }}>
                {children}
            </div>
        </div>
    );
}

function Field({ label, value, onChange, placeholder }) {
    return (
        <div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-1)', marginBottom: 6 }}>{label}</label>
            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                style={{
                    width: '100%', height: 44, padding: '0 14px',
                    background: 'white', border: '1px solid var(--border)',
                    borderRadius: 12, fontSize: 15, color: 'var(--text-1)', boxSizing: 'border-box',
                }}
            />
        </div>
    );
}

function DateField({ label, type, value, onChange, min }) {
    return (
        <div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-1)', marginBottom: 6 }}>{label}</label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                min={min}
                style={{
                    width: '100%', height: 44, padding: '0 14px',
                    background: 'white', border: '1px solid var(--border)',
                    borderRadius: 12, fontSize: 15, color: 'var(--text-1)', boxSizing: 'border-box',
                }}
            />
        </div>
    );
}
