import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/test/renderWithProviders';
import { server } from '@/test/server';
import PaymentsTransactionsPage from '@/features/payments/pages/PaymentsTransactionsPage';

const BASE_URL = 'http://localhost:3000';
const EVENT_ID = 'evt_001';

function renderPage(id = EVENT_ID) {
    return renderWithProviders(
        <Routes>
            <Route
                path="/payments/transactions/:eventId"
                element={<PaymentsTransactionsPage />}
            />
        </Routes>,
        { initialEntries: [`/payments/transactions/${id}`] },
    );
}

/* Default handlers for the three endpoints this page consumes. Tests can
   override any of them with server.use(...) before rendering. */
function defaultHandlers({
    event = {
        id: EVENT_ID,
        title: 'Moniepoint DreamDev Bootcamp — Capstone Demo Day',
        venue: 'Marriott Hotels Ikeja',
        startTime: '2026-05-26T09:00:00',
    },
    analytics = {
        totalRevenue: 5000000,
        totalAttendees: 12,
        paidBookings: 8,
        refundedBookings: 1,
        pendingBookings: 2,
    },
    bookingsPage = {
        content: [
            {
                id: 'bk_201',
                tierId: 't1',
                tierName: 'VIP Front Row',
                quantity: 2,
                unitPrice: 1500000,
                totalPrice: 3000000,
                paymentStatus: 'PAID',
                attendeeName: 'Adaeze Okonkwo',
                attendeeEmail: 'adaeze@example.com',
                createdAt: '2026-05-01T10:00:00',
            },
            {
                id: 'bk_202',
                tierId: 't2',
                tierName: 'General Admission',
                quantity: 1,
                unitPrice: 2000000,
                totalPrice: 2000000,
                paymentStatus: 'PENDING_PAYMENT',
                attendeeName: 'Chidi Okeke',
                attendeeEmail: 'chidi@example.com',
                createdAt: '2026-05-02T11:00:00',
            },
        ],
        totalElements: 2,
        totalPages: 1,
        number: 0,
    },
} = {}) {
    server.use(
        http.get(`${BASE_URL}/me/organiser/events/:id`, () =>
            HttpResponse.json({ success: true, data: event }),
        ),
        http.get(`${BASE_URL}/me/organiser/events/:id/analytics`, () =>
            HttpResponse.json({ success: true, data: analytics }),
        ),
        http.get(`${BASE_URL}/me/organiser/events/:id/bookings`, () =>
            HttpResponse.json({ success: true, data: bookingsPage }),
        ),
    );
}

describe('PaymentsTransactionsPage', () => {
    test('renders the event title from the organiser-event endpoint', async () => {
        defaultHandlers();
        renderPage();
        expect(
            await screen.findByRole('heading', {
                name: /Moniepoint DreamDev Bootcamp/i,
            }),
        ).toBeInTheDocument();
    });

    test('summary tiles populate from the analytics endpoint', async () => {
        defaultHandlers();
        renderPage();

        // formatNaira uses 0-fraction-digit default, so 5,000,000 kobo → ₦50,000.
        // Use a regex matcher to tolerate ICU non-breaking-space variants.
        await screen.findByText(/₦\s?50,000/);
        // The smaller numbers (1, 2, 8) can collide with booking-row quantities
        // displayed in the same table, so we assert at-least-1 occurrence rather
        // than a single unique match.
        expect(screen.getByText('12')).toBeInTheDocument(); // total attendees, unique
        expect(screen.getAllByText('8').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1);
    });

    test('renders one row per booking with buyer, tier and total', async () => {
        defaultHandlers();
        renderPage();

        await screen.findByText('Adaeze Okonkwo');
        expect(screen.getByText('adaeze@example.com')).toBeInTheDocument();
        expect(screen.getByText('VIP Front Row')).toBeInTheDocument();
        // 3,000,000 kobo → ₦30,000  /  2,000,000 kobo → ₦20,000
        expect(screen.getByText(/₦\s?30,000/)).toBeInTheDocument();

        expect(screen.getByText('Chidi Okeke')).toBeInTheDocument();
        expect(screen.getByText('General Admission')).toBeInTheDocument();
        expect(screen.getByText(/₦\s?20,000/)).toBeInTheDocument();
    });

    test('renders PAID and PENDING status badges from booking rows', async () => {
        defaultHandlers();
        renderPage();
        await screen.findByText('Adaeze Okonkwo');
        // "Paid" appears only on the booking-status badge (the summary tile reads
        // "Paid bookings"). "Pending" appears on BOTH the summary tile and the
        // badge, so we just assert at least one badge is present.
        expect(screen.getByText('Paid')).toBeInTheDocument();
        expect(screen.getAllByText('Pending').length).toBeGreaterThanOrEqual(1);
    });

    test('empty state shows when bookings list is empty', async () => {
        defaultHandlers({
            bookingsPage: { content: [], totalElements: 0, totalPages: 0, number: 0 },
        });
        renderPage();
        expect(await screen.findByText(/no transactions yet/i)).toBeInTheDocument();
    });

    test('pagination requests the next page when Next is clicked', async () => {
        const pageRequests = [];
        server.use(
            http.get(`${BASE_URL}/me/organiser/events/:id`, () =>
                HttpResponse.json({ success: true, data: { id: EVENT_ID, title: 'Demo Day' } }),
            ),
            http.get(`${BASE_URL}/me/organiser/events/:id/analytics`, () =>
                HttpResponse.json({
                    success: true,
                    data: { totalRevenue: 0, totalAttendees: 0, paidBookings: 0, refundedBookings: 0, pendingBookings: 0 },
                }),
            ),
            http.get(`${BASE_URL}/me/organiser/events/:id/bookings`, ({ request }) => {
                const url = new URL(request.url);
                const page = Number(url.searchParams.get('page') ?? 0);
                pageRequests.push(page);
                const content = page === 0
                    ? [
                        {
                            id: `bk_p0`, tierId: 't1', tierName: 'VIP', quantity: 1,
                            unitPrice: 100000, totalPrice: 100000, paymentStatus: 'PAID',
                            attendeeName: 'Page-0 Buyer', attendeeEmail: 'p0@x.com',
                            createdAt: '2026-05-01T00:00:00',
                        },
                    ]
                    : [
                        {
                            id: `bk_p1`, tierId: 't1', tierName: 'VIP', quantity: 1,
                            unitPrice: 100000, totalPrice: 100000, paymentStatus: 'PAID',
                            attendeeName: 'Page-1 Buyer', attendeeEmail: 'p1@x.com',
                            createdAt: '2026-05-02T00:00:00',
                        },
                    ];
                return HttpResponse.json({
                    success: true,
                    data: { content, totalElements: 2, totalPages: 2, number: page },
                });
            }),
        );

        renderPage();
        await screen.findByText('Page-0 Buyer');
        expect(pageRequests).toContain(0);

        await userEvent.click(screen.getByRole('button', { name: /next/i }));
        await waitFor(() => expect(pageRequests).toContain(1));
        expect(await screen.findByText('Page-1 Buyer')).toBeInTheDocument();
    });

    test('Previous button is disabled on page 0', async () => {
        defaultHandlers({
            bookingsPage: {
                content: [
                    {
                        id: 'bk_x', tierId: 't1', tierName: 'VIP', quantity: 1,
                        unitPrice: 100000, totalPrice: 100000, paymentStatus: 'PAID',
                        attendeeName: 'A B', attendeeEmail: 'a@b.com',
                        createdAt: '2026-05-01T00:00:00',
                    },
                ],
                totalElements: 21,
                totalPages: 2,
                number: 0,
            },
        });
        renderPage();
        await screen.findByText('A B');
        expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
        expect(screen.getByRole('button', { name: /next/i })).toBeEnabled();
    });

    test('falls back to a sensible header when event endpoint errors', async () => {
        server.use(
            http.get(`${BASE_URL}/me/organiser/events/:id`, () =>
                HttpResponse.json({ success: false, message: 'forbidden' }, { status: 403 }),
            ),
            http.get(`${BASE_URL}/me/organiser/events/:id/analytics`, () =>
                HttpResponse.json({
                    success: true,
                    data: { totalRevenue: 0, totalAttendees: 0, paidBookings: 0, refundedBookings: 0, pendingBookings: 0 },
                }),
            ),
            http.get(`${BASE_URL}/me/organiser/events/:id/bookings`, () =>
                HttpResponse.json({ success: true, data: { content: [], totalElements: 0, totalPages: 0, number: 0 } }),
            ),
        );
        renderPage();
        // Generic heading falls back when event isn't loaded
        expect(
            await screen.findByRole('heading', { name: /event payments/i }),
        ).toBeInTheDocument();
        expect(
            await screen.findByText(/some data couldn't be loaded/i),
        ).toBeInTheDocument();
    });
});
