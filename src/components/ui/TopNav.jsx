import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import {
    selectIsAuthenticated,
    selectIsAdmin,
    selectIsCheckinStaff,
    selectCurrentUser,
    selectAuthEmail,
    logout,
} from '@/features/auth/authSlice';
import { baseApi } from '@/services/baseApi';
import Brand from './Brand';
import Button from './Button';
import UserMenu from './UserMenu';
import SidebarPanel from './SidebarPanel';
import { Icons } from './Icon';

/**
 * Shared top navigation bar.
 *
 * variant:
 *   - "light"       white background (used inside the app)
 *   - "transparent" navy/glass header (used over the dark hero)
 */
export default function TopNav({ variant = 'light', showBrowse = true }) {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const isAdmin = useSelector(selectIsAdmin);
    const isCheckinStaff = useSelector(selectIsCheckinStaff);
    const user = useSelector(selectCurrentUser);
    const email = useSelector(selectAuthEmail);
    const onDark = variant === 'transparent';
    const [menuOpen, setMenuOpen] = useState(false);
    // Desktop-only right-side drawer. Triggered by the sidebar icon OR by
    // clicking the avatar pill. Mobile uses the existing menuOpen / slide-down panel.
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const styles = onDark
        ? {
            background: 'rgba(2,16,45,0.92)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
        }
        : {
            background: 'white',
            borderBottom: '1px solid var(--border)',
        };

    const browseStyle = onDark
        ? { color: 'rgba(255,255,255,0.75)' }
        : { color: 'var(--text-2)' };

    const closeMenu = () => setMenuOpen(false);
    const go = (path) => { closeMenu(); navigate(path); };

    const handleLogout = () => {
        dispatch(logout());
        dispatch(baseApi.util.resetApiState());
        closeMenu();
        navigate('/');
    };

    const displayName = user
        ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email
        : email ?? 'Account';

    return (
        <>
            <nav data-testid="topnav" style={{
                position: 'sticky',
                top: 0,
                zIndex: 50,
                padding: '0 24px',
                height: 64,
                display: 'flex',
                alignItems: 'center',
                gap: 24,
                ...styles,
            }}>
                <button
                    onClick={() => navigate('/')}
                    style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }}
                    aria-label="EventNest home"
                >
                    <Brand size={18} color={onDark ? 'white' : undefined} />
                </button>
                <div style={{ flex: 1 }} />

                {/* Desktop nav items */}
                <div className="mp-hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                    {showBrowse && (
                        <button
                            onClick={() => navigate('/events')}
                            style={{
                                background: 'none',
                                border: 0,
                                fontSize: 14,
                                fontWeight: 500,
                                cursor: 'pointer',
                                padding: '8px 0',
                                ...browseStyle,
                            }}
                        >
                            Browse events
                        </button>
                    )}
                    {isAuthenticated && (
                        <Button
                            size="sm"
                            variant={onDark ? 'onDark' : 'secondary'}
                            onClick={() => navigate('/events/new')}
                            icon={<Icons.plus size={14} />}
                        >
                            Create event
                        </Button>
                    )}
                    {isAuthenticated ? (
                        <>
                            {/*
                              Sidebar trigger — separate dedicated icon as
                              well as the avatar both open the right-side
                              drawer on desktop. The old in-place dropdown
                              under the avatar is replaced by the drawer.
                            */}
                            <button
                                type="button"
                                aria-label="Open menu"
                                onClick={() => setSidebarOpen(true)}
                                style={{
                                    background: 'transparent',
                                    border: `1px solid ${onDark ? 'rgba(255,255,255,0.20)' : 'var(--border)'}`,
                                    color: onDark ? 'white' : 'var(--text-1)',
                                    padding: 8,
                                    borderRadius: 8,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    minWidth: 40,
                                    minHeight: 40,
                                }}
                            >
                                <Icons.list size={18} />
                            </button>
                            <UserMenu onDark={onDark} onOpenSidebar={() => setSidebarOpen(true)} />
                        </>
                    ) : (
                        <>
                            <Button
                                size="sm"
                                variant={onDark ? 'onDark' : 'secondary'}
                                onClick={() => navigate('/login')}
                            >
                                Sign in
                            </Button>
                            <Button size="sm" variant="primary" onClick={() => navigate('/register')}>
                                Get started
                            </Button>
                        </>
                    )}
                </div>

                {/* Mobile hamburger */}
                <button
                    type="button"
                    aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                    aria-expanded={menuOpen}
                    onClick={() => setMenuOpen((o) => !o)}
                    className="mp-hide-desktop"
                    style={{
                        background: 'transparent',
                        border: `1px solid ${onDark ? 'rgba(255,255,255,0.20)' : 'var(--border)'}`,
                        color: onDark ? 'white' : 'var(--text-1)',
                        padding: 8,
                        borderRadius: 8,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: 40,
                        minHeight: 40,
                    }}
                >
                    {menuOpen ? <Icons.x size={20} /> : <Icons.list size={20} />}
                </button>
            </nav>

            {/* Desktop right-side drawer (replaces the old avatar dropdown) */}
            {isAuthenticated && (
                <SidebarPanel
                    open={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                />
            )}

            {/* Mobile slide-down panel */}
            {menuOpen && (
                <div
                    className="mp-hide-desktop"
                    role="menu"
                    style={{
                        position: 'sticky',
                        top: 64,
                        zIndex: 49,
                        background: onDark ? 'rgba(2,16,45,0.98)' : 'white',
                        borderBottom: `1px solid ${onDark ? 'rgba(255,255,255,0.08)' : 'var(--border)'}`,
                        padding: 12,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                        boxShadow: 'var(--shadow-card)',
                    }}
                >
                    {showBrowse && (
                        <MobileMenuItem onDark={onDark} onClick={() => go('/events')}>
                            Browse events
                        </MobileMenuItem>
                    )}

                    {!isAuthenticated && (
                        <>
                            <MobileMenuItem onDark={onDark} onClick={() => go('/login')}>
                                Sign in
                            </MobileMenuItem>
                            <MobileMenuItem onDark={onDark} onClick={() => go('/register')} primary>
                                Get started
                            </MobileMenuItem>
                        </>
                    )}

                    {isAuthenticated && (
                        <>
                            <div style={{
                                padding: '10px 12px',
                                fontSize: 12,
                                color: onDark ? 'rgba(255,255,255,0.55)' : 'var(--text-3)',
                                fontWeight: 600,
                                letterSpacing: '0.04em',
                                textTransform: 'uppercase',
                            }}>
                                {displayName}
                            </div>
                            {!isAdmin && !isCheckinStaff && (
                                <>
                                    <MobileMenuItem onDark={onDark} onClick={() => go('/events/new')}>
                                        Create event
                                    </MobileMenuItem>
                                    <MobileMenuItem onDark={onDark} onClick={() => go('/organiser')}>
                                        My events
                                    </MobileMenuItem>
                                    <MobileMenuItem onDark={onDark} onClick={() => go('/tickets')}>
                                        My tickets
                                    </MobileMenuItem>
                                    <MobileMenuItem onDark={onDark} onClick={() => go('/messages')}>
                                        Messages
                                    </MobileMenuItem>
                                    <MobileMenuItem onDark={onDark} onClick={() => go('/checkin')}>
                                        Check-in station
                                    </MobileMenuItem>
                                </>
                            )}
                            {isAdmin && (
                                <>
                                    <MobileMenuItem onDark={onDark} onClick={() => go('/admin/moderation')}>
                                        Event moderation
                                    </MobileMenuItem>
                                    <MobileMenuItem onDark={onDark} onClick={() => go('/admin/users')}>
                                        Manage users
                                    </MobileMenuItem>
                                    <MobileMenuItem onDark={onDark} onClick={() => go('/admin/event-edits')}>
                                        Event edit requests
                                    </MobileMenuItem>
                                    <MobileMenuItem onDark={onDark} onClick={() => go('/admin/invite')}>
                                        Invite admin
                                    </MobileMenuItem>
                                </>
                            )}
                            {isCheckinStaff && !isAdmin && (
                                <MobileMenuItem onDark={onDark} onClick={() => go('/checkin')}>
                                    Check-in station
                                </MobileMenuItem>
                            )}
                            <MobileMenuItem onDark={onDark} onClick={handleLogout} danger>
                                Sign out
                            </MobileMenuItem>
                        </>
                    )}
                </div>
            )}
        </>
    );
}

function MobileMenuItem({ children, onClick, onDark, primary, danger }) {
    const color = danger
        ? 'var(--error)'
        : primary
            ? 'var(--mp-blue)'
            : (onDark ? 'rgba(255,255,255,0.92)' : 'var(--text-1)');
    return (
        <button
            type="button"
            onClick={onClick}
            role="menuitem"
            style={{
                width: '100%',
                textAlign: 'left',
                background: 'transparent',
                border: 0,
                padding: '12px 14px',
                borderRadius: 8,
                fontSize: 15,
                fontWeight: primary || danger ? 600 : 500,
                color,
                cursor: 'pointer',
                minHeight: 44,
            }}
        >
            {children}
        </button>
    );
}
