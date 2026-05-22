import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { MOCK_ANALYTICS } from '@/test/server';
import AdminPage, { UsersPanel } from '@/features/admin/pages/AdminPage';

/* ── Auth helpers ───────────────────────────────── */
function makeAdminState() {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
        sub: 'admin@example.com',
        email: 'admin@example.com',
        roles: ['ROLE_ADMIN'],
        type: 'ACCESS',
        exp: Math.floor(Date.now() / 1000) + 3600,
    }));
    return {
        auth: {
            user: null,
            tokenUser: { email: 'admin@example.com', roles: ['ROLE_ADMIN'] },
            token: `${header}.${payload}.signature`,
            refreshToken: 'r',
            isAuthenticated: true,
        },
    };
}

function renderPage() {
    return renderWithProviders(<AdminPage />, {
        initialEntries: ['/admin'],
        preloadedState: makeAdminState(),
    });
}

/* ── Tests ──────────────────────────────────────── */
describe('AdminPage', () => {
    describe('analytics strip', () => {
        test('renders stat tiles', async () => {
            renderPage();
            await waitFor(() => {
                expect(screen.getByTestId('stat-published')).toBeInTheDocument();
                expect(screen.getByTestId('stat-revenue')).toBeInTheDocument();
                expect(screen.getByTestId('stat-checkin')).toBeInTheDocument();
            });
        });

        test('shows revenue formatted with ₦', async () => {
            renderPage();
            await waitFor(() => {
                const tile = screen.getByTestId('stat-revenue');
                expect(within(tile).getByText(/₦/)).toBeInTheDocument();
            });
        });

        test('shows check-in rate as percentage', async () => {
            renderPage();
            await waitFor(() => {
                const tile = screen.getByTestId('stat-checkin');
                expect(within(tile).getByText(/\d+%/)).toBeInTheDocument();
            });
        });
    });

    describe('tab navigation', () => {
        test('renders Users and Invite admin tabs', () => {
            renderPage();
            const tabs = screen.getByTestId('admin-tabs');
            expect(within(tabs).getByRole('button', { name: /users/i })).toBeInTheDocument();
            expect(within(tabs).getByRole('button', { name: /invite admin/i })).toBeInTheDocument();
        });

        test('Users is the default active tab', async () => {
            renderPage();
            await waitFor(() => {
                expect(screen.getByText(/john@example\.com/i)).toBeInTheDocument();
            });
        });

        test('switching to Invite admin tab renders the invite form', async () => {
            const user = userEvent.setup();
            renderPage();
            const tabs = screen.getByTestId('admin-tabs');
            await user.click(within(tabs).getByRole('button', { name: /invite admin/i }));
            expect(screen.getByRole('button', { name: /send invite/i })).toBeInTheDocument();
        });
    });

    describe('users panel', () => {
        function renderUsersPanel() {
            return renderWithProviders(<UsersPanel />, {
                preloadedState: makeAdminState(),
            });
        }

        test('shows all users with email and role', async () => {
            renderUsersPanel();
            await waitFor(() => {
                expect(screen.getByText(/john@example\.com/)).toBeInTheDocument();
                expect(screen.getByText(/jane@example\.com/)).toBeInTheDocument();
            });
        });

        test('shows role badge for each user', async () => {
            renderUsersPanel();
            await waitFor(() => {
                expect(screen.getAllByText('Attendee').length).toBeGreaterThan(0);
                expect(screen.getAllByText('Organiser').length).toBeGreaterThan(0);
            });
        });
    });
});
