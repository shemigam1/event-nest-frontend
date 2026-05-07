import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/test/renderWithProviders';
import { server, MOCK_EVENTS } from '@/test/server';
import DiscoveryPage from '@/features/events/pages/DiscoveryPage';

describe('DiscoveryPage', () => {
    describe('initial load', () => {
        test('shows skeleton cards while loading', () => {
            renderWithProviders(<DiscoveryPage />);
            // During loading the header says "Loading events…"
            expect(screen.getByText('Loading events…')).toBeInTheDocument();
        });

        test('renders all events returned by the API', async () => {
            renderWithProviders(<DiscoveryPage />);
            await waitFor(() => {
                expect(screen.getByText('Moniepoint Merchant Summit 2026')).toBeInTheDocument();
                expect(screen.getByText('Agent Onboarding Workshop · Q2')).toBeInTheDocument();
                expect(screen.getByText('Partner Certification Day — Lagos')).toBeInTheDocument();
            });
        });

        test('shows correct event count in subheading', async () => {
            renderWithProviders(<DiscoveryPage />);
            await waitFor(() => {
                expect(screen.getByText(/3 events available/)).toBeInTheDocument();
            });
        });

        test('shows singular "event" when only one result', async () => {
            server.use(
                http.get('http://localhost:3000/events', () =>
                    HttpResponse.json({ success: true, data: [MOCK_EVENTS[0]] })
                )
            );
            renderWithProviders(<DiscoveryPage />);
            await waitFor(() => {
                expect(screen.getByText(/1 event available/)).toBeInTheDocument();
            });
        });

        test('formats API startTime into a readable date label', async () => {
            renderWithProviders(<DiscoveryPage />);
            await waitFor(() => {
                expect(screen.getByText('Sat 16 May · 10:00 AM')).toBeInTheDocument();
            });
        });

        test('renders venue for each event', async () => {
            renderWithProviders(<DiscoveryPage />);
            await waitFor(() => {
                expect(screen.getByText('Eko Convention Centre, Lagos')).toBeInTheDocument();
            });
        });
    });

    describe('error state', () => {
        test('shows error message when API fails', async () => {
            server.use(
                http.get('http://localhost:3000/events', () =>
                    HttpResponse.json({ success: false }, { status: 500 })
                )
            );
            renderWithProviders(<DiscoveryPage />);
            await waitFor(() => {
                expect(screen.getByText(/could not load events/i)).toBeInTheDocument();
            });
        });

        test('shows retry button on error', async () => {
            server.use(
                http.get('http://localhost:3000/events', () =>
                    HttpResponse.json({ success: false }, { status: 500 })
                )
            );
            renderWithProviders(<DiscoveryPage />);
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
            });
        });
    });

    describe('search', () => {
        test('filters events by title keyword', async () => {
            renderWithProviders(<DiscoveryPage />);
            await waitFor(() => screen.getByText('Moniepoint Merchant Summit 2026'));

            await userEvent.type(screen.getByRole('textbox', { name: /search events/i }), 'merchant');

            expect(screen.getByText('Moniepoint Merchant Summit 2026')).toBeInTheDocument();
            expect(screen.queryByText('Agent Onboarding Workshop · Q2')).not.toBeInTheDocument();
        });

        test('filters events by venue keyword', async () => {
            renderWithProviders(<DiscoveryPage />);
            await waitFor(() => screen.getByText('Moniepoint Merchant Summit 2026'));

            await userEvent.type(screen.getByRole('textbox', { name: /search events/i }), 'civic');

            expect(screen.getByText('Agent Onboarding Workshop · Q2')).toBeInTheDocument();
            expect(screen.queryByText('Moniepoint Merchant Summit 2026')).not.toBeInTheDocument();
        });

        test('search is case-insensitive', async () => {
            renderWithProviders(<DiscoveryPage />);
            await waitFor(() => screen.getByText('Moniepoint Merchant Summit 2026'));

            await userEvent.type(screen.getByRole('textbox', { name: /search events/i }), 'SUMMIT');

            expect(screen.getByText('Moniepoint Merchant Summit 2026')).toBeInTheDocument();
        });

        test('shows empty state when no results match search', async () => {
            renderWithProviders(<DiscoveryPage />);
            await waitFor(() => screen.getByText('Moniepoint Merchant Summit 2026'));

            await userEvent.type(screen.getByRole('textbox', { name: /search events/i }), 'xyznotexist');

            expect(screen.getByText('No events match.')).toBeInTheDocument();
        });

        test('shows "Try a different keyword" hint in empty state', async () => {
            renderWithProviders(<DiscoveryPage />);
            await waitFor(() => screen.getByText('Moniepoint Merchant Summit 2026'));

            await userEvent.type(screen.getByRole('textbox', { name: /search events/i }), 'xyznotexist');

            expect(screen.getByText(/try a different keyword/i)).toBeInTheDocument();
        });
    });

    describe('filter tabs', () => {
        test('renders all four filter tabs', async () => {
            renderWithProviders(<DiscoveryPage />);
            const tabs = screen.getByTestId('filter-tabs');
            expect(within(tabs).getByRole('button', { name: 'All' })).toBeInTheDocument();
            expect(within(tabs).getByRole('button', { name: 'This month' })).toBeInTheDocument();
            expect(within(tabs).getByRole('button', { name: 'Free' })).toBeInTheDocument();
            expect(within(tabs).getByRole('button', { name: 'Selling fast' })).toBeInTheDocument();
        });

        test('"All" is active by default', () => {
            renderWithProviders(<DiscoveryPage />);
            const tabs = screen.getByTestId('filter-tabs');
            const allBtn = within(tabs).getByRole('button', { name: 'All' });
            // Active tab has blue color and white background
            expect(allBtn).toHaveStyle({ color: 'var(--mp-blue)' });
        });

        test('switches active filter when a tab is clicked', async () => {
            renderWithProviders(<DiscoveryPage />);
            const tabs = screen.getByTestId('filter-tabs');
            await userEvent.click(within(tabs).getByRole('button', { name: 'This month' }));
            const thisMonthBtn = within(tabs).getByRole('button', { name: 'This month' });
            expect(thisMonthBtn).toHaveStyle({ color: 'var(--mp-blue)' });
        });
    });

    describe('navigation', () => {
        test('clicking an event card navigates to its detail page', async () => {
            renderWithProviders(<DiscoveryPage />, { initialEntries: ['/events'] });
            await waitFor(() => screen.getByText('Moniepoint Merchant Summit 2026'));

            await userEvent.click(
                screen.getByText('Moniepoint Merchant Summit 2026').closest('button')
            );
            expect(screen.getByTestId('location')).toHaveTextContent('/events/evt_001');
        });

        test('brand logo navigates to /', async () => {
            renderWithProviders(<DiscoveryPage />, { initialEntries: ['/events'] });
            const nav = screen.getByTestId('discovery-nav');
            await userEvent.click(within(nav).getByRole('button', { name: /eventnest/i }));
            expect(screen.getByTestId('location')).toHaveTextContent('/');
        });

        test('"Sign in" navigates to /login', async () => {
            renderWithProviders(<DiscoveryPage />, { initialEntries: ['/events'] });
            const nav = screen.getByTestId('discovery-nav');
            await userEvent.click(within(nav).getByRole('button', { name: /sign in/i }));
            expect(screen.getByTestId('location')).toHaveTextContent('/login');
        });

        test('"Get started" navigates to /register', async () => {
            renderWithProviders(<DiscoveryPage />, { initialEntries: ['/events'] });
            const nav = screen.getByTestId('discovery-nav');
            await userEvent.click(within(nav).getByRole('button', { name: /get started/i }));
            expect(screen.getByTestId('location')).toHaveTextContent('/register');
        });
    });
});
