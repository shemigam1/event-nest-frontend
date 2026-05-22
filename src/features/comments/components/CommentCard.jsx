import { useState } from 'react';
import {
    useUpdateCommentMutation,
    useDeleteCommentMutation,
    useToggleCommentLikeMutation,
} from '../commentsApi';
import { Icons } from '@/components/ui/Icon';
import Composer from './Composer';

/* Role pill styling. Mirrors RoleBadge but renders inline so we can show
   it next to the author name without breaking the line layout. */
const ROLE_STYLE = {
    ORGANIZER:     { label: 'Organiser', bg: '#E6F4EA', fg: '#0F9D58' },
    MANAGER:       { label: 'Manager',   bg: '#EAF1FE', fg: '#0247c7' },
    VENDOR:        { label: 'Vendor',    bg: '#FFF3E0', fg: '#E65100' },
    CHECKIN_STAFF: { label: 'Check-in',  bg: '#FEF4E2', fg: '#B8770A' },
    ATTENDEE:      { label: 'Attendee',  bg: '#F5F7FA', fg: '#4A5468' },
};

const AVATAR_COLORS = [
    ['#E8F0FE', '#1967D2'],
    ['#FEF0E6', '#C85A00'],
    ['#E6F4EA', '#0F7B3E'],
    ['#F3E8FE', '#7B2FBE'],
    ['#FDE8EA', '#C62828'],
];

function initials(name) {
    if (!name) return '?';
    return name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase() || '?';
}

function avatarColor(name = '') {
    const idx = (name.charCodeAt(0) || 0) % AVATAR_COLORS.length;
    return AVATAR_COLORS[idx];
}

/* Relative time anchored to a `nowMs` passed in by the parent so all
   timestamps render against the same reference within one frame. */
function relativeTime(iso, nowMs) {
    if (!iso) return '';
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return '';
    const diffMs = Math.max(0, nowMs - t);
    const s = Math.floor(diffMs / 1000);
    if (s < 60) return 'just now';
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d ago`;
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function CommentCard({
    comment,
    nowMs,
    currentUserId,
    canModerate,
    onReply,
    /* When `true` the reply control is hidden — used for cards inside
       a replies panel so threads stay one level deep. */
    isReply = false,
    /* Pass-through so the parent can flip the open reply panel. */
    repliesOpen = false,
    onToggleReplies,
}) {
    const [editing, setEditing] = useState(false);
    const [actionError, setActionError] = useState('');
    const [menuOpen, setMenuOpen] = useState(false);

    const [updateComment, updateState] = useUpdateCommentMutation();
    const [deleteComment, deleteState] = useDeleteCommentMutation();
    const [toggleLike] = useToggleCommentLikeMutation();

    const isOwn       = !!currentUserId && comment.authorId === currentUserId;
    const canDelete   = isOwn || canModerate;
    const canEdit     = isOwn && !comment.deleted;
    const showMenu    = !comment.deleted && (canDelete || canEdit);
    const [bg, fg]    = avatarColor(comment.authorName);
    const roleStyle   = ROLE_STYLE[comment.authorRoleOnEvent];

    async function handleSaveEdit(body) {
        setActionError('');
        try {
            await updateComment({ commentId: comment.id, body }).unwrap();
            setEditing(false);
            return true;
        } catch (err) {
            setActionError(err?.data?.message || 'Could not save edit.');
            return false;
        }
    }

    async function handleDelete() {
        setActionError('');
        setMenuOpen(false);
        try {
            await deleteComment(comment.id).unwrap();
        } catch (err) {
            setActionError(err?.data?.message || 'Could not delete.');
        }
    }

    function handleLike() {
        if (!currentUserId) return;
        toggleLike(comment.id);
    }

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: '40px 1fr',
            gap: 12,
            padding: isReply ? '10px 0' : '14px 0',
            borderBottom: isReply ? 0 : '1px solid var(--border)',
        }}>
            <div style={{
                width: 40, height: 40, borderRadius: 99,
                background: bg, color: fg,
                display: 'grid', placeItems: 'center',
                fontSize: 13, fontWeight: 700,
                flexShrink: 0,
            }}>
                {initials(comment.authorName)}
            </div>

            <div style={{ minWidth: 0 }}>
                {/* Header row */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    flexWrap: 'wrap',
                    marginBottom: 4,
                }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>
                        {comment.authorName}
                    </span>
                    {roleStyle && (
                        <span style={{
                            fontSize: 10,
                            fontWeight: 600,
                            letterSpacing: '0.02em',
                            padding: '2px 7px',
                            borderRadius: 99,
                            background: roleStyle.bg,
                            color: roleStyle.fg,
                        }}>
                            {roleStyle.label}
                        </span>
                    )}
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                        · {relativeTime(comment.createdAt, nowMs)}
                    </span>
                    {comment.edited && !comment.deleted && (
                        <span style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>
                            · edited
                        </span>
                    )}

                    {/* Menu (edit / delete) */}
                    {showMenu && (
                        <div style={{ marginLeft: 'auto', position: 'relative' }}>
                            <button
                                onClick={() => setMenuOpen((o) => !o)}
                                aria-label="More actions"
                                style={{
                                    width: 28, height: 28, borderRadius: 6,
                                    background: 'transparent',
                                    border: 0, cursor: 'pointer',
                                    color: 'var(--text-3)',
                                    display: 'grid', placeItems: 'center',
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = 'var(--surface-subtle)'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                <Icons.more size={14} />
                            </button>
                            {menuOpen && (
                                <div
                                    onMouseLeave={() => setMenuOpen(false)}
                                    style={{
                                        position: 'absolute',
                                        right: 0, top: 30,
                                        background: 'white',
                                        border: '1px solid var(--border)',
                                        borderRadius: 8,
                                        boxShadow: 'var(--shadow-card)',
                                        padding: 4,
                                        minWidth: 140,
                                        zIndex: 10,
                                    }}
                                >
                                    {canEdit && (
                                        <MenuItem onClick={() => { setMenuOpen(false); setEditing(true); }}>
                                            Edit
                                        </MenuItem>
                                    )}
                                    {canDelete && (
                                        <MenuItem onClick={handleDelete} danger disabled={deleteState.isLoading}>
                                            {deleteState.isLoading ? 'Deleting…' : 'Delete'}
                                        </MenuItem>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Body */}
                {editing && !comment.deleted ? (
                    <div style={{ marginTop: 6 }}>
                        <Composer
                            initialValue={comment.body || ''}
                            onSubmit={handleSaveEdit}
                            onCancel={() => { setEditing(false); setActionError(''); }}
                            submitLabel="Save"
                            placeholder="Edit your comment"
                            busy={updateState.isLoading}
                            autoFocus
                            error={actionError}
                        />
                    </div>
                ) : comment.deleted ? (
                    <p style={{
                        margin: '0 0 6px',
                        fontSize: 14,
                        color: 'var(--text-3)',
                        fontStyle: 'italic',
                    }}>
                        [Comment removed]
                    </p>
                ) : (
                    <p style={{
                        margin: '0 0 8px',
                        fontSize: 14,
                        color: 'var(--text-1)',
                        lineHeight: 1.5,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                    }}>
                        {comment.body}
                    </p>
                )}

                {actionError && !editing && (
                    <div role="alert" style={{
                        fontSize: 12, color: 'var(--error)', marginBottom: 6,
                    }}>
                        {actionError}
                    </div>
                )}

                {/* Action row — hidden on deleted comments and when editing */}
                {!editing && !comment.deleted && (
                    <div style={{
                        display: 'flex',
                        gap: 14,
                        alignItems: 'center',
                        fontSize: 12,
                    }}>
                        <button
                            onClick={handleLike}
                            disabled={!currentUserId}
                            aria-pressed={comment.currentUserLiked}
                            title={currentUserId ? '' : 'Sign in to like comments'}
                            style={{
                                background: 'none',
                                border: 0,
                                padding: 0,
                                cursor: currentUserId ? 'pointer' : 'not-allowed',
                                color: comment.currentUserLiked ? 'var(--mp-blue)' : 'var(--text-2)',
                                fontWeight: comment.currentUserLiked ? 600 : 500,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                fontFamily: 'inherit',
                                fontSize: 12,
                            }}
                        >
                            <span style={{
                                fontSize: 14,
                                filter: comment.currentUserLiked ? 'none' : 'grayscale(1)',
                                opacity: comment.currentUserLiked ? 1 : 0.7,
                            }}>
                                {comment.currentUserLiked ? '♥' : '♡'}
                            </span>
                            {comment.likeCount > 0 ? comment.likeCount : 'Like'}
                        </button>

                        {!isReply && (
                            <>
                                <button
                                    onClick={() => onReply?.(comment.id)}
                                    style={{
                                        background: 'none', border: 0, padding: 0,
                                        cursor: 'pointer', color: 'var(--text-2)',
                                        fontFamily: 'inherit', fontSize: 12, fontWeight: 500,
                                    }}
                                >
                                    Reply
                                </button>
                                {comment.replyCount > 0 && (
                                    <button
                                        onClick={() => onToggleReplies?.(comment.id)}
                                        style={{
                                            background: 'none', border: 0, padding: 0,
                                            cursor: 'pointer',
                                            color: 'var(--mp-blue)',
                                            fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
                                            display: 'inline-flex', alignItems: 'center', gap: 3,
                                        }}
                                    >
                                        {repliesOpen
                                            ? 'Hide replies'
                                            : `View ${comment.replyCount} ${comment.replyCount === 1 ? 'reply' : 'replies'}`}
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function MenuItem({ children, onClick, danger, disabled }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            style={{
                display: 'block', width: '100%',
                textAlign: 'left',
                padding: '7px 10px',
                background: 'transparent',
                border: 0, borderRadius: 6,
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', fontSize: 13,
                color: danger ? 'var(--error)' : 'var(--text-1)',
                opacity: disabled ? 0.6 : 1,
            }}
            onMouseOver={(e) => { if (!disabled) e.currentTarget.style.background = 'var(--surface-subtle)'; }}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
        >
            {children}
        </button>
    );
}
