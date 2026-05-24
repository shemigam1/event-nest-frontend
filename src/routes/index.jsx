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
import TermsPage from '../features/legal/pages/TermsPage';
import PrivacyPage from '../features/legal/pages/PrivacyPage';
import BookingPage from '../features/bookings/pages/BookingPage';
import TicketsPage from '../features/tickets/pages/TicketsPage';
import ClaimGiftPage from '../features/tickets/pages/ClaimGiftPage';
import MyEventsPage from '../features/events/pages/MyEventsPage';
import CreateEventPage from '../features/events/pages/CreateEventPage';
import EditEventPage from '../features/events/pages/EditEventPage';
import EventModerationPage from '../features/admin/pages/EventModerationPage';
import ManageUsersPage from '../features/admin/pages/ManageUsersPage';
import AdminUserEventsPage from '../features/admin/pages/AdminUserEventsPage';
import InviteAdminPage from '../features/admin/pages/InviteAdminPage';
import AdminReportsPage from '../features/admin/pages/AdminReportsPage';
import AdminEventDetailPage from '../features/admin/pages/AdminEventDetailPage';
import AdminEscrowPage from '../features/admin/pages/AdminEscrowPage';
import AdminVendorsPage from '../features/admin/pages/AdminVendorsPage';
import AdminVendorDetailPage from '../features/admin/pages/AdminVendorDetailPage';
import EventProgrammePage from '../features/events/pages/EventProgrammePage';
import OrganizerConsolePage from '../features/organiser/pages/OrganizerConsolePage';
import OrganizerEventPage from '../features/organiser/pages/OrganizerEventPage';
import OrganizerContractsPage from '../features/organiser/pages/OrganizerContractsPage';
import OrganizerAccountPage from '../features/organiser/pages/OrganizerAccountPage';
import OrganizerDisputesPage from '../features/organiser/pages/OrganizerDisputesPage';
import VendorContractsPage from '../features/vendor/pages/VendorContractsPage';
import VendorDisputesPage from '../features/vendor/pages/VendorDisputesPage';
import VendorOpportunitiesPage from '../features/vendor/pages/VendorOpportunitiesPage';
import MyApplicationsPage from '../features/vendor/pages/MyApplicationsPage';
import VendorApplyPage from '../features/vendor/pages/VendorApplyPage';
import VendorEventPage from '../features/vendor/pages/VendorEventPage';
import VendorDashboardPage from '../features/vendor/pages/VendorDashboardPage';
import CheckInPage from '../features/checkin/pages/CheckInPage';
import CheckInScannerPage from '../features/checkin/pages/CheckInScannerPage';
import PaymentResultPage from '../features/bookings/pages/PaymentResultPage';
import PaymentsTransactionsPage from '../features/payments/pages/PaymentsTransactionsPage';
import VendorMarketplacePage from '../features/vendor/pages/VendorMarketplacePage';
import VendorDetailPage from '../features/vendor/pages/VendorDetailPage';
import VendorProfileSetupPage from '../features/vendor/pages/VendorProfileSetupPage';
import VendorSignupPage from '../features/vendor/pages/VendorSignupPage';
import VendorInviteAcceptPage from '../features/vendor/pages/VendorInviteAcceptPage';
import MessagesPage from '../features/messages/pages/MessagesPage';
import SettingsPage from '../features/settings/pages/SettingsPage';
import PrivateRoute from './PrivateRoute';
import AdminRoute from './AdminRoute';
import DashboardRedirect from './DashboardRedirect';
import ErrorPage from '../components/ui/ErrorPage';

const router = createBrowserRouter([
    {
        element: <AppShell />,
        errorElement: <ErrorPage />,
        children: [
            { path: '/',          element: <LandingPage /> },
            { path: '/events',    element: <DiscoveryPage /> },
            { path: '/events/:identifier', element: <EventDetailPage /> },
            { path: '/login',            element: <LoginPage /> },
            { path: '/register',         element: <RegisterPage /> },
            { path: '/forgot-password',  element: <ForgotPasswordPage /> },
            { path: '/reset-password',   element: <ResetPasswordPage /> },
            { path: '/terms',            element: <TermsPage /> },
            { path: '/privacy',          element: <PrivacyPage /> },
            { path: '/checkin',                   element: <CheckInPage /> },
            { path: '/checkin/:eventId',          element: <CheckInScannerPage /> },
            { path: '/vendors',        element: <VendorMarketplacePage /> },
            { path: '/vendors/:id',    element: <VendorDetailPage /> },
            { path: '/payment-result', element: <PaymentResultPage /> },
            { path: '/vendor/signup',  element: <VendorSignupPage /> },
            // Vendor invite landing. Public because the recipient may not yet
            // have an EventNest account — completing the invite creates one.
            { path: '/vendor/invite/:token', element: <VendorInviteAcceptPage /> },
            // Gift claim landing. Public so recipients can preview before signing up.
            // After login/register they are redirected back here to complete the claim.
            { path: '/tickets/claim/:token', element: <ClaimGiftPage /> },

            {
                element: <PrivateRoute />,
                children: [
                    { path: '/events/new',                       element: <CreateEventPage /> },
                    { path: '/events/:id/edit',              element: <EditEventPage /> },
                    { path: '/events/:id/book',              element: <BookingPage /> },
                    { path: '/events/:identifier/programme', element: <EventProgrammePage /> },
                    { path: '/tickets',           element: <TicketsPage /> },
                    { path: '/my-events',         element: <MyEventsPage /> },
                    { path: '/dashboard',         element: <DashboardRedirect /> },
                    { path: '/organiser',             element: <Navigate to="/my-events" replace /> },
                    { path: '/organiser/events/:id', element: <OrganizerEventPage /> },
                    { path: '/organiser/contracts',  element: <OrganizerContractsPage /> },
                    { path: '/organiser/account',    element: <OrganizerAccountPage /> },
                    { path: '/organiser/disputes',   element: <OrganizerDisputesPage /> },
                    { path: '/payments/transactions/:eventId', element: <PaymentsTransactionsPage /> },
                    { path: '/vendor/contracts',     element: <VendorContractsPage /> },
                    { path: '/vendor/disputes',      element: <VendorDisputesPage /> },
                    { path: '/vendor',               element: <VendorDashboardPage /> },
                    { path: '/vendor/opportunities', element: <VendorOpportunitiesPage /> },
                    { path: '/vendor/applications',  element: <MyApplicationsPage /> },
                    { path: '/vendor/profile',       element: <VendorProfileSetupPage /> },
                    { path: '/vendor/apply/:eventId', element: <VendorApplyPage /> },
                    { path: '/vendor/events/:id',    element: <VendorEventPage /> },
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
                    { path: '/admin/reports',            element: <AdminReportsPage /> },
                    { path: '/admin/users',              element: <ManageUsersPage /> },
                    { path: '/admin/users/:id/events',   element: <AdminUserEventsPage /> },
                    { path: '/admin/invite',             element: <InviteAdminPage /> },
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
