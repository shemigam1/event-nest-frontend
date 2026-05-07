import { createBrowserRouter, Navigate } from 'react-router';
import LandingPage from '../features/landing/LandingPage';
import DiscoveryPage from '../features/events/pages/DiscoveryPage';
import EventDetailPage from '../features/events/pages/EventDetailPage';
import LoginPage from '../features/auth/pages/LoginPage';
import RegisterPage from '../features/auth/pages/RegisterPage';
import BookingPage from '../features/bookings/pages/BookingPage';
import DashboardPage from '../features/bookings/pages/DashboardPage';
import TicketsPage from '../features/tickets/pages/TicketsPage';
import CreateEventPage from '../features/events/pages/CreateEventPage';
import AdminPage from '../features/admin/pages/AdminPage';
import PrivateRoute from './PrivateRoute';
import AdminRoute from './AdminRoute';

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
                path: '/events/new',
                element: <CreateEventPage />,
            },
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
        element: <AdminRoute />,
        children: [
            {
                path: '/admin',
                element: <AdminPage />,
            },
        ],
    },
    {
        path: '*',
        element: <Navigate to="/" replace />,
    },
]);

export default router;
