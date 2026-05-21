import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import {
    selectActiveWorkspace,
    selectAuthEmail,
    selectCurrentUser,
    selectIsAdmin,
    selectIsCheckinStaff,
    setActiveWorkspace,
} from '@/features/auth/authSlice';
import { Icons } from './Icon';

/* ────────────────────────────────────────────────────────────────────────────
   TopBar — thin (56px) bar at the top of the main content column.

   The avatar dropdown IS the global workspace toggle (Attendee / Organiser /
   Vendor). Picking a workspace changes what the left sidebar shows and lands
   the user on that workspace's home. Settings + Sign out live in the left
   sidebar — they don't repeat here.

   All three workspaces are ALWAYS available — they're contexts the user opts
   into, not roles derived from existing memberships. A first-time user with
   zero events should still be able to switch to Organiser mode and create
   their first event. Backend MANAGER role (co-manage another organiser's
   event) shares the Organiser console, so it isn't a separate toggle option.

   Hidden entirely for admins and check-in staff — neither has multi-workspace
   identity.
   ──────────────────────────────────────────────────────────────────────── */

// Ordered list of workspaces shown in the dropdown.
const WORKSPACE_ORDER = ['ATTENDEE', 'ORGANISER', 'VENDOR'];

const WORKSPACE_LABEL = {
    ATTENDEE:  'Attendee',
    ORGANISER: 'Organiser',
    VENDOR:    'Vendor',
};

// Where to land the user when they pick this workspace.
const WORKSPACE_HOME = {
    ATTENDEE:  '/dashboard',
    ORGANISER: '/organiser',
    VENDOR:    '/vendor',
};

// One-line copy below each option in the dropdown — helps the user grok the
// shift in context before they commit.
const WORKSPACE_HINT = {
    ATTENDEE:  'Browse events, manage tickets.',
    ORGANISER: 'Run your events end-to-end.',
    VENDOR:    'Apply for gigs, run contracts.',
};

export default function TopBar() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const isAdmin        = useSelector(selectIsAdmin);
    const isCheckinStaff = useSelector(selectIsCheckinStaff);
    const user           = useSelector(selectCurrentUser);
    const email          = useSelector(selectAuthEmail);
    const activeWorkspace = useSelector(selectActiveWorkspace);

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

    // All three workspaces are always available; activeWorkspace seeds from
    // Redux if set, otherwise defaults to the first option (Attendee).
    const availableWorkspaces = WORKSPACE_ORDER;
    const currentWorkspace = activeWorkspace && availableWorkspaces.includes(activeWorkspace)
        ? activeWorkspace
        : availableWorkspaces[0];

    function switchTo(role) {
        if (!availableWorkspaces.includes(role)) return;
        dispatch(setActiveWorkspace(role));
        setOpen(false);
        navigate(WORKSPACE_HOME[role] ?? '/');
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
                    aria-label="Switch workspace"
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
                    {/* Show the active workspace name as the primary label —
                        the avatar IS the workspace toggle, not an identity menu. */}
                    <span className="text-sm font-semibold text-text-1 max-w-[160px] truncate">
                        {currentWorkspace ? WORKSPACE_LABEL[currentWorkspace] : displayName}
                    </span>
                    <Icons.chevronD size={14} className="text-text-3" />
                </button>

                {open && (
                    <div
                        role="menu"
                        aria-label="Switch workspace"
                        className="
                            absolute right-0 top-[calc(100%+8px)]
                            min-w-[260px]
                            bg-surface-elevated border border-border
                            rounded-xl shadow-elevated
                            overflow-hidden
                            z-50
                        "
                    >
                        <div className="py-1.5">
                            {availableWorkspaces.map((role) => {
                                const active = role === currentWorkspace;
                                return (
                                    <button
                                        key={role}
                                        type="button"
                                        role="menuitem"
                                        onClick={() => switchTo(role)}
                                        className={`
                                            flex items-center gap-3
                                            w-full px-4 py-2.5
                                            text-left
                                            ${active
                                                ? 'bg-mp-blue-50'
                                                : 'hover:bg-surface-subtle'}
                                        `}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className={`
                                                text-sm
                                                ${active
                                                    ? 'font-semibold text-mp-blue'
                                                    : 'font-medium text-text-1'}
                                            `}>
                                                {WORKSPACE_LABEL[role]}
                                            </div>
                                            <div className="text-xs text-text-3 mt-0.5">
                                                {WORKSPACE_HINT[role]}
                                            </div>
                                        </div>
                                        {active && (
                                            <Icons.check size={16} className="text-mp-blue flex-shrink-0" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
