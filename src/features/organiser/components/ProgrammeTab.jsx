import { useState, useMemo } from 'react';
import {
    useGetProgrammeQuery,
    useAddProgrammeItemMutation,
    useUpdateProgrammeItemMutation,
    useDeleteProgrammeItemMutation,
} from '../programmeApi';
import { useUpdateEventConfigMutation } from '@/features/events/eventsApi';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { Icons } from '@/components/ui/Icon';

/* ─── Helpers ─────────────────────────────────────── */

function isoToLocalInput(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    // <input type="datetime-local"> wants "YYYY-MM-DDTHH:MM" in local time.
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToIso(value) {
    if (!value) return null;
    // Naïve: drop the timezone offset and send as local ISO. Backend stores
    // LocalDateTime (no zone), so this matches.
    return value.length === 16 ? `${value}:00` : value;
}

function formatRange(startIso, endIso) {
    if (!startIso) return '';
    const start = new Date(startIso);
    if (Number.isNaN(start.getTime())) return '';
    const startStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    if (!endIso) return startStr;
    const end = new Date(endIso);
    if (Number.isNaN(end.getTime())) return startStr;
    const endStr = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${startStr} – ${endStr}`;
}

function dayLabel(day) {
    if (day.title) return day.title;
    if (day.dayNumber) return `Day ${day.dayNumber}`;
    return 'Day';
}

/* ─── Empty state ─────────────────────────────────── */
function EmptyState({ onAdd }) {
    return (
        <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{
                width: 56, height: 56, borderRadius: 99,
                margin: '0 auto 14px',
                background: 'var(--surface-subtle)',
                display: 'grid', placeItems: 'center',
                color: 'var(--text-3)',
            }}>
                <Icons.calendar size={22} />
            </div>
            <div className="mp-h4" style={{ color: 'var(--text-1)', margin: 0 }}>
                No agenda yet
            </div>
            <div className="body" style={{ color: 'var(--text-2)', marginTop: 6 }}>
                Add your first session — keynote, panel, break, anything.
            </div>
            <Button
                variant="primary"
                size="md"
                icon={<Icons.plus size={14} />}
                onClick={onAdd}
                style={{ marginTop: 18 }}
            >
                Add session
            </Button>
        </div>
    );
}

/* ─── Edit modal ──────────────────────────────────── */
function EditModal({ open, draft, days, onChange, onSave, onDelete, onClose, saving, deleting }) {
    return (
        <Modal open={open} onClose={onClose} width={520} label="Session details">
            {draft && (
                <div style={{ padding: 24 }}>
                    <h3 className="mp-h3" style={{ margin: 0, color: 'var(--text-1)' }}>
                        {draft._isNew ? 'Add session' : 'Edit session'}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 18 }}>
                        <Input
                            label="Session title"
                            value={draft.title}
                            onChange={(e) => onChange({ ...draft, title: e.target.value })}
                            placeholder="Opening keynote"
                        />
                        <Input
                            label="Description"
                            value={draft.description || ''}
                            onChange={(e) => onChange({ ...draft, description: e.target.value })}
                            placeholder="What this session covers"
                        />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <Input
                                label="Speaker / facilitator"
                                value={draft.speakerName || ''}
                                onChange={(e) => onChange({ ...draft, speakerName: e.target.value })}
                                placeholder="Adaeze Okonkwo"
                            />
                            <Input
                                label="Speaker bio"
                                value={draft.speakerBio || ''}
                                onChange={(e) => onChange({ ...draft, speakerBio: e.target.value })}
                                placeholder="Head of Product"
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <Input
                                label="Start"
                                type="datetime-local"
                                value={draft.startTime || ''}
                                onChange={(e) => onChange({ ...draft, startTime: e.target.value })}
                            />
                            <Input
                                label="End"
                                type="datetime-local"
                                value={draft.endTime || ''}
                                onChange={(e) => onChange({ ...draft, endTime: e.target.value })}
                            />
                        </div>
                        {days.length > 1 && (
                            <label style={{ display: 'block' }}>
                                <span style={{
                                    display: 'block', fontSize: 14, fontWeight: 500,
                                    color: 'var(--text-1)', marginBottom: 6,
                                }}>
                                    Day
                                </span>
                                <select
                                    value={draft.eventDayId || ''}
                                    onChange={(e) => onChange({ ...draft, eventDayId: e.target.value || null })}
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        fontFamily: 'inherit',
                                        fontSize: 15,
                                        border: '1px solid var(--border)',
                                        borderRadius: 8,
                                        background: 'white',
                                        color: 'var(--text-1)',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <option value="">Spans whole event</option>
                                    {days.map((d) => (
                                        <option key={d.id} value={d.id}>{dayLabel(d)}</option>
                                    ))}
                                </select>
                            </label>
                        )}
                        <Input
                            label="Display order"
                            type="number"
                            value={String(draft.displayOrder ?? 0)}
                            onChange={(e) => onChange({ ...draft, displayOrder: Number(e.target.value) || 0 })}
                            hint="Lower numbers appear first when start times tie."
                        />
                    </div>
                    <div style={{
                        display: 'flex', justifyContent: 'space-between',
                        marginTop: 22, alignItems: 'center',
                    }}>
                        {!draft._isNew ? (
                            <Button
                                variant="ghost"
                                size="md"
                                onClick={onDelete}
                                disabled={saving || deleting}
                                style={{ color: 'var(--error)' }}
                            >
                                {deleting ? 'Deleting…' : 'Delete'}
                            </Button>
                        ) : <span />}
                        <div style={{ display: 'flex', gap: 8 }}>
                            <Button variant="ghost" size="md" onClick={onClose} disabled={saving || deleting}>
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                size="md"
                                onClick={onSave}
                                disabled={saving || deleting || !draft.title?.trim()}
                            >
                                {saving ? 'Saving…' : (draft._isNew ? 'Add session' : 'Save')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </Modal>
    );
}

/* ─── Tab ─────────────────────────────────────────── */
export default function ProgrammeTab({ eventId, event }) {
    const items = useGetProgrammeQuery(eventId);
    const [addItem,    addState]    = useAddProgrammeItemMutation();
    const [updateItem, updateState] = useUpdateProgrammeItemMutation();
    const [deleteItem, deleteState] = useDeleteProgrammeItemMutation();
    const [updateConfig, configState] = useUpdateEventConfigMutation();

    const [draft, setDraft]   = useState(null);
    const [error, setError]   = useState('');

    // Days come from the event response. Single-day events have a single
    // (or zero) entries — we still allow per-day grouping in the UI.
    const days = useMemo(() => event?.days || [], [event?.days]);
    const daysById = useMemo(() => {
        const map = {};
        for (const d of days) map[d.id] = d;
        return map;
    }, [days]);

    const grouped = useMemo(() => {
        const list = items.data || [];
        if (days.length <= 1) {
            const sorted = [...list].sort(sortItems);
            return [{ id: 'all', label: 'Agenda', items: sorted }];
        }
        const groups = days.map((d) => ({
            id: d.id,
            label: dayLabel(d),
            items: [],
        }));
        const unscoped = { id: '_unscoped', label: 'All days', items: [] };
        for (const it of list) {
            if (it.eventDayId && daysById[it.eventDayId]) {
                groups.find((g) => g.id === it.eventDayId).items.push(it);
            } else {
                unscoped.items.push(it);
            }
        }
        for (const g of groups) g.items.sort(sortItems);
        unscoped.items.sort(sortItems);
        return unscoped.items.length > 0 ? [unscoped, ...groups] : groups;
    }, [items.data, days, daysById]);

    const totalCount = (items.data || []).length;

    function openAdd(eventDayId = null) {
        setError('');
        setDraft({
            _isNew: true,
            title: '',
            description: '',
            speakerName: '',
            speakerBio: '',
            startTime: '',
            endTime: '',
            displayOrder: 0,
            eventDayId,
        });
    }

    function openEdit(item) {
        setError('');
        setDraft({
            _isNew: false,
            id: item.id,
            title: item.title || '',
            description: item.description || '',
            speakerName: item.speakerName || '',
            speakerBio: item.speakerBio || '',
            startTime: isoToLocalInput(item.startTime),
            endTime: isoToLocalInput(item.endTime),
            displayOrder: item.displayOrder ?? 0,
            eventDayId: item.eventDayId || null,
        });
    }

    async function save() {
        if (!draft?.title?.trim()) return;
        setError('');
        const payload = {
            title: draft.title.trim(),
            description: draft.description?.trim() || null,
            speakerName: draft.speakerName?.trim() || null,
            speakerBio: draft.speakerBio?.trim() || null,
            startTime: localInputToIso(draft.startTime),
            endTime: localInputToIso(draft.endTime),
            displayOrder: draft.displayOrder ?? 0,
            eventDayId: draft.eventDayId || null,
        };
        try {
            if (draft._isNew) {
                await addItem({ eventId, ...payload }).unwrap();
            } else {
                await updateItem({ eventId, itemId: draft.id, ...payload }).unwrap();
            }
            setDraft(null);
        } catch (err) {
            setError(err?.data?.message || 'Could not save session.');
        }
    }

    async function remove() {
        if (!draft?.id) return;
        setError('');
        try {
            await deleteItem({ eventId, itemId: draft.id }).unwrap();
            setDraft(null);
        } catch (err) {
            setError(err?.data?.message || 'Could not delete session.');
        }
    }

    async function enableProgrammeModule() {
        setError('');
        try {
            await updateConfig({ eventId, programmeEnabled: true }).unwrap();
            items.refetch();
        } catch (err) {
            setError(err?.data?.message || 'Could not enable programme module.');
        }
    }

    if (items.isLoading) return <Skeleton />;

    // Backend gates the programme module per-event via EventConfig.
    // When it's off, the GET returns 409 with "programme is not enabled
    // for this event". Detect that and offer to flip the flag.
    const errStatus = items.error?.status;
    const errMsg    = items.error?.data?.message ?? items.error?.data?.errors?.[0] ?? '';
    // Backend returns 409 when the module is explicitly off, and 404 when
    // EventConfig doesn't exist yet (event was created before config row existed).
    // Both states mean the module hasn't been turned on — offer the same enable CTA.
    const notEnabled = items.isError && (
        (errStatus === 409 && /not enabled/i.test(errMsg)) ||
        (errStatus === 404 && /config not found|not found/i.test(errMsg))
    );

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
                    <Icons.calendar size={22} />
                </div>
                <div className="mp-h3" style={{ color: 'var(--text-1)', margin: 0 }}>
                    Programme module is off
                </div>
                <p className="body" style={{ color: 'var(--text-2)', marginTop: 8 }}>
                    Turn it on to publish a run-of-show — keynote, panels, breaks,
                    speakers and timing — that attendees see on the public event page.
                </p>
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
                <Button
                    variant="primary"
                    size="md"
                    icon={<Icons.bolt size={14} />}
                    onClick={enableProgrammeModule}
                    disabled={configState.isLoading}
                    style={{ marginTop: 18 }}
                >
                    {configState.isLoading ? 'Enabling…' : 'Enable programme'}
                </Button>
            </div>
        );
    }

    if (items.isError) {
        // If programme is disabled, show enable button instead of retry
        const isNotEnabledMsg = /not enabled/i.test(errMsg);
        if (isNotEnabledMsg) {
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
                        <Icons.calendar size={22} />
                    </div>
                    <div className="mp-h3" style={{ color: 'var(--text-1)', margin: 0 }}>
                        Programme module is off
                    </div>
                    <p className="body" style={{ color: 'var(--text-2)', marginTop: 8 }}>
                        Turn it on to publish a run-of-show — keynote, panels, breaks,
                        speakers and timing — that attendees see on the public event page.
                    </p>
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
                    <Button
                        variant="primary"
                        size="md"
                        icon={<Icons.bolt size={14} />}
                        onClick={enableProgrammeModule}
                        disabled={configState.isLoading}
                        style={{ marginTop: 18 }}
                    >
                        {configState.isLoading ? 'Enabling…' : 'Enable programme'}
                    </Button>
                </div>
            );
        }

        return (
            <div style={{
                background: 'white', border: '1px solid var(--border)',
                borderRadius: 12, padding: 40, textAlign: 'center',
            }}>
                <Icons.alert size={28} style={{ color: 'var(--error)' }} />
                <p className="body-sm" style={{ marginTop: 8, color: 'var(--text-2)' }}>
                    {errMsg || 'Could not load the agenda.'}
                </p>
                <Button variant="secondary" size="sm" onClick={items.refetch} style={{ marginTop: 12 }}>
                    Retry
                </Button>
            </div>
        );
    }

    return (
        <>
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
                }}>
                    <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>Run of show</div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                            {totalCount} session{totalCount !== 1 ? 's' : ''}
                            {days.length > 1 && ` · ${days.length} days`}
                        </div>
                    </div>
                    <Button
                        size="sm"
                        variant="primary"
                        icon={<Icons.plus size={14} />}
                        onClick={() => openAdd(days[0]?.id ?? null)}
                    >
                        Add session
                    </Button>
                </div>

                {error && (
                    <div role="alert" style={{
                        margin: '12px 20px 0',
                        padding: '10px 12px',
                        background: 'var(--error-bg, #FBE9E9)',
                        color: 'var(--error)',
                        borderRadius: 8,
                        fontSize: 13,
                    }}>
                        {error}
                    </div>
                )}

                {totalCount === 0 ? (
                    <EmptyState onAdd={() => openAdd(days[0]?.id ?? null)} />
                ) : (
                    grouped.map((group) => (
                        <div key={group.id}>
                            {grouped.length > 1 && (
                                <div style={{
                                    padding: '14px 20px',
                                    background: 'var(--surface-subtle)',
                                    borderTop: '1px solid var(--border)',
                                    borderBottom: '1px solid var(--border)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                }}>
                                    <span style={{
                                        fontSize: 12, fontWeight: 700,
                                        color: 'var(--text-3)',
                                        letterSpacing: 0.5,
                                        textTransform: 'uppercase',
                                    }}>
                                        {group.label}
                                    </span>
                                    <span className="mp-num" style={{ fontSize: 12, color: 'var(--text-3)' }}>
                                        {group.items.length} session{group.items.length !== 1 ? 's' : ''}
                                    </span>
                                </div>
                            )}

                            {group.items.length === 0 ? (
                                <div style={{
                                    padding: 24,
                                    textAlign: 'center',
                                    color: 'var(--text-3)',
                                    fontSize: 13,
                                    borderBottom: '1px solid var(--border)',
                                }}>
                                    No sessions for {group.label.toLowerCase()} yet.
                                </div>
                            ) : group.items.map((it, i) => (
                                <SessionRow
                                    key={it.id}
                                    item={it}
                                    isLast={i === group.items.length - 1}
                                    onEdit={() => openEdit(it)}
                                />
                            ))}

                            {group.id !== '_unscoped' && (
                                <button
                                    onClick={() => openAdd(group.id === 'all' ? (days[0]?.id ?? null) : group.id)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 20px',
                                        textAlign: 'left',
                                        background: 'transparent',
                                        border: 0,
                                        borderBottom: '1px solid var(--border)',
                                        color: 'var(--mp-blue)',
                                        fontSize: 13,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        fontFamily: 'inherit',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                    }}
                                >
                                    <Icons.plus size={13} /> Add session
                                    {grouped.length > 1 && ` to ${group.label}`}
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>

            <EditModal
                open={!!draft}
                draft={draft}
                days={days}
                onChange={setDraft}
                onSave={save}
                onDelete={remove}
                onClose={() => setDraft(null)}
                saving={addState.isLoading || updateState.isLoading}
                deleting={deleteState.isLoading}
            />
        </>
    );
}

/* ─── Row ─────────────────────────────────────────── */
function SessionRow({ item, isLast, onEdit }) {
    const time = formatRange(item.startTime, item.endTime);
    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: '120px 1fr auto',
            gap: 16,
            alignItems: 'flex-start',
            padding: '14px 20px',
            borderBottom: isLast ? 0 : '1px solid var(--border)',
        }}>
            <div className="mp-num" style={{
                fontSize: 13, fontWeight: 600,
                color: time ? 'var(--text-1)' : 'var(--text-3)',
                paddingTop: 2,
            }}>
                {time || '—'}
            </div>
            <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>
                    {item.title}
                </div>
                {(item.speakerName || item.description) && (
                    <div style={{
                        display: 'flex', gap: 8, marginTop: 4,
                        fontSize: 12, color: 'var(--text-2)', flexWrap: 'wrap',
                    }}>
                        {item.speakerName && (
                            <span style={{
                                display: 'inline-flex', alignItems: 'center',
                                gap: 4, color: 'var(--text-2)',
                            }}>
                                <Icons.users size={11} style={{ color: 'var(--text-3)' }} />
                                {item.speakerName}
                                {item.speakerBio && (
                                    <span style={{ color: 'var(--text-3)' }}> · {item.speakerBio}</span>
                                )}
                            </span>
                        )}
                        {item.description && (
                            <span style={{ color: 'var(--text-3)' }}>· {item.description}</span>
                        )}
                    </div>
                )}
            </div>
            <button
                onClick={onEdit}
                style={{
                    background: 'var(--surface-subtle)',
                    border: '1px solid var(--border)',
                    padding: '4px 10px',
                    borderRadius: 6,
                    fontSize: 12,
                    color: 'var(--text-2)',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                }}
            >
                Edit
            </button>
        </div>
    );
}

function sortItems(a, b) {
    // Sort by start time first, then display order as tiebreaker.
    const at = a.startTime ? new Date(a.startTime).getTime() : Infinity;
    const bt = b.startTime ? new Date(b.startTime).getTime() : Infinity;
    if (at !== bt) return at - bt;
    return (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
}

function Skeleton() {
    const row = {
        height: 60,
        background: 'var(--surface-subtle)',
        borderBottom: '1px solid var(--border)',
        animation: 'mp-flash 1.6s ease-in-out infinite',
    };
    return (
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
    );
}
