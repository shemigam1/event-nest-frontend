import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import {
    logout,
    selectAuthEmail,
    selectCurrentUser,
    selectIsAdmin,
    selectIsCheckinStaff,
} from '@/features/auth/authSlice';
import { baseApi } from '@/services/baseApi';
import { Icons } from './Icon';

/**
 * Right-side slide-in panel that replaces the avatar dropdown on desktop.
 * Mobile keeps its own slide-down panel inside {@code TopNav}.
 *
 * Open/close state is owned by {@code TopNav}; this component is purely a
 * rendered overlay + content. Closes on:
 *   - backdrop click
 *   - close button
 *   - escape key
 *   - any nav action (handled by go())
 */
export default function SidebarPanel({ open, onClose }) {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const user = useSelector(selectCurrentUser);
    const email = useSelector(selectAuthEmail);
    const isAdmin = useSelector(selectIsAdmin);
    const isCheckinStaff = useSelector(selectIsCheckinStaff);

    // ESC to close. Also prevent body scroll while open.
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prev;
        };
    }, [open, onClose]);

    if (!open) return null;

    const initial = (user?.firstName?.[0] ?? email?.[0] ?? 'U').toUpperCase();
    const displayName = user
        ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email
        : email ?? 'Account';

    const go = (path) => { onClose(); navigate(path); };

    const handleLogout = () => {
        dispatch(logout());
        dispatch(baseApi.util.resetApiState());
        onClose();
        navigate('/');
    };

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                aria-hidden="true"
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(2, 16, 45, 0.35)',
                    backdropFilter: 'blur(2px)',
                    zIndex: 60,
                }}
            />

            {/* Drawer */}
            <aside
                role="dialog"
                aria-label="Account menu"
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    bottom: 0,
                    width: 'min(360px, 90vw)',
                    background: 'white',
                    // Flip the shadow direction so the depth still falls
                    // away from the panel edge that's "in" the page.
                    boxShadow: '12px 0 32px rgba(2, 16, 45, 0.12)',
                    zIndex: 61,
                    display: 'flex',
                    flexDirection: 'column',
                    animation: 'mp-sidebar-slide-in 180ms ease-out',
                }}
            >
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '20px 20px 16px',
                    borderBottom: '1px solid var(--border)',
                }}>
                    <span style={{
                        width: 40, height: 40, borderRadius: 99,
                        background: isAdmin ? 'var(--text-1)' : 'var(--mp-blue)',
                        color: 'white',
                        display: 'grid', placeItems: 'center',
                        fontSize: 16, fontWeight: 700,
                    }}>{initial}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            fontSize: 14, fontWeight: 600, color: 'var(--text-1)',
                        }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {displayName}
                            </span>
                            {isAdmin && (
                                <span style={{
                                    fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
                                    padding: '2px 6px', borderRadius: 4,
                                    background: 'var(--text-1)', color: 'white',
                                    flexShrink: 0,
                                }}>
                                    ADMIN
                                </span>
                            )}
                        </div>
                        {email && email !== displayName && (
                            <div style={{
                                fontSize: 12, color: 'var(--text-3)', marginTop: 2,
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>{email}</div>
                        )}
                    </div>
                    <button
                        type="button"
                        aria-label="Close"
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 0,
                            padding: 8,
                            borderRadius: 8,
                            cursor: 'pointer',
                            color: 'var(--text-2)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Icons.x size={18} />
                    </button>
                </div>

                {/* Body — nav items */}
                <nav style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                }}>
                    {isCheckinStaff && !isAdmin ? (
                        <SidebarItem icon={<Icons.scan size={18} />} onClick={() => go('/checkin')}>
                            Check-in station
                        </SidebarItem>
                    ) : isAdmin ? (
                        <>
                            <SidebarItem icon={<Icons.signal size={18} />} onClick={() => go('/admin/moderation')}>
                                Event moderation
                            </SidebarItem>
                            <SidebarItem icon={<Icons.users size={18} />} onClick={() => go('/admin/users')}>
                                Manage users
                            </SidebarItem>
                            <SidebarItem icon={<Icons.list size={18} />} onClick={() => go('/admin/event-edits')}>
                                Event edit requests
                            </SidebarItem>
                            <SidebarItem icon={<Icons.mail size={18} />} onClick={() => go('/admin/invite')}>
                                Invite admin
                            </SidebarItem>
                        </>
                    ) : (
                        <>
                            <SidebarItem icon={<Icons.calendar size={18} />} onClick={() => go('/organiser')}>
                                My events
                            </SidebarItem>
                            <SidebarItem icon={<Icons.ticket size={18} />} onClick={() => go('/tickets')}>
                                My tickets
                            </SidebarItem>
                            <SidebarItem icon={<Icons.message size={18} />} onClick={() => go('/messages')}>
                                Messages
                            </SidebarItem>
                            {/* Single Vendors entry — marketplace lives at /vendors
                                and the page itself surfaces the verification /
                                profile CTA based on the caller's state. */}
                            <SidebarItem icon={<Icons.users size={18} />} onClick={() => go('/vendors')}>
                                Vendors
                            </SidebarItem>
                        </>
                    )}

                    <div style={{ height: 1, background: 'var(--border)', margin: '8px 6px' }} />

                    <SidebarItem icon={<Icons.x size={18} />} onClick={handleLogout} danger>
                        Sign out
                    </SidebarItem>
                </nav>
            </aside>

            {/* Inline keyframes — kept here so the component is self-contained
                without forcing a global CSS edit. */}
            <style>{`
                @keyframes mp-sidebar-slide-in {
                    from { transform: translateX(-8px); opacity: 0; }
                    to   { transform: translateX(0);    opacity: 1; }
                }
            `}</style>
        </>
    );
}

function SidebarItem({ icon, children, onClick, danger }) {
    return (
        <button
            type="button"
            role="menuitem"
            onClick={onClick}
            style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                borderRadius: 8,
                border: 0,
                background: 'transparent',
                color: danger ? 'var(--error)' : 'var(--text-1)',
                fontSize: 15,
                fontWeight: 500,
                textAlign: 'left',
                cursor: 'pointer',
                minHeight: 44,
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'var(--surface-subtle)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
            onFocus={(e) => e.currentTarget.style.background = 'var(--surface-subtle)'}
            onBlur={(e) => e.currentTarget.style.background = 'transparent'}
        >
            <span style={{ display: 'inline-flex', color: danger ? 'var(--error)' : 'var(--text-2)' }}>
                {icon}
            </span>
            {children}
        </button>
    );
}
