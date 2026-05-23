import { useState } from 'react';
import {
    useGetProgrammeQuery,
    useAddProgrammeItemMutation,
    useUpdateProgrammeItemMutation,
    useDeleteProgrammeItemMutation,
} from '../programmeApi';
import Button from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icon';

function fmtTime(iso) {
    if (!iso) return null;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null
        : d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function fmtDateTime(iso) {
    if (!iso) return null;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null
        : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
          + ' · '
          + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export default function ProgrammeTab({ eventId, event }) {
    const { data: items = [], isLoading, isError, refetch } = useGetProgrammeQuery(eventId);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [pendingDelete, setPendingDelete] = useState(null);
    const [deleteItem, deleteState] = useDeleteProgrammeItemMutation();
    const [deleteError, setDeleteError] = useState('');

    async function handleDelete() {
        if (!pendingDelete) return;
        setDeleteError('');
        try {
            await deleteItem({ eventId, itemId: pendingDelete.id }).unwrap();
            setPendingDelete(null);
        } catch (err) {
            setDeleteError(err?.data?.message || 'Could not delete item.');
        }
    }

    if (isLoading) return <Skeleton />;
    if (isError) return (
        <ErrorCard message="Could not load programme." onRetry={refetch} />
    );

    return (
        <div>
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 20,
            }}>
                <div>
                    <h2 className="mp-h2" style={{ margin: 0, color: 'var(--text-1)' }}>Programme</h2>
                    <p style={{ margin: '2px 0 0', fontSize: 14, color: 'var(--text-2)' }}>
                        Agenda and speaker sessions for this event.
                    </p>
                </div>
                <Button variant="primary" size="md" icon={<Icons.plus size={14} />}
                    onClick={() => { setEditing(null); setShowForm(true); }}>
                    Add session
                </Button>
            </div>

            {items.length === 0 ? (
                <EmptyCard
                    message="No sessions yet"
                    sub="Add your first programme item — sessions, talks, and breaks."
                    action={
                        <Button variant="primary" size="md" onClick={() => { setEditing(null); setShowForm(true); }}>
                            Add first session
                        </Button>
                    }
                />
            ) : (
                <div style={{
                    background: 'var(--surface-elevated)', border: '1px solid var(--border)',
                    borderRadius: 12, overflow: 'hidden',
                }}>
                    {[...items]
                        .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
                        .map((item, i, arr) => (
                            <ProgrammeRow
                                key={item.id}
                                item={item}
                                isLast={i === arr.length - 1}
                                onEdit={() => { setEditing(item); setShowForm(true); }}
                                onDelete={() => setPendingDelete(item)}
                            />
                        ))}
                </div>
            )}

            {showForm && (
                <ProgrammeItemModal
                    eventId={eventId}
                    item={editing}
                    eventStartTime={event?.startTime}
                    eventEndTime={event?.endTime}
                    onDismiss={() => { setShowForm(false); setEditing(null); }}
                />
            )}

            {pendingDelete && (
                <div
                    role="dialog"
                    onClick={() => setPendingDelete(null)}
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
                            Delete session?
                        </h2>
                        <p className="body-sm" style={{ margin: '0 0 24px', color: 'var(--text-2)' }}>
                            <strong>{pendingDelete.title}</strong> will be removed from the programme.
                        </p>
                        {deleteError && (
                            <p style={{ fontSize: 13, color: 'var(--error)', marginBottom: 12 }}>
                                {deleteError}
                            </p>
                        )}
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <Button variant="ghost" size="md"
                                onClick={() => setPendingDelete(null)}
                                disabled={deleteState.isLoading}>
                                Cancel
                            </Button>
                            <Button variant="destructive" size="md"
                                onClick={handleDelete}
                                disabled={deleteState.isLoading}>
                                {deleteState.isLoading ? 'Deleting…' : 'Delete'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ProgrammeRow({ item, isLast, onEdit, onDelete }) {
    const start = fmtDateTime(item.startTime);
    const end = fmtTime(item.endTime);
    return (
        <div style={{
            display: 'grid', gridTemplateColumns: '120px 1fr auto',
            gap: 16, alignItems: 'flex-start',
            padding: '16px 20px',
            borderBottom: isLast ? 0 : '1px solid var(--border)',
        }}>
            <div style={{ fontSize: 13, color: 'var(--text-3)', paddingTop: 2 }}>
                {start
                    ? <>{start}{end && <> – {end}</>}</>
                    : <span style={{ color: 'var(--text-3)' }}>TBD</span>
                }
            </div>
            <div>
                <div style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 14 }}>
                    {item.title}
                </div>
                {item.speakerName && (
                    <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
                        {item.speakerName}
                        {item.speakerBio && (
                            <span style={{ color: 'var(--text-3)' }}> — {item.speakerBio}</span>
                        )}
                    </div>
                )}
                {item.description && (
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>
                        {item.description}
                    </p>
                )}
            </div>
            <div style={{ display: 'flex', gap: 8, paddingTop: 2 }}>
                <button
                    onClick={onEdit}
                    aria-label="Edit session"
                    style={{
                        background: 'none', border: '1px solid var(--border)',
                        borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
                        fontSize: 12, color: 'var(--text-2)', fontWeight: 500,
                    }}
                >
                    Edit
                </button>
                <button
                    onClick={onDelete}
                    aria-label="Delete session"
                    style={{
                        background: 'none', border: '1px solid var(--border)',
                        borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
                        fontSize: 12, color: 'var(--error)', fontWeight: 500,
                    }}
                >
                    Delete
                </button>
            </div>
        </div>
    );
}

function ProgrammeItemModal({ eventId, item, eventStartTime, eventEndTime, onDismiss }) {
    const isEdit = !!item;
    const [addItem, addState] = useAddProgrammeItemMutation();
    const [updateItem, updateState] = useUpdateProgrammeItemMutation();

    const [form, setForm] = useState({
        title: item?.title ?? '',
        description: item?.description ?? '',
        speakerName: item?.speakerName ?? '',
        speakerBio: item?.speakerBio ?? '',
        startTime: item?.startTime ? item.startTime.slice(0, 16) : '',
        endTime: item?.endTime ? item.endTime.slice(0, 16) : '',
        displayOrder: item?.displayOrder ?? 0,
    });
    const [err, setErr] = useState('');

    const busy = addState.isLoading || updateState.isLoading;
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    // Clamp the min/max attributes shown in the datetime-local inputs
    // so the browser's own date picker also guides the user.
    const inputMin = eventStartTime ? eventStartTime.slice(0, 16) : undefined;
    const inputMax = eventEndTime   ? eventEndTime.slice(0, 16)   : undefined;

    function validate() {
        const sessionStart = form.startTime ? new Date(form.startTime) : null;
        const sessionEnd   = form.endTime   ? new Date(form.endTime)   : null;
        const evtStart     = eventStartTime  ? new Date(eventStartTime) : null;
        const evtEnd       = eventEndTime    ? new Date(eventEndTime)   : null;

        if (sessionStart && sessionEnd && sessionStart >= sessionEnd) {
            return 'Session end time must be after start time.';
        }
        if (evtStart && sessionStart && sessionStart < evtStart) {
            return `Session start time cannot be before the event starts (${fmtDateTime(eventStartTime)}).`;
        }
        if (evtEnd && sessionEnd && sessionEnd > evtEnd) {
            return `Session end time cannot be after the event ends (${fmtDateTime(eventEndTime)}).`;
        }
        if (evtStart && evtEnd && sessionStart && sessionStart > evtEnd) {
            return 'Programme item must fall within the event\'s time window.';
        }
        return null;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setErr('');

        const validationError = validate();
        if (validationError) {
            setErr(validationError);
            return;
        }

        const body = {
            title: form.title.trim(),
            description: form.description.trim() || undefined,
            speakerName: form.speakerName.trim() || undefined,
            speakerBio: form.speakerBio.trim() || undefined,
            startTime: form.startTime || undefined,
            endTime: form.endTime || undefined,
            displayOrder: Number(form.displayOrder) || 0,
        };
        try {
            if (isEdit) {
                await updateItem({ eventId, itemId: item.id, ...body }).unwrap();
            } else {
                await addItem({ eventId, ...body }).unwrap();
            }
            onDismiss();
        } catch (error) {
            setErr(error?.data?.message || (isEdit ? 'Failed to update session.' : 'Failed to add session.'));
        }
    }

    return (
        <div
            role="dialog"
            aria-label={isEdit ? 'Edit session' : 'Add session'}
            onClick={onDismiss}
            style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: 'rgba(2,16,45,0.55)',
                display: 'grid', placeItems: 'center', padding: 20,
                overflowY: 'auto',
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: '100%', maxWidth: 520, background: 'var(--surface-elevated)',
                    borderRadius: 16, padding: 28, boxShadow: 'var(--shadow-modal)',
                    margin: 'auto',
                }}
            >
                <h3 className="mp-h3" style={{ margin: '0 0 20px', color: 'var(--text-1)' }}>
                    {isEdit ? 'Edit session' : 'Add session'}
                </h3>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <FieldGroup label="Title *">
                        <TextInput value={form.title} onChange={set('title')} placeholder="e.g. Opening keynote" required />
                    </FieldGroup>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <FieldGroup label="Start time">
                            <TextInput type="datetime-local" value={form.startTime} onChange={set('startTime')} min={inputMin} max={inputMax} />
                        </FieldGroup>
                        <FieldGroup label="End time">
                            <TextInput type="datetime-local" value={form.endTime} onChange={set('endTime')} min={inputMin} max={inputMax} />
                        </FieldGroup>
                    </div>
                    <FieldGroup label="Speaker name">
                        <TextInput value={form.speakerName} onChange={set('speakerName')} placeholder="e.g. Jane Okoye" />
                    </FieldGroup>
                    <FieldGroup label="Speaker bio">
                        <TextInput value={form.speakerBio} onChange={set('speakerBio')} placeholder="Short bio or title" />
                    </FieldGroup>
                    <FieldGroup label="Description">
                        <textarea
                            value={form.description}
                            onChange={set('description')}
                            placeholder="What will this session cover?"
                            rows={3}
                            style={{
                                width: '100%', padding: '9px 12px', fontSize: 14,
                                border: '1px solid var(--border)', borderRadius: 8,
                                resize: 'vertical', fontFamily: 'inherit',
                                boxSizing: 'border-box', color: 'var(--text-1)', background: 'var(--surface-elevated)',
                            }}
                        />
                    </FieldGroup>
                    <FieldGroup label="Display order">
                        <TextInput type="number" min="0" value={form.displayOrder} onChange={set('displayOrder')} />
                    </FieldGroup>
                    {err && <p style={{ fontSize: 13, color: 'var(--error)', margin: 0 }}>{err}</p>}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                        <Button type="button" variant="secondary" size="md" onClick={onDismiss}>Cancel</Button>
                        <Button type="submit" variant="primary" size="md" disabled={!form.title.trim() || busy}>
                            {busy ? (isEdit ? 'Saving…' : 'Adding…') : (isEdit ? 'Save changes' : 'Add session')}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function FieldGroup({ label, children }) {
    return (
        <div>
            <label style={{
                display: 'block', fontSize: 13, fontWeight: 600,
                color: 'var(--text-1)', marginBottom: 6,
            }}>
                {label}
            </label>
            {children}
        </div>
    );
}

function TextInput(props) {
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
                <Icons.calendar size={20} />
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
        height: 72, background: 'var(--surface-subtle)',
        borderBottom: '1px solid var(--border)',
        animation: 'mp-flash 1.6s ease-in-out infinite',
    };
    return (
        <div style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ ...row }} />
            <div style={{ ...row, opacity: 0.7 }} />
            <div style={{ ...row, opacity: 0.4, borderBottom: 0 }} />
        </div>
    );
}
