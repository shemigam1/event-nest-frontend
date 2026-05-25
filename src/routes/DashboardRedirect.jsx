import { Navigate } from 'react-router';
import { useSelector } from 'react-redux';
import { selectIsAdmin } from '@/features/auth/authSlice';

/**
 * Smart /dashboard redirect.
 * - Admins     → /admin/moderation  (their actual home)
 * - Everyone else → /my-events
 */
export default function DashboardRedirect() {
    const isAdmin = useSelector(selectIsAdmin);
    return <Navigate to={isAdmin ? '/admin/moderation' : '/my-events'} replace />;
}
