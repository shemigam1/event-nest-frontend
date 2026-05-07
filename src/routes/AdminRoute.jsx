import { Navigate, Outlet } from 'react-router';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectIsAdmin } from '@/features/auth/authSlice';

export default function AdminRoute() {
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const isAdmin = useSelector(selectIsAdmin);

    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (!isAdmin) return <Navigate to="/" replace />;
    return <Outlet />;
}
