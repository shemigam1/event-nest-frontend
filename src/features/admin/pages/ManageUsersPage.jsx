import { useState } from 'react';
import { useNavigate } from 'react-router';
import TopNav from '@/components/ui/TopNav';
import Button from '@/components/ui/Button';
import { RoleBadge } from '@/components/ui/Badge';
import { Icons } from '@/components/ui/Icon';
import {
    useGetAdminUsersQuery,
    useEnableUserMutation,
    useDisableUserMutation,
} from '../adminApi';

function Skeleton() {
    const row = { height: 64, borderBottom: '1px solid var(--border)', background: 'var(--surface-subtle)', animation: 'mp-flash 1.6s ease-in-out infinite' };
    return (
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={row} /><div style={{ ...row, opacity: 0.7 }} /><div style={{ ...row, opacity: 0.4, borderBottom: 0 }} />
        </div>
    );
}

export default function ManageUsersPage() {
    const navigate = useNavigate();
    const { data, isLoading, isError, refetch } = useGetAdminUsersQuery();
    const [enableUser, enableState] = useEnableUserMutation();
    const [disableUser, disableState] = useDisableUserMutation();
    const [actionUserId, setActionUserId] = useState(null);
    const [actionError, setActionError] = useState('');

    const users = data?.content ?? [];
    const busy = enableState.isLoading || disableState.isLoading;

    async function toggleEnabled(user) {
        setActionUserId(user.id);
        setActionError('');
        try {
            if (user.enabled) await disableUser(user.id).unwrap();
            else await enableUser(user.id).unwrap();
        } catch (err) {
            setActionError(err?.data?.message || 'Action failed. Please try again.');
        } finally {
            setActionUserId(null);
        }
    }

    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            <TopNav />
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
                    <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}>
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
                            const isOrganiser = user.role === 'ORGANISER';
                            const isTogglingThis = busy && actionUserId === user.id;

                            return (
                                <div
                                    key={user.id}
                                    data-testid={`user-row-${user.id}`}
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

                                    {/* Status + toggle */}
                                    <button
                                        onClick={() => toggleEnabled(user)}
                                        disabled={busy || user.role === 'ADMIN'}
                                        title={user.role === 'ADMIN' ? 'Cannot disable admin accounts' : user.enabled ? 'Disable user' : 'Enable user'}
                                        style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 6,
                                            padding: '5px 12px', borderRadius: 8, cursor: user.role === 'ADMIN' ? 'default' : 'pointer',
                                            fontSize: 12, fontWeight: 600, border: '1px solid',
                                            opacity: (busy && actionUserId !== user.id) || user.role === 'ADMIN' ? 0.5 : 1,
                                            borderColor: user.enabled ? 'var(--success)' : 'var(--border)',
                                            background: user.enabled ? 'var(--success-bg)' : 'var(--surface-subtle)',
                                            color: user.enabled ? 'var(--success)' : 'var(--text-3)',
                                            transition: 'all 0.15s',
                                        }}
                                    >
                                        {isTogglingThis ? '…' : user.enabled ? 'Active' : 'Disabled'}
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
        </div>
    );
}
