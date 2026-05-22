import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import CommentCard from '@/features/comments/components/CommentCard';

const NOW_MS = new Date('2026-05-16T10:00:00').getTime();

function comment(overrides = {}) {
    return {
        id: 'cmt_001',
        authorId: 'user_001',
        authorName: 'Base Locke',
        authorRoleOnEvent: null,
        body: 'This is a great event!',
        deleted: false,
        editedAt: null,
        createdAt: '2026-05-16T09:55:00',
        likeCount: 0,
        replyCount: 0,
        currentUserLiked: false,
        replies: [],
        ...overrides,
    };
}

function renderCard(commentOverrides = {}, props = {}) {
    return renderWithProviders(
        <CommentCard
            comment={comment(commentOverrides)}
            nowMs={NOW_MS}
            currentUserId={props.currentUserId ?? null}
            canModerate={props.canModerate ?? false}
            onReply={props.onReply ?? vi.fn()}
            isReply={props.isReply ?? false}
            repliesOpen={props.repliesOpen ?? false}
            onToggleReplies={props.onToggleReplies ?? vi.fn()}
        />
    );
}

describe('CommentCard', () => {

    describe('author and body', () => {
        test('renders author name and comment body', () => {
            renderCard();
            expect(screen.getByText('Base Locke')).toBeInTheDocument();
            expect(screen.getByText('This is a great event!')).toBeInTheDocument();
        });

        test('shows relative timestamp', () => {
            renderCard();
            // 5 minutes ago
            expect(screen.getByText(/5m ago/i)).toBeInTheDocument();
        });
    });

    describe('role pill', () => {
        test('shows "Organiser" pill when authorRoleOnEvent is ORGANIZER', () => {
            renderCard({ authorRoleOnEvent: 'ORGANIZER' });
            expect(screen.getByText('Organiser')).toBeInTheDocument();
        });

        test('shows "Manager" pill when authorRoleOnEvent is MANAGER', () => {
            renderCard({ authorRoleOnEvent: 'MANAGER' });
            expect(screen.getByText('Manager')).toBeInTheDocument();
        });

        test('shows "Vendor" pill when authorRoleOnEvent is VENDOR', () => {
            renderCard({ authorRoleOnEvent: 'VENDOR' });
            expect(screen.getByText('Vendor')).toBeInTheDocument();
        });

        test('shows no role pill when authorRoleOnEvent is null (regular attendee)', () => {
            renderCard({ authorRoleOnEvent: null });
            expect(screen.queryByText('Organiser')).not.toBeInTheDocument();
            expect(screen.queryByText('Manager')).not.toBeInTheDocument();
            expect(screen.queryByText('Vendor')).not.toBeInTheDocument();
        });
    });

    describe('deleted comment', () => {
        test('shows "[Comment removed]" for deleted comments', () => {
            renderCard({ deleted: true, body: '[Comment removed]' });
            expect(screen.getByText('[Comment removed]')).toBeInTheDocument();
        });

        test('hides Like and Reply actions on deleted comments', () => {
            renderCard({ deleted: true, body: '[Comment removed]' });
            expect(screen.queryByText(/like/i)).not.toBeInTheDocument();
            expect(screen.queryByText('Reply')).not.toBeInTheDocument();
        });
    });

    describe('like button', () => {
        test('shows "Like" label when likeCount is 0', () => {
            renderCard({ likeCount: 0 });
            expect(screen.getByText('Like')).toBeInTheDocument();
        });

        test('shows numeric count when likeCount > 0', () => {
            renderCard({ likeCount: 5 });
            expect(screen.getByText('5')).toBeInTheDocument();
        });
    });

    describe('reply button', () => {
        test('shows Reply button on top-level comments (isReply = false)', () => {
            renderCard({}, { isReply: false, currentUserId: 'user_002' });
            expect(screen.getByText('Reply')).toBeInTheDocument();
        });

        test('hides Reply button when isReply = true (already inside a thread)', () => {
            renderCard({}, { isReply: true });
            expect(screen.queryByText('Reply')).not.toBeInTheDocument();
        });

        test('calls onReply when Reply is clicked', async () => {
            const onReply = vi.fn();
            renderCard({}, { onReply, currentUserId: 'user_002' });
            await userEvent.click(screen.getByText('Reply'));
            expect(onReply).toHaveBeenCalledTimes(1);
        });
    });

    describe('view replies button', () => {
        test('shows "View N replies" when replyCount > 0', () => {
            renderCard({ replyCount: 3 }, { repliesOpen: false });
            expect(screen.getByText('View 3 replies')).toBeInTheDocument();
        });

        test('shows "Hide replies" when repliesOpen = true', () => {
            renderCard({ replyCount: 3 }, { repliesOpen: true });
            expect(screen.getByText('Hide replies')).toBeInTheDocument();
        });

        test('hides view-replies button when replyCount is 0', () => {
            renderCard({ replyCount: 0 });
            expect(screen.queryByText(/view \d+ repl/i)).not.toBeInTheDocument();
        });
    });

    describe('edit/delete menu', () => {
        test('shows ⋯ menu button for own comment', () => {
            renderCard({ authorId: 'user_me' }, { currentUserId: 'user_me' });
            expect(screen.getByRole('button', { name: /more actions/i })).toBeInTheDocument();
        });

        test('does not show ⋯ menu for another user\'s comment', () => {
            renderCard({ authorId: 'user_other' }, { currentUserId: 'user_me' });
            expect(screen.queryByRole('button', { name: /more actions/i })).not.toBeInTheDocument();
        });

        test('shows ⋯ menu for a moderator on any comment', () => {
            renderCard({ authorId: 'user_other' }, { currentUserId: 'user_me', canModerate: true });
            expect(screen.getByRole('button', { name: /more actions/i })).toBeInTheDocument();
        });

        test('opens menu and reveals Delete when ⋯ is clicked', async () => {
            renderCard({ authorId: 'user_me' }, { currentUserId: 'user_me' });
            await userEvent.click(screen.getByRole('button', { name: /more actions/i }));
            expect(screen.getByText('Delete')).toBeInTheDocument();
        });

        test('opens menu and reveals Edit for own non-deleted comment', async () => {
            renderCard({ authorId: 'user_me', deleted: false }, { currentUserId: 'user_me' });
            await userEvent.click(screen.getByRole('button', { name: /more actions/i }));
            expect(screen.getByText('Edit')).toBeInTheDocument();
        });
    });
});
