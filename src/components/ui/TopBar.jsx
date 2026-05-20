import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import {
    logout,
    selectActiveWorkspace,
    selectAuthEmail,
    selectCurrentUser,
    selectIsAdmin,
    selectIsCheckinStaff,
    setActiveWorkspace,
} from '@/features/auth/authSlice';
import { useGetWorkspacesQuery } from '@/features/organiser/organizerApi';
import { Icons } from './Icon';

/* Order matches the sidebar's WORKSPACE_PRIORITY so the visible list is stable. */
const WORKSPACE_ORDER = ['ATTENDEE', 'ORGANISER', 'MANAGER', 'VENDOR'];

const WORKSPACE_LABEL = {
    ATTENDEE:  'Attendee',
    ORGANISER: 'Organiser',
    MANAGER:   'Manager',
    VENDOR:    'Vendor',
};

const WORKSPACE_HOME = {
    ATTENDEE:  '/dashboard',
    ORGANISER: '/organiser',
    MANAGER:   '/organiser',
    VENDOR:    '/vendor',
};

/* ────────────────────────────────────────────────────────────────────────────
   TopBar — thin (56px) bar at the top of the main content column. Its sole
   job is to host the avatar workspace switcher in the top-right. Sidebar
   still owns navigation; this is identity + workspace.
   Hidden for admin + check-in staff (neither has multi-workspace identity).
   ──────────────────────────────────────────────────────────────────────── */
export default function TopBar() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const isAdmin        = useSelector(selectIsAdmin);
    const isCheckinStaff = useSelector(selectIsCheckinStaff);
    const user           = useSelector(selectCurrentUser);
    const email          = useSelector(selectAuthEmail);
    const activeWorkspace = useSelector(selectActiveWorkspace);

    const { data: workspaces = [] } = useGetWorkspacesQuery(undefined, {
        skip: isAdmin || isCheckinStaff,
    });

    const [open, setOpen] = useState(false);
    const menuRef = useRef(null);

    // Close on outside click / Escape.
    useEffect(() => {
        if (!open) return;
        const onDown = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
        };
        const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    if (isAdmin || isCheckinStaff) return null;

    const firstName = user?.firstName?.trim() || '';
    const lastName  = user?.lastName?.trim()  || '';
    const displayName = firstName || (email ? email.split('@')[0] : 'Account');
    const initial = (firstName[0] || lastName[0] || email?.[0] || '?').toUpperCase();

    const availableWorkspaces = WORKSPACE_ORDER.filter((r) => workspaces.includes(r));
    const currentWorkspace = activeWorkspace && availableWorkspaces.includes(activeWorkspace)
        ? activeWorkspace
        : availableWorkspaces[0] ?? null;

    function switchTo(role) {
        if (!availableWorkspaces.includes(role)) return;
        dispatch(setActiveWorkspace(role));
        setOpen(false);
        navigate(WORKSPACE_HOME[role] ?? '/');
    }

    function handleLogout() {
        setOpen(false);
        dispatch(logout());
        navigate('/login', { replace: true });
    }

    return (
        <div
            className="
                sticky top-0 z-40
                flex items-center justify-end gap-3
                h-14 px-6
                bg-surface-elevated border-b border-border
            "
        >
            <div className="relative" ref={menuRef}>
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    aria-haspopup="menu"
                    aria-expanded={open}
                    className="
                        flex items-center gap-2.5
                        py-1 pl-1 pr-2.5
                        rounded-full border border-transparent
                        hover:bg-surface-subtle hover:border-border
                        transition-colors duration-150
                    "
                >
                    <span
                        className="
                            w-8 h-8 rounded-full
                            bg-mp-blue text-white
                            grid place-items-center
                            text-[13px] font-bold
                            flex-shrink-0
                        "
                    >
                        {initial}
                    </span>
                    <span className="text-sm font-medium text-text-1 max-w-[140px] truncate">
                        {displayName}
                    </span>
                    {currentWorkspace && availableWorkspaces.length > 0 && (
                        <span
                            className="
                                hidden sm:inline-flex
                                items-center
                                px-2 py-0.5
                                rounded-full
                                bg-mp-blue-50 text-mp-blue
                                text-[10px] font-semibold uppercase tracking-wider
                            "
                        >
                            {WORKSPACE_LABEL[currentWorkspace]}
                        </span>
                    )}
                    <Icons.chevronD size={14} className="text-text-3" />
                </button>

                {open && (
                    <div
                        role="menu"
                        className="
                            absolute right-0 top-[calc(100%+8px)]
                            min-w-[240px]
                            bg-surface-elevated border border-border
                            rounded-xl shadow-elevated
                            overflow-hidden
                            z-50
                        "
                    >
                        {availableWorkspaces.length > 0 && (
                            <>
                                <div className="px-4 pt-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-3">
                                    Switch workspace
                                </div>
                                <div className="pb-1.5">
                                    {availableWorkspaces.map((role) => {
                                        const active = role === currentWorkspace;
                                        return (
                                            <button
                                                key={role}
                                                type="button"
                                                role="menuitem"
                                                onClick={() => switchTo(role)}
                                                className={`
                                                    flex items-center justify-between
                                                    w-full px-4 py-2
                                                    text-sm text-left
                                                    ${active
                                                        ? 'bg-mp-blue-50 text-mp-blue font-semibold'
                                                        : 'text-text-1 hover:bg-surface-subtle font-medium'}
                                                `}
                                            >
                                                <span>{WORKSPACE_LABEL[role]}</span>
                                                {active && <Icons.check size={14} />}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="h-px bg-border mx-2" />
                            </>
                        )}

                        <div className="py-1.5">
                            <MenuItem icon={<Icons.settings size={16} />} onClick={() => { setOpen(false); navigate('/settings'); }}>
                                Settings
                            </MenuItem>
                            <MenuItem icon={<Icons.x size={16} />} danger onClick={handleLogout}>
                                Sign out
                            </MenuItem>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function MenuItem({ icon, danger, onClick, children }) {
    return (
        <button
            type="button"
            role="menuitem"
            onClick={onClick}
            className={`
                flex items-center gap-2.5
                w-full px-4 py-2
                text-sm font-medium text-left
                hover:bg-surface-subtle
                ${danger ? 'text-error' : 'text-text-1'}
            `}
        >
            <span className="flex-shrink-0 inline-flex items-center">{icon}</span>
            <span>{children}</span>
        </button>
    );
}
