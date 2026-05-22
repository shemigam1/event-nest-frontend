import { useState } from 'react';
import { useLocation } from 'react-router';
import TopNav from '@/components/ui/TopNav';
import Button from '@/components/ui/Button';
import { RoleBadge } from '@/components/ui/Badge';
import { Icons } from '@/components/ui/Icon';
import {
    useGetAdminEventsQuery,
    useGetAdminUsersQuery,
    useGetAnalyticsQuery,
} from '../adminApi';

/* ── Stat tile ───────────────────────────────────── */
function StatTile({ label, value, icon, sub, testId }) {
    return (
        <div data-testid={testId} style={{
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 20,
            boxShadow: 'var(--shadow-card)',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 13, fontWeight: 500, color: 'var(--text-2)' }}>
                {icon}
                {label}
            </div>
            <div className="mp-num" style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1 }}>
                {value}
            </div>
            {sub && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>{sub}</div>}
        </div>
    );
}

/* ── Users panel ─────────────────────────────────── */
export function UsersPanel() {
    const { data, isLoading, isError, refetch } = useGetAdminUsersQuery();
    const users = Array.isArray(data) ? data : (data?.content ?? []);

    if (isLoading) return <PanelSkeleton />;
    if (isError) return (
        <div role="alert" style={{ padding: 40, textAlign: 'center' }}>
            <Icons.alert size={28} style={{ color: 'var(--error)' }} />
            <p className="body-sm" style={{ marginTop: 8, color: 'var(--text-2)' }}>Could not load users.</p>
            <Button variant="secondary" size="sm" onClick={refetch} style={{ marginTop: 12 }}>Retry</Button>
        </div>
    );

    return (
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 14 }}>Platform users</span>
                <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{users.length} users</span>
            </div>
            {users.map((user, i) => {
                const joined = new Date(user.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                return (
                    <div
                        key={user.id}
                        data-testid={`user-row-${user.id}`}
                        className="mp-user-row"
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr auto auto',
                            gap: 16,
                            alignItems: 'center',
                            padding: '14px 20px',
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
    );
}

/* ── Skeleton ────────────────────────────────────── */
function PanelSkeleton() {
    const row = { height: 72, borderBottom: '1px solid var(--border)', background: 'var(--surface-subtle)', animation: 'mp-flash 1.6s ease-in-out infinite' };
    return (
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={row} />
            <div style={{ ...row, opacity: 0.7 }} />
            <div style={{ ...row, opacity: 0.4, borderBottom: 0 }} />
        </div>
    );
}

/* ── Invite admin panel ──────────────────────────── */
function InviteAdminPanel() {
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);

    function submit(e) {
        e.preventDefault();
        if (!email.trim()) return;
        setSent(true);
        setEmail('');
    }

    return (
        <div style={{ maxWidth: 480 }}>
            <h2 className="mp-h3" style={{ margin: '0 0 6px', color: 'var(--text-1)' }}>Invite admin</h2>
            <p className="body" style={{ margin: '0 0 24px', color: 'var(--text-2)' }}>
                Send an invitation to grant someone admin access to the platform.
            </p>
            {sent && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 16px', borderRadius: 10,
                    background: 'var(--success-bg)', color: 'var(--success)',
                    fontSize: 14, fontWeight: 500, marginBottom: 20,
                }}>
                    <Icons.check size={16} /> Invitation sent successfully.
                </div>
            )}
            <form onSubmit={submit} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                    <input
                        type="email"
                        placeholder="admin@example.com"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setSent(false); }}
                        required
                        style={{
                            width: '100%', height: 44, padding: '0 14px',
                            background: 'white', border: '1px solid var(--border)',
                            borderRadius: 12, fontSize: 15, color: 'var(--text-1)',
                            boxSizing: 'border-box',
                        }}
                    />
                </div>
                <Button type="submit" variant="primary" size="md" icon={<Icons.mail size={15} />}>
                    Send invite
                </Button>
            </form>
            <p style={{ marginTop: 12, fontSize: 12, color: 'var(--text-3)' }}>
                The invitee will receive an email with a link to set up their admin account.
            </p>
        </div>
    );
}

/* ── Page ────────────────────────────────────────── */
export default function AdminPage() {
    const location = useLocation();
    const [tab, setTab] = useState(location.state?.tab ?? 'users');
    const { data: analytics, isLoading: analyticsLoading } = useGetAnalyticsQuery();
    const { data: eventsData } = useGetAdminEventsQuery('PUBLISHED');

    const published = analytics?.eventsByStatus?.PUBLISHED ?? eventsData?.totalElements ?? 0;
    const revenue = analytics
        ? `₦${Number(analytics.totalRevenue).toLocaleString()}`
        : '—';
    const checkIn = analytics
        ? `${Math.round(analytics.checkInRate * 100)}%`
        : '—';

    const TABS = [
        { id: 'users', label: 'Users' },
        { id: 'invite', label: 'Invite admin' },
    ];

    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            <TopNav />
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 80px' }}>
                <div style={{ marginBottom: 24 }}>
                    <h1 className="mp-h1" style={{ margin: 0, color: 'var(--text-1)' }}>Admin</h1>
                    <p className="body" style={{ margin: '6px 0 0', color: 'var(--text-2)' }}>
                        Platform overview and moderation.
                    </p>
                </div>

                {/* Analytics strip */}
                <div className="mp-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
                    <StatTile
                        testId="stat-published"
                        label="Live events"
                        value={analyticsLoading ? '—' : published}
                        icon={<Icons.bolt size={16} />}
                        sub="currently published"
                    />
                    <StatTile
                        testId="stat-revenue"
                        label="Platform revenue"
                        value={analyticsLoading ? '—' : revenue}
                        icon={<Icons.wallet size={16} />}
                    />
                    <StatTile
                        testId="stat-checkin"
                        label="Check-in rate"
                        value={analyticsLoading ? '—' : checkIn}
                        icon={<Icons.scan size={16} />}
                    />
                </div>

                {/* Tab nav */}
                <div
                    data-testid="admin-tabs"
                    className="mp-tab-scroll"
                    style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: 4, width: 'fit-content', maxWidth: '100%' }}
                >
                    {TABS.map(({ id, label }) => {
                        const active = tab === id;
                        return (
                            <button
                                key={id}
                                onClick={() => setTab(id)}
                                style={{
                                    height: 36,
                                    padding: '0 16px',
                                    borderRadius: 8,
                                    border: 'none',
                                    background: active ? 'var(--mp-blue)' : 'transparent',
                                    color: active ? 'white' : 'var(--text-2)',
                                    fontSize: 14,
                                    fontWeight: active ? 600 : 500,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    transition: 'all 0.15s',
                                }}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>

                {tab === 'users' && <UsersPanel />}
                {tab === 'invite' && <InviteAdminPanel />}
            </div>
        </div>
    );
}
