import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/test/renderWithProviders';
import { server, MOCK_PENDING_EVENTS, MOCK_ANALYTICS } from '@/test/server';
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
        test('renders all four stat tiles', async () => {
            renderPage();
            await waitFor(() => {
                expect(screen.getByTestId('stat-pending')).toBeInTheDocument();
                expect(screen.getByTestId('stat-published')).toBeInTheDocument();
                expect(screen.getByTestId('stat-revenue')).toBeInTheDocument();
                expect(screen.getByTestId('stat-checkin')).toBeInTheDocument();
            });
        });

        test('shows correct pending count from analytics', async () => {
            renderPage();
            await waitFor(() => {
                const tile = screen.getByTestId('stat-pending');
                expect(within(tile).getByText(String(MOCK_ANALYTICS.eventsByStatus.PENDING_APPROVAL))).toBeInTheDocument();
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
        test('renders Review queue and Users tabs', () => {
            renderPage();
            const tabs = screen.getByTestId('admin-tabs');
            expect(within(tabs).getByRole('button', { name: /review queue/i })).toBeInTheDocument();
            expect(within(tabs).getByRole('button', { name: /users/i })).toBeInTheDocument();
        });

        test('Review queue is the default active tab', async () => {
            renderPage();
            await waitFor(() => {
                expect(screen.getByText('Lagos Fintech Summit')).toBeInTheDocument();
            });
        });

        test('switching to Users tab renders users panel', async () => {
            const user = userEvent.setup();
            renderPage();
            const tabs = screen.getByTestId('admin-tabs');
            await user.click(within(tabs).getByRole('button', { name: /users/i }));
            // Panel renders immediately (may show loading skeleton)
            expect(screen.queryByTestId('review-queue-empty')).not.toBeInTheDocument();
        });
    });

    describe('review queue', () => {
        test('renders all pending events', async () => {
            renderPage();
            await waitFor(() => {
                for (const evt of MOCK_PENDING_EVENTS) {
                    expect(screen.getByText(evt.title)).toBeInTheDocument();
                }
            });
        });

        test('each event row has Approve and Reject buttons', async () => {
            renderPage();
            await waitFor(() => screen.getByText('Lagos Fintech Summit'));
            const row = screen.getByTestId(`event-row-${MOCK_PENDING_EVENTS[0].id}`);
            expect(within(row).getByRole('button', { name: /approve/i })).toBeInTheDocument();
            expect(within(row).getByRole('button', { name: /reject/i })).toBeInTheDocument();
        });

        test('shows empty state when no pending events', async () => {
            server.use(
                http.get('http://localhost:3000/admin/events', () =>
                    HttpResponse.json({
                        success: true,
                        data: { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 },
                    })
                )
            );
            renderPage();
            await waitFor(() => {
                expect(screen.getByTestId('review-queue-empty')).toBeInTheDocument();
            });
        });

        test('shows error state when API fails', async () => {
            server.use(
                http.get('http://localhost:3000/admin/events', () =>
                    HttpResponse.json({ success: false }, { status: 500 })
                )
            );
            renderPage();
            await waitFor(() => {
                expect(screen.getByRole('alert')).toBeInTheDocument();
            });
        });
    });

    describe('approve action', () => {
        test('clicking Approve calls PATCH /admin/events/:id/approve', async () => {
            const approved = [];
            server.use(
                http.patch('http://localhost:3000/admin/events/:id/approve', ({ params }) => {
                    approved.push(params.id);
                    return HttpResponse.json({ success: true, data: { id: params.id, status: 'PUBLISHED' } });
                })
            );

            const user = userEvent.setup();
            renderPage();
            await waitFor(() => screen.getByText('Lagos Fintech Summit'));
            const row = screen.getByTestId(`event-row-${MOCK_PENDING_EVENTS[0].id}`);
            await user.click(within(row).getByRole('button', { name: /approve/i }));

            await waitFor(() => {
                expect(approved).toContain(MOCK_PENDING_EVENTS[0].id);
            });
        });
    });

    describe('reject action', () => {
        test('clicking Reject opens the reject dialog', async () => {
            const user = userEvent.setup();
            renderPage();
            await waitFor(() => screen.getByText('Lagos Fintech Summit'));
            const row = screen.getByTestId(`event-row-${MOCK_PENDING_EVENTS[0].id}`);
            await user.click(within(row).getByRole('button', { name: /reject/i }));
            expect(screen.getByRole('dialog', { name: /reject event/i })).toBeInTheDocument();
        });

        test('reject dialog requires a reason before submitting', async () => {
            const user = userEvent.setup();
            renderPage();
            await waitFor(() => screen.getByText('Lagos Fintech Summit'));
            const row = screen.getByTestId(`event-row-${MOCK_PENDING_EVENTS[0].id}`);
            await user.click(within(row).getByRole('button', { name: /reject/i }));

            const dialog = screen.getByRole('dialog', { name: /reject event/i });
            await user.click(within(dialog).getByRole('button', { name: /reject event/i }));
            expect(screen.getByText('A rejection reason is required')).toBeInTheDocument();
        });

        test('submitting rejection reason calls PATCH /admin/events/:id/reject', async () => {
            const rejected = [];
            server.use(
                http.patch('http://localhost:3000/admin/events/:id/reject', async ({ params, request }) => {
                    const body = await request.json();
                    rejected.push({ id: params.id, reason: body.reason });
                    return HttpResponse.json({ success: true, data: { id: params.id, status: 'DRAFT', rejectionReason: body.reason } });
                })
            );

            const user = userEvent.setup();
            renderPage();
            await waitFor(() => screen.getByText('Lagos Fintech Summit'));
            const row = screen.getByTestId(`event-row-${MOCK_PENDING_EVENTS[0].id}`);
            await user.click(within(row).getByRole('button', { name: /reject/i }));

            const dialog = screen.getByRole('dialog', { name: /reject event/i });
            await user.type(within(dialog).getByRole('textbox', { name: /rejection reason/i }), 'Incomplete details');
            await user.click(within(dialog).getByRole('button', { name: /reject event/i }));

            await waitFor(() => {
                expect(rejected[0]?.id).toBe(MOCK_PENDING_EVENTS[0].id);
                expect(rejected[0]?.reason).toBe('Incomplete details');
            });
        });

        test('reject dialog closes after successful rejection', async () => {
            const user = userEvent.setup();
            renderPage();
            await waitFor(() => screen.getByText('Lagos Fintech Summit'));
            const row = screen.getByTestId(`event-row-${MOCK_PENDING_EVENTS[0].id}`);
            await user.click(within(row).getByRole('button', { name: /reject/i }));

            const dialog = screen.getByRole('dialog', { name: /reject event/i });
            await user.type(within(dialog).getByRole('textbox', { name: /rejection reason/i }), 'Incomplete details');
            await user.click(within(dialog).getByRole('button', { name: /reject event/i }));

            await waitFor(() => {
                expect(screen.queryByRole('dialog', { name: /reject event/i })).not.toBeInTheDocument();
            });
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
                // RoleBadge renders the label ("Attendee"), not the raw key ("ATTENDEE")
                expect(screen.getAllByText('Attendee').length).toBeGreaterThan(0);
                expect(screen.getAllByText('Organiser').length).toBeGreaterThan(0);
            });
        });
    });
});
