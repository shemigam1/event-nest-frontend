import { Navigate, Outlet, useLocation } from 'react-router';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectIsOrganiser } from '@/features/auth/authSlice';

export default function OrganizerRoute() {
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const isOrganiser     = useSelector(selectIsOrganiser);
    const location        = useLocation();

    if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    if (!isOrganiser)     return <Navigate to="/dashboard" replace />;
    return <Outlet />;
}
