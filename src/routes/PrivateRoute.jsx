import { Navigate, Outlet } from 'react-router';
import { useSelector } from 'react-redux';

export default function PrivateRoute() {
  const isAuthenticated = useSelector(
    (state) => state.auth.isAuthenticated
  );

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}