import { useState } from 'react';
import {
    useGetEventManagersQuery,
    useAssignManagerMutation,
    useRemoveManagerMutation,
} from '../teamApi';
import Button from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icon';

function initials(firstName, lastName) {
    const f = (firstName || '').trim()[0] || '';
    const l = (lastName || '').trim()[0] || '';
    return (f + l).toUpperCase() || '?';
}

function fmtDate(iso) {
    if (!iso) return null;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null
        : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function TeamTab({ eventId, isPublished }) {
    const { data: managers = [], isLoading, isError, refetch } = useGetEventManagersQuery(eventId);
    const [showForm, setShowForm] = useState(false);
    const [pendingRemove, setPendingRemove] = useState(null);
    const [removeManager, removeState] = useRemoveManagerMutation();
    const [removeError, setRemoveError] = useState('');

    async function handleRemove() {
        if (!pendingRemove) return;
        setRemoveError('');
        try {
            await removeManager({ eventId, managerId: pendingRemove.membershipId }).unwrap();
            setPendingRemove(null);
        } catch (err) {
            setRemoveError(err?.data?.message || 'Could not remove manager.');
        }
    }

    if (isLoading) return <Skeleton />;
    if (isError) return <ErrorCard message="Could not load team members." onRetry={refetch} />;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{
                background: 'white', border: '1px solid var(--border)',
                borderRadius: 12, overflow: 'hidden',
            }}>
                <div style={{
                    padding: '16px 20px', borderBottom: '1px solid var(--border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                }}>
                    <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 15 }}>
                            Co-organisers & managers
                        </div>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-3)' }}>
                            Managers can view and edit this event on your behalf.
                        </p>
                    </div>
                    <Button
                        variant="primary" size="md"
                        icon={<Icons.plus size={14} />}
                        onClick={() => setShowForm(true)}
                        disabled={!isPublished}
                        title={!isPublished ? 'Publish the event before adding managers' : ''}
                    >
                        Add manager
                    </Button>
                </div>

                {managers.length === 0 ? (
                    <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                        <Icons.users size={28} style={{ color: 'var(--text-3)' }} />
                        <p className="mp-h4" style={{ margin: '10px 0 4px', color: 'var(--text-1)' }}>
                            No managers yet
                        </p>
                        <p className="body-sm" style={{ color: 'var(--text-2)', margin: 0 }}>
                            Add a co-organiser by email to give them management access to this event.
                        </p>
                    </div>
                ) : (
                    managers.map((m, i) => (
                        <ManagerRow
                            key={m.membershipId}
                            manager={m}
                            isLast={i === managers.length - 1}
                            onRemove={() => setPendingRemove(m)}
                        />
                    ))
                )}
            </div>

            {showForm && (
                <AssignManagerModal eventId={eventId} onDismiss={() => setShowForm(false)} />
            )}

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
                            width: '100%', maxWidth: 400, background: 'white',
                            borderRadius: 16, padding: 28, boxShadow: 'var(--shadow-modal)',
                        }}
                    >
                        <h2 className="mp-h3" style={{ margin: '0 0 8px', color: 'var(--text-1)' }}>
                            Remove manager?
                        </h2>
                        <p className="body-sm" style={{ margin: '0 0 6px', color: 'var(--text-2)' }}>
                            <strong>
                                {pendingRemove.firstName} {pendingRemove.lastName}
                            </strong>{' '}
                            ({pendingRemove.email}) will lose access to this event.
                        </p>
                        {removeError && (
                            <p style={{ fontSize: 13, color: 'var(--error)', margin: '8px 0 0' }}>{removeError}</p>
                        )}
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
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

function ManagerRow({ manager, isLast, onRemove }) {
    const name = `${manager.firstName || ''} ${manager.lastName || ''}`.trim() || manager.email;
    const assigned = fmtDate(manager.assignedAt);
    return (
        <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '14px 20px', gap: 16,
            borderBottom: isLast ? 0 : '1px solid var(--border)',
        }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0 }}>
                <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: 'var(--surface-subtle)', color: 'var(--text-2)',
                    display: 'grid', placeItems: 'center',
                    fontSize: 13, fontWeight: 700,
                }}>
                    {initials(manager.firstName, manager.lastName)}
                </div>
                <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 500, color: 'var(--text-1)', fontSize: 14 }}>
                        {name}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 1 }}>
                        {manager.email}
                        {manager.assignedByName && (
                            <span style={{ color: 'var(--text-3)' }}>
                                {' '}· Added by {manager.assignedByName}
                            </span>
                        )}
                        {assigned && (
                            <span style={{ color: 'var(--text-3)' }}> · {assigned}</span>
                        )}
                    </div>
                </div>
            </div>
            <button
                onClick={onRemove}
                aria-label={`Remove ${name}`}
                style={{
                    background: 'none', border: '1px solid var(--border)',
                    borderRadius: 6, padding: '5px 10px', cursor: 'pointer',
                    fontSize: 12, color: 'var(--error)', fontWeight: 500, flexShrink: 0,
                }}
            >
                Remove
            </button>
        </div>
    );
}

function AssignManagerModal({ eventId, onDismiss }) {
    const [assignManager, state] = useAssignManagerMutation();
    const [email, setEmail] = useState('');
    const [err, setErr] = useState('');

    async function handleSubmit(e) {
        e.preventDefault();
        setErr('');
        try {
            await assignManager({ eventId, email: email.trim() }).unwrap();
            onDismiss();
        } catch (error) {
            setErr(error?.data?.message || 'Could not assign manager. Make sure the email belongs to a registered user.');
        }
    }

    return (
        <div
            role="dialog"
            aria-label="Add manager"
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
                    width: '100%', maxWidth: 440, background: 'white',
                    borderRadius: 16, padding: 28, boxShadow: 'var(--shadow-modal)',
                }}
            >
                <h3 className="mp-h3" style={{ margin: '0 0 8px', color: 'var(--text-1)' }}>
                    Add manager
                </h3>
                <p className="body-sm" style={{ margin: '0 0 20px', color: 'var(--text-2)' }}>
                    Enter the email address of a registered user to give them co-organiser access.
                </p>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                        <label style={{
                            display: 'block', fontSize: 13, fontWeight: 600,
                            color: 'var(--text-1)', marginBottom: 6,
                        }}>
                            Email address *
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="manager@example.com"
                            required
                            style={{
                                width: '100%', padding: '9px 12px', fontSize: 14,
                                border: '1px solid var(--border)', borderRadius: 8,
                                fontFamily: 'inherit', boxSizing: 'border-box',
                                color: 'var(--text-1)', background: 'white',
                            }}
                        />
                    </div>
                    {err && <p style={{ fontSize: 13, color: 'var(--error)', margin: 0 }}>{err}</p>}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                        <Button type="button" variant="secondary" size="md" onClick={onDismiss}>Cancel</Button>
                        <Button type="submit" variant="primary" size="md"
                            disabled={!email.trim() || state.isLoading}>
                            {state.isLoading ? 'Adding…' : 'Add manager'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function ErrorCard({ message, onRetry }) {
    return (
        <div style={{
            background: 'white', border: '1px solid var(--border)',
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
        height: 66, background: 'var(--surface-subtle)',
        borderBottom: '1px solid var(--border)',
        animation: 'mp-flash 1.6s ease-in-out infinite',
    };
    return (
        <div style={{
            background: 'white', border: '1px solid var(--border)',
            borderRadius: 12, overflow: 'hidden',
        }}>
            <div style={{ ...row, height: 60, background: 'white' }} />
            <div style={row} />
            <div style={{ ...row, opacity: 0.6, borderBottom: 0 }} />
        </div>
    );
}
