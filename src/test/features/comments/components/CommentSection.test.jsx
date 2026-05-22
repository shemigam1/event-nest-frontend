import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/test/renderWithProviders';
import { server } from '@/test/server';
import CommentSection from '@/features/comments/components/CommentSection';

// Builds a minimal JWT-shaped auth state so RTK Query attaches the token
function makeAuthState(userId = 'user_001') {
    const header  = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
        sub: 'test@test.com',
        email: 'test@test.com',
        userId,
        roles: ['ROLE_USER'],
        type: 'ACCESS',
        exp: Math.floor(Date.now() / 1000) + 3600,
    }));
    const token = `${header}.${payload}.sig`;
    return {
        auth: {
            user: null,
            tokenUser: { email: 'test@test.com', userId, roles: ['ROLE_USER'] },
            token,
            refreshToken: 'r',
            isAuthenticated: true,
        },
    };
}

function renderSection({ eventId = 'evt_001', eventStatus = 'PUBLISHED', canModerate = false, preloadedState } = {}) {
    return renderWithProviders(
        <CommentSection eventId={eventId} eventStatus={eventStatus} canModerate={canModerate} />,
        { preloadedState }
    );
}

describe('CommentSection', () => {

    describe('heading', () => {
        test('renders Discussion heading', async () => {
            renderSection({ preloadedState: makeAuthState() });
            expect(screen.getByText('Discussion')).toBeInTheDocument();
        });

        test('shows comment count next to heading after load', async () => {
            renderSection({ preloadedState: makeAuthState() });
            await waitFor(() => {
                // MOCK_COMMENTS.evt_001.totalElements = 2
                expect(screen.getByText('2')).toBeInTheDocument();
            });
        });
    });

    describe('loading state', () => {
        test('shows skeleton while comments are loading', () => {
            renderSection({ preloadedState: makeAuthState() });
            // Skeletons render as divs with animation; there are no headings yet
            expect(screen.queryByText('Base Locke')).not.toBeInTheDocument();
        });
    });

    describe('unauthenticated', () => {
        test('shows sign-in prompt instead of composer when not authenticated', async () => {
            renderSection(); // no preloadedState → isAuthenticated = false
            await waitFor(() => {
                expect(screen.getByText(/sign in to join the discussion/i)).toBeInTheDocument();
            });
        });
    });

    describe('rendering comments', () => {
        test('renders comments from the API', async () => {
            renderSection({ preloadedState: makeAuthState() });
            await waitFor(() => {
                expect(screen.getByText('Base Locke')).toBeInTheDocument();
                expect(screen.getByText('Looking forward to this event!')).toBeInTheDocument();
                expect(screen.getByText('Emeka Okafor')).toBeInTheDocument();
            });
        });

        test('shows Organiser role pill on the organiser\'s comment', async () => {
            renderSection({ preloadedState: makeAuthState() });
            await waitFor(() => {
                expect(screen.getByText('Organiser')).toBeInTheDocument();
            });
        });

        test('does not show role pill on regular attendee comment', async () => {
            renderSection({ preloadedState: makeAuthState() });
            await waitFor(() => screen.getByText('Emeka Okafor'));
            // Only one Organiser pill should exist (for Base Locke)
            expect(screen.getAllByText('Organiser')).toHaveLength(1);
        });

        test('shows empty state when event has no comments', async () => {
            server.use(
                http.get('http://localhost:3000/events/evt_empty/comments', () =>
                    HttpResponse.json({ success: true, data: { content: [], totalElements: 0, totalPages: 0 } })
                )
            );
            renderSection({ eventId: 'evt_empty', preloadedState: makeAuthState() });
            await waitFor(() => {
                expect(screen.getByText(/be the first to say something/i)).toBeInTheDocument();
            });
        });

        test('shows error and Retry when comments API fails', async () => {
            server.use(
                http.get('http://localhost:3000/events/evt_fail/comments', () =>
                    HttpResponse.json({ success: false, message: 'Server error' }, { status: 500 })
                )
            );
            renderSection({ eventId: 'evt_fail', preloadedState: makeAuthState() });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
            });
        });
    });

    describe('disabled state (module off)', () => {
        test('shows "Comments are turned off" when API returns 409', async () => {
            server.use(
                http.get('http://localhost:3000/events/evt_off/comments', () =>
                    HttpResponse.json(
                        { success: false, message: 'comments are not enabled for this event' },
                        { status: 409 }
                    )
                )
            );
            renderSection({ eventId: 'evt_off', preloadedState: makeAuthState() });
            await waitFor(() => {
                expect(screen.getByText(/comments are turned off/i)).toBeInTheDocument();
            });
        });
    });

    describe('non-published events', () => {
        test('shows closed note when event is not PUBLISHED', async () => {
            renderSection({ eventStatus: 'DRAFT', preloadedState: makeAuthState() });
            await waitFor(() => {
                expect(screen.getByText(/comments will open once the event is published/i)).toBeInTheDocument();
            });
        });

        test('shows cancelled note when event is CANCELLED', async () => {
            renderSection({ eventStatus: 'CANCELLED', preloadedState: makeAuthState() });
            await waitFor(() => {
                expect(screen.getByText(/this event has been cancelled/i)).toBeInTheDocument();
            });
        });
    });

    describe('posting a comment', () => {
        test('shows composer for authenticated user on a PUBLISHED event', async () => {
            renderSection({ preloadedState: makeAuthState() });
            await waitFor(() => {
                expect(screen.getByPlaceholderText(/share your thoughts/i)).toBeInTheDocument();
            });
        });

        test('posting a comment calls the API and clears the textarea', async () => {
            let posted = null;
            server.use(
                http.post('http://localhost:3000/events/evt_001/comments', async ({ request }) => {
                    posted = await request.json();
                    return HttpResponse.json({
                        success: true,
                        data: {
                            id: 'cmt_new',
                            parentCommentId: null,
                            authorId: 'user_001',
                            authorName: 'Base Locke',
                            authorRoleOnEvent: 'ORGANIZER',
                            body: posted.body,
                            deleted: false,
                            editedAt: null,
                            createdAt: new Date().toISOString(),
                            likeCount: 0,
                            replyCount: 0,
                            replies: [],
                        },
                    }, { status: 201 });
                })
            );

            renderSection({ preloadedState: makeAuthState() });

            const textarea = await screen.findByPlaceholderText(/share your thoughts/i);
            await userEvent.type(textarea, 'My new comment');
            await userEvent.click(screen.getByRole('button', { name: /post comment/i }));

            await waitFor(() => expect(posted).not.toBeNull());

            // parentCommentId should be null for a top-level comment posted from CommentSection
            expect(posted.parentCommentId).toBeNull();
            expect(posted.body).toBe('My new comment');

            // Textarea should be cleared after success
            expect(textarea).toHaveValue('');
        });
    });

    describe('reply panel toggle', () => {
        test('opens RepliesPanel when Reply is clicked on a comment with replies', async () => {
            renderSection({ preloadedState: makeAuthState() });

            // Wait for comments to load; cmt_001 (first comment) has replyCount: 1
            const replyButtons = await screen.findAllByText('Reply', { selector: 'button' });
            await userEvent.click(replyButtons[0]);

            // RepliesPanel should now be mounted and start loading
            await waitFor(() => {
                expect(screen.getByPlaceholderText(/write a reply/i)).toBeInTheDocument();
            });
        });
    });
});
