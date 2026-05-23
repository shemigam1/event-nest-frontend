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
    selectActiveWorkspace,
    selectVendorModeActive,
    setActiveWorkspace,
    setVendorModeActive,
} from '@/features/auth/authSlice';
import { useGetMyNotificationsQuery, useGetUnreadNotificationCountQuery, useMarkNotificationAsReadMutation } from '@/features/notifications/notificationsApi';
import { Icons } from './Icon';
import { SidebarContext, useSidebar } from './sidebarContext';
import TopBar from './TopBar';

/* ── Navigation items ───────────────────────────────────────────────────────
   The app now has ONE unified user workspace (browse + my events + create).
   Organiser features (contracts, vendor marketplace, messages) live inside
   the organiser event page — they are no longer global sidebar items.

   Vendor mode is activated via a toggle in the sidebar footer. When active,
   the sidebar swaps to the vendor-specific nav.
   ─────────────────────────────────────────────────────────────────────────── */

const USER_NAV = [
    { icon: Icons.search,   label: 'Browse events', path: '/events' },
    { icon: Icons.calendar, label: 'My events',      path: '/my-events' },
];

const VENDOR_NAV = [
    { icon: Icons.signal,   label: 'Dashboard',      path: '/vendor' },
    { icon: Icons.search,   label: 'Browse events',  path: '/vendor/opportunities' },
    { icon: Icons.lock,     label: 'Contracts',      path: '/vendor/contracts' },
    { icon: Icons.calendar, label: 'My events',      path: '/vendor/applications' },
    { icon: Icons.message,  label: 'Messages',       path: '/messages' },
    { icon: Icons.alert,    label: 'Disputes',       path: '/vendor/disputes', comingSoon: true },
];

const STORAGE_KEY = 'mp-sidebar-collapsed';

export default function AppShell() {
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const location = useLocation();

    const [collapsed, setCollapsed] = useState(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored != null) return stored === '1';
        } catch { /* ignore */ }
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

    const ALWAYS_NO_SIDEBAR = new Set([
        '/', '/login', '/register', '/forgot-password', '/reset-password',
        '/terms', '/privacy',
    ]);
    const p = location.pathname;
    const isCheckinRoute = p === '/checkin' || p.startsWith('/checkin/');
    // Vendor invite landing page renders standalone (no sidebar) — recipient
    // may not yet be signed in, and the page handles its own layout.
    const isVendorInvite = /^\/vendor\/invite\/[^/]+$/.test(p);
    const isPublicBrowsingPage =
        p === '/events' ||
        p === '/vendors' ||
        (/^\/events\/[^/]+$/.test(p) && p !== '/events/new') ||
        /^\/vendors\/[^/]+$/.test(p);

    const isNoSidebarPage =
        ALWAYS_NO_SIDEBAR.has(p) ||
        isCheckinRoute ||
        isVendorInvite ||
        !isAuthenticated;

    if (isNoSidebarPage) {
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
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column',
                }}>
                    <TopBar />
                    <div style={{ flex: 1, minHeight: 0 }}>
                        <Outlet />
                    </div>
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

    const isAuthenticated  = useSelector(selectIsAuthenticated);
    const isAdmin          = useSelector(selectIsAdmin);
    const isCheckinStaff   = useSelector(selectIsCheckinStaff);
    const user             = useSelector(selectCurrentUser);
    const email            = useSelector(selectAuthEmail);
    const activeWorkspace  = useSelector(selectActiveWorkspace);
    const vendorModeActive = useSelector(selectVendorModeActive);

    const { data: notifData } = useGetMyNotificationsQuery(undefined, { skip: !isAuthenticated });
    const { data: unreadCount = 0 } = useGetUnreadNotificationCountQuery(undefined, { skip: !isAuthenticated });
    const [markRead] = useMarkNotificationAsReadMutation();
    const notifications = notifData?.content ?? [];

    const isVendorMode = activeWorkspace === 'VENDOR';

    const displayName = (() => {
        const first = user?.firstName?.trim() || '';
        const last  = user?.lastName?.trim()  || '';
        return (first || last) ? `${first} ${last}`.trim() : (email || 'Account');
    })();
    const initial = (displayName[0] || '?').toUpperCase();

    function go(path) { navigate(path); }

    function handleLogout() {
        dispatch(logout());
        navigate('/login', { replace: true });
    }

    function handleSwitchToVendor() {
        dispatch(setActiveWorkspace('VENDOR'));
        navigate('/vendor');
    }

    function handleExitVendorMode() {
        dispatch(setActiveWorkspace('ATTENDEE'));
        navigate('/events');
    }

    const items = (() => {
        if (isCheckinStaff && !isAdmin) {
            return [{ icon: Icons.scan, label: 'Check-in station', path: '/checkin' }];
        }
        if (isAdmin) {
            return [
                { icon: Icons.signal, label: 'Event moderation', path: '/admin/moderation' },
                { icon: Icons.alert,  label: 'Reports',          path: '/admin/reports' },
                { icon: Icons.shield, label: 'Escrow disputes',  path: '/admin/escrow' },
                { icon: Icons.users,  label: 'Manage users',     path: '/admin/users' },
                { icon: Icons.spark,  label: 'Vendors',          path: '/admin/vendors' },
                { icon: Icons.mail,   label: 'Invite admin',     path: '/admin/invite' },
            ];
        }
        return isVendorMode ? VENDOR_NAV : USER_NAV;
    })();

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
                background: 'var(--surface-elevated)',
                borderRight: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                transition: 'width 0.18s ease',
                overflow: 'hidden',
            }}
        >
            {/* ── Header: collapse toggle ── */}
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

            {/* ── Create event CTA (user mode only, not admin/checkin/vendor) ── */}
            {!isAdmin && !isCheckinStaff && !isVendorMode && (
                <div style={{ padding: collapsed ? '10px 8px' : '10px 12px' }}>
                    <CreateButton collapsed={collapsed} onClick={() => go('/events/new')} />
                </div>
            )}

            {/* ── Nav items ── */}
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
                            comingSoon={item.comingSoon}
                            onClick={() => !item.comingSoon && go(item.path)}
                        />
                    );
                })}
            </nav>

            {/* ── Footer ── */}
            <div style={{
                borderTop: '1px solid var(--border)',
                padding: collapsed ? '10px 8px' : '12px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
            }}>
                {/* Vendor mode section — hidden for admin/checkin */}
                {!isAdmin && !isCheckinStaff && (
                    <VendorModeSection
                        collapsed={collapsed}
                        isVendorMode={isVendorMode}
                        vendorModeActive={vendorModeActive}
                        onToggleVendorMode={(v) => dispatch(setVendorModeActive(v))}
                        onSwitchToVendor={handleSwitchToVendor}
                        onExitVendorMode={handleExitVendorMode}
                    />
                )}

                {/* User info */}
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

/* ─── Vendor mode section ─────────────────────────────────────────────────
   Shown in the sidebar footer above user info, for non-admin users.

   User mode: toggle to activate vendor mode; if active, a "Switch to vendor"
              pill button appears.
   Vendor mode: a single "Exit vendor mode" button to return to user workspace.
   ─────────────────────────────────────────────────────────────────────────── */
function VendorModeSection({ collapsed, isVendorMode, vendorModeActive, onToggleVendorMode, onSwitchToVendor, onExitVendorMode }) {
    if (collapsed) {
        // In collapsed mode show a small indicator icon only
        return (
            <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 4 }}>
                <button
                    title={isVendorMode ? 'Exit vendor mode' : 'Vendor mode'}
                    onClick={isVendorMode ? onExitVendorMode : () => onToggleVendorMode(!vendorModeActive)}
                    style={{
                        width: 32, height: 32, borderRadius: 8,
                        border: `1px solid ${isVendorMode ? 'var(--mp-blue)' : 'var(--border)'}`,
                        background: isVendorMode ? 'var(--mp-blue-50, #EAF1FE)' : 'transparent',
                        color: isVendorMode ? 'var(--mp-blue)' : 'var(--text-3)',
                        cursor: 'pointer',
                        display: 'grid', placeItems: 'center',
                    }}
                >
                    <Icons.spark size={15} />
                </button>
            </div>
        );
    }

    if (isVendorMode) {
        return (
            <div style={{ paddingBottom: 4 }}>
                <button
                    onClick={onExitVendorMode}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        background: 'transparent',
                        color: 'var(--text-2)',
                        fontFamily: 'inherit',
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: 'pointer',
                        textAlign: 'left',
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'var(--surface-subtle)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                    <Icons.chevronL size={14} />
                    Exit vendor mode
                </button>
            </div>
        );
    }

    // User mode: toggle + optional switch button
    return (
        <div style={{
            padding: '8px 4px',
            borderRadius: 10,
            border: vendorModeActive ? '1px solid var(--mp-blue-50, #EAF1FE)' : '1px solid var(--border)',
            background: vendorModeActive ? 'var(--mp-blue-50, #EAF1FE)' : 'var(--surface-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
        }}>
            {/* Toggle row */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 8px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Icons.spark size={14} style={{ color: vendorModeActive ? 'var(--mp-blue)' : 'var(--text-3)' }} />
                    <span style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: vendorModeActive ? 'var(--mp-blue)' : 'var(--text-2)',
                        whiteSpace: 'nowrap',
                    }}>
                        Vendor mode
                    </span>
                </div>
                <ToggleSwitch on={vendorModeActive} onChange={onToggleVendorMode} />
            </div>

            {/* Switch button — only shown when toggle is on */}
            {vendorModeActive && (
                <button
                    onClick={onSwitchToVendor}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 7,
                        border: 0,
                        background: 'var(--mp-blue)',
                        color: 'white',
                        fontFamily: 'inherit',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.opacity = '0.88'; }}
                    onMouseOut={(e) => { e.currentTarget.style.opacity = '1'; }}
                >
                    Switch to vendor
                    <Icons.arrowR size={14} />
                </button>
            )}
        </div>
    );
}

/* ─── Toggle switch ───────────────────────────────────────────── */
function ToggleSwitch({ on, onChange }) {
    return (
        <button
            role="switch"
            aria-checked={on}
            onClick={() => onChange(!on)}
            style={{
                position: 'relative',
                width: 36,
                height: 20,
                borderRadius: 99,
                border: 0,
                background: on ? 'var(--mp-blue)' : 'var(--border)',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'background 0.15s ease',
                padding: 0,
            }}
        >
            <span style={{
                position: 'absolute',
                top: 2,
                left: on ? 18 : 2,
                width: 16,
                height: 16,
                borderRadius: 99,
                background: 'var(--surface-elevated)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                transition: 'left 0.15s ease',
                display: 'block',
            }} />
        </button>
    );
}

/* ─── Pieces ──────────────────────────────────────────────────── */

function SidebarLink({ icon, label, active, collapsed, danger, comingSoon, onClick }) {
    const baseColor   = danger ? 'var(--error)' : 'var(--text-1)';
    const activeBg    = 'var(--mp-blue-50, #EAF1FE)';
    const activeColor = 'var(--mp-blue)';

    const btn = (
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
                cursor: comingSoon ? 'default' : 'pointer',
                textAlign: 'left',
                minWidth: 0,
                filter: comingSoon ? 'blur(1.5px)' : 'none',
                opacity: comingSoon ? 0.45 : 1,
                userSelect: 'none',
            }}
            onMouseOver={(e) => {
                if (!active && !comingSoon) e.currentTarget.style.background = 'var(--surface-subtle)';
            }}
            onMouseOut={(e) => {
                if (!active && !comingSoon) e.currentTarget.style.background = 'transparent';
            }}
        >
            <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center' }}>
                {icon}
            </span>
            {!collapsed && (
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {label}
                </span>
            )}
        </button>
    );

    if (!comingSoon) return btn;

    return (
        <div style={{ position: 'relative' }}>
            {btn}
            <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'flex-end',
                paddingRight: collapsed ? 0 : 10,
                pointerEvents: 'none', borderRadius: 8,
            }}>
                {!collapsed && (
                    <span style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        background: 'var(--mp-blue)', color: 'white',
                        padding: '2px 7px', borderRadius: 99, opacity: 0.9,
                    }}>
                        Soon
                    </span>
                )}
            </div>
        </div>
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
            onMouseOver={(e) => { e.currentTarget.style.opacity = '0.88'; }}
            onMouseOut={(e) => { e.currentTarget.style.opacity = '1'; }}
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
            fontSize: 13, fontWeight: 700, flexShrink: 0,
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
                display: 'flex', alignItems: 'center', gap: 12,
                padding: collapsed ? '10px 0' : '10px 12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                width: '100%', borderRadius: 8, border: 0,
                background: open ? 'var(--surface-subtle)' : 'transparent',
                color: 'var(--text-1)', fontFamily: 'inherit',
                fontSize: 14, fontWeight: 500, cursor: 'pointer',
                textAlign: 'left', minWidth: 0,
            }}
            onMouseOver={(e) => { if (!open) e.currentTarget.style.background = 'var(--surface-subtle)'; }}
            onMouseOut={(e) => { if (!open) e.currentTarget.style.background = 'transparent'; }}
        >
            <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', position: 'relative' }}>
                <Icons.bell size={18} />
                {unread > 0 && (
                    <span style={{
                        position: 'absolute', top: -4, right: -4,
                        minWidth: 16, height: 16, borderRadius: 99,
                        background: 'var(--error, #E53E3E)', color: 'white',
                        fontSize: 10, fontWeight: 700,
                        display: 'grid', placeItems: 'center',
                        padding: '0 3px', lineHeight: 1,
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
                    background: 'rgba(2,16,45,0.25)', zIndex: 58,
                }}
            />
            <aside
                role="dialog"
                aria-label="Notifications"
                style={{
                    position: 'fixed', top: 0, left: sidebarWidth, bottom: 0,
                    width: 'min(360px, calc(100vw - 64px))',
                    background: 'var(--surface-elevated, white)',
                    borderRight: '1px solid var(--border)',
                    boxShadow: '8px 0 24px rgba(2,16,45,0.1)',
                    zIndex: 59, display: 'flex', flexDirection: 'column',
                    animation: 'mp-notif-slide-in 160ms ease-out',
                }}
            >
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 20px', borderBottom: '1px solid var(--border)',
                }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>Notifications</div>
                    <button
                        type="button" aria-label="Close" onClick={onClose}
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
                        <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>
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
                                    padding: '14px 20px', border: 0,
                                    borderBottom: '1px solid var(--border)',
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
                                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4, marginLeft: n.read ? 0 : 15 }}>
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

function isActive(currentPath, target) {
    if (target === '/') return currentPath === '/';
    return currentPath === target || currentPath.startsWith(target + '/');
}
