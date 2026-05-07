import { createBrowserRouter, Navigate } from 'react-router';
import LandingPage from '../features/landing/LandingPage';
import DiscoveryPage from '../features/events/pages/DiscoveryPage';
import LoginPage from '../features/auth/pages/LoginPage';
import RegisterPage from '../features/auth/pages/RegisterPage';
import PrivateRoute from './PrivateRoute';

const router = createBrowserRouter([
    {
        path: '/',
        element: <LandingPage />,
    },
    {
        path: '/events',
        element: <DiscoveryPage />,
    },
    {
        path: '/login',
        element: <LoginPage />,
    },
    {
        path: '/register',
        element: <RegisterPage />,
    },
    {
        element: <PrivateRoute />,
        children: [],
    },
    {
        path: '*',
        element: <Navigate to="/" replace />,
    },
]);

export default router;
