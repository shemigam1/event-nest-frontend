import { useState } from 'react';
import { useNavigate } from 'react-router';
import Button from '@/components/ui/Button';
import { RoleBadge } from '@/components/ui/Badge';
import { Icons } from '@/components/ui/Icon';
import {
    useGetAdminUsersQuery,
    useEnableUserMutation,
    useDisableUserMutation,
} from '../adminApi';

/* ── Confirm dialog ──────────────────────────────── */
function ConfirmDialog({ user, onConfirm, onDismiss, loading }) {
    if (!user) return null;
    const isDisabling = user.enabled;
    return (
        <div
            role="dialog"
            aria-label={isDisabling ? 'Disable user' : 'Enable user'}
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
                    background: 'var(--surface-elevated)', borderRadius: 16,
                    boxShadow: 'var(--shadow-modal)', padding: 28,
                }}
            >
                <div style={{
                    width: 48, height: 48, borderRadius: 99,
                    background: isDisabling ? 'var(--error-bg)' : 'var(--success-bg)',
                    color: isDisabling ? 'var(--error)' : 'var(--success)',
                    display: 'grid', placeItems: 'center', marginBottom: 18,
                }}>
                    {isDisabling ? <Icons.x size={22} /> : <Icons.check size={22} />}
                </div>

                <h2 className="mp-h3" style={{ margin: '0 0 8px', color: 'var(--text-1)' }}>
                    {isDisabling ? 'Disable account?' : 'Enable account?'}
                </h2>
                <p className="body-sm" style={{ margin: '0 0 6px', color: 'var(--text-2)' }}>
                    <strong>{user.firstName} {user.lastName}</strong> ({user.email})
                </p>
                <p className="body-sm" style={{ margin: '0 0 24px', color: isDisabling ? 'var(--error)' : 'var(--text-2)' }}>
                    {isDisabling
                        ? 'They will immediately lose access to the platform and cannot log in until re-enabled.'
                        : 'They will regain full access to the platform.'}
                </p>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <Button variant="ghost" size="md" onClick={onDismiss} disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        variant={isDisabling ? 'destructive' : 'primary'}
                        size="md"
                        onClick={onConfirm}
                        disabled={loading}
                    >
                        {loading
                            ? (isDisabling ? 'Disabling…' : 'Enabling…')
                            : (isDisabling ? 'Yes, disable' : 'Yes, enable')}
                    </Button>
                </div>
            </div>
        </div>
    );
}

/* ── Skeleton ────────────────────────────────────── */
function Skeleton() {
    const row = { height: 64, borderBottom: '1px solid var(--border)', background: 'var(--surface-subtle)', animation: 'mp-flash 1.6s ease-in-out infinite' };
    return (
        <div style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={row} /><div style={{ ...row, opacity: 0.7 }} /><div style={{ ...row, opacity: 0.4, borderBottom: 0 }} />
        </div>
    );
}

/* ── Page ────────────────────────────────────────── */
export default function ManageUsersPage() {
    const navigate = useNavigate();
    const { data, isLoading, isError, refetch } = useGetAdminUsersQuery();
    const [enableUser, enableState] = useEnableUserMutation();
    const [disableUser, disableState] = useDisableUserMutation();

    const [pendingToggle, setPendingToggle] = useState(null);
    const [actionError, setActionError] = useState('');

    const users = data?.content ?? [];
    const busy = enableState.isLoading || disableState.isLoading;

    async function handleConfirm() {
        if (!pendingToggle) return;
        setActionError('');
        try {
            if (pendingToggle.enabled) await disableUser(pendingToggle.id).unwrap();
            else await enableUser(pendingToggle.id).unwrap();
            setPendingToggle(null);
        } catch (err) {
            setPendingToggle(null);
            setActionError(err?.data?.message || 'Action failed. Please try again.');
        }
    }

    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 80px' }}>
                <div style={{ marginBottom: 28 }}>
                    <h1 className="mp-h1" style={{ margin: 0, color: 'var(--text-1)' }}>Manage Users</h1>
                    <p className="body" style={{ margin: '6px 0 0', color: 'var(--text-2)' }}>
                        View, enable, disable, and audit all platform users.
                    </p>
                </div>

                {actionError && (
                    <div role="alert" style={{ margin: '0 0 16px', padding: '10px 16px', background: 'var(--error-bg)', color: 'var(--error)', borderRadius: 10, fontSize: 14 }}>
                        {actionError}
                    </div>
                )}

                {isLoading && <Skeleton />}

                {isError && (
                    <div role="alert" style={{ padding: 40, textAlign: 'center' }}>
                        <Icons.alert size={28} style={{ color: 'var(--error)' }} />
                        <p className="body-sm" style={{ marginTop: 8, color: 'var(--text-2)' }}>Could not load users.</p>
                        <Button variant="secondary" size="sm" onClick={refetch} style={{ marginTop: 12 }}>Retry</Button>
                    </div>
                )}

                {!isLoading && !isError && (
                    <div style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}>
                        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 14 }}>Platform users</span>
                            <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{data?.totalElements ?? users.length} users</span>
                        </div>

                        {users.length === 0 ? (
                            <div style={{ padding: 40, textAlign: 'center' }}>
                                <Icons.users size={28} style={{ color: 'var(--text-3)' }} />
                                <p className="mp-h4" style={{ margin: '12px 0 4px', color: 'var(--text-1)' }}>No users yet</p>
                            </div>
                        ) : users.map((user, i) => {
                            const joined = new Date(user.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                            const isLast = i === users.length - 1;
                            const isAdmin = user.role === 'ADMIN';
                            const isOrganiser = user.role === 'ORGANISER';

                            return (
                                <div
                                    key={user.id}
                                    data-testid={`user-row-${user.id}`}
                                    className="mp-user-row"
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr auto auto auto',
                                        gap: 12,
                                        alignItems: 'center',
                                        padding: '14px 20px',
                                        borderBottom: isLast ? 0 : '1px solid var(--border)',
                                    }}
                                >
                                    {/* Identity */}
                                    <div>
                                        <div style={{ fontWeight: 500, color: 'var(--text-1)' }}>
                                            {user.firstName} {user.lastName}
                                        </div>
                                        <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
                                            {user.email} · Joined {joined}
                                        </div>
                                    </div>

                                    {/* Role */}
                                    <RoleBadge role={user.role} />

                                    {/* Status chip */}
                                    <button
                                        onClick={() => !isAdmin && setPendingToggle(user)}
                                        disabled={isAdmin || busy}
                                        title={isAdmin ? 'Admin accounts cannot be disabled' : user.enabled ? 'Click to disable' : 'Click to enable'}
                                        style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 6,
                                            padding: '5px 12px', borderRadius: 8,
                                            cursor: isAdmin ? 'default' : 'pointer',
                                            fontSize: 12, fontWeight: 600, border: '1px solid',
                                            opacity: isAdmin ? 0.5 : 1,
                                            borderColor: user.enabled ? 'var(--success)' : 'var(--border)',
                                            background: user.enabled ? 'var(--success-bg)' : 'var(--surface-subtle)',
                                            color: user.enabled ? 'var(--success)' : 'var(--text-3)',
                                            transition: 'all 0.15s',
                                        }}
                                    >
                                        {user.enabled ? 'Active' : 'Disabled'}
                                    </button>

                                    {/* View events (organisers only) */}
                                    {isOrganiser ? (
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            icon={<Icons.calendar size={13} />}
                                            onClick={() => navigate(`/admin/users/${user.id}/events`)}
                                        >
                                            View events
                                        </Button>
                                    ) : (
                                        <div style={{ width: 110 }} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <ConfirmDialog
                user={pendingToggle}
                onConfirm={handleConfirm}
                onDismiss={() => setPendingToggle(null)}
                loading={busy}
            />
        </div>
    );
}
