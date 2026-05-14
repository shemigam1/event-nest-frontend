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
import { Icons } from './Icon';
import { SidebarContext, useSidebar } from './sidebarContext';

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

    // Landing page always renders full-width — no sidebar even when signed in.
    const isLandingPage = location.pathname === '/';

    if (!isAuthenticated || isLandingPage) {
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

    const isAdmin        = useSelector(selectIsAdmin);
    const isCheckinStaff = useSelector(selectIsCheckinStaff);
    const user           = useSelector(selectCurrentUser);
    const email          = useSelector(selectAuthEmail);

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

    // Role-keyed nav lists. Mirrors what SidebarPanel exposed but stripped
    // of the drawer-specific affordances. Admins and check-in-only users
    // see purpose-built lists; everyone else gets the standard organiser /
    // attendee / vendor surface.
    const items = (() => {
        if (isCheckinStaff && !isAdmin) {
            return [
                { icon: Icons.scan,     label: 'Check-in station', path: '/checkin' },
            ];
        }
        if (isAdmin) {
            return [
                { icon: Icons.signal,   label: 'Event moderation',    path: '/admin/moderation' },
                { icon: Icons.users,    label: 'Manage users',        path: '/admin/users' },
                { icon: Icons.list,     label: 'Event edit requests', path: '/admin/event-edits' },
                { icon: Icons.shield,   label: 'Vendor verification', path: '/admin/vendor-verification' },
                { icon: Icons.mail,     label: 'Invite admin',        path: '/admin/invite' },
            ];
        }
        return [
            { icon: Icons.calendar, label: 'My events',  path: '/organiser' },
            { icon: Icons.ticket,   label: 'My tickets', path: '/tickets' },
            { icon: Icons.message,  label: 'Messages',   path: '/messages' },
            { icon: Icons.users,    label: 'Vendors',    path: '/vendors' },
        ];
    })();

    const width = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

    return (
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
            {/* Header: brand + collapse toggle */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'space-between',
                gap: 8,
                padding: collapsed ? '14px 0' : '14px 14px',
                borderBottom: '1px solid var(--border)',
                minHeight: 60,
            }}>
                {!collapsed && (
                    <button
                        onClick={() => go('/')}
                        aria-label="EventNest"
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 10,
                            background: 'transparent', border: 0, padding: 0,
                            cursor: 'pointer', fontFamily: 'inherit',
                            minWidth: 0,
                        }}
                    >
                        <span style={{
                            width: 28, height: 28, borderRadius: 8,
                            background: 'var(--mp-blue)', color: 'white',
                            display: 'grid', placeItems: 'center',
                            fontSize: 14, fontWeight: 700,
                            flexShrink: 0,
                        }}>
                            N
                        </span>
                        <span style={{
                            fontSize: 16, fontWeight: 700, color: 'var(--text-1)',
                            letterSpacing: '-0.02em',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}>
                            EventNest
                        </span>
                    </button>
                )}
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
                    {/* The icon's chevron points "out" — toward where the
                        panel will move when toggled. */}
                    {collapsed ? <Icons.chevronR size={16} /> : <Icons.chevronL size={16} />}
                </button>
            </div>

            {/* Quick "Create event" CTA — hidden for check-in-only roles. */}
            {!(isCheckinStaff && !isAdmin) && !isAdmin && (
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
                <SidebarLink
                    icon={<Icons.x size={18} />}
                    label="Sign out"
                    collapsed={collapsed}
                    danger
                    onClick={handleLogout}
                />
            </div>
        </aside>
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

/* Match the sidebar entry against the current path so the active item
   highlights as you navigate. We avoid pure-prefix matches for "/" so the
   landing route doesn't permanently look "active". */
function isActive(currentPath, target) {
    if (target === '/') return currentPath === '/';
    return currentPath === target || currentPath.startsWith(target + '/');
}
