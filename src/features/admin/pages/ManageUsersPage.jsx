import TopNav from '@/components/ui/TopNav';
import Button from '@/components/ui/Button';
import { RoleBadge } from '@/components/ui/Badge';
import { Icons } from '@/components/ui/Icon';
import { useGetAdminUsersQuery } from '../adminApi';

function Skeleton() {
    const row = { height: 64, borderBottom: '1px solid var(--border)', background: 'var(--surface-subtle)', animation: 'mp-flash 1.6s ease-in-out infinite' };
    return (
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={row} /><div style={{ ...row, opacity: 0.7 }} /><div style={{ ...row, opacity: 0.4, borderBottom: 0 }} />
        </div>
    );
}

export default function ManageUsersPage() {
    const { data, isLoading, isError, refetch } = useGetAdminUsersQuery();
    const users = data?.content ?? [];

    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            <TopNav />
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 80px' }}>
                <div style={{ marginBottom: 28 }}>
                    <h1 className="mp-h1" style={{ margin: 0, color: 'var(--text-1)' }}>Manage Users</h1>
                    <p className="body" style={{ margin: '6px 0 0', color: 'var(--text-2)' }}>
                        View and manage all registered users on the platform.
                    </p>
                </div>

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
                                <p className="body-sm" style={{ color: 'var(--text-2)', margin: 0 }}>Users will appear here once they register.</p>
                            </div>
                        ) : users.map((user, i) => {
                            const joined = new Date(user.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                            return (
                                <div
                                    key={user.id}
                                    data-testid={`user-row-${user.id}`}
                                    style={{
                                        display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 16,
                                        alignItems: 'center', padding: '14px 20px',
                                        borderBottom: i === users.length - 1 ? 0 : '1px solid var(--border)',
                                    }}
                                >
                                    <div>
                                        <div style={{ fontWeight: 500, color: 'var(--text-1)' }}>
                                            {user.firstName} {user.lastName}
                                        </div>
                                        <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
                                            {user.email} · Joined {joined}
                                        </div>
                                    </div>
                                    <RoleBadge role={user.role} />
                                    <div style={{ fontSize: 12, color: user.enabled ? 'var(--success)' : 'var(--error)', fontWeight: 500 }}>
                                        {user.enabled ? 'Active' : 'Disabled'}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
