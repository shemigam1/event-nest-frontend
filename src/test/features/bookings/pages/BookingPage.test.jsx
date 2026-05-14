import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/test/renderWithProviders';
import { server } from '@/test/server';
import BookingPage from '@/features/bookings/pages/BookingPage';

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

function renderBooking({ id = 'evt_001' } = {}) {
    return renderWithProviders(
        <Routes>
            <Route path="/events/:id/book" element={<BookingPage />} />
            <Route path="/events" element={<div>events list</div>} />
            <Route path="/events/:id" element={<div>event detail</div>} />
            <Route path="/tickets" element={<div>tickets page</div>} />
        </Routes>,
        { initialEntries: [`/events/${id}/book`], preloadedState: makeAuthState() }
    );
}

describe('BookingPage', () => {
    test('renders all tiers in the select-tier step', async () => {
        renderBooking();
        await waitFor(() => screen.getByText('VIP Front Row'));
        expect(screen.getByText('VIP Front Row')).toBeInTheDocument();
        expect(screen.getByText('General Admission')).toBeInTheDocument();
        expect(screen.getByText('₦75,000')).toBeInTheDocument();
        expect(screen.getByText('₦25,000')).toBeInTheDocument();
    });

    test('first available tier is preselected', async () => {
        renderBooking();
        const tier = await screen.findByTestId('tier-t1');
        expect(tier).toHaveAttribute('aria-pressed', 'true');
    });

    test('Continue advances to the quantity step', async () => {
        renderBooking();
        await screen.findByTestId('tier-t1');
        await userEvent.click(screen.getByRole('button', { name: /continue/i }));
        expect(await screen.findByText(/Pick a quantity/i)).toBeInTheDocument();
    });

    test('quantity stepper increments and decrements with caps', async () => {
        renderBooking();
        await screen.findByTestId('tier-t1');
        await userEvent.click(screen.getByRole('button', { name: /continue/i }));

        const display = await screen.findByTestId('qty-display');
        expect(display).toHaveTextContent('1');

        const inc = screen.getByRole('button', { name: /increase quantity/i });
        const dec = screen.getByRole('button', { name: /decrease quantity/i });

        expect(dec).toBeDisabled();

        await userEvent.click(inc);
        expect(display).toHaveTextContent('2');
        await userEvent.click(inc);
        expect(display).toHaveTextContent('3');
        await userEvent.click(dec);
        expect(display).toHaveTextContent('2');
    });

    test('review step shows correct total amount for paid tier', async () => {
        renderBooking();
        await screen.findByTestId('tier-t1');
        await userEvent.click(screen.getByRole('button', { name: /continue/i }));

        const inc = await screen.findByRole('button', { name: /increase quantity/i });
        await userEvent.click(inc);
        await userEvent.click(inc);
        await userEvent.click(screen.getByRole('button', { name: /review/i }));

        expect(await screen.findByTestId('total-amount')).toHaveTextContent('₦225,000');
    });

    test('shows "Free" total for zero-price tier', async () => {
        renderBooking({ id: 'evt_002' });
        await screen.findByTestId('tier-t3');
        await userEvent.click(screen.getByRole('button', { name: /continue/i }));
        await userEvent.click(await screen.findByRole('button', { name: /review/i }));
        expect(await screen.findByTestId('total-amount')).toHaveTextContent('Free');
    });

    test('confirming a booking shows the success step with seats', async () => {
        renderBooking();
        await screen.findByTestId('tier-t1');
        await userEvent.click(screen.getByRole('button', { name: /continue/i }));
        await userEvent.click(await screen.findByRole('button', { name: /review/i }));
        await userEvent.click(await screen.findByRole('button', { name: /confirm booking/i }));

        await waitFor(() =>
            expect(screen.getByText(/you're booked/i)).toBeInTheDocument()
        );
        // MSW handler issues a single seat starting at offset 38 (50 total - 12 available)
        expect(screen.getByText(/Your seats/i)).toBeInTheDocument();
    });

    test('"View tickets" navigates to /tickets after success', async () => {
        renderBooking();
        await screen.findByTestId('tier-t1');
        await userEvent.click(screen.getByRole('button', { name: /continue/i }));
        await userEvent.click(await screen.findByRole('button', { name: /review/i }));
        await userEvent.click(await screen.findByRole('button', { name: /confirm booking/i }));
        await screen.findByText(/you're booked/i);

        await userEvent.click(screen.getByRole('button', { name: /view tickets/i }));
        await waitFor(() => expect(screen.getByText('tickets page')).toBeInTheDocument());
    });

    test('shows error message when create booking fails', async () => {
        server.use(
            http.post('http://localhost:3000/events/evt_001/bookings', () =>
                HttpResponse.json({ success: false, message: 'Tier sold out' }, { status: 409 })
            )
        );
        renderBooking();
        await screen.findByTestId('tier-t1');
        await userEvent.click(screen.getByRole('button', { name: /continue/i }));
        await userEvent.click(await screen.findByRole('button', { name: /review/i }));
        await userEvent.click(await screen.findByRole('button', { name: /confirm booking/i }));

        expect(await screen.findByRole('alert')).toHaveTextContent(/tier sold out/i);
    });

    test('renders Sold out empty state when no tier has availability', async () => {
        server.use(
            http.get('http://localhost:3000/events/evt_001/tiers', () =>
                HttpResponse.json({
                    success: true,
                    data: [
                        { id: 't1', eventId: 'evt_001', name: 'VIP', price: 75000, rowPrefix: 'V', rowCount: 1, seatsPerRow: 1, totalCapacity: 1, availableCapacity: 0, createdAt: '2026-01-01T00:00:00' },
                    ],
                })
            )
        );
        renderBooking();
        await waitFor(() =>
            expect(screen.getByRole('heading', { name: /sold out/i })).toBeInTheDocument()
        );
    });

    test('redirects to event when status is not PUBLISHED', async () => {
        server.use(
            http.get('http://localhost:3000/events/evt_draft', () =>
                HttpResponse.json({
                    success: true,
                    data: {
                        id: 'evt_draft',
                        title: 'Draft event',
                        venue: 'Venue',
                        startTime: '2026-05-16T10:00:00',
                        endTime: '2026-05-16T18:00:00',
                        status: 'DRAFT',
                    },
                })
            ),
            http.get('http://localhost:3000/events/evt_draft/tiers', () =>
                HttpResponse.json({ success: true, data: [] })
            )
        );
        renderBooking({ id: 'evt_draft' });
        await waitFor(() =>
            expect(screen.getByRole('heading', { name: /not on sale/i })).toBeInTheDocument()
        );
    });

    test('Back button on review step returns to quantity step', async () => {
        renderBooking();
        await screen.findByTestId('tier-t1');
        await userEvent.click(screen.getByRole('button', { name: /continue/i }));
        await userEvent.click(await screen.findByRole('button', { name: /review/i }));
        await screen.findByText(/Almost there/i);

        const backButtons = screen.getAllByRole('button', { name: /^back$/i });
        await userEvent.click(backButtons[0]);
        expect(await screen.findByText(/Pick a quantity/i)).toBeInTheDocument();
    });

    test('stepper is hidden after success', async () => {
        renderBooking();
        await screen.findByTestId('tier-t1');
        expect(screen.getByTestId('booking-stepper')).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: /continue/i }));
        await userEvent.click(await screen.findByRole('button', { name: /review/i }));
        await userEvent.click(await screen.findByRole('button', { name: /confirm booking/i }));
        await screen.findByText(/you're booked/i);

        expect(screen.queryByTestId('booking-stepper')).not.toBeInTheDocument();
    });
});

describe('BookingPage — payment redirect', () => {
    let originalLocation;

    beforeEach(() => {
        originalLocation = window.location;
        delete window.location;
        window.location = { href: '' };
    });

    afterEach(() => {
        window.location = originalLocation;
    });

    test('redirects to paymentUrl when booking returns one', async () => {
        server.use(
            http.post('http://localhost:3000/events/evt_001/bookings', () =>
                HttpResponse.json({
                    success: true,
                    data: {
                        id: 'bk_pay_001',
                        paymentUrl: 'http://localhost:5173/stub-payment?ref=STUB-abc&amount=75000',
                        paymentStatus: 'PENDING',
                        quantity: 1,
                        totalAmount: 75000,
                        tickets: [],
                        createdAt: '2026-05-01T00:00:00',
                    },
                }, { status: 201 })
            )
        );
        renderBooking();
        await screen.findByTestId('tier-t1');
        await userEvent.click(screen.getByRole('button', { name: /continue/i }));
        await userEvent.click(await screen.findByRole('button', { name: /review/i }));
        await userEvent.click(await screen.findByRole('button', { name: /confirm booking/i }));

        await waitFor(() =>
            expect(window.location.href).toBe('http://localhost:5173/stub-payment?ref=STUB-abc&amount=75000')
        );
        expect(screen.queryByText(/you're booked/i)).not.toBeInTheDocument();
    });

    test('shows success step when booking has no paymentUrl (free tier)', async () => {
        renderBooking({ id: 'evt_002' });
        await screen.findByTestId('tier-t3');
        await userEvent.click(screen.getByRole('button', { name: /continue/i }));
        await userEvent.click(await screen.findByRole('button', { name: /review/i }));
        await userEvent.click(await screen.findByRole('button', { name: /confirm booking/i }));

        await waitFor(() =>
            expect(screen.getByText(/you're booked/i)).toBeInTheDocument()
        );
        expect(window.location.href).toBe('');
    });

    test('review step shows payment redirect notice for paid tier', async () => {
        renderBooking();
        await screen.findByTestId('tier-t1');
        await userEvent.click(screen.getByRole('button', { name: /continue/i }));
        await userEvent.click(await screen.findByRole('button', { name: /review/i }));
        await screen.findByText(/Almost there/i);

        expect(screen.getByText(/redirected to our secure payment page/i)).toBeInTheDocument();
    });

    test('review step does NOT show payment notice for free tier', async () => {
        renderBooking({ id: 'evt_002' });
        await screen.findByTestId('tier-t3');
        await userEvent.click(screen.getByRole('button', { name: /continue/i }));
        await userEvent.click(await screen.findByRole('button', { name: /review/i }));
        await screen.findByText(/Almost there/i);

        expect(screen.queryByText(/redirected to our secure payment page/i)).not.toBeInTheDocument();
    });
});

describe('BookingPage stepper indicator', () => {
    test('marks step labels as user advances', async () => {
        renderBooking();
        await screen.findByTestId('tier-t1');
        const stepper = screen.getByTestId('booking-stepper');
        expect(within(stepper).getByText('Select tier')).toBeInTheDocument();
        expect(within(stepper).getByText('Choose quantity')).toBeInTheDocument();
        expect(within(stepper).getByText('Review')).toBeInTheDocument();
    });
});
