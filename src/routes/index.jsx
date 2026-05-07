import { createBrowserRouter, Navigate } from 'react-router';
import LandingPage from '../features/landing/LandingPage';
import DiscoveryPage from '../features/events/pages/DiscoveryPage';
import EventDetailPage from '../features/events/pages/EventDetailPage';
import LoginPage from '../features/auth/pages/LoginPage';
import RegisterPage from '../features/auth/pages/RegisterPage';
import BookingPage from '../features/bookings/pages/BookingPage';
import DashboardPage from '../features/bookings/pages/DashboardPage';
import TicketsPage from '../features/tickets/pages/TicketsPage';
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
        path: '/events/:id',
        element: <EventDetailPage />,
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
        children: [
            {
                path: '/events/:id/book',
                element: <BookingPage />,
            },
            {
                path: '/tickets',
                element: <TicketsPage />,
            },
            {
                path: '/dashboard',
                element: <DashboardPage />,
            },
        ],
    },
    {
        path: '*',
        element: <Navigate to="/" replace />,
    },
]);

export default router;
