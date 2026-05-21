import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/test/renderWithProviders';
import { server, MOCK_EVENTS, MOCK_TIERS } from '@/test/server';
import EventDetailPage from '@/features/events/pages/EventDetailPage';

function makeAuthState() {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
        sub: 'a@b.com',
        email: 'a@b.com',
        roles: ['ROLE_USER'],
        type: 'ACCESS',
        exp: Math.floor(Date.now() / 1000) + 3600,
    }));
    const token = `${header}.${payload}.signature`;
    return {
        auth: {
            user: null,
            tokenUser: { email: 'a@b.com', roles: ['ROLE_USER'] },
            token,
            refreshToken: 'r',
            isAuthenticated: true,
        },
    };
}

function renderDetail({ id = 'evt_001', preloadedState } = {}) {
    return renderWithProviders(
        <Routes>
            <Route path="/events/:identifier" element={<EventDetailPage />} />
            <Route path="/events" element={<div>events list</div>} />
            <Route path="/events/:id/book" element={<div>book page</div>} />
            <Route path="/login" element={<div>login page</div>} />
        </Routes>,
        { initialEntries: [`/events/${id}`], preloadedState }
    );
}

describe('EventDetailPage', () => {
    test('renders event title, venue and formatted date', async () => {
        renderDetail();
        await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'Moniepoint Merchant Summit 2026' })).toBeInTheDocument();
        });
        expect(screen.getByText('Eko Convention Centre, Lagos')).toBeInTheDocument();
        expect(screen.getByText('Sat 16 May · 10:00 AM')).toBeInTheDocument();
    });

    test('shows Published status badge for a published event', async () => {
        renderDetail();
        const aside = await screen.findByTestId('booking-aside');
        expect(aside).toHaveTextContent(/Live/i);
        expect(screen.getByText('Published')).toBeInTheDocument();
    });

    test('renders all tiers with formatted prices and remaining capacity', async () => {
        renderDetail();
        await waitFor(() => screen.getByText('VIP Front Row'));
        expect(screen.getByText('VIP Front Row')).toBeInTheDocument();
        expect(screen.getByText('₦75,000')).toBeInTheDocument();
        // 50 - 12 sold => "12 of 50 left · 38 sold"
        expect(screen.getByText(/12 of 50 left/)).toBeInTheDocument();
    });

    test('renders "Free" for tiers with zero price', async () => {
        renderDetail({ id: 'evt_002' });
        await waitFor(() => screen.getByText('Standard'));
        expect(screen.getByText('Free')).toBeInTheDocument();
    });

    test('shows total-capacity bar across all tiers', async () => {
        renderDetail();
        // total = 50 + 400 = 450, sold = (50-12) + (400-113) = 38 + 287 = 325
        await waitFor(() => screen.getByText('Total capacity'));
        expect(screen.getByText('325')).toBeInTheDocument();
        expect(screen.getByText('/ 450')).toBeInTheDocument();
    });

    test('"Book seats" routes to /login when unauthenticated', async () => {
        renderDetail();
        const button = await screen.findByRole('button', { name: /book seats/i });
        await userEvent.click(button);
        await waitFor(() => expect(screen.getByText('login page')).toBeInTheDocument());
    });

    test('"Book seats" routes to /events/:id/book when authenticated', async () => {
        renderDetail({ preloadedState: makeAuthState() });
        const button = await screen.findByRole('button', { name: /book seats/i });
        await userEvent.click(button);
        await waitFor(() => expect(screen.getByText('book page')).toBeInTheDocument());
    });

    test('shows Sold out CTA when no tiers have availability', async () => {
        server.use(
            http.get('http://localhost:3000/events/evt_001/tiers', () =>
                HttpResponse.json({
                    success: true,
                    data: [{
                        ...MOCK_TIERS.evt_001[0],
                        availableCapacity: 0,
                        totalCapacity: 50,
                    }],
                })
            )
        );
        renderDetail();
        const button = await screen.findByRole('button', { name: /sold out/i });
        expect(button).toBeDisabled();
    });

    test('shows Not found state when event API returns 404', async () => {
        server.use(
            http.get('http://localhost:3000/events/evt_404', () =>
                HttpResponse.json({ success: false, message: 'Not found' }, { status: 404 })
            )
        );
        renderDetail({ id: 'evt_404' });
        await waitFor(() => {
            expect(screen.getByText(/event not found/i)).toBeInTheDocument();
        });
    });

    test('disables CTA when event is not PUBLISHED', async () => {
        const draftEvent = { ...MOCK_EVENTS[0], id: 'evt_draft', slug: 'evt_draft', status: 'DRAFT' };
        server.use(
            http.get('http://localhost:3000/events/slug/evt_draft', () =>
                HttpResponse.json({ success: true, data: draftEvent })
            ),
            http.get('http://localhost:3000/events/evt_draft', () =>
                HttpResponse.json({ success: true, data: draftEvent })
            ),
            http.get('http://localhost:3000/events/evt_draft/tiers', () =>
                HttpResponse.json({ success: true, data: MOCK_TIERS.evt_001 })
            )
        );
        renderDetail({ id: 'evt_draft' });
        const button = await screen.findByRole('button', { name: /not on sale/i });
        expect(button).toBeDisabled();
    });
});
