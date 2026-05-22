import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/test/renderWithProviders';
import { server, MOCK_REPLIES } from '@/test/server';
import RepliesPanel from '@/features/comments/components/RepliesPanel';

const NOW_MS = Date.now();

function renderPanel(props = {}) {
    return renderWithProviders(
        <RepliesPanel
            eventId={props.eventId ?? 'evt_001'}
            parentId={props.parentId ?? 'cmt_001'}
            nowMs={NOW_MS}
            currentUserId={props.currentUserId ?? 'user_001'}
            canModerate={props.canModerate ?? false}
            canPost={props.canPost ?? true}
            onSignInPrompt={props.onSignInPrompt ?? vi.fn()}
        />
    );
}

describe('RepliesPanel', () => {

    test('loads and renders replies from the API', async () => {
        renderPanel();
        await waitFor(() => {
            expect(screen.getByText('Fatima Bello')).toBeInTheDocument();
            expect(screen.getByText('Same here! Already bought mine.')).toBeInTheDocument();
        });
    });

    test('shows loading state before replies arrive', () => {
        renderPanel();
        expect(screen.getByText(/loading replies/i)).toBeInTheDocument();
    });

    test('renders empty panel when parent has no replies', async () => {
        renderPanel({ parentId: 'cmt_no_replies' });
        await waitFor(() => {
            // Reply composer should be present even with no replies
            expect(screen.getByPlaceholderText(/write a reply/i)).toBeInTheDocument();
        });
        expect(screen.queryByText('Fatima Bello')).not.toBeInTheDocument();
    });

    test('shows error state with Retry button when API fails', async () => {
        server.use(
            // No message in body → component falls back to its hardcoded "Could not load replies." text
            http.get('http://localhost:3000/comments/:commentId/replies', () =>
                HttpResponse.json({ success: false }, { status: 500 })
            )
        );
        renderPanel();
        await waitFor(() => {
            expect(screen.getByText(/could not load replies/i)).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
        });
    });

    test('shows sign-in-to-reply prompt when canPost is false', () => {
        renderPanel({ canPost: false });
        expect(screen.getByText(/sign in to reply/i)).toBeInTheDocument();
    });

    // ── THE KEY REGRESSION TEST ──────────────────────────────────────────────
    // Before the fix, the POST body contained `parentId` instead of
    // `parentCommentId`, so Jackson silently ignored it and the reply was
    // stored as a top-level comment.
    test('REGRESSION: reply POST body uses parentCommentId, not parentId', async () => {
        let capturedBody = null;
        server.use(
            http.post('http://localhost:3000/events/:eventId/comments', async ({ request }) => {
                capturedBody = await request.json();
                return HttpResponse.json({
                    success: true,
                    data: {
                        id: 'rpl_new',
                        parentCommentId: capturedBody.parentCommentId,
                        authorId: 'user_001',
                        authorName: 'Base Locke',
                        authorRoleOnEvent: null,
                        body: capturedBody.body,
                        deleted: false,
                        editedAt: null,
                        createdAt: new Date().toISOString(),
                        likeCount: 0,
                        replies: [],
                    },
                }, { status: 201 });
            })
        );

        renderPanel({ parentId: 'cmt_001' });

        // Wait for replies to load, then type and submit a reply
        await waitFor(() => screen.getByPlaceholderText(/write a reply/i));
        await userEvent.type(screen.getByPlaceholderText(/write a reply/i), 'My reply text');
        await userEvent.click(screen.getByRole('button', { name: /^reply$/i }));

        await waitFor(() => expect(capturedBody).not.toBeNull());

        // Must use parentCommentId — NOT parentId — so the backend nests it correctly
        expect(capturedBody.parentCommentId).toBe('cmt_001');
        expect(capturedBody).not.toHaveProperty('parentId');
        expect(capturedBody.body).toBe('My reply text');
    });

});
