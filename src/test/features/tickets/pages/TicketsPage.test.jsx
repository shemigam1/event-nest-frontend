import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/test/renderWithProviders';
import { server } from '@/test/server';
import TicketsPage from '@/features/tickets/pages/TicketsPage';

function makeAuthState() {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
        sub: 'a@b.com',
        email: 'a@b.com',
        roles: ['ROLE_USER'],
        type: 'ACCESS',
        exp: Math.floor(Date.now() / 1000) + 3600,
    }));
    return {
        auth: {
            user: null,
            tokenUser: { email: 'a@b.com', roles: ['ROLE_USER'] },
            token: `${header}.${payload}.signature`,
            refreshToken: 'r',
            isAuthenticated: true,
        },
    };
}

function renderPage() {
    return renderWithProviders(<TicketsPage />, {
        initialEntries: ['/tickets'],
        preloadedState: makeAuthState(),
    });
}

describe('TicketsPage', () => {
    test('renders the page heading and subhead', async () => {
        renderPage();
        expect(await screen.findByRole('heading', { name: /my tickets/i })).toBeInTheDocument();
        expect(screen.getByText(/tap any ticket to display the qr/i)).toBeInTheDocument();
    });

    test('renders a card per ticket from the API', async () => {
        renderPage();
        await waitFor(() => screen.getByTestId('ticket-tk_001'));
        expect(screen.getByTestId('ticket-tk_001')).toBeInTheDocument();
        expect(screen.getByTestId('ticket-tk_002')).toBeInTheDocument();
        expect(screen.getByTestId('ticket-tk_003')).toBeInTheDocument();
    });

    test('shows seat number, tier and event title on each ticket', async () => {
        renderPage();
        const card = await screen.findByTestId('ticket-tk_001');
        expect(within(card).getByText('VIP2-5')).toBeInTheDocument();
        expect(within(card).getByText('VIP Front Row')).toBeInTheDocument();
        expect(within(card).getByText('Moniepoint Merchant Summit 2026')).toBeInTheDocument();
    });

    test('USED ticket has its Show QR button disabled', async () => {
        renderPage();
        const card = await screen.findByTestId('ticket-tk_003');
        expect(within(card).getByRole('button', { name: /show qr/i })).toBeDisabled();
    });

    test('clicking Show QR opens the boarding-pass modal', async () => {
        renderPage();
        const card = await screen.findByTestId('ticket-tk_001');
        await userEvent.click(within(card).getByRole('button', { name: /show qr/i }));

        const dialog = await screen.findByRole('dialog', { name: /ticket qr code/i });
        expect(within(dialog).getByText('BOARDING PASS')).toBeInTheDocument();
        expect(within(dialog).getByText('VIP2-5')).toBeInTheDocument();
        expect(within(dialog).getByText('qr_a8f3-72ce-bb1d')).toBeInTheDocument();
    });

    test('modal closes via the close button', async () => {
        renderPage();
        const card = await screen.findByTestId('ticket-tk_001');
        await userEvent.click(within(card).getByRole('button', { name: /show qr/i }));
        const dialog = await screen.findByRole('dialog', { name: /ticket qr code/i });

        await userEvent.click(within(dialog).getByRole('button', { name: /close qr/i }));
        await waitFor(() =>
            expect(screen.queryByRole('dialog', { name: /ticket qr code/i })).not.toBeInTheDocument()
        );
    });

    test('modal closes via the backdrop', async () => {
        renderPage();
        const card = await screen.findByTestId('ticket-tk_001');
        await userEvent.click(within(card).getByRole('button', { name: /show qr/i }));
        const dialog = await screen.findByRole('dialog', { name: /ticket qr code/i });

        await userEvent.click(dialog);
        await waitFor(() =>
            expect(screen.queryByRole('dialog', { name: /ticket qr code/i })).not.toBeInTheDocument()
        );
    });

    test('shows the empty state when the user has no tickets', async () => {
        server.use(
            http.get('http://localhost:3000/me/tickets', () =>
                HttpResponse.json({ success: true, data: [] })
            )
        );
        renderPage();
        const empty = await screen.findByTestId('tickets-empty');
        expect(within(empty).getByRole('button', { name: /browse events/i })).toBeInTheDocument();
    });

    test('shows the error state when the API fails', async () => {
        server.use(
            http.get('http://localhost:3000/me/tickets', () =>
                HttpResponse.json({ success: false }, { status: 500 })
            )
        );
        renderPage();
        await waitFor(() =>
            expect(screen.getByText(/could not load tickets/i)).toBeInTheDocument()
        );
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
});
