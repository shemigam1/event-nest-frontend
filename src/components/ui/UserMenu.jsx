import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import { logout, selectAuthEmail, selectCurrentUser, selectIsAdmin, selectIsCheckinStaff } from '@/features/auth/authSlice';
import { baseApi } from '@/services/baseApi';
import { Icons } from './Icon';

/**
 * When {@code onOpenSidebar} is provided (desktop only — passed from
 * TopNav), clicking the avatar opens the right-side drawer instead of the
 * inline dropdown. The inline dropdown stays as a fallback for any context
 * that doesn't pass the prop.
 */
export default function UserMenu({ onDark = false, onOpenSidebar }) {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const user = useSelector(selectCurrentUser);
    const email = useSelector(selectAuthEmail);
    const isAdmin        = useSelector(selectIsAdmin);
    const isCheckinStaff = useSelector(selectIsCheckinStaff);
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        if (!open) return;
        const onClick = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, [open]);

    const initial = (user?.firstName?.[0] ?? email?.[0] ?? 'U').toUpperCase();
    const displayName = user
        ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email
        : email ?? 'Account';

    const go = (path) => { setOpen(false); navigate(path); };

    const handleLogout = () => {
        dispatch(logout());
        dispatch(baseApi.util.resetApiState());
        setOpen(false);
        navigate('/');
    };

    const handleAvatarClick = () => {
        if (onOpenSidebar) {
            onOpenSidebar();
        } else {
            setOpen((o) => !o);
        }
    };

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <button
                onClick={handleAvatarClick}
                aria-haspopup={onOpenSidebar ? 'dialog' : 'menu'}
                aria-expanded={onOpenSidebar ? undefined : open}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '6px 10px 6px 6px',
                    borderRadius: 99,
                    background: onDark ? 'rgba(255,255,255,0.10)' : 'var(--surface-subtle)',
                    border: `1px solid ${onDark ? 'rgba(255,255,255,0.20)' : 'var(--border)'}`,
                    color: onDark ? 'white' : 'var(--text-1)',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                }}
            >
                <span style={{
                    width: 28, height: 28, borderRadius: 99,
                    background: isAdmin ? 'var(--text-1)' : 'var(--mp-blue)', color: 'white',
                    display: 'grid', placeItems: 'center',
                    fontSize: 13, fontWeight: 700,
                }}>{initial}</span>
                <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {displayName}
                </span>
            </button>

            {open && (
                <div role="menu" style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    minWidth: 240,
                    background: 'var(--surface-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    boxShadow: 'var(--shadow-elevated)',
                    padding: 6,
                    zIndex: 100,
                }}>
                    {/* Header */}
                    <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{displayName}</div>
                            {isAdmin && (
                                <span style={{
                                    fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
                                    padding: '2px 6px', borderRadius: 4,
                                    background: 'var(--text-1)', color: 'white',
                                }}>
                                    ADMIN
                                </span>
                            )}
                        </div>
                        {email && email !== displayName && (
                            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{email}</div>
                        )}
                    </div>

                    {isCheckinStaff && !isAdmin ? (
                        <>
                            <MenuItem icon={<Icons.scan size={16} />} onClick={() => go('/checkin')}>
                                Check-in station
                            </MenuItem>
                        </>
                    ) : isAdmin ? (
                        <>
                            <MenuItem icon={<Icons.signal size={16} />} onClick={() => go('/admin/moderation')}>
                                Event moderation
                            </MenuItem>
                            <MenuItem icon={<Icons.users size={16} />} onClick={() => go('/admin/users')}>
                                Manage users
                            </MenuItem>
                            <MenuItem icon={<Icons.list size={16} />} onClick={() => go('/admin/event-edits')}>
                                Event edit requests
                            </MenuItem>
                            <MenuItem icon={<Icons.mail size={16} />} onClick={() => go('/admin/invite')}>
                                Invite admin
                            </MenuItem>
                        </>
                    ) : (
                        <>
                            {/*
                              "My events" now points at /organiser (the
                              former Organiser Console). The old /dashboard
                              entry is dropped — login lands users on the
                              public events browse, and the sidebar gives
                              them quick access to the rest.
                            */}
                            <MenuItem icon={<Icons.calendar size={16} />} onClick={() => go('/organiser')}>
                                My events
                            </MenuItem>
                            <MenuItem icon={<Icons.ticket size={16} />} onClick={() => go('/tickets')}>
                                My tickets
                            </MenuItem>
                            <MenuItem icon={<Icons.scan size={16} />} onClick={() => go('/checkin')}>
                                Check-in station
                            </MenuItem>

                            {/* Single Vendors entry — the marketplace page itself
                                routes the user to the right place (apply for
                                verification, resubmit, or view dashboard) based
                                on their verification status. */}
                            <MenuItem icon={<Icons.users size={16} />} onClick={() => go('/vendors')}>
                                Vendors
                            </MenuItem>
                        </>
                    )}

                    <div style={{ height: 1, background: 'var(--border)', margin: '6px 4px' }} />
                    <MenuItem icon={<Icons.x size={16} />} onClick={handleLogout} danger>
                        Sign out
                    </MenuItem>
                </div>
            )}
        </div>
    );
}

function MenuItem({ icon, children, onClick, danger }) {
    return (
        <button
            role="menuitem"
            onClick={onClick}
            style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 12px',
                borderRadius: 8,
                border: 0,
                background: 'transparent',
                color: danger ? 'var(--error)' : 'var(--text-1)',
                fontSize: 14,
                fontWeight: 500,
                textAlign: 'left',
                cursor: 'pointer',
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'var(--surface-subtle)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
        >
            {icon}
            {children}
        </button>
    );
}
