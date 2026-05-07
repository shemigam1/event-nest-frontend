import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/test/renderWithProviders';
import { server, MOCK_MY_BOOKINGS } from '@/test/server';
import DashboardPage from '@/features/bookings/pages/DashboardPage';

function makeAuthState(firstName = null) {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
        sub: 'adaeze@example.com',
        email: 'adaeze@example.com',
        roles: ['ROLE_USER'],
        type: 'ACCESS',
        exp: Math.floor(Date.now() / 1000) + 3600,
    }));
    return {
        auth: {
            user: firstName ? { firstName, email: 'adaeze@example.com' } : null,
            tokenUser: { email: 'adaeze@example.com', roles: ['ROLE_USER'] },
            token: `${header}.${payload}.signature`,
            refreshToken: 'r',
            isAuthenticated: true,
        },
    };
}

function renderDashboard(preloadedState = makeAuthState()) {
    return renderWithProviders(<DashboardPage />, {
        initialEntries: ['/dashboard'],
        preloadedState,
    });
}

describe('DashboardPage', () => {
    test('greets user by first name when available', async () => {
        renderDashboard(makeAuthState('Adaeze'));
        expect(await screen.findByRole('heading', { name: /welcome back, adaeze/i })).toBeInTheDocument();
    });

    test('falls back to email prefix when no profile is stored', async () => {
        renderDashboard();
        expect(await screen.findByRole('heading', { name: /welcome back, adaeze/i })).toBeInTheDocument();
    });

    describe('stats tiles', () => {
        test('shows correct confirmed booking count', async () => {
            renderDashboard();
            await screen.findByTestId(`booking-row-${MOCK_MY_BOOKINGS[0].id}`);
            const confirmed = MOCK_MY_BOOKINGS.filter((b) => b.status === 'CONFIRMED').length;
            const tile = screen.getByTestId('stat-confirmed');
            expect(within(tile).getByText(String(confirmed))).toBeInTheDocument();
        });

        test('shows total ticket count across confirmed bookings', async () => {
            renderDashboard();
            await screen.findByTestId(`booking-row-${MOCK_MY_BOOKINGS[0].id}`);
            const total = MOCK_MY_BOOKINGS
                .filter((b) => b.status === 'CONFIRMED')
                .reduce((s, b) => s + b.quantity, 0);
            const tile = screen.getByTestId('stat-total-tickets');
            expect(within(tile).getByText(String(total))).toBeInTheDocument();
        });
    });

    describe('bookings table', () => {
        test('renders a row for each booking', async () => {
            renderDashboard();
            await waitFor(() => {
                MOCK_MY_BOOKINGS.forEach((b) => {
                    expect(screen.getByTestId(`booking-row-${b.id}`)).toBeInTheDocument();
                });
            });
        });

        test('shows event title, tier and quantity in each row', async () => {
            renderDashboard();
            const row = await screen.findByTestId(`booking-row-${MOCK_MY_BOOKINGS[0].id}`);
            expect(within(row).getByText('Moniepoint Merchant Summit 2026')).toBeInTheDocument();
            expect(within(row).getByText(/VIP Front Row/)).toBeInTheDocument();
            expect(within(row).getByText(/2 tickets/)).toBeInTheDocument();
        });

        test('CONFIRMED row shows a Cancel button', async () => {
            renderDashboard();
            const row = await screen.findByTestId(`booking-row-${MOCK_MY_BOOKINGS[0].id}`);
            expect(within(row).getByRole('button', { name: /cancel/i })).toBeInTheDocument();
        });

        test('shows Confirmed status badge on confirmed bookings', async () => {
            renderDashboard();
            const row = await screen.findByTestId(`booking-row-${MOCK_MY_BOOKINGS[0].id}`);
            expect(within(row).getByText('Confirmed')).toBeInTheDocument();
        });
    });

    describe('cancel flow', () => {
        test('clicking Cancel opens the confirmation dialog', async () => {
            renderDashboard();
            const row = await screen.findByTestId(`booking-row-${MOCK_MY_BOOKINGS[0].id}`);
            await userEvent.click(within(row).getByRole('button', { name: /cancel/i }));
            const dialog = await screen.findByRole('dialog', { name: /cancel booking/i });
            expect(dialog).toBeInTheDocument();
            expect(within(dialog).getByText(/Moniepoint Merchant Summit 2026/)).toBeInTheDocument();
        });

        test('"Keep booking" dismisses the dialog without cancelling', async () => {
            renderDashboard();
            const row = await screen.findByTestId(`booking-row-${MOCK_MY_BOOKINGS[0].id}`);
            await userEvent.click(within(row).getByRole('button', { name: /cancel/i }));
            await screen.findByRole('dialog', { name: /cancel booking/i });

            await userEvent.click(screen.getByRole('button', { name: /keep booking/i }));
            await waitFor(() =>
                expect(screen.queryByRole('dialog', { name: /cancel booking/i })).not.toBeInTheDocument()
            );
        });

        test('"Yes, cancel" calls the cancel endpoint and closes dialog', async () => {
            renderDashboard();
            const row = await screen.findByTestId(`booking-row-${MOCK_MY_BOOKINGS[0].id}`);
            await userEvent.click(within(row).getByRole('button', { name: /cancel/i }));
            await screen.findByRole('dialog', { name: /cancel booking/i });

            await userEvent.click(screen.getByRole('button', { name: /yes, cancel/i }));
            await waitFor(() =>
                expect(screen.queryByRole('dialog', { name: /cancel booking/i })).not.toBeInTheDocument()
            );
        });

        test('shows error alert when cancel API fails', async () => {
            server.use(
                http.post(
                    `http://localhost:3000/events/${MOCK_MY_BOOKINGS[0].eventId}/bookings/${MOCK_MY_BOOKINGS[0].id}/cancel`,
                    () => HttpResponse.json({ success: false, message: 'Booking already cancelled' }, { status: 409 })
                )
            );
            renderDashboard();
            const row = await screen.findByTestId(`booking-row-${MOCK_MY_BOOKINGS[0].id}`);
            await userEvent.click(within(row).getByRole('button', { name: /cancel/i }));
            await userEvent.click(await screen.findByRole('button', { name: /yes, cancel/i }));
            expect(await screen.findByRole('alert')).toHaveTextContent(/booking already cancelled/i);
        });
    });

    describe('edge cases', () => {
        test('shows empty state when user has no bookings', async () => {
            server.use(
                http.get('http://localhost:3000/me/bookings', () =>
                    HttpResponse.json({ success: true, data: [] })
                )
            );
            renderDashboard();
            expect(await screen.findByTestId('dashboard-empty')).toBeInTheDocument();
        });

        test('shows error state when API fails', async () => {
            server.use(
                http.get('http://localhost:3000/me/bookings', () =>
                    HttpResponse.json({ success: false }, { status: 500 })
                )
            );
            renderDashboard();
            await waitFor(() =>
                expect(screen.getByText(/could not load bookings/i)).toBeInTheDocument()
            );
        });
    });
});
