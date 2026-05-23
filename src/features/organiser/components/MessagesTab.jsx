import { useNavigate } from 'react-router';
import { useGetConversationsQuery } from '@/features/messages/messagesApi';
import Button from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icon';

function timeAgo(iso) {
    if (!iso) return '';
    const ms   = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(ms / 60_000);
    if (mins < 1)  return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7)  return `${days}d ago`;
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function initials(name) {
    if (!name) return '?';
    return name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase() || '?';
}

/* ── Main component ──────────────────────────────── */
export default function MessagesTab() {
    const navigate = useNavigate();
    const { data: conversations = [], isLoading, isError, refetch } = useGetConversationsQuery();

    if (isLoading) return <ConvSkeleton />;

    if (isError) {
        return (
            <div style={{
                background: 'var(--surface-elevated)', border: '1px solid var(--border)',
                borderRadius: 12, padding: 40, textAlign: 'center',
            }}>
                <Icons.alert size={28} style={{ color: 'var(--error)' }} />
                <p className="body-sm" style={{ marginTop: 8, color: 'var(--text-2)' }}>
                    Could not load conversations.
                </p>
                <Button variant="secondary" size="sm" onClick={refetch} style={{ marginTop: 12 }}>
                    Retry
                </Button>
            </div>
        );
    }

    const totalUnread = conversations.reduce((s, c) => s + (c.unreadCount ?? 0), 0);

    return (
        <div>
            {/* Header */}
            <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: 20,
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-1)' }}>Messages</span>
                        {totalUnread > 0 && (
                            <span style={{
                                background: 'var(--mp-blue)', color: 'white',
                                fontSize: 11, fontWeight: 700, padding: '1px 8px',
                                borderRadius: 99,
                            }}>
                                {totalUnread} unread
                            </span>
                        )}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
                        Conversations with vendors and collaborators
                    </div>
                </div>
                <Button
                    variant="primary" size="sm"
                    icon={<Icons.message size={14} />}
                    onClick={() => navigate('/messages')}
                >
                    Open inbox
                </Button>
            </div>

            {/* Empty state */}
            {conversations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '56px 24px' }}>
                    <div style={{
                        width: 56, height: 56, borderRadius: 99, margin: '0 auto 16px',
                        background: '#EAF1FE', display: 'grid', placeItems: 'center',
                        color: 'var(--mp-blue)',
                    }}>
                        <Icons.message size={24} />
                    </div>
                    <div className="mp-h4" style={{ color: 'var(--text-1)', margin: 0 }}>
                        No conversations yet
                    </div>
                    <p className="body-sm" style={{ color: 'var(--text-2)', margin: '8px 0 20px' }}>
                        When you or a vendor starts a conversation, it will appear here.
                    </p>
                    <Button variant="secondary" size="sm" onClick={() => navigate('/vendors')}>
                        Browse vendors
                    </Button>
                </div>
            ) : (
                <div style={{
                    background: 'var(--surface-elevated)', border: '1px solid var(--border)',
                    borderRadius: 12, overflow: 'hidden',
                }}>
                    <div style={{
                        padding: '14px 20px', borderBottom: '1px solid var(--border)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 14 }}>
                            Recent conversations
                        </span>
                        <span style={{ fontSize: 13, color: 'var(--text-3)' }}>
                            {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
                        </span>
                    </div>

                    {conversations.map((conv, i) => (
                        <ConversationRow
                            key={conv.id}
                            conv={conv}
                            isLast={i === conversations.length - 1}
                            onClick={() => navigate(`/messages?c=${conv.id}`)}
                        />
                    ))}

                    {/* See-all footer */}
                    {conversations.length >= 5 && (
                        <div style={{
                            padding: '12px 20px', borderTop: '1px solid var(--border)',
                            textAlign: 'center',
                        }}>
                            <Button variant="ghost" size="sm" onClick={() => navigate('/messages')}>
                                View all messages →
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/* ── Conversation row ────────────────────────────── */
function ConversationRow({ conv, isLast, onClick }) {
    const otherName = conv.otherParticipantName
        ?? conv.otherParticipant?.name
        ?? conv.otherParticipant?.firstName
        ?? 'Unknown';
    const lastMsg = conv.lastMessage?.body ?? conv.lastMessagePreview ?? '';
    const time    = conv.lastActivity ?? conv.lastMessage?.createdAt ?? conv.updatedAt;
    const unread  = conv.unreadCount ?? 0;
    const context = conv.referenceName ?? conv.eventTitle ?? '';

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(e) => e.key === 'Enter' && onClick()}
            style={{
                display: 'grid',
                gridTemplateColumns: '44px 1fr auto',
                gap: 14, alignItems: 'center',
                padding: '14px 20px',
                borderBottom: isLast ? 0 : '1px solid var(--border)',
                cursor: 'pointer',
                transition: 'background 0.12s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-subtle)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
        >
            {/* Avatar */}
            <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: '#EAF1FE', color: 'var(--mp-blue)',
                display: 'grid', placeItems: 'center',
                fontSize: 14, fontWeight: 700, flexShrink: 0,
            }}>
                {initials(otherName)}
            </div>

            {/* Body */}
            <div style={{ minWidth: 0 }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    marginBottom: 3, flexWrap: 'wrap',
                }}>
                    <span style={{
                        fontWeight: unread > 0 ? 700 : 500,
                        fontSize: 14, color: 'var(--text-1)',
                    }}>
                        {otherName}
                    </span>
                    {context && (
                        <span style={{
                            fontSize: 11, padding: '1px 7px',
                            background: 'var(--surface-subtle)', borderRadius: 6,
                            color: 'var(--text-3)', flexShrink: 0,
                        }}>
                            {context}
                        </span>
                    )}
                </div>
                {lastMsg && (
                    <div style={{
                        fontSize: 13,
                        color: unread > 0 ? 'var(--text-1)' : 'var(--text-2)',
                        fontWeight: unread > 0 ? 500 : 400,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                        {lastMsg}
                    </div>
                )}
            </div>

            {/* Right col: time + badge */}
            <div style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'flex-end', gap: 6, flexShrink: 0,
            }}>
                {time && (
                    <span style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                        {timeAgo(time)}
                    </span>
                )}
                {unread > 0 && (
                    <span style={{
                        minWidth: 20, height: 20, borderRadius: 99,
                        background: 'var(--mp-blue)', color: 'white',
                        fontSize: 11, fontWeight: 700,
                        display: 'grid', placeItems: 'center', padding: '0 6px',
                    }}>
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </div>
        </div>
    );
}

/* ── Skeleton ────────────────────────────────────── */
function ConvSkeleton() {
    const row = {
        background: 'var(--surface-subtle)',
        animation: 'mp-flash 1.6s ease-in-out infinite',
        borderBottom: '1px solid var(--border)',
    };
    return (
        <div style={{
            background: 'var(--surface-elevated)', border: '1px solid var(--border)',
            borderRadius: 12, overflow: 'hidden',
        }}>
            <div style={{ ...row, height: 50 }} />
            <div style={{ ...row, height: 72 }} />
            <div style={{ ...row, height: 72, opacity: 0.7 }} />
            <div style={{ ...row, height: 72, opacity: 0.4, borderBottom: 0 }} />
        </div>
    );
}
