import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import LandingPage from '@/features/landing/LandingPage';

describe('LandingPage', () => {
    describe('navigation bar', () => {
        test('renders EventNest brand name', () => {
            renderWithProviders(<LandingPage />);
            // Brand appears in both nav and footer; use getAllBy and check at least one
            expect(screen.getAllByText('EventNest').length).toBeGreaterThan(0);
        });

        test('navigates to /login when "Sign in" is clicked', async () => {
            renderWithProviders(<LandingPage />, { initialEntries: ['/'] });
            const nav = screen.getByTestId('topnav');
            await userEvent.click(within(nav).getByRole('button', { name: /sign in/i }));
            expect(screen.getByTestId('location')).toHaveTextContent('/login');
        });

        test('navigates to /register when "Get started" is clicked', async () => {
            renderWithProviders(<LandingPage />, { initialEntries: ['/'] });
            const nav = screen.getByTestId('topnav');
            await userEvent.click(within(nav).getByRole('button', { name: /get started/i }));
            expect(screen.getByTestId('location')).toHaveTextContent('/register');
        });

        test('navigates to /events when "Browse events" in nav is clicked', async () => {
            renderWithProviders(<LandingPage />, { initialEntries: ['/'] });
            const nav = screen.getByTestId('topnav');
            await userEvent.click(within(nav).getByRole('button', { name: /browse events/i }));
            expect(screen.getByTestId('location')).toHaveTextContent('/events');
        });
    });

    describe('audience toggle — attendee view (default)', () => {
        test('shows attendee eyebrow text by default', () => {
            renderWithProviders(<LandingPage />);
            expect(screen.getByText(/for people who actually want their seat/i)).toBeInTheDocument();
        });

        test('renders attendee primary CTA in the hero', () => {
            renderWithProviders(<LandingPage />);
            // Both nav and hero have a "Browse events" button in attendee view
            expect(screen.getAllByRole('button', { name: /browse events/i }).length).toBeGreaterThanOrEqual(1);
        });

        test('shows attendee stats', () => {
            renderWithProviders(<LandingPage />);
            expect(screen.getByText('12,400+')).toBeInTheDocument();
            expect(screen.getByText('Tickets booked')).toBeInTheDocument();
        });

        test('shows attendee pillars section heading', () => {
            renderWithProviders(<LandingPage />);
            expect(screen.getByText('Why EventNest')).toBeInTheDocument();
        });

        test('shows "On the calendar" events section heading', () => {
            renderWithProviders(<LandingPage />);
            expect(screen.getByText('On the calendar')).toBeInTheDocument();
        });
    });

    describe('audience toggle — organiser view', () => {
        async function switchToOrganiser() {
            renderWithProviders(<LandingPage />);
            await userEvent.click(screen.getByRole('button', { name: /for organisers/i }));
        }

        test('switches to organiser eyebrow text', async () => {
            await switchToOrganiser();
            expect(screen.getByText(/for teams running events that can't go wrong/i)).toBeInTheDocument();
        });

        test('shows organiser primary CTA', async () => {
            await switchToOrganiser();
            expect(screen.getByRole('button', { name: /host an event/i })).toBeInTheDocument();
        });

        test('shows organiser stats', async () => {
            await switchToOrganiser();
            expect(screen.getByText('99.98%')).toBeInTheDocument();
            expect(screen.getByText('Booking uptime')).toBeInTheDocument();
        });

        test('shows organiser pillars eyebrow', async () => {
            await switchToOrganiser();
            expect(screen.getByText('Why teams choose us')).toBeInTheDocument();
        });

        test('shows "Recently published" events section heading', async () => {
            await switchToOrganiser();
            expect(screen.getByText('Recently published')).toBeInTheDocument();
        });

        test('organiser primary CTA navigates to /register', async () => {
            renderWithProviders(<LandingPage />, { initialEntries: ['/'] });
            await userEvent.click(screen.getByRole('button', { name: /for organisers/i }));
            await userEvent.click(screen.getByRole('button', { name: /host an event/i }));
            expect(screen.getByTestId('location')).toHaveTextContent('/register');
        });
    });

    describe('featured events grid', () => {
        test('renders the first 3 events from sample data', () => {
            renderWithProviders(<LandingPage />);
            expect(screen.getByText('Moniepoint Merchant Summit 2026')).toBeInTheDocument();
            expect(screen.getByText('Agent Onboarding Workshop · Q2')).toBeInTheDocument();
            expect(screen.getByText('Partner Certification Day — Lagos')).toBeInTheDocument();
        });

        test('does not render the 4th event', () => {
            renderWithProviders(<LandingPage />);
            expect(screen.queryByText('AfroTech Lagos · Investor Mixer')).not.toBeInTheDocument();
        });

        test('"Browse all" navigates to /events', async () => {
            renderWithProviders(<LandingPage />, { initialEntries: ['/'] });
            await userEvent.click(screen.getByRole('button', { name: /browse all/i }));
            expect(screen.getByTestId('location')).toHaveTextContent('/events');
        });

        test('clicking an event card navigates to its detail page', async () => {
            renderWithProviders(<LandingPage />, { initialEntries: ['/'] });
            // Click the first event card (Merchant Summit)
            const summitTitle = screen.getByText('Moniepoint Merchant Summit 2026');
            await userEvent.click(summitTitle.closest('button'));
            expect(screen.getByTestId('location')).toHaveTextContent('/events/evt_001');
        });
    });
});
