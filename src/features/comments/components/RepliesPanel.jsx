import { useState } from 'react';
import {
    useGetCommentRepliesQuery,
    useCreateCommentMutation,
} from '../commentsApi';
import CommentCard from './CommentCard';
import Composer from './Composer';
import Button from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icon';

/* Expandable thread of replies under a top-level comment. Mounted on
   demand (key off by the parent), so loading only happens when the user
   clicks through. Has its own mini composer for adding to the thread. */
export default function RepliesPanel({
    eventId,
    parentId,
    nowMs,
    currentUserId,
    canModerate,
    canPost,
    onSignInPrompt,
}) {
    const replies = useGetCommentRepliesQuery(parentId);
    const [createComment, createState] = useCreateCommentMutation();
    const [error, setError] = useState('');

    async function handleSubmit(body) {
        if (!canPost) {
            onSignInPrompt?.();
            return false;
        }
        setError('');
        try {
            await createComment({ eventId, body, parentId }).unwrap();
            return true;
        } catch (err) {
            setError(err?.data?.message || 'Could not post reply.');
            return false;
        }
    }

    return (
        <div style={{
            marginTop: 6,
            marginLeft: 52,           // align with author name above
            paddingLeft: 14,
            borderLeft: '2px solid var(--border)',
        }}>
            {replies.isLoading && (
                <div style={{ padding: '12px 0', fontSize: 13, color: 'var(--text-3)' }}>
                    Loading replies…
                </div>
            )}

            {replies.isError && (
                <div style={{
                    padding: '10px 12px', marginBottom: 8,
                    background: 'var(--error-bg, #FBE9E9)',
                    color: 'var(--error)',
                    borderRadius: 8, fontSize: 13,
                }}>
                    {replies.error?.data?.message || 'Could not load replies.'}
                    <Button
                        variant="ghost" size="sm"
                        onClick={replies.refetch}
                        style={{ marginLeft: 8 }}
                    >
                        Retry
                    </Button>
                </div>
            )}

            {replies.isSuccess && replies.data.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {replies.data.map((r) => (
                        <CommentCard
                            key={r.id}
                            comment={r}
                            nowMs={nowMs}
                            currentUserId={currentUserId}
                            canModerate={canModerate}
                            isReply
                        />
                    ))}
                </div>
            )}

            {/* Reply composer — unauthenticated callers get the same nudge
                as the parent section so the affordance is consistent. */}
            <div style={{ paddingTop: 8 }}>
                {canPost ? (
                    <Composer
                        onSubmit={handleSubmit}
                        busy={createState.isLoading}
                        placeholder="Write a reply…"
                        submitLabel="Reply"
                        error={error}
                    />
                ) : (
                    <button
                        onClick={onSignInPrompt}
                        style={{
                            background: 'none', border: 0, padding: 0,
                            color: 'var(--mp-blue)',
                            fontFamily: 'inherit', fontSize: 13,
                            fontWeight: 600, cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                        }}
                    >
                        Sign in to reply
                        <Icons.arrowR size={12} />
                    </button>
                )}
            </div>
        </div>
    );
}
