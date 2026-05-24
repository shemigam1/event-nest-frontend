import { useState } from 'react';
import {
    useGetGuestsQuery,
    useAddGuestMutation,
    useUpdateGuestStatusMutation,
    useRemoveGuestMutation,
} from '../guestsApi';
import { useUpdateEventConfigMutation } from '@/features/events/eventsApi';
import Button from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icon';
import CsvImportModal from '@/components/ui/CsvImportModal';

/* Column schema for the CSV/Excel guest import. Order matters — the importer
   maps file column 1 → fields[0], column 2 → fields[1], etc. Keep the
   required columns first so the disclaimer "Column order: name, email"
   matches reality. */
const GUEST_IMPORT_FIELDS = [
    { key: 'name',  label: 'Name',  required: true },
    { key: 'email', label: 'Email', required: true },
    { key: 'phone', label: 'Phone (optional)', required: false },
    { key: 'note',  label: 'Note (optional)',  required: false },
];

const RSVP_STYLE = {
    PENDING:  { bg: '#FEF4E2', fg: '#B8770A', label: 'Pending' },
    ACCEPTED: { bg: '#E6F4EA', fg: '#0F9D58', label: 'Accepted' },
    DECLINED: { bg: '#FBE9E9', fg: '#D62828', label: 'Declined' },
};

function fmtDate(iso) {
    if (!iso) return null;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null
        : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function GuestsTab({ eventId }) {
    const { data: guests = [], isLoading, isError, error, refetch } = useGetGuestsQuery(eventId);
    const [updateConfig, configState] = useUpdateEventConfigMutation();
    const [enableError, setEnableError] = useState('');

    const isGuestListDisabled = isError &&
        (error?.data?.message ?? '').toLowerCase().includes('guest list is not enabled');

    async function handleEnableGuestList() {
        setEnableError('');
        try {
            await updateConfig({ eventId, guestListEnabled: true }).unwrap();
            refetch();
        } catch (err) {
            setEnableError(err?.data?.message || 'Could not enable guest list.');
        }
    }
    const [showForm, setShowForm] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [pendingRemove, setPendingRemove] = useState(null);
    const [removeGuest, removeState] = useRemoveGuestMutation();
    const [addGuest] = useAddGuestMutation();
    const [removeError, setRemoveError] = useState('');

    // Per-row submit callback for the import modal. Wrapping the existing
    // addGuest mutation gives us the same validation + invalidation as the
    // single-add form, just in a loop. Errors are caught by CsvImportModal
    // and surfaced in the summary.
    //
    // The backend's AddGuestRequest expects `guestName` (not `name`) and has
    // no `phone` column at all — phone numbers in the CSV are silently
    // dropped on the server, so we omit them client-side to stay honest.
    async function importOneGuest(row) {
        await addGuest({
            eventId,
            email: row.email,
            guestName: row.name || undefined,
            note: row.note || undefined,
        }).unwrap();
    }

    // Click handler for the Import button. Auto-enables the guest list if
    // it isn't already on — otherwise the user's batch would hit "guest list
    // is not enabled" on every row. Doing this proactively avoids the
    // confusing N-identical-errors summary we'd otherwise show.
    async function handleOpenImport() {
        try {
            await updateConfig({ eventId, guestListEnabled: true }).unwrap();
        } catch {
            // If the toggle fails (already enabled, or something stranger),
            // open the modal anyway — addGuest itself surfaces real issues.
        }
        setShowImport(true);
    }

    const counts = guests.reduce((acc, g) => {
        acc[g.rsvpStatus] = (acc[g.rsvpStatus] ?? 0) + 1;
        return acc;
    }, {});

    async function handleRemove() {
        if (!pendingRemove) return;
        setRemoveError('');
        try {
            await removeGuest({ eventId, guestId: pendingRemove.id }).unwrap();
            setPendingRemove(null);
        } catch (err) {
            setRemoveError(err?.data?.message || 'Could not remove guest.');
        }
    }

    function exportCsv() {
        window.open(
            `${import.meta.env.VITE_API_BASE_URL}/events/${eventId}/guests/export`,
            '_blank',
        );
    }

    if (isLoading) return <Skeleton />;
    if (isGuestListDisabled) return (
        <EmptyCard
            message="Guest list is not enabled"
            sub="Enable the guest list to invite guests, track RSVPs, and manage attendance for this event."
            action={
                <>
                    {enableError && (
                        <p style={{ fontSize: 13, color: 'var(--error)', marginBottom: 8 }}>{enableError}</p>
                    )}
                    <Button
                        variant="primary"
                        size="md"
                        onClick={handleEnableGuestList}
                        disabled={configState.isLoading}
                    >
                        {configState.isLoading ? 'Enabling…' : 'Enable guest list'}
                    </Button>
                </>
            }
        />
    );
    if (isError) return <ErrorCard message="Could not load guests." onRetry={refetch} />;

    return (
        <div>
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 20, gap: 12, flexWrap: 'wrap',
            }}>
                <div>
                    <h2 className="mp-h2" style={{ margin: 0, color: 'var(--text-1)' }}>Guest list</h2>
                    <p style={{ margin: '2px 0 0', fontSize: 14, color: 'var(--text-2)' }}>
                        {guests.length} guest{guests.length !== 1 ? 's' : ''} invited
                        {counts.ACCEPTED != null && ` · ${counts.ACCEPTED} accepted`}
                        {counts.DECLINED != null && ` · ${counts.DECLINED} declined`}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Button variant="secondary" size="md" icon={<Icons.download size={14} />}
                        onClick={handleOpenImport}>
                        Import
                    </Button>
                    {guests.length > 0 && (
                        <Button variant="secondary" size="md" icon={<Icons.list size={14} />} onClick={exportCsv}>
                            Export CSV
                        </Button>
                    )}
                    <Button variant="primary" size="md" icon={<Icons.plus size={14} />}
                        onClick={() => setShowForm(true)}>
                        Add guest
                    </Button>
                </div>
            </div>

            {guests.length === 0 ? (
                <EmptyCard
                    message="No guests yet"
                    sub="Add guests and track RSVPs. Guests will receive an invite link by email."
                    action={
                        <div className="mp-actions-row" style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                            <Button variant="secondary" size="md" onClick={handleOpenImport}>
                                Import from file
                            </Button>
                            <Button variant="primary" size="md" onClick={() => setShowForm(true)}>
                                Invite first guest
                            </Button>
                        </div>
                    }
                />
            ) : (
                <div style={{
                    background: 'var(--surface-elevated)', border: '1px solid var(--border)',
                    borderRadius: 12, overflow: 'hidden',
                }}>
                    {guests.map((guest, i) => (
                        <GuestRow
                            key={guest.id}
                            guest={guest}
                            eventId={eventId}
                            isLast={i === guests.length - 1}
                            onRemove={() => setPendingRemove(guest)}
                        />
                    ))}
                </div>
            )}

            {showForm && (
                <AddGuestModal eventId={eventId} onDismiss={() => setShowForm(false)} />
            )}

            <CsvImportModal
                open={showImport}
                title="Import guests"
                description="Bulk-add guests from a CSV, TSV, or Excel file. Each row will be added to the guest list and (if the event has guest invites enabled) emailed an RSVP link."
                fields={GUEST_IMPORT_FIELDS}
                onSubmitRow={importOneGuest}
                onClose={() => setShowImport(false)}
                onComplete={() => refetch()}
            />

            {pendingRemove && (
                <div
                    role="dialog"
                    onClick={() => setPendingRemove(null)}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 1000,
                        background: 'rgba(2,16,45,0.55)',
                        display: 'grid', placeItems: 'center', padding: 20,
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: '100%', maxWidth: 400, background: 'var(--surface-elevated)',
                            borderRadius: 16, padding: 28, boxShadow: 'var(--shadow-modal)',
                        }}
                    >
                        <h2 className="mp-h3" style={{ margin: '0 0 8px', color: 'var(--text-1)' }}>
                            Remove guest?
                        </h2>
                        <p className="body-sm" style={{ margin: '0 0 24px', color: 'var(--text-2)' }}>
                            <strong>{pendingRemove.guestName ?? pendingRemove.name ?? pendingRemove.email}</strong>{' '}
                            will be removed from the guest list.
                        </p>
                        {removeError && (
                            <p style={{ fontSize: 13, color: 'var(--error)', marginBottom: 12 }}>{removeError}</p>
                        )}
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <Button variant="ghost" size="md"
                                onClick={() => setPendingRemove(null)}
                                disabled={removeState.isLoading}>
                                Cancel
                            </Button>
                            <Button variant="destructive" size="md"
                                onClick={handleRemove}
                                disabled={removeState.isLoading}>
                                {removeState.isLoading ? 'Removing…' : 'Remove'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function GuestRow({ guest, eventId, isLast, onRemove }) {
    const [updateStatus, updateState] = useUpdateGuestStatusMutation();
    const [statusError, setStatusError] = useState('');
    const style = RSVP_STYLE[guest.rsvpStatus] ?? RSVP_STYLE.PENDING;
    const invited = fmtDate(guest.invitedAt);
    // Backend GuestListEntryResponse serializes the name as `guestName`. The
    // create endpoint accepts `name` on the way in but read responses ship as
    // `guestName` — keep both in case that's ever normalised.
    const displayName = guest.guestName ?? guest.name ?? '';

    async function handleStatusChange(rsvpStatus) {
        setStatusError('');
        try {
            await updateStatus({ eventId, guestId: guest.id, rsvpStatus }).unwrap();
        } catch (err) {
            setStatusError(err?.data?.message || 'Could not update status.');
        }
    }

    return (
        <div style={{
            display: 'grid', gridTemplateColumns: '1fr auto',
            gap: 16, alignItems: 'center',
            padding: '14px 20px',
            borderBottom: isLast ? 0 : '1px solid var(--border)',
        }}>
            <div>
                <div style={{ fontWeight: 500, color: 'var(--text-1)', fontSize: 14 }}>
                    {displayName || <span style={{ color: 'var(--text-3)', fontStyle: 'italic' }}>Unnamed guest</span>}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 1 }}>
                    {guest.email}
                    {guest.phone && <span style={{ color: 'var(--text-3)' }}> · {guest.phone}</span>}
                    {invited && <span style={{ color: 'var(--text-3)' }}> · Invited {invited}</span>}
                </div>
                {statusError && (
                    <p style={{ fontSize: 12, color: 'var(--error)', margin: '4px 0 0' }}>{statusError}</p>
                )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <select
                    value={guest.rsvpStatus}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    disabled={updateState.isLoading}
                    style={{
                        padding: '4px 8px', fontSize: 12, fontWeight: 600,
                        borderRadius: 6, border: `1px solid ${style.fg}`,
                        background: style.bg, color: style.fg,
                        cursor: 'pointer', fontFamily: 'inherit',
                    }}
                >
                    <option value="PENDING">Pending</option>
                    <option value="ACCEPTED">Accepted</option>
                    <option value="DECLINED">Declined</option>
                </select>
                <button
                    onClick={onRemove}
                    aria-label={`Remove ${displayName || guest.email}`}
                    style={{
                        background: 'none', border: '1px solid var(--border)',
                        borderRadius: 6, padding: '4px 8px', cursor: 'pointer',
                        fontSize: 12, color: 'var(--error)', fontWeight: 500,
                    }}
                >
                    Remove
                </button>
            </div>
        </div>
    );
}

function AddGuestModal({ eventId, onDismiss }) {
    const [addGuest, state] = useAddGuestMutation();
    const [form, setForm] = useState({ name: '', email: '', phone: '', note: '' });
    const [err, setErr] = useState('');

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    async function handleSubmit(e) {
        e.preventDefault();
        setErr('');
        try {
            // Backend AddGuestRequest fields: email (required), guestName (optional),
            // note (optional). Phone isn't stored server-side — kept in the form
            // for now as a UX courtesy but not sent.
            await addGuest({
                eventId,
                email: form.email.trim(),
                guestName: form.name.trim() || undefined,
                note: form.note.trim() || undefined,
            }).unwrap();
            onDismiss();
        } catch (error) {
            setErr(error?.data?.message || 'Could not add guest.');
        }
    }

    return (
        <div
            role="dialog"
            aria-label="Add guest"
            onClick={onDismiss}
            style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: 'rgba(2,16,45,0.55)',
                display: 'grid', placeItems: 'center', padding: 20,
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: '100%', maxWidth: 460, background: 'var(--surface-elevated)',
                    borderRadius: 16, padding: 28, boxShadow: 'var(--shadow-modal)',
                }}
            >
                <h3 className="mp-h3" style={{ margin: '0 0 20px', color: 'var(--text-1)' }}>
                    Add guest
                </h3>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <Field label="Name *">
                        <Input value={form.name} onChange={set('name')} placeholder="Guest full name" required />
                    </Field>
                    <Field label="Email *">
                        <Input type="email" value={form.email} onChange={set('email')} placeholder="guest@example.com" required />
                    </Field>
                    <Field label="Phone">
                        <Input value={form.phone} onChange={set('phone')} placeholder="+234 800 000 0000" />
                    </Field>
                    <Field label="Note">
                        <Input value={form.note} onChange={set('note')} placeholder="Optional note" />
                    </Field>
                    {err && <p style={{ fontSize: 13, color: 'var(--error)', margin: 0 }}>{err}</p>}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                        <Button type="button" variant="secondary" size="md" onClick={onDismiss}>Cancel</Button>
                        <Button type="submit" variant="primary" size="md"
                            disabled={!form.name.trim() || !form.email.trim() || state.isLoading}>
                            {state.isLoading ? 'Adding…' : 'Add guest'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function Field({ label, children }) {
    return (
        <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 6 }}>
                {label}
            </label>
            {children}
        </div>
    );
}

function Input(props) {
    return (
        <input
            {...props}
            style={{
                width: '100%', padding: '9px 12px', fontSize: 14,
                border: '1px solid var(--border)', borderRadius: 8,
                fontFamily: 'inherit', boxSizing: 'border-box',
                color: 'var(--text-1)', background: 'var(--surface-elevated)',
            }}
        />
    );
}

function EmptyCard({ message, sub, action }) {
    return (
        <div style={{
            background: 'var(--surface-elevated)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 60, textAlign: 'center',
        }}>
            <div style={{
                width: 52, height: 52, borderRadius: 99, margin: '0 auto 14px',
                background: 'var(--surface-subtle)', display: 'grid',
                placeItems: 'center', color: 'var(--text-3)',
            }}>
                <Icons.mail size={20} />
            </div>
            <div className="mp-h4" style={{ color: 'var(--text-1)', margin: 0 }}>{message}</div>
            {sub && <p className="body-sm" style={{ color: 'var(--text-2)', marginTop: 6 }}>{sub}</p>}
            {action && <div style={{ marginTop: 16 }}>{action}</div>}
        </div>
    );
}

function ErrorCard({ message, onRetry }) {
    return (
        <div style={{
            background: 'var(--surface-elevated)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 40, textAlign: 'center',
        }}>
            <Icons.alert size={28} style={{ color: 'var(--error)' }} />
            <p className="body-sm" style={{ marginTop: 8, color: 'var(--text-2)' }}>{message}</p>
            {onRetry && (
                <Button variant="secondary" size="sm" onClick={onRetry} style={{ marginTop: 12 }}>
                    Retry
                </Button>
            )}
        </div>
    );
}

function Skeleton() {
    const row = {
        height: 64, background: 'var(--surface-subtle)',
        borderBottom: '1px solid var(--border)',
        animation: 'mp-flash 1.6s ease-in-out infinite',
    };
    return (
        <div style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={row} />
            <div style={{ ...row, opacity: 0.7 }} />
            <div style={{ ...row, opacity: 0.4, borderBottom: 0 }} />
        </div>
    );
}
