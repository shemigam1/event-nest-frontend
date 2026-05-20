import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import {
    logout,
    selectIsAuthenticated,
    selectIsAdmin,
    selectIsCheckinStaff,
    selectCurrentUser,
    selectAuthEmail,
} from '@/features/auth/authSlice';
import { useGetMyNotificationsQuery, useGetUnreadNotificationCountQuery, useMarkNotificationAsReadMutation } from '@/features/notifications/notificationsApi';
import { useGetWorkspacesQuery } from '@/features/organiser/organizerApi';
import { Icons } from './Icon';
import { SidebarContext, useSidebar } from './sidebarContext';

const WORKSPACE_NAV = {
    ORGANISER: [
        { icon: Icons.calendar, label: 'My events',         path: '/organiser' },
        { icon: Icons.users,    label: 'Vendor marketplace', path: '/vendors' },
        { icon: Icons.message,  label: 'Messages',           path: '/messages' },
    ],
    MANAGER: [
        { icon: Icons.calendar, label: 'My events',         path: '/organiser' },
        { icon: Icons.users,    label: 'Vendor marketplace', path: '/vendors' },
        { icon: Icons.message,  label: 'Messages',           path: '/messages' },
    ],
    VENDOR: [
        { icon: Icons.signal,   label: 'Dashboard',     path: '/vendor' },
        { icon: Icons.calendar, label: 'Opportunities', path: '/vendor/opportunities' },
        { icon: Icons.list,     label: 'Applications',  path: '/vendor/applications' },
        { icon: Icons.users,    label: 'My profile',    path: '/vendor/profile' },
        { icon: Icons.message,  label: 'Messages',      path: '/messages' },
    ],
    ATTENDEE: [
        { icon: Icons.signal,   label: 'Dashboard',    path: '/dashboard' },
        { icon: Icons.ticket,   label: 'My tickets',   path: '/tickets' },
        { icon: Icons.calendar, label: 'Browse events', path: '/events' },
        { icon: Icons.message,  label: 'Messages',     path: '/messages' },
    ],
};

const WORKSPACE_PRIORITY = ['ORGANISER', 'MANAGER', 'VENDOR', 'ATTENDEE'];

function pickDefaultWorkspace(roles = []) {
    for (const role of WORKSPACE_PRIORITY) {
        if (roles.includes(role)) return role;
    }
    return null;
}

// useSidebar is used inside the Sidebar child component below.

/* ────────────────────────────────────────────────────────────────────────────
   AppShell — top-level layout. Renders a persistent left sidebar (à la the
   Claude desktop app) when the user is signed in, with an outlet for the
   page on the right. The sidebar is retractable to an icon-only rail; the
   collapsed/expanded state is persisted to localStorage so it survives a
   reload, and exposed via context so anything in the page (e.g. the TopNav
   hamburger) can toggle it.

   On anonymous routes the shell renders the outlet full-width — no sidebar.
   Mobile (< 1024px wide) auto-collapses to keep the page readable.
   ──────────────────────────────────────────────────────────────────────── */

const STORAGE_KEY = 'mp-sidebar-collapsed';

export default function AppShell() {
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const location = useLocation();

    // Auto-collapse on small viewports. The user can still toggle, and the
    // toggle persists, but the *initial* render on a phone shouldn't take
    // up half the screen with the sidebar.
    const [collapsed, setCollapsed] = useState(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored != null) return stored === '1';
        } catch {
            /* SSR / disabled storage — fall through */
        }
        return typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches;
    });

    useEffect(() => {
        try { localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0'); } catch { /* ignore */ }
    }, [collapsed]);

    const ctx = useMemo(() => ({
        collapsed,
        toggle: () => setCollapsed((c) => !c),
        setCollapsed,
    }), [collapsed]);

    // Auth pages and the marketing landing page never show the sidebar.
    // Public discovery pages (/events, /vendors and their detail routes)
    // hide the sidebar only when the user is anonymous; authenticated users
    // browsing those pages still get the full shell.
    const ALWAYS_NO_SIDEBAR = new Set(['/', '/login', '/register', '/forgot-password', '/reset-password']);
    const p = location.pathname;
    const isCheckinRoute = p === '/checkin' || p.startsWith('/checkin/');
    const isPublicBrowsingPage =
        p === '/events' ||
        p === '/vendors' ||
        // /events/:id — public event detail (but not /events/new or sub-routes)
        (/^\/events\/[^/]+$/.test(p) && p !== '/events/new') ||
        // /vendors/:id — public vendor profile
        /^\/vendors\/[^/]+$/.test(p);

    const isNoSidebarPage =
        ALWAYS_NO_SIDEBAR.has(p) ||
        isCheckinRoute ||
        (!isAuthenticated && isPublicBrowsingPage);

    if (isNoSidebarPage) {
        // Anonymous flows (landing, public discovery, login, register…) get
        // no sidebar. Still provide the context so consumer components don't
        // throw if they happen to render on a public page.
        return (
            <SidebarContext.Provider value={ctx}>
                <Outlet />
            </SidebarContext.Provider>
        );
    }

    return (
        <SidebarContext.Provider value={ctx}>
            <div style={{
                display: 'flex',
                minHeight: '100vh',
                background: 'var(--surface-subtle)',
            }}>
                <Sidebar />
                <main style={{
                    flex: 1,
                    minWidth: 0, // critical — without this, flex children with
                                  // long content blow past the viewport width
                }}>
                    <Outlet />
                </main>
            </div>
        </SidebarContext.Provider>
    );
}

/* ─── Sidebar ──────────────────────────────────────────────────── */

const EXPANDED_WIDTH = 240;
const COLLAPSED_WIDTH = 64;

function Sidebar() {
    const { collapsed, toggle } = useSidebar();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const location = useLocation();
    const [notifOpen, setNotifOpen] = useState(false);

    const isAdmin        = useSelector(selectIsAdmin);
    const isCheckinStaff = useSelector(selectIsCheckinStaff);
    const user           = useSelector(selectCurrentUser);
    const email          = useSelector(selectAuthEmail);

    const { data: notifData } = useGetMyNotificationsQuery(undefined, { pollingInterval: 60_000 });
    const { data: unreadCount = 0 } = useGetUnreadNotificationCountQuery(undefined, { pollingInterval: 30_000 });
    const [markRead] = useMarkNotificationAsReadMutation();
    const notifications = notifData ?? [];

    const { data: workspaces = [] } = useGetWorkspacesQuery(undefined, {
        skip: isAdmin || (isCheckinStaff && !isAdmin),
    });
    const [activeWorkspace, setActiveWorkspace] = useState(null);

    const resolvedWorkspace = activeWorkspace ?? pickDefaultWorkspace(workspaces);

    const displayName = (() => {
        const first = user?.firstName?.trim() || '';
        const last  = user?.lastName?.trim()  || '';
        return (first || last) ? `${first} ${last}`.trim() : (email || 'Account');
    })();
    const initial = (displayName[0] || '?').toUpperCase();

    function go(path) {
        navigate(path);
    }
    function handleLogout() {
        dispatch(logout());
        navigate('/login', { replace: true });
    }

    const items = (() => {
        if (isCheckinStaff && !isAdmin) {
            return [{ icon: Icons.scan, label: 'Check-in station', path: '/checkin' }];
        }
        if (isAdmin) {
            return [
                { icon: Icons.signal, label: 'Event moderation',    path: '/admin/moderation' },
                { icon: Icons.users,  label: 'Manage users',        path: '/admin/users' },
                { icon: Icons.list,   label: 'Event edit requests', path: '/admin/event-edits' },
                { icon: Icons.mail,   label: 'Invite admin',        path: '/admin/invite' },
            ];
        }
        return WORKSPACE_NAV[resolvedWorkspace] ?? [
            { icon: Icons.calendar, label: 'My events',  path: '/organiser' },
            { icon: Icons.ticket,   label: 'My tickets', path: '/tickets' },
            { icon: Icons.message,  label: 'Messages',   path: '/messages' },
            { icon: Icons.users,    label: 'Vendors',    path: '/vendors' },
        ];
    })();

    // Only show workspace switcher for users who have multiple roles
    const switchableWorkspaces = WORKSPACE_PRIORITY.filter((r) => workspaces.includes(r));
    const showSwitcher = !isAdmin && !isCheckinStaff && switchableWorkspaces.length > 1;

    const width = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

    return (
        <>
        <aside
            aria-label="Primary navigation"
            style={{
                position: 'sticky',
                top: 0,
                alignSelf: 'flex-start',
                height: '100vh',
                width,
                flexShrink: 0,
                background: 'white',
                borderRight: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                transition: 'width 0.18s ease',
                overflow: 'hidden',
            }}
        >
            {/* Header: collapse toggle only */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                padding: '14px 12px',
                borderBottom: '1px solid var(--border)',
                minHeight: 60,
            }}>
                <button
                    onClick={toggle}
                    aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    style={{
                        width: 32, height: 32, borderRadius: 8,
                        border: 0, background: 'transparent',
                        color: 'var(--text-2)', cursor: 'pointer',
                        display: 'grid', placeItems: 'center',
                        flexShrink: 0,
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'var(--surface-subtle)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                    {collapsed ? <Icons.chevronR size={16} /> : <Icons.chevronL size={16} />}
                </button>
            </div>

            {/* Workspace switcher — shown when user has multiple event roles */}
            {showSwitcher && !collapsed && (
                <div style={{
                    padding: '8px 12px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    gap: 4,
                }}>
                    {switchableWorkspaces.map((role) => (
                        <button
                            key={role}
                            onClick={() => setActiveWorkspace(role)}
                            style={{
                                flex: 1,
                                padding: '5px 4px',
                                borderRadius: 6,
                                border: '1px solid',
                                borderColor: resolvedWorkspace === role ? 'var(--mp-blue)' : 'var(--border)',
                                background: resolvedWorkspace === role ? 'var(--mp-blue-50, #EAF1FE)' : 'transparent',
                                color: resolvedWorkspace === role ? 'var(--mp-blue)' : 'var(--text-2)',
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: 'pointer',
                                textTransform: 'capitalize',
                                letterSpacing: '0.02em',
                            }}
                        >
                            {role.charAt(0) + role.slice(1).toLowerCase()}
                        </button>
                    ))}
                </div>
            )}

            {/* Quick "Create event" CTA — only relevant for organiser workspace */}
            {!(isCheckinStaff && !isAdmin) && !isAdmin && resolvedWorkspace !== 'ATTENDEE' && resolvedWorkspace !== 'VENDOR' && (
                <div style={{ padding: collapsed ? '10px 8px' : '10px 12px' }}>
                    <CreateButton collapsed={collapsed} onClick={() => go('/events/new')} />
                </div>
            )}

            {/* Nav items */}
            <nav style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                padding: collapsed ? '4px 8px' : '4px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
            }}>
                {items.map((item) => {
                    const active = isActive(location.pathname, item.path);
                    return (
                        <SidebarLink
                            key={item.path}
                            icon={<item.icon size={18} />}
                            label={item.label}
                            active={active}
                            collapsed={collapsed}
                            onClick={() => go(item.path)}
                        />
                    );
                })}
            </nav>

            {/* Footer: user info + sign out */}
            <div style={{
                borderTop: '1px solid var(--border)',
                padding: collapsed ? '10px 8px' : '12px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
            }}>
                {!collapsed ? (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '6px 4px',
                        minWidth: 0,
                    }}>
                        <Avatar initial={initial} />
                        <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{
                                fontSize: 13, fontWeight: 600, color: 'var(--text-1)',
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>
                                {displayName}
                            </div>
                            {email && email !== displayName && (
                                <div style={{
                                    fontSize: 11, color: 'var(--text-3)',
                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                }}>
                                    {email}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '2px 0' }}>
                        <Avatar initial={initial} />
                    </div>
                )}
                <NotifBell
                    unread={unreadCount}
                    collapsed={collapsed}
                    open={notifOpen}
                    onToggle={() => setNotifOpen((v) => !v)}
                />
                <SidebarLink
                    icon={<Icons.settings size={18} />}
                    label="Settings"
                    active={isActive(location.pathname, '/settings')}
                    collapsed={collapsed}
                    onClick={() => go('/settings')}
                />
                <SidebarLink
                    icon={<Icons.x size={18} />}
                    label="Sign out"
                    collapsed={collapsed}
                    danger
                    onClick={handleLogout}
                />
            </div>
        </aside>

        {notifOpen && (
            <NotifPanel
                notifications={notifications}
                onClose={() => setNotifOpen(false)}
                onMarkRead={markRead}
                sidebarWidth={collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH}
            />
        )}
        </>
    );
}

/* ─── Pieces ──────────────────────────────────────────────────── */

function SidebarLink({ icon, label, active, collapsed, danger, onClick }) {
    const baseColor   = danger ? 'var(--error)' : 'var(--text-1)';
    const activeBg    = 'var(--mp-blue-50, #EAF1FE)';
    const activeColor = 'var(--mp-blue)';
    return (
        <button
            onClick={onClick}
            title={collapsed ? label : undefined}
            aria-current={active ? 'page' : undefined}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: collapsed ? '10px 0' : '10px 12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                width: '100%',
                borderRadius: 8,
                border: 0,
                background: active ? activeBg : 'transparent',
                color: active ? activeColor : baseColor,
                fontFamily: 'inherit',
                fontSize: 14,
                fontWeight: active ? 600 : 500,
                cursor: 'pointer',
                textAlign: 'left',
                minWidth: 0,
            }}
            onMouseOver={(e) => {
                if (!active) e.currentTarget.style.background = 'var(--surface-subtle)';
            }}
            onMouseOut={(e) => {
                if (!active) e.currentTarget.style.background = 'transparent';
            }}
        >
            <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center' }}>
                {icon}
            </span>
            {!collapsed && (
                <span style={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                }}>
                    {label}
                </span>
            )}
        </button>
    );
}

function CreateButton({ collapsed, onClick }) {
    return (
        <button
            onClick={onClick}
            title={collapsed ? 'Create event' : undefined}
            aria-label="Create event"
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                justifyContent: collapsed ? 'center' : 'flex-start',
                width: '100%',
                padding: collapsed ? '10px 0' : '10px 14px',
                background: 'var(--mp-blue)',
                color: 'white',
                border: 0,
                borderRadius: 10,
                fontFamily: 'inherit',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: 'var(--shadow-card, 0 1px 2px rgba(0,0,0,0.05))',
            }}
        >
            <Icons.plus size={16} />
            {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>Create event</span>}
        </button>
    );
}

function Avatar({ initial }) {
    return (
        <span style={{
            width: 32, height: 32, borderRadius: 99,
            background: 'var(--mp-blue)', color: 'white',
            display: 'grid', placeItems: 'center',
            fontSize: 13, fontWeight: 700,
            flexShrink: 0,
        }}>
            {initial}
        </span>
    );
}

function NotifBell({ unread, collapsed, open, onToggle }) {
    return (
        <button
            onClick={onToggle}
            title="Notifications"
            aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
            style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: collapsed ? '10px 0' : '10px 12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                width: '100%',
                borderRadius: 8,
                border: 0,
                background: open ? 'var(--surface-subtle)' : 'transparent',
                color: 'var(--text-1)',
                fontFamily: 'inherit',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left',
                minWidth: 0,
            }}
            onMouseOver={(e) => { if (!open) e.currentTarget.style.background = 'var(--surface-subtle)'; }}
            onMouseOut={(e) => { if (!open) e.currentTarget.style.background = 'transparent'; }}
        >
            <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', position: 'relative' }}>
                <Icons.bell size={18} />
                {unread > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: -4, right: -4,
                        minWidth: 16, height: 16,
                        borderRadius: 99,
                        background: 'var(--error, #E53E3E)',
                        color: 'white',
                        fontSize: 10,
                        fontWeight: 700,
                        display: 'grid',
                        placeItems: 'center',
                        padding: '0 3px',
                        lineHeight: 1,
                    }}>
                        {unread > 99 ? '99+' : unread}
                    </span>
                )}
            </span>
            {!collapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Notifications</span>}
        </button>
    );
}

function NotifPanel({ notifications, onClose, onMarkRead, sidebarWidth }) {
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    function handleClick(n) {
        if (!n.read) onMarkRead(n.id);
        onClose();
    }

    return (
        <>
            <div
                aria-hidden="true"
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0,
                    background: 'rgba(2,16,45,0.25)',
                    zIndex: 58,
                }}
            />
            <aside
                role="dialog"
                aria-label="Notifications"
                style={{
                    position: 'fixed',
                    top: 0,
                    left: sidebarWidth,
                    bottom: 0,
                    width: 'min(360px, calc(100vw - 64px))',
                    background: 'var(--surface-elevated, white)',
                    borderRight: '1px solid var(--border)',
                    boxShadow: '8px 0 24px rgba(2,16,45,0.1)',
                    zIndex: 59,
                    display: 'flex',
                    flexDirection: 'column',
                    animation: 'mp-notif-slide-in 160ms ease-out',
                }}
            >
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 20px', borderBottom: '1px solid var(--border)',
                }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>Notifications</div>
                    <button
                        type="button"
                        aria-label="Close"
                        onClick={onClose}
                        style={{
                            background: 'transparent', border: 0, padding: 6,
                            borderRadius: 6, cursor: 'pointer', color: 'var(--text-2)',
                            display: 'inline-flex',
                        }}
                    >
                        <Icons.x size={16} />
                    </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                        <div style={{
                            padding: 32, textAlign: 'center',
                            color: 'var(--text-3)', fontSize: 14,
                        }}>
                            No notifications yet
                        </div>
                    ) : (
                        notifications.map((n) => (
                            <button
                                key={n.id}
                                type="button"
                                onClick={() => handleClick(n)}
                                style={{
                                    display: 'block', width: '100%', textAlign: 'left',
                                    padding: '14px 20px', border: 0, borderBottom: '1px solid var(--border)',
                                    background: n.read ? 'transparent' : 'var(--mp-blue-50, #EAF1FE)',
                                    cursor: 'pointer',
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = 'var(--surface-subtle)'}
                                onMouseOut={(e) => e.currentTarget.style.background = n.read ? 'transparent' : 'var(--mp-blue-50, #EAF1FE)'}
                            >
                                <div style={{
                                    fontSize: 13, fontWeight: n.read ? 400 : 600,
                                    color: 'var(--text-1)', marginBottom: 3,
                                    display: 'flex', alignItems: 'center', gap: 8,
                                }}>
                                    {!n.read && (
                                        <span style={{
                                            width: 7, height: 7, borderRadius: 99,
                                            background: 'var(--mp-blue)', flexShrink: 0,
                                        }} />
                                    )}
                                    {n.title ?? n.message}
                                </div>
                                {n.title && n.message && (
                                    <div style={{ fontSize: 12, color: 'var(--text-2)', marginLeft: n.read ? 0 : 15 }}>
                                        {n.message}
                                    </div>
                                )}
                                {n.createdAt && (
                                    <div style={{
                                        fontSize: 11, color: 'var(--text-3)', marginTop: 4,
                                        marginLeft: n.read ? 0 : 15,
                                    }}>
                                        {new Date(n.createdAt).toLocaleString()}
                                    </div>
                                )}
                            </button>
                        ))
                    )}
                </div>
            </aside>
            <style>{`
                @keyframes mp-notif-slide-in {
                    from { transform: translateX(-8px); opacity: 0; }
                    to   { transform: translateX(0);    opacity: 1; }
                }
            `}</style>
        </>
    );
}

/* Match the sidebar entry against the current path so the active item
   highlights as you navigate. We avoid pure-prefix matches for "/" so the
   landing route doesn't permanently look "active". */
function isActive(currentPath, target) {
    if (target === '/') return currentPath === '/';
    return currentPath === target || currentPath.startsWith(target + '/');
}
