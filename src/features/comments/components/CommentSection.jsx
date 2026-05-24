import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useSelector } from 'react-redux';
import {
    useGetEventCommentsQuery,
    useCreateCommentMutation,
} from '../commentsApi';
import {
    selectCurrentUserId,
    selectIsAuthenticated,
} from '@/features/auth/authSlice';
import Button from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icon';
import Composer from './Composer';
import CommentCard from './CommentCard';
import RepliesPanel from './RepliesPanel';

const PAGE_SIZE = 20;

/* The whole comments section for one event. Drops into any page as
   <CommentSection eventId={...} eventStatus={...} canModerate={...} />.
   Handles: 409 "module off" gate, login redirect for anon writers,
   pagination via Load more, per-comment reply panel toggle. */
export default function CommentSection({
    eventId,
    eventStatus,
    canModerate = false,
}) {
    const navigate = useNavigate();
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const currentUserId   = useSelector(selectCurrentUserId);

    const [page, setPage] = useState(0);
    const [openReplies, setOpenReplies] = useState(() => new Set());
    const [composeError, setComposeError] = useState('');

    const list = useGetEventCommentsQuery(
        { eventId, page, size: PAGE_SIZE },
        {
            skip: !isAuthenticated,
            // Silent background poll every 60 s — only fires when the tab is visible.
            // See DESIGN_DECISIONS.md for why SSE is intentionally NOT used here.
            pollingInterval: 60_000,
            skipPollingIfUnfocused: true,
            refetchOnWindowFocus: true,
        },
    );
    const [createComment, createState] = useCreateCommentMutation();

    // Tracks the total count the user last "saw" so we can surface a
    // "N new comments" banner when the background poll finds more.
    const lastSeenTotal = useRef(null);
    const [newCount, setNewCount] = useState(0);

    // Single now anchor per render pass so relative timestamps line up.
    // Refreshed whenever the user explicitly refetches.
    const [nowMs, setNowMs] = useState(() => Date.now());

    /* Backend rejects writes on non-published events. We render the
       composer in a disabled state with copy explaining why instead of
       just hiding the affordance. */
    const isPublished = eventStatus === 'PUBLISHED';
    const canPost = isAuthenticated && isPublished;

    function promptSignIn() {
        navigate('/login', { state: { from: `/events/${eventId}` } });
    }

    async function handleCreate(body) {
        if (!canPost) {
            if (!isAuthenticated) promptSignIn();
            return false;
        }
        setComposeError('');
        try {
            await createComment({ eventId, body, parentId: null }).unwrap();
            return true;
        } catch (err) {
            setComposeError(err?.data?.message || 'Could not post.');
            return false;
        }
    }

    function toggleReplies(id) {
        setOpenReplies((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }

    // Detect the 409 module-disabled state. Anything else is a real error.
    const errStatus  = list.error?.status;
    const errMessage = list.error?.data?.message ?? '';
    const isDisabled = list.isError && errStatus === 409 && /not enabled/i.test(errMessage);

    // Hooks must run unconditionally — derive view state before any early return.
    const totalElements = list.data?.totalElements ?? 0;
    const totalPages    = list.data?.totalPages ?? 0;
    const comments      = useMemo(() => list.data?.content ?? [], [list.data]);
    const hasMore       = totalPages > 0 && page < totalPages - 1;

    // Detect background poll arrivals: if totalElements grew since the user
    // last read, surface the "N new" banner.
    useMemo(() => {
        if (!list.isSuccess) return;
        if (lastSeenTotal.current === null) {
            // First successful load — mark as seen silently.
            lastSeenTotal.current = totalElements;
            return;
        }
        const delta = totalElements - lastSeenTotal.current;
        if (delta > 0) setNewCount(delta);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [totalElements, list.isSuccess]);

    function handleRefresh() {
        setNewCount(0);
        lastSeenTotal.current = totalElements;
        setNowMs(Date.now());
        setPage(0);
        list.refetch();
    }

    function dismissNewBanner() {
        setNewCount(0);
        lastSeenTotal.current = totalElements;
    }

    if (isDisabled) {
        return (
            <SectionShell>
                <div style={{ padding: 32, textAlign: 'center' }}>
                    <Icons.lock size={22} style={{ color: 'var(--text-3)' }} />
                    <div className="mp-h4" style={{ color: 'var(--text-1)', margin: '10px 0 4px' }}>
                        Comments are turned off
                    </div>
                    <p className="body-sm" style={{ color: 'var(--text-2)', margin: 0 }}>
                        The organiser has disabled discussion for this event.
                    </p>
                </div>
            </SectionShell>
        );
    }

    return (
        <SectionShell>
            <div style={{
                padding: '14px 20px',
                borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <div className="mp-h4" style={{ margin: 0, color: 'var(--text-1)' }}>
                    Discussion
                    {!list.isLoading && (
                        <span className="mp-num" style={{
                            fontSize: 13,
                            color: 'var(--text-3)',
                            marginLeft: 8,
                            fontWeight: 500,
                        }}>
                            {totalElements}
                        </span>
                    )}
                </div>

                {/* Manual refresh button */}
                <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={list.isFetching}
                    aria-label="Refresh comments"
                    title="Refresh comments"
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        background: 'none', border: 0, padding: '4px 6px',
                        cursor: list.isFetching ? 'not-allowed' : 'pointer',
                        borderRadius: 6, color: 'var(--text-3)',
                        fontFamily: 'inherit', fontSize: 12, fontWeight: 500,
                        transition: 'color 0.15s, background 0.15s',
                    }}
                    onMouseOver={(e) => { if (!list.isFetching) e.currentTarget.style.color = 'var(--mp-blue)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-3)'; }}
                >
                    <Icons.signal
                        size={14}
                        style={{
                            animation: list.isFetching ? 'spin 0.8s linear infinite' : 'none',
                            opacity: list.isFetching ? 0.5 : 1,
                        }}
                    />
                    {list.isFetching ? 'Refreshing…' : 'Refresh'}
                </button>
            </div>

            <div style={{ padding: '14px 20px 0' }}>
                {canPost ? (
                    <Composer
                        onSubmit={handleCreate}
                        busy={createState.isLoading}
                        placeholder="Share your thoughts about this event…"
                        submitLabel="Post comment"
                        error={composeError}
                    />
                ) : !isAuthenticated ? (
                    <SignInPrompt onSignIn={promptSignIn} />
                ) : (
                    <ClosedNote message={
                        eventStatus === 'CANCELLED'
                            ? 'This event has been cancelled — comments are read-only.'
                            : 'Comments will open once the event is published.'
                    } />
                )}
            </div>

            {/* States */}
            {list.isLoading && <ListSkeleton />}

            {list.isError && !isDisabled && (
                <div style={{ padding: 30, textAlign: 'center' }}>
                    <Icons.alert size={24} style={{ color: 'var(--error)' }} />
                    <p className="body-sm" style={{ marginTop: 8, color: 'var(--text-2)' }}>
                        {errMessage || 'Could not load comments.'}
                    </p>
                    <Button variant="secondary" size="sm" onClick={list.refetch} style={{ marginTop: 8 }}>
                        Retry
                    </Button>
                </div>
            )}

            {list.isSuccess && comments.length === 0 && (
                <div style={{ padding: 30, textAlign: 'center' }}>
                    <p className="body-sm" style={{ color: 'var(--text-3)', margin: 0 }}>
                        {canPost ? 'Be the first to say something.' : 'No comments yet.'}
                    </p>
                </div>
            )}

            {/* "N new comments" banner — appears when background poll detects new arrivals */}
            {newCount > 0 && (
                <button
                    type="button"
                    onClick={handleRefresh}
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: 8, width: '100%',
                        padding: '10px 20px',
                        background: 'var(--mp-blue)',
                        color: 'white', border: 0,
                        fontSize: 13, fontWeight: 600,
                        cursor: 'pointer', fontFamily: 'inherit',
                        transition: 'background 0.15s',
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = '#2a3bb5'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'var(--mp-blue)'; }}
                >
                    <Icons.arrowL size={13} style={{ transform: 'rotate(90deg)' }} />
                    {newCount} new {newCount === 1 ? 'comment' : 'comments'} — click to load
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); dismissNewBanner(); }}
                        aria-label="Dismiss"
                        style={{
                            background: 'rgba(255,255,255,0.2)', border: 0, borderRadius: 4,
                            color: 'white', fontSize: 11, padding: '1px 6px',
                            cursor: 'pointer', fontFamily: 'inherit', marginLeft: 4,
                        }}
                    >
                        dismiss
                    </button>
                </button>
            )}

            {list.isSuccess && comments.length > 0 && (
                <div style={{ padding: '0 20px' }}>
                    {comments.map((c) => {
                        const open = openReplies.has(c.id);
                        return (
                            <div key={c.id}>
                                <CommentCard
                                    comment={c}
                                    nowMs={nowMs}
                                    currentUserId={currentUserId}
                                    canModerate={canModerate}
                                    onReply={() => toggleReplies(c.id)}
                                    onToggleReplies={() => toggleReplies(c.id)}
                                    repliesOpen={open}
                                />
                                {open && (
                                    <RepliesPanel
                                        eventId={eventId}
                                        parentId={c.id}
                                        nowMs={nowMs}
                                        currentUserId={currentUserId}
                                        canModerate={canModerate}
                                        canPost={canPost}
                                        onSignInPrompt={promptSignIn}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {hasMore && (
                <div style={{ padding: '12px 20px 20px', textAlign: 'center' }}>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPage((p) => p + 1)}
                    >
                        Load more
                    </Button>
                </div>
            )}

            {comments.length > 0 && !hasMore && (
                <div style={{ paddingBottom: 16 }} />
            )}
        </SectionShell>
    );
}

function SectionShell({ children }) {
    return (
        <div style={{
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            overflow: 'hidden',
        }}>
            {children}
        </div>
    );
}

function SignInPrompt({ onSignIn }) {
    return (
        <div style={{
            padding: '16px 18px',
            background: 'var(--surface-subtle)',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
        }}>
            <Icons.users size={18} style={{ color: 'var(--text-3)' }} />
            <span style={{ fontSize: 13, color: 'var(--text-2)', flex: 1, minWidth: 200 }}>
                Sign in to join the discussion.
            </span>
            <Button size="sm" variant="primary" onClick={onSignIn} iconRight={<Icons.arrowR size={13} />}>
                Sign in
            </Button>
        </div>
    );
}

function ClosedNote({ message }) {
    return (
        <div style={{
            padding: '12px 14px',
            background: 'var(--surface-subtle)',
            borderRadius: 10,
            fontSize: 13,
            color: 'var(--text-3)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
        }}>
            <Icons.alert size={14} />
            {message}
        </div>
    );
}

function ListSkeleton() {
    const row = (op = 1) => ({
        margin: '14px 20px',
        height: 80,
        background: 'var(--surface-subtle)',
        borderRadius: 8,
        animation: 'mp-flash 1.6s ease-in-out infinite',
        opacity: op,
    });
    return (
        <div>
            <div style={row(1)} />
            <div style={row(0.7)} />
            <div style={row(0.4)} />
        </div>
    );
}
