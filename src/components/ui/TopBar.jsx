import { useSelector } from 'react-redux';
import {
    selectCurrentUser,
    selectAuthEmail,
    selectIsAdmin,
    selectIsCheckinStaff,
} from '@/features/auth/authSlice';

/* ── TopBar ──────────────────────────────────────────────────────────────
   Thin 56-px bar at the top of the main content column.
   Shows a personalised greeting for regular users.
   Hidden for admins and check-in staff (they have their own context).
   ────────────────────────────────────────────────────────────────────── */
export default function TopBar() {
    const isAdmin        = useSelector(selectIsAdmin);
    const isCheckinStaff = useSelector(selectIsCheckinStaff);
    const user           = useSelector(selectCurrentUser);
    const email          = useSelector(selectAuthEmail);

    if (isAdmin || isCheckinStaff) return null;

    const firstName = user?.firstName?.trim() || email?.split('@')[0] || '';
    const greeting  = firstName ? `Hello, ${firstName}` : 'Hello';

    return (
        <div style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            padding: '0 28px',
            background: 'var(--surface-elevated)',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
        }}>
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
