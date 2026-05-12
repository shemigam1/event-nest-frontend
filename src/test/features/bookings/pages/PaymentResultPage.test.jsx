import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/test/renderWithProviders';
import { server } from '@/test/server';
import PaymentResultPage from '@/features/bookings/pages/PaymentResultPage';

// Speed up polling for tests
vi.mock('@/features/bookings/paymentConfig', () => ({
    POLL_INTERVAL_MS: 30,
    MAX_POLLS: 10,
}));

const BASE_URL = 'http://localhost:3000';
const TXN_REF = 'TXN-MOCK-001';

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

function renderResult(search = `?transactionReference=${TXN_REF}`) {
    return renderWithProviders(
        <Routes>
            <Route path="/payment-result" element={<PaymentResultPage />} />
            <Route path="/tickets" element={<div>tickets page</div>} />
            <Route path="/events" element={<div>events list</div>} />
        </Routes>,
        { initialEntries: [`/payment-result${search}`], preloadedState: makeAuthState() }
    );
}

// Helper — scopes queries to the card to avoid matching TopNav buttons
function getCard() {
    return screen.getByTestId('payment-result-card');
}

describe('PaymentResultPage — paid flow', () => {
    test('shows spinner while verifying', () => {
        renderResult();
        expect(screen.getByText(/confirming payment/i)).toBeInTheDocument();
    });

    test('shows confirmed view when payment status is PAID', async () => {
        renderResult();
        await waitFor(() =>
            expect(within(getCard()).getByText(/payment confirmed/i)).toBeInTheDocument()
        );
        expect(within(getCard()).getByRole('button', { name: /view tickets/i })).toBeInTheDocument();
        expect(within(getCard()).getByRole('button', { name: /browse more/i })).toBeInTheDocument();
    });

    test('"View tickets" navigates to /tickets after confirmed', async () => {
        renderResult();
        const btn = await screen.findByRole('button', { name: /view tickets/i });
        await userEvent.click(btn);
        await waitFor(() =>
            expect(screen.getByText('tickets page')).toBeInTheDocument()
        );
    });

    test('"Browse more" navigates to /events after confirmed', async () => {
        renderResult();
        const btn = await screen.findByRole('button', { name: /browse more/i });
        await userEvent.click(btn);
        await waitFor(() =>
            expect(screen.getByText('events list')).toBeInTheDocument()
        );
    });
});

describe('PaymentResultPage — failed flow', () => {
    beforeEach(() => {
        server.use(
            http.post(`${BASE_URL}/payments/monnify/verify/${TXN_REF}`, () =>
                HttpResponse.json({ success: true, data: { status: 'FAILED' } })
            )
        );
    });

    test('shows failed view when payment status is FAILED', async () => {
        renderResult();
        await waitFor(() =>
            expect(within(getCard()).getByText(/payment failed/i)).toBeInTheDocument()
        );
        expect(within(getCard()).getByText(/no charge has been made/i)).toBeInTheDocument();
        expect(within(getCard()).getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    test('"Browse events" navigates to /events from failed view', async () => {
        renderResult();
        const btn = await within(getCard()).findByRole('button', { name: /browse events/i });
        await userEvent.click(btn);
        await waitFor(() =>
            expect(screen.getByText('events list')).toBeInTheDocument()
        );
    });
});

describe('PaymentResultPage — network error', () => {
    beforeEach(() => {
        server.use(
            http.post(`${BASE_URL}/payments/monnify/verify/${TXN_REF}`, () =>
                HttpResponse.error()
            )
        );
    });

    test('shows error view on network error', async () => {
        renderResult();
        await waitFor(() =>
            expect(within(getCard()).getByText(/something went wrong/i)).toBeInTheDocument()
        );
        expect(within(getCard()).getByRole('button', { name: /browse events/i })).toBeInTheDocument();
    });
});

describe('PaymentResultPage — missing transaction reference', () => {
    test('shows error view when transactionReference is absent from URL', async () => {
        renderResult('');
        await waitFor(() =>
            expect(within(getCard()).getByText(/something went wrong/i)).toBeInTheDocument()
        );
    });
});

describe('PaymentResultPage — pending timeout', () => {
    beforeEach(() => {
        server.use(
            http.post(`${BASE_URL}/payments/monnify/verify/${TXN_REF}`, () =>
                HttpResponse.json({ success: true, data: { status: 'PENDING' } })
            )
        );
    });

    test('shows timeout view after max polls exhausted', async () => {
        renderResult();
        await waitFor(() =>
            expect(within(getCard()).getByText(/payment pending/i)).toBeInTheDocument(),
            { timeout: 3000 }
        );
        expect(within(getCard()).getByText(/waiting for confirmation from the payment gateway/i)).toBeInTheDocument();
        expect(within(getCard()).getByRole('button', { name: /check my tickets/i })).toBeInTheDocument();
    });

    test('"Check my tickets" navigates to /tickets from timeout view', async () => {
        renderResult();
        const btn = await within(getCard()).findByRole('button', { name: /check my tickets/i }, { timeout: 3000 });
        await userEvent.click(btn);
        await waitFor(() =>
            expect(screen.getByText('tickets page')).toBeInTheDocument()
        );
    });
});

describe('PaymentResultPage — recovery from pending to paid', () => {
    test('transitions to paid when a later poll returns PAID', async () => {
        let callCount = 0;
        server.use(
            http.post(`${BASE_URL}/payments/monnify/verify/${TXN_REF}`, () => {
                callCount++;
                const status = callCount < 3 ? 'PENDING' : 'PAID';
                return HttpResponse.json({ success: true, data: { status } });
            })
        );

        renderResult();
        await waitFor(() =>
            expect(within(getCard()).getByText(/payment confirmed/i)).toBeInTheDocument(),
            { timeout: 3000 }
        );
    });
});
