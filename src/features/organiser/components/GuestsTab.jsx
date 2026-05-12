import { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
    useGetGuestsQuery,
    useAddGuestMutation,
    useUpdateGuestStatusMutation,
    useRemoveGuestMutation,
} from '../guestsApi';
import { useUpdateEventConfigMutation } from '@/features/events/eventsApi';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { Icons } from '@/components/ui/Icon';

const STATUS_STYLE = {
    PENDING:    { bg: '#FEF4E2', fg: '#B8770A', label: 'Awaiting' },
    ACCEPTED:   { bg: '#E6F4EA', fg: '#0F9D58', label: 'Accepted' },
    DECLINED:   { bg: '#FBE9E9', fg: '#D62828', label: 'Declined' },
    WAITLISTED: { bg: '#EAF1FE', fg: '#0247c7', label: 'Waitlisted' },
};

const FILTERS = [
    ['all',        'All'],
    ['ACCEPTED',   'Accepted'],
    ['PENDING',    'Pending'],
    ['DECLINED',   'Declined'],
    ['WAITLISTED', 'Waitlisted'],
];

function formatTimestamp(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ─── Tab entry point ─────────────────────────────── */
export default function GuestsTab({ eventId }) {
    const guests = useGetGuestsQuery(eventId);
    const [updateConfig, configState] = useUpdateEventConfigMutation();
    const [enableError, setEnableError] = useState('');

    async function enableGuestListModule() {
        setEnableError('');
        try {
            await updateConfig({ eventId, guestListEnabled: true }).unwrap();
            guests.refetch();
        } catch (err) {
            setEnableError(err?.data?.message || 'Could not enable guest list.');
        }
    }

    if (guests.isLoading) return <Skeleton />;

    // Same gating pattern as ProgrammeTab — 409 + "not enabled" → enable CTA.
    const errStatus = guests.error?.status;
    const errMsg    = guests.error?.data?.message ?? '';
    const notEnabled = guests.isError && errStatus === 409 && /not enabled/i.test(errMsg);

    if (notEnabled) {
        return (
            <div style={{
                background: 'white',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: 40,
                textAlign: 'center',
                maxWidth: 560,
                margin: '0 auto',
            }}>
                <div style={{
                    width: 56, height: 56, borderRadius: 99,
                    margin: '0 auto 14px',
                    background: 'var(--mp-blue-50, #EAF1FE)',
                    color: 'var(--mp-blue)',
                    display: 'grid', placeItems: 'center',
                }}>
                    <Icons.mail size={22} />
                </div>
                <div className="mp-h3" style={{ color: 'var(--text-1)', margin: 0 }}>
                    Guest list is off
                </div>
                <p className="body" style={{ color: 'var(--text-2)', marginTop: 8 }}>
                    Turn it on to invite guests by email, track RSVPs, and gate
                    bookings to accepted guests for private events.
                </p>
                {enableError && (
                    <div role="alert" style={{
                        marginTop: 14,
                        padding: '10px 12px',
                        background: 'var(--error-bg, #FBE9E9)',
                        color: 'var(--error)',
                        borderRadius: 8,
                        fontSize: 13,
                    }}>
                        {enableError}
                    </div>
                )}
                <Button
                    variant="primary"
                    size="md"
                    icon={<Icons.bolt size={14} />}
                    onClick={enableGuestListModule}
                    disabled={configState.isLoading}
                    style={{ marginTop: 18 }}
                >
                    {configState.isLoading ? 'Enabling…' : 'Enable guest list'}
                </Button>
            </div>
        );
    }

    if (guests.isError) {
        return (
            <div style={{
                background: 'white', border: '1px solid var(--border)',
                borderRadius: 12, padding: 40, textAlign: 'center',
            }}>
                <Icons.alert size={28} style={{ color: 'var(--error)' }} />
                <p className="body-sm" style={{ marginTop: 8, color: 'var(--text-2)' }}>
                    {errMsg || 'Could not load the guest list.'}
                </p>
                <Button variant="secondary" size="sm" onClick={guests.refetch} style={{ marginTop: 12 }}>
                    Retry
                </Button>
            </div>
        );
    }

    return <GuestsView eventId={eventId} guests={guests.data || []} />;
}

/* ─── Main view ───────────────────────────────────── */
function GuestsView({ eventId, guests }) {
    const [addGuest, addState]             = useAddGuestMutation();
    const [updateStatus, updateState]      = useUpdateGuestStatusMutation();
    const [removeGuest, removeState]       = useRemoveGuestMutation();

    const [filter, setFilter]      = useState('all');
    const [showInvite, setShowInvite] = useState(false);
    const [pendingRemove, setPendingRemove] = useState(null);
    const [actionError, setActionError]     = useState('');
    const [exporting, setExporting]         = useState(false);
    const [exportError, setExportError]     = useState('');

    const token = useSelector((s) => s.auth.token);

    const counts = useMemo(() => {
        const c = {
            all: guests.length,
            ACCEPTED: 0, PENDING: 0, DECLINED: 0, WAITLISTED: 0,
        };
        for (const g of guests) {
            if (c[g.rsvpStatus] !== undefined) c[g.rsvpStatus] += 1;
        }
        return c;
    }, [guests]);

    const acceptRate = counts.all ? Math.round((counts.ACCEPTED / counts.all) * 100) : 0;

    const list = useMemo(() => (
        filter === 'all' ? guests : guests.filter((g) => g.rsvpStatus === filter)
    ), [guests, filter]);

    async function handleStatus(guest, rsvpStatus) {
        setActionError('');
        try {
            await updateStatus({ eventId, guestId: guest.id, rsvpStatus }).unwrap();
        } catch (err) {
            setActionError(err?.data?.message || 'Could not update RSVP.');
        }
    }

    async function handleRemove() {
        if (!pendingRemove) return;
        setActionError('');
        try {
            await removeGuest({ eventId, guestId: pendingRemove.id }).unwrap();
            setPendingRemove(null);
        } catch (err) {
            setActionError(err?.data?.message || 'Could not remove guest.');
        }
    }

    /* CSV export — the endpoint returns a binary stream, which RTK Query's
       default JSON decoder doesn't handle. So we hit it with plain fetch,
       pulling the auth token straight from the store. */
    async function handleExport() {
        setExportError('');
        setExporting(true);
        try {
            const base = import.meta.env.VITE_API_BASE_URL;
            const res = await fetch(`${base}/events/${eventId}/guests/export`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (!res.ok) {
                const body = await res.text();
                throw new Error(body || `Export failed (${res.status})`);
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `guests-${eventId}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            setExportError(err?.message || 'Could not export.');
        } finally {
            setExporting(false);
        }
    }

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 300px',
            gap: 20,
        }}>
            <div style={{ minWidth: 0 }}>
                {/* Tiles */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 16,
                    marginBottom: 20,
                }}>
                    <Tile label="Invited"  value={counts.all}      icon={<Icons.mail size={16} />} />
                    <Tile
                        label="Accepted"
                        value={counts.ACCEPTED}
                        sub={counts.all > 0 ? `${acceptRate}% accept rate` : '—'}
                        accent="var(--success)"
                    />
                    <Tile
                        label="Pending"
                        value={counts.PENDING}
                        accent={counts.PENDING > 0 ? 'var(--warning)' : undefined}
                    />
                    <Tile label="Declined" value={counts.DECLINED} />
                </div>

                {/* List card */}
                <div style={{
                    background: 'white',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    overflow: 'hidden',
                }}>
                    <div style={{
                        padding: '14px 20px',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 12,
                        flexWrap: 'wrap',
                    }}>
                        <div style={{
                            display: 'flex',
                            gap: 4,
                            padding: 4,
                            background: 'var(--surface-subtle)',
                            borderRadius: 10,
                            border: '1px solid var(--border)',
                            flexWrap: 'wrap',
                        }}>
                            {FILTERS.map(([k, l]) => {
                                const active = filter === k;
                                const n = k === 'all' ? counts.all : counts[k];
                                return (
                                    <button
                                        key={k}
                                        onClick={() => setFilter(k)}
                                        style={{
                                            background: active ? 'white' : 'transparent',
                                            border: 0,
                                            padding: '6px 12px',
                                            borderRadius: 7,
                                            fontSize: 13,
                                            fontWeight: active ? 600 : 500,
                                            color: active ? 'var(--mp-blue)' : 'var(--text-2)',
                                            boxShadow: active ? 'var(--shadow-card)' : 'none',
                                            cursor: 'pointer',
                                            fontFamily: 'inherit',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 4,
                                        }}
                                    >
                                        {l}
                                        <span className="mp-num" style={{ color: 'var(--text-3)' }}>
                                            {n}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <Button
                                size="sm"
                                variant="secondary"
                                icon={<Icons.download size={14} />}
                                onClick={handleExport}
                                disabled={exporting || counts.all === 0}
                            >
                                {exporting ? 'Exporting…' : 'Export CSV'}
                            </Button>
                            <Button
                                size="sm"
                                variant="primary"
                                icon={<Icons.plus size={14} />}
                                onClick={() => setShowInvite(true)}
                            >
                                Invite guests
                            </Button>
                        </div>
                    </div>

                    {(actionError || exportError) && (
                        <div role="alert" style={{
                            margin: '12px 20px 0',
                            padding: '10px 12px',
                            background: 'var(--error-bg, #FBE9E9)',
                            color: 'var(--error)',
                            borderRadius: 8,
                            fontSize: 13,
                        }}>
                            {actionError || exportError}
                        </div>
                    )}

                    {counts.all === 0 ? (
                        <EmptyState onInvite={() => setShowInvite(true)} />
                    ) : list.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: 50,
                            color: 'var(--text-3)',
                            fontSize: 14,
                        }}>
                            No guests match this filter.
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                            <thead>
                                <tr style={{ background: 'var(--surface-subtle)' }}>
                                    {['Guest', 'Status', 'Invited', 'Responded', ''].map((h, i) => (
                                        <th
                                            key={h || `_${i}`}
                                            style={{
                                                textAlign: 'left',
                                                padding: '10px 20px',
                                                color: 'var(--text-3)',
                                                fontSize: 12,
                                                fontWeight: 600,
                                                borderBottom: '1px solid var(--border)',
                                            }}
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {list.map((g, i) => (
                                    <GuestRow
                                        key={g.id}
                                        guest={g}
                                        isLast={i === list.length - 1}
                                        onSetStatus={(rsvpStatus) => handleStatus(g, rsvpStatus)}
                                        onRemove={() => setPendingRemove(g)}
                                        busy={updateState.isLoading || removeState.isLoading}
                                    />
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Side panel */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                height: 'fit-content',
                position: 'sticky',
                top: 24,
            }}>
                <div style={{
                    background: 'white',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: 18,
                }}>
                    <div className="mp-h4" style={{ margin: 0, color: 'var(--text-1)' }}>
                        How RSVP works
                    </div>
                    <ol style={{
                        margin: '10px 0 0',
                        padding: 0,
                        listStyle: 'none',
                        color: 'var(--text-2)',
                        fontSize: 13,
                    }}>
                        {[
                            ['1', "Invite by email. The system sends each guest a unique RSVP link."],
                            ['2', "Guest opens the link and accepts, declines, or sits on the waitlist."],
                            ['3', "Status flows back here in real time — no spreadsheets, no chasing."],
                            ['4', "If the event is private, only accepted guests can book a seat."],
                        ].map(([n, t]) => (
                            <li key={n} style={{ display: 'flex', gap: 10, padding: '6px 0' }}>
                                <span style={{
                                    width: 22, height: 22, borderRadius: 99,
                                    background: 'var(--mp-blue-50, #EAF1FE)',
                                    color: 'var(--mp-blue)',
                                    fontSize: 11, fontWeight: 700,
                                    display: 'grid', placeItems: 'center',
                                    flexShrink: 0,
                                }}>
                                    {n}
                                </span>
                                <span style={{ lineHeight: 1.5 }}>{t}</span>
                            </li>
                        ))}
                    </ol>
                </div>
            </div>

            <InviteModal
                open={showInvite}
                onClose={() => setShowInvite(false)}
                onSubmit={async (drafts, opts) => {
                    setActionError('');
                    const failures = [];
                    // Sequential on purpose: keeps order stable + avoids
                    // hammering the SMTP path with parallel invites.
                    for (const d of drafts) {
                        try {
                            await addGuest({
                                eventId,
                                name: d.name,
                                email: d.email,
                                phone: d.phone,
                                note: d.note,
                                sendInvite: opts.sendInvite,
                            }).unwrap();
                        } catch (err) {
                            failures.push(`${d.email}: ${err?.data?.message || 'failed'}`);
                        }
                    }
                    if (failures.length) {
                        setActionError(`Some invites failed:\n${failures.join('\n')}`);
                    }
                    setShowInvite(false);
                }}
                saving={addState.isLoading}
            />

            {pendingRemove && (
                <ConfirmDialog
                    title="Remove guest?"
                    body={
                        <>
                            <strong>{pendingRemove.name}</strong> ({pendingRemove.email}) will
                            be removed from the guest list. Their RSVP link will stop working.
                        </>
                    }
                    confirmLabel="Remove"
                    loading={removeState.isLoading}
                    onConfirm={handleRemove}
                    onDismiss={() => setPendingRemove(null)}
                />
            )}
        </div>
    );
}

/* ─── Subcomponents ───────────────────────────────── */

function Tile({ label, value, sub, icon, accent }) {
    return (
        <div style={{
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 18,
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
            }}>
                <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>{label}</span>
                {icon && <span style={{ color: 'var(--text-3)' }}>{icon}</span>}
            </div>
            <div className="mp-num" style={{
                fontSize: 26,
                fontWeight: 700,
                lineHeight: 1,
                color: accent || 'var(--text-1)',
            }}>
                {value}
            </div>
            {sub && (
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>{sub}</div>
            )}
        </div>
    );
}

function GuestRow({ guest, isLast, onSetStatus, onRemove, busy }) {
    const style = STATUS_STYLE[guest.rsvpStatus] || STATUS_STYLE.PENDING;
    return (
        <tr style={{ borderBottom: isLast ? 0 : '1px solid var(--border)' }}>
            <td style={{ padding: '12px 20px' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>{guest.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                    {guest.email}
                    {guest.phone ? ` · ${guest.phone}` : ''}
                </div>
                {guest.note && (
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4, fontStyle: 'italic' }}>
                        {guest.note}
                    </div>
                )}
            </td>
            <td style={{ padding: '12px 20px' }}>
                <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    background: style.bg,
                    color: style.fg,
                    padding: '4px 10px',
                    borderRadius: 99,
                }}>
                    {style.label}
                </span>
            </td>
            <td style={{ padding: '12px 20px', color: 'var(--text-3)', fontSize: 13 }}>
                {formatTimestamp(guest.invitedAt)}
            </td>
            <td style={{ padding: '12px 20px', color: 'var(--text-3)', fontSize: 13 }}>
                {formatTimestamp(guest.respondedAt)}
            </td>
            <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                <div style={{ display: 'inline-flex', gap: 6, justifyContent: 'flex-end' }}>
                    <select
                        value={guest.rsvpStatus}
                        onChange={(e) => onSetStatus(e.target.value)}
                        disabled={busy}
                        aria-label="Set RSVP status"
                        style={{
                            fontFamily: 'inherit',
                            fontSize: 12,
                            padding: '5px 8px',
                            borderRadius: 6,
                            border: '1px solid var(--border)',
                            background: 'white',
                            color: 'var(--text-2)',
                            cursor: 'pointer',
                        }}
                    >
                        <option value="PENDING">Pending</option>
                        <option value="ACCEPTED">Accepted</option>
                        <option value="DECLINED">Declined</option>
                        <option value="WAITLISTED">Waitlisted</option>
                    </select>
                    <button
                        onClick={onRemove}
                        disabled={busy}
                        aria-label="Remove guest"
                        title="Remove guest"
                        style={{
                            background: 'white',
                            border: '1px solid var(--border)',
                            padding: 6,
                            borderRadius: 6,
                            color: 'var(--error)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Icons.x size={13} />
                    </button>
                </div>
            </td>
        </tr>
    );
}

function EmptyState({ onInvite }) {
    return (
        <div style={{ textAlign: 'center', padding: 50 }}>
            <div style={{
                width: 52, height: 52, borderRadius: 99,
                margin: '0 auto 14px',
                background: 'var(--surface-subtle)',
                display: 'grid', placeItems: 'center',
                color: 'var(--text-3)',
            }}>
                <Icons.mail size={20} />
            </div>
            <div className="mp-h4" style={{ color: 'var(--text-1)', margin: 0 }}>
                No guests invited yet
            </div>
            <p className="body-sm" style={{ color: 'var(--text-2)', marginTop: 6 }}>
                Invite people by email — each one gets a unique RSVP link they can
                accept or decline. Useful for private events and curated guest lists.
            </p>
            <Button
                variant="primary"
                size="md"
                icon={<Icons.plus size={14} />}
                onClick={onInvite}
                style={{ marginTop: 16 }}
            >
                Invite first guest
            </Button>
        </div>
    );
}

/* Bulk paste OR single guest. The backend has no bulk endpoint, so we
   fan out one POST per line on submit. */
function InviteModal({ open, onClose, onSubmit, saving }) {
    const [bulk, setBulk]         = useState('');
    const [singleMode, setSingle] = useState(false);
    const [name, setName]         = useState('');
    const [email, setEmail]       = useState('');
    const [phone, setPhone]       = useState('');
    const [note, setNote]         = useState('');
    const [sendInvite, setSendInvite] = useState(true);
    const [parseError, setParseError] = useState('');

    function reset() {
        setBulk(''); setSingle(false);
        setName(''); setEmail(''); setPhone(''); setNote('');
        setSendInvite(true); setParseError('');
    }

    function close() {
        reset();
        onClose();
    }

    function submit() {
        setParseError('');
        let drafts = [];
        if (singleMode) {
            if (!name.trim() || !email.trim() || !email.includes('@')) {
                setParseError('Enter a name and a valid email.');
                return;
            }
            drafts = [{
                name: name.trim(),
                email: email.trim(),
                phone: phone.trim() || null,
                note: note.trim() || null,
            }];
        } else {
            // Accept "email" alone or "name <email>" or "name,email" per line.
            const lines = bulk.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
            if (!lines.length) {
                setParseError('Paste at least one email address.');
                return;
            }
            for (const line of lines) {
                const m = line.match(/^(.*?)<\s*([^>]+)\s*>$/);
                let lineEmail; let lineName;
                if (m) {
                    lineName = m[1].trim().replace(/^["']|["']$/g, '');
                    lineEmail = m[2].trim();
                } else {
                    lineEmail = line;
                    // Synthesise a name from the local-part so the email
                    // template has something nicer than the bare address.
                    lineName = line.split('@')[0]
                        .replace(/[._-]+/g, ' ')
                        .replace(/\b\w/g, (c) => c.toUpperCase());
                }
                if (!lineEmail || !lineEmail.includes('@')) {
                    setParseError(`Not a valid email: "${line}"`);
                    return;
                }
                drafts.push({ name: lineName, email: lineEmail, phone: null, note: null });
            }
        }
        onSubmit(drafts, { sendInvite });
        reset();
    }

    return (
        <Modal open={open} onClose={close} width={540} label="Invite guests">
            <div style={{ padding: 24 }}>
                <h3 className="mp-h3" style={{ margin: 0, color: 'var(--text-1)' }}>
                    Invite guests
                </h3>
                <p className="body-sm" style={{ color: 'var(--text-2)', marginTop: 6 }}>
                    {singleMode
                        ? 'Add one guest with full contact details.'
                        : 'Paste one address per line. Each guest gets a unique RSVP link.'}
                </p>

                <div style={{
                    display: 'inline-flex',
                    gap: 4,
                    padding: 4,
                    background: 'var(--surface-subtle)',
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    marginTop: 14,
                }}>
                    {[
                        [false, 'Bulk paste'],
                        [true,  'Single guest'],
                    ].map(([m, l]) => (
                        <button
                            key={String(m)}
                            onClick={() => setSingle(m)}
                            style={{
                                background: singleMode === m ? 'white' : 'transparent',
                                border: 0,
                                padding: '6px 12px',
                                borderRadius: 7,
                                fontSize: 13,
                                fontWeight: singleMode === m ? 600 : 500,
                                color: singleMode === m ? 'var(--mp-blue)' : 'var(--text-2)',
                                boxShadow: singleMode === m ? 'var(--shadow-card)' : 'none',
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                            }}
                        >
                            {l}
                        </button>
                    ))}
                </div>

                {singleMode ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
                        <Input
                            label="Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Adaeze Okonkwo"
                        />
                        <Input
                            label="Email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="adaeze@company.com"
                        />
                        <Input
                            label="Phone (optional)"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+234 8…"
                        />
                        <Input
                            label="Note (optional)"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="VIP — front row"
                        />
                    </div>
                ) : (
                    <textarea
                        value={bulk}
                        onChange={(e) => setBulk(e.target.value)}
                        placeholder={'tope.ajayi@kuda.com\nfolake@flutterwave.com\nIdris Mohammed <idris@cbn.gov.ng>'}
                        rows={6}
                        style={{
                            width: '100%',
                            marginTop: 14,
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
                )}

                <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginTop: 14,
                    padding: 10,
                    background: 'var(--surface-subtle)',
                    borderRadius: 8,
                    fontSize: 13,
                    color: 'var(--text-2)',
                    cursor: 'pointer',
                }}>
                    <input
                        type="checkbox"
                        checked={sendInvite}
                        onChange={(e) => setSendInvite(e.target.checked)}
                        style={{ width: 16, height: 16, accentColor: 'var(--mp-blue)' }}
                    />
                    Send RSVP email immediately
                    <span style={{ color: 'var(--text-3)', fontSize: 12 }}>
                        — uncheck to add silently
                    </span>
                </label>

                {parseError && (
                    <div role="alert" style={{
                        marginTop: 12,
                        padding: '10px 12px',
                        background: 'var(--error-bg, #FBE9E9)',
                        color: 'var(--error)',
                        borderRadius: 8,
                        fontSize: 13,
                        whiteSpace: 'pre-wrap',
                    }}>
                        {parseError}
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
                    <Button variant="ghost" size="md" onClick={close} disabled={saving}>
                        Cancel
                    </Button>
                    <Button variant="primary" size="md" onClick={submit} disabled={saving}>
                        {saving ? 'Sending…' : 'Send invites'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

function ConfirmDialog({ title, body, confirmLabel, loading, onConfirm, onDismiss }) {
    return (
        <div
            role="dialog"
            aria-label={title}
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
                    width: '100%', maxWidth: 420,
                    background: 'white', borderRadius: 16,
                    boxShadow: 'var(--shadow-modal)', padding: 28,
                }}
            >
                <h2 className="mp-h3" style={{ margin: 0, color: 'var(--text-1)' }}>{title}</h2>
                <p className="body-sm" style={{ margin: '8px 0 24px', color: 'var(--text-2)' }}>
                    {body}
                </p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <Button variant="ghost" size="md" onClick={onDismiss} disabled={loading}>Cancel</Button>
                    <Button variant="destructive" size="md" onClick={onConfirm} disabled={loading}>
                        {loading ? 'Working…' : confirmLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
}

function Skeleton() {
    const tile = {
        height: 90,
        background: 'white',
        border: '1px solid var(--border)',
        borderRadius: 12,
        animation: 'mp-flash 1.6s ease-in-out infinite',
    };
    const row = {
        height: 60,
        background: 'var(--surface-subtle)',
        borderBottom: '1px solid var(--border)',
        animation: 'mp-flash 1.6s ease-in-out infinite',
    };
    return (
        <div>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 16,
                marginBottom: 20,
            }}>
                <div style={tile} />
                <div style={{ ...tile, opacity: 0.8 }} />
                <div style={{ ...tile, opacity: 0.6 }} />
                <div style={{ ...tile, opacity: 0.4 }} />
            </div>
            <div style={{
                background: 'white',
                border: '1px solid var(--border)',
                borderRadius: 12,
                overflow: 'hidden',
            }}>
                <div style={{ ...row, height: 50 }} />
                <div style={row} />
                <div style={{ ...row, opacity: 0.7 }} />
                <div style={{ ...row, opacity: 0.4, borderBottom: 0 }} />
            </div>
        </div>
    );
}
