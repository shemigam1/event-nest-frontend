import { useSelector } from 'react-redux';
import {
    selectCurrentUser,
    selectAuthEmail,
    selectIsAdmin,
    selectIsCheckinStaff,
} from '@/features/auth/authSlice';
import { useSidebar } from './sidebarContext';
import { Icons } from './Icon';

/* ── TopBar ──────────────────────────────────────────────────────────────
   Thin 56-px bar at the top of the main content column.
   Shows a personalised greeting for regular users.
   Hidden for admins and check-in staff (they have their own context).
   Includes a hamburger button on mobile that opens the sidebar drawer.
   ────────────────────────────────────────────────────────────────────── */
export default function TopBar() {
    const isAdmin        = useSelector(selectIsAdmin);
    const isCheckinStaff = useSelector(selectIsCheckinStaff);
    const user           = useSelector(selectCurrentUser);
    const email          = useSelector(selectAuthEmail);
    const { openMobile } = useSidebar();

    if (isAdmin || isCheckinStaff) return null;

    const firstName = user?.firstName?.trim() || email?.split('@')[0] || '';
    const greeting  = firstName ? `Hello, ${firstName}` : 'Hello';

    return (
        <div style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '0 16px',
            background: 'var(--surface-elevated)',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
        }}>
            {/* Hamburger — visible only under 1024px */}
            <button
                onClick={openMobile}
                aria-label="Open menu"
                className="mp-hide-desktop mp-tap-target"
                style={{
                    width: 40, height: 40, borderRadius: 8,
                    border: 0, background: 'transparent',
                    color: 'var(--text-1)', cursor: 'pointer',
                    display: 'grid', placeItems: 'center',
                    marginLeft: -8, // pull flush to the left edge
                }}
            >
                <Icons.list size={22} />
            </button>

            <span style={{
                fontSize: 15,
                fontWeight: 600,
                color: 'var(--text-1)',
            }}>
                {greeting} 👋
            </span>
        </div>
    );
}
