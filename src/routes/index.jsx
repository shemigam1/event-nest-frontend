import { createBrowserRouter, Navigate, useParams } from 'react-router';

function ConversationRedirect() {
    const { conversationId } = useParams();
    return <Navigate to={`/messages?c=${conversationId}`} replace />;
}
import AppShell from '../components/ui/AppShell';
import LandingPage from '../features/landing/LandingPage';
import DiscoveryPage from '../features/events/pages/DiscoveryPage';
import EventDetailPage from '../features/events/pages/EventDetailPage';
import LoginPage from '../features/auth/pages/LoginPage';
import RegisterPage from '../features/auth/pages/RegisterPage';
import ForgotPasswordPage from '../features/auth/pages/ForgotPasswordPage';
import ResetPasswordPage from '../features/auth/pages/ResetPasswordPage';
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
import AdminEscrowPage from '../features/admin/pages/AdminEscrowPage';
import AdminVendorsPage from '../features/admin/pages/AdminVendorsPage';
import AdminVendorDetailPage from '../features/admin/pages/AdminVendorDetailPage';
import OrganizerConsolePage from '../features/organiser/pages/OrganizerConsolePage';
import OrganizerEventPage from '../features/organiser/pages/OrganizerEventPage';
import VendorOpportunitiesPage from '../features/vendor/pages/VendorOpportunitiesPage';
import MyApplicationsPage from '../features/vendor/pages/MyApplicationsPage';
import VendorApplyPage from '../features/vendor/pages/VendorApplyPage';
import VendorDashboardPage from '../features/vendor/pages/VendorDashboardPage';
import CheckInPage from '../features/checkin/pages/CheckInPage';
import PaymentResultPage from '../features/bookings/pages/PaymentResultPage';
import VendorMarketplacePage from '../features/vendor/pages/VendorMarketplacePage';
import VendorDetailPage from '../features/vendor/pages/VendorDetailPage';
import VendorProfileSetupPage from '../features/vendor/pages/VendorProfileSetupPage';
import VendorSignupPage from '../features/vendor/pages/VendorSignupPage';
import MessagesPage from '../features/messages/pages/MessagesPage';
import SettingsPage from '../features/settings/pages/SettingsPage';
import PrivateRoute from './PrivateRoute';
import AdminRoute from './AdminRoute';
import ErrorPage from '../components/ui/ErrorPage';

const router = createBrowserRouter([
    {
        // Root wrapper — provides the global errorElement AND mounts the
        // AppShell layout (persistent left sidebar for signed-in users,
        // full-width passthrough for anonymous routes).
        element: <AppShell />,
        errorElement: <ErrorPage />,
        children: [
            { path: '/',          element: <LandingPage /> },
            { path: '/events',    element: <DiscoveryPage /> },
            { path: '/events/:id', element: <EventDetailPage /> },
            { path: '/login',            element: <LoginPage /> },
            { path: '/register',         element: <RegisterPage /> },
            { path: '/forgot-password',  element: <ForgotPasswordPage /> },
            { path: '/reset-password',   element: <ResetPasswordPage /> },
            { path: '/checkin',        element: <CheckInPage /> },
            { path: '/vendors',        element: <VendorMarketplacePage /> },
            { path: '/vendors/:id',    element: <VendorDetailPage /> },
            { path: '/payment-result', element: <PaymentResultPage /> },
            { path: '/vendor/signup',  element: <VendorSignupPage /> },

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
                    { path: '/vendor',               element: <VendorDashboardPage /> },
                    { path: '/vendor/opportunities', element: <VendorOpportunitiesPage /> },
                    { path: '/vendor/applications',  element: <MyApplicationsPage /> },
                    { path: '/vendor/profile',       element: <VendorProfileSetupPage /> },
                    { path: '/vendor/apply/:eventId', element: <VendorApplyPage /> },
                    { path: '/messages',                  element: <MessagesPage /> },
                    { path: '/messages/:conversationId',  element: <ConversationRedirect /> },
                    { path: '/settings',              element: <SettingsPage /> },
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
                    { path: '/admin/events/:id',             element: <AdminEventDetailPage /> },
                    { path: '/admin/escrow',                 element: <AdminEscrowPage /> },
                    { path: '/admin/vendors',                element: <AdminVendorsPage /> },
                    { path: '/admin/vendors/:id',            element: <AdminVendorDetailPage /> },
                ],
            },

            { path: '*', element: <Navigate to="/" replace /> },
        ],
    },
]);

export default router;
