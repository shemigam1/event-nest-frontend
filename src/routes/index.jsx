import { createBrowserRouter, Navigate, Outlet } from 'react-router';
import LandingPage from '../features/landing/LandingPage';
import DiscoveryPage from '../features/events/pages/DiscoveryPage';
import EventDetailPage from '../features/events/pages/EventDetailPage';
import LoginPage from '../features/auth/pages/LoginPage';
import RegisterPage from '../features/auth/pages/RegisterPage';
import BookingPage from '../features/bookings/pages/BookingPage';
import DashboardPage from '../features/bookings/pages/DashboardPage';
import TicketsPage from '../features/tickets/pages/TicketsPage';
import CreateEventPage from '../features/events/pages/CreateEventPage';
import EditEventPage from '../features/events/pages/EditEventPage';
import EventModerationPage from '../features/admin/pages/EventModerationPage';
import ManageUsersPage from '../features/admin/pages/ManageUsersPage';
import AdminUserEventsPage from '../features/admin/pages/AdminUserEventsPage';
import InviteAdminPage from '../features/admin/pages/InviteAdminPage';
import EventEditsPage from '../features/admin/pages/EventEditsPage';
import AdminEventDetailPage from '../features/admin/pages/AdminEventDetailPage';
import OrganizerConsolePage from '../features/organiser/pages/OrganizerConsolePage';
import OrganizerEventPage from '../features/organiser/pages/OrganizerEventPage';
import CheckInPage from '../features/checkin/pages/CheckInPage';
import StubPaymentPage from '../features/bookings/pages/StubPaymentPage';
import PaymentResultPage from '../features/bookings/pages/PaymentResultPage';
import PrivateRoute from './PrivateRoute';
import AdminRoute from './AdminRoute';
import ErrorPage from '../components/ui/ErrorPage';

const router = createBrowserRouter([
    {
        // Root wrapper — no path, just provides the global errorElement.
        // All routes are children so they inherit it automatically.
        element: <Outlet />,
        errorElement: <ErrorPage />,
        children: [
            { path: '/',          element: <LandingPage /> },
            { path: '/events',    element: <DiscoveryPage /> },
            { path: '/events/:id', element: <EventDetailPage /> },
            { path: '/login',     element: <LoginPage /> },
            { path: '/register',  element: <RegisterPage /> },
            { path: '/checkin',        element: <CheckInPage /> },
            { path: '/stub-payment',   element: <StubPaymentPage /> },
            { path: '/payment-result', element: <PaymentResultPage /> },

            {
                element: <PrivateRoute />,
                children: [
                    { path: '/events/new',        element: <CreateEventPage /> },
                    { path: '/events/:id/edit',   element: <EditEventPage /> },
                    { path: '/events/:id/book',   element: <BookingPage /> },
                    { path: '/tickets',           element: <TicketsPage /> },
                    { path: '/dashboard',         element: <DashboardPage /> },
                    { path: '/organiser',         element: <OrganizerConsolePage /> },
                    { path: '/organiser/events/:id', element: <OrganizerEventPage /> },
                ],
            },

            {
                element: <AdminRoute />,
                children: [
                    { path: '/admin',                    element: <Navigate to="/admin/moderation" replace /> },
                    { path: '/admin/moderation',         element: <EventModerationPage /> },
                    { path: '/admin/users',              element: <ManageUsersPage /> },
                    { path: '/admin/users/:id/events',   element: <AdminUserEventsPage /> },
                    { path: '/admin/invite',             element: <InviteAdminPage /> },
                    { path: '/admin/event-edits',        element: <EventEditsPage /> },
                    { path: '/admin/events/:id',         element: <AdminEventDetailPage /> },
                ],
            },

            { path: '*', element: <Navigate to="/" replace /> },
        ],
    },
]);

export default router;
