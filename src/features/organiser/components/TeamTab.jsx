import { useState } from 'react';
import {
    useGetEventManagersQuery,
    useAssignManagerMutation,
    useRemoveManagerMutation,
} from '../organizerApi';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Icons } from '@/components/ui/Icon';

/* Managers panel. Check-in staff is rendered separately on the same tab —
   the OrganizerEventPage stacks <TeamTab /> above the existing
   <CheckInStaffSection /> so each owns its API surface independently. */
export default function TeamTab({ eventId, isPublished = true }) {
    const managers = useGetEventManagersQuery(eventId);
    const [assignManager, assignState] = useAssignManagerMutation();
    const [removeManager, removeState] = useRemoveManagerMutation();

    const [email, setEmail]   = useState('');
    const [error, setError]   = useState('');
    const [pendingRemove, setPendingRemove] = useState(null);

    async function handleAssign(e) {
        e.preventDefault();
        if (!email.trim() || !email.includes('@')) {
            setError('Enter a valid email address.');
            return;
        }
        setError('');
        try {
            await assignManager({ eventId, email: email.trim() }).unwrap();
            setEmail('');
        } catch (err) {
            setError(err?.data?.message || 'Could not assign manager.');
        }
    }

    async function handleRemove() {
        if (!pendingRemove) return;
        setError('');
        try {
            await removeManager({ eventId, managerId: pendingRemove.userId }).unwrap();
            setPendingRemove(null);
        } catch (err) {
            setError(err?.data?.message || 'Could not remove manager.');
        }
    }

    const list = managers.data || [];

    return (
        <div style={{
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: 12,
            overflow: 'hidden',
            marginBottom: 20,
        }}>
            <div style={{
                padding: '14px 20px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>Event managers</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                        Managers can edit details, manage tiers, and view bookings. They cannot delete the event.
                        {!isPublished && ' Publish the event to add managers.'}
                    </div>
                </div>
                <span className="mp-num" style={{
                    fontSize: 12, fontWeight: 600,
                    padding: '4px 10px',
                    background: 'var(--surface-subtle)',
                    color: 'var(--text-2)',
                    borderRadius: 99,
                }}>
                    {list.length} {list.length === 1 ? 'manager' : 'managers'}
                </span>
            </div>

            {/* Assign form */}
            <form
                onSubmit={handleAssign}
                style={{
                    padding: 20,
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-end',
                    flexWrap: 'wrap',
                    opacity: !isPublished ? 0.6 : 1,
                }}
            >
                <div style={{ flex: '1 1 280px', minWidth: 240 }}>
                    <Input
                        label="Add manager by email"
                        type="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError(''); }}
                        placeholder="teammate@company.com"
                        icon={<Icons.mail size={18} />}
                        disabled={!isPublished}
                    />
                </div>
                <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    icon={<Icons.plus size={14} />}
                    disabled={assignState.isLoading || !isPublished}
                    title={!isPublished ? 'Publish the event before adding managers' : ''}
                >
                    {assignState.isLoading ? 'Assigning…' : 'Assign'}
                </Button>
            </form>

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

            {/* List */}
            {managers.isLoading ? (
                <ListSkeleton />
            ) : managers.isError ? (
                <div style={{ padding: 30, textAlign: 'center' }}>
                    <Icons.alert size={24} style={{ color: 'var(--error)' }} />
                    <p className="body-sm" style={{ marginTop: 8, color: 'var(--text-2)' }}>
                        Could not load managers.
                    </p>
                    <Button variant="secondary" size="sm" onClick={managers.refetch} style={{ marginTop: 8 }}>
                        Retry
                    </Button>
                </div>
            ) : list.length === 0 ? (
                <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-3)' }}>
                    <Icons.users size={24} />
                    <p className="body-sm" style={{ marginTop: 8, color: 'var(--text-2)' }}>
                        No managers yet. Add a teammate above to give them access.
                    </p>
                </div>
            ) : (
                <div>
                    {list.map((m, i) => (
                        <ManagerRow
                            key={m.userId}
                            manager={m}
                            isLast={i === list.length - 1}
                            onRemove={() => setPendingRemove(m)}
                            removing={removeState.isLoading && pendingRemove?.userId === m.userId}
                        />
                    ))}
                </div>
            )}

            {pendingRemove && (
                <ConfirmDialog
                    title="Remove manager?"
                    body={
                        <>
                            <strong>{managerName(pendingRemove)}</strong> will lose manager access to this event.
                            They&apos;ll keep any other event roles they have.
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

function ManagerRow({ manager, isLast, onRemove, removing }) {
    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: '40px 1fr auto',
            gap: 14,
            alignItems: 'center',
            padding: '14px 20px',
            borderBottom: isLast ? 0 : '1px solid var(--border)',
        }}>
            <div style={{
                width: 40, height: 40, borderRadius: 99,
                background: 'var(--mp-blue-50, #EAF1FE)',
                color: 'var(--mp-blue)',
                display: 'grid', placeItems: 'center',
                fontSize: 14, fontWeight: 700,
            }}>
                {initials(manager)}
            </div>
            <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>
                    {managerName(manager)}
                </div>
                <div style={{
                    fontSize: 13,
                    color: 'var(--text-3)',
                    display: 'flex',
                    gap: 12,
                    flexWrap: 'wrap',
                }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Icons.mail size={12} />{manager.email}
                    </span>
                    {manager.assignedByName && (
                        <span>· Added by {manager.assignedByName}</span>
                    )}
                </div>
            </div>
            <Button
                size="sm"
                variant="ghost"
                onClick={onRemove}
                disabled={removing}
                style={{ color: 'var(--error)' }}
            >
                {removing ? 'Removing…' : 'Remove'}
            </Button>
        </div>
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

function managerName(m) {
    const name = `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim();
    return name || m.email || 'Manager';
}

function initials(m) {
    const f = (m.firstName || '').trim();
    const l = (m.lastName  || '').trim();
    if (f || l) return `${f[0] ?? ''}${l[0] ?? ''}`.toUpperCase() || '?';
    return (m.email || '?').slice(0, 1).toUpperCase();
}

function ListSkeleton() {
    const row = {
        height: 56,
        background: 'var(--surface-subtle)',
        borderBottom: '1px solid var(--border)',
        animation: 'mp-flash 1.6s ease-in-out infinite',
    };
    return (
        <>
            <div style={row} />
            <div style={{ ...row, opacity: 0.7 }} />
            <div style={{ ...row, opacity: 0.4, borderBottom: 0 }} />
        </>
    );
}
