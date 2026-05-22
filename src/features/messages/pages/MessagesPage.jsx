import { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router';
import { Icons } from '@/components/ui/Icon';
import { selectCurrentUserId, selectCurrentUser } from '@/features/auth/authSlice';
import { useGetConversationsQuery, useGetConversationMessagesQuery, useMarkConversationReadMutation, messagesApi } from '../messagesApi';
import { stompConnect, stompDisconnect, stompSubscribe, stompSend } from '@/services/stompService';

const TEMP_PREFIX = '__temp__';

export default function MessagesPage() {
    const myId = useSelector(selectCurrentUserId);
    const currentUser = useSelector(selectCurrentUser);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [selectedId, setSelectedId] = useState(() => searchParams.get('c') ?? null);
    const [messages, setMessages] = useState([]);
    const [draft, setDraft] = useState('');
    // 'list' | 'thread' — only used on mobile to switch between panels
    const [mobileView, setMobileView] = useState(() => searchParams.get('c') ? 'thread' : 'list');
    const [connected, setConnected] = useState(false);
    const [connError, setConnError] = useState('');
    const [sendError, setSendError] = useState('');
    // { [conversationId]: number } — seeded from backend, updated optimistically via STOMP
    const [unreadCounts, setUnreadCounts] = useState({});
    const [markConversationRead] = useMarkConversationReadMutation();
    const bottomRef = useRef(null);
    const textareaRef = useRef(null);

    // The backend uses an opaque short ID for senderId (not the JWT email).
    // We discover it from conversation participants so historical messages render correctly.
    // The ref lets the STOMP handler read it without stale closures;
    // the state triggers a re-render of bubbles when first discovered.
    const myServerIdRef = useRef(null);
    const [myServerId, setMyServerId] = useState(null);

    const resolveMyServerId = useCallback((id) => {
        if (!id || myServerIdRef.current !== null) return;
        const s = String(id);
        myServerIdRef.current = s;
        setMyServerId(s);
    }, []);

    // Check whether a senderId belongs to the current user.
    // Checks the JWT email (myId), the stored profile id, and the server-resolved short ID.
    const isMyMessage = useCallback((senderId) => {
        const id = String(senderId ?? '');
        if (!id) return false;
        return (
            id === String(myId ?? '') ||
            id === String(currentUser?.id ?? '') ||
            id === String(currentUser?.email ?? '') ||
            (myServerId !== null && id === myServerId)
        );
    }, [myId, currentUser, myServerId]);

    const { data: conversations = [], isLoading: loadingConvs } = useGetConversationsQuery();

    // Seed unread counts from backend when conversations first load.
    useEffect(() => {
        if (!conversations.length) return;
        setUnreadCounts(prev => {
            const next = { ...prev };
            for (const conv of conversations) {
                if (conv.id in next) continue; // already tracking — don't overwrite live counts
                next[conv.id] = conv.unreadCount ?? 0;
            }
            return next;
        });
    }, [conversations]);

    // Derive our server-assigned sender ID from conversation participants.
    // Each participant has { email, userId } — we match by email (the JWT sub).
    useEffect(() => {
        for (const conv of conversations) {
            const participants = conv.participants ?? conv.members ?? [];
            const me = participants.find(p =>
                String(p.email ?? '') === String(myId) ||
                String(p.username ?? '') === String(myId)
            );
            if (me) {
                resolveMyServerId(me.userId ?? me.id);
                break;
            }
        }
    }, [conversations, myId, resolveMyServerId]);

    const { data: history, isLoading: loadingHistory } = useGetConversationMessagesQuery(
        { conversationId: selectedId },
        // Always hit the server when the user opens a conversation — never serve
        // stale cache. This ensures messages sent while the user was offline or
        // before they subscribed are always visible.
        { skip: !selectedId, refetchOnMountOrArgChange: true },
    );

    // STOMP connect on mount
    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        if (!token) return;
        let cancelled = false;
        stompConnect(token, {
            onConnect: () => {
                if (cancelled) return;
                setConnected(true);
                setConnError('');
                // Invalidate cached message history so RTK Query refetches —
                // picks up any messages that arrived while STOMP was connecting.
                dispatch(messagesApi.util.invalidateTags(['ConversationMessages']));
            },
            onError: (msg) => { if (!cancelled) { setConnected(false); setConnError(msg ?? 'Connection error'); } },
        }).catch(err => {
            console.error('[STOMP] init error', err);
            if (!cancelled) setConnError('Could not connect to chat server.');
        });
        return () => {
            cancelled = true;
            stompDisconnect();
        };
    }, []);

    // Mark conversation as read when history loads (covers deep-link / initial ?c= param)
    useEffect(() => {
        if (!selectedId || !history) return;
        setUnreadCounts(prev => ({ ...prev, [selectedId]: 0 }));
        markConversationRead(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedId, history]);

    // Load history into local state when REST response arrives
    useEffect(() => {
        if (!history) return;
        const msgs = Array.isArray(history)
            ? history
            : history.content ?? history.messages ?? [];
        setMessages(msgs);
    }, [history]);

    // Subscribe to STOMP topic for selected conversation
    useEffect(() => {
        if (!selectedId) return;
        const dest = `/topic/conversation.${selectedId}`;
        const unsub = stompSubscribe(dest, (msg) => {
            setMessages(prev => {
                // Check if this is the echo of one of our optimistic messages.
                // We detect our own echo by matching the temp-prefixed placeholder —
                // this is reliable regardless of what format senderId uses.
                const tempIdx = prev.findIndex(
                    m => String(m.id ?? '').startsWith(TEMP_PREFIX) && m.content === msg.content
                );
                if (tempIdx >= 0) {
                    return prev.map((m, i) => (i === tempIdx ? msg : m));
                }
                return [...prev, msg];
            });
        });
        return unsub;
    }, [selectedId]);

    // Subscribe to all other conversations to track unread counts
    useEffect(() => {
        const unsubs = conversations
            .filter(conv => conv.id !== selectedId)
            .map(conv =>
                stompSubscribe(`/topic/conversation.${conv.id}`, (msg) => {
                    // Only count messages from others, not our own echoes
                    if (isMyMessage(msg.senderId)) return;
                    setUnreadCounts(prev => ({
                        ...prev,
                        [conv.id]: (prev[conv.id] ?? 0) + 1,
                    }));
                })
            );
        return () => unsubs.forEach(u => u?.());
    }, [conversations, selectedId, isMyMessage]);

    // Scroll to newest message
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSelect = useCallback((id) => {
        setSelectedId(id);
        setMessages([]);
        setDraft('');
        setSendError('');
        setMobileView('thread');
        // Clear local unread count immediately; tell backend (fire-and-forget)
        setUnreadCounts(prev => ({ ...prev, [id]: 0 }));
        markConversationRead(id);
    }, [markConversationRead]);

    const handleBack = () => {
        setMobileView('list');
    };

    const handleSend = () => {
        if (!draft.trim() || !selectedId) return;
        const content = draft.trim();

        // Optimistic bubble — visible immediately, dimmed until confirmed
        const optimistic = {
            id: `${TEMP_PREFIX}${Date.now()}`,
            content,
            senderId: String(currentUser?.id ?? myId),
            sentAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, optimistic]);
        setDraft('');
        textareaRef.current?.focus();

        const sent = stompSend(selectedId, content);
        if (!sent) {
            setMessages(prev => prev.filter(m => m.id !== optimistic.id));
            setSendError('Not connected — please wait and try again.');
        } else {
            setSendError('');
        }
    };

    const selectedConv = conversations.find(c => c.id === selectedId);

    // Return the display name for a conversation from THIS user's perspective.
    // For 1-on-1: the other person's name.
    // For groups: comma-separated names of all other participants (truncated after 2).
    const convDisplayName = useCallback((conv) => {
        const participants = conv?.participants ?? conv?.members ?? [];
        const others = participants.filter(p =>
            p.userId !== myServerId &&
            String(p.email ?? '') !== String(myId)
        );
        if (others.length === 0) return conv?.title ?? 'Direct message';
        if (others.length === 1) return others[0].name ?? conv?.title ?? 'Direct message';
        const names = others.map(p => p.name ?? p.email ?? 'Unknown');
        if (names.length <= 3) return names.join(', ');
        return `${names.slice(0, 2).join(', ')} +${names.length - 2} more`;
    }, [myServerId, myId]);

    // On mobile: sidebar hidden when viewing thread, thread hidden when viewing list
    const sidebarClass = `mp-msg-panel mp-msg-sidebar${mobileView === 'thread' ? ' mp-msg-hide-mobile' : ''}`;
    const threadClass  = `mp-msg-panel mp-msg-thread${mobileView === 'list'   ? ' mp-msg-hide-mobile' : ''}`;

    return (
        <div style={{ minHeight: '100vh', background: 'var(--surface-subtle)' }}>
            <div style={{ maxWidth: 1100, margin: '0 auto', padding: '16px 20px 0' }}>
                <button
                    onClick={() => navigate(-1)}
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        background: 'none', border: 0, padding: 0,
                        cursor: 'pointer', color: 'var(--text-2)',
                        fontSize: 13, fontFamily: 'inherit',
                    }}
                >
                    <Icons.arrowL size={14} />
                    Back
                </button>
            </div>
            <div style={{
                maxWidth: 1100,
                margin: '0 auto',
                padding: '8px 20px 24px',
                height: 'calc(100vh - 96px)',
                display: 'flex',
                gap: 16,
                boxSizing: 'border-box',
            }}>
                {/* ── Left: Conversation list ─────────────────────────── */}
                <aside className={sidebarClass}>
                    <div style={{
                        padding: '16px 16px 14px',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        fontWeight: 700,
                        fontSize: 16,
                        color: 'var(--text-1)',
                    }}>
                        <Icons.inbox size={18} style={{ color: 'var(--mp-blue)' }} />
                        Messages
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {loadingConvs ? (
                            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>
                                Loading…
                            </div>
                        ) : conversations.length === 0 ? (
                            <div style={{ padding: 32, textAlign: 'center' }}>
                                <Icons.inbox size={32} style={{ color: 'var(--text-3)', marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
                                <p style={{ fontSize: 14, color: 'var(--text-3)', margin: 0 }}>No messages yet</p>
                            </div>
                        ) : (
                            conversations.map(conv => (
                                <ConvItem
                                    key={conv.id}
                                    conv={conv}
                                    displayName={convDisplayName(conv)}
                                    selected={selectedId === conv.id}
                                    unreadCount={unreadCounts[conv.id] ?? 0}
                                    onSelect={() => handleSelect(conv.id)}
                                />
                            ))
                        )}
                    </div>
                </aside>

                {/* ── Right: Thread ───────────────────────────────────── */}
                <main className={threadClass}>
                    {!selectedId ? (
                        <EmptyThread connError={connError} />
                    ) : (
                        <>
                            {/* Header */}
                            <div style={{
                                padding: '14px 20px',
                                borderBottom: '1px solid var(--border)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                flexShrink: 0,
                            }}>
                                <button
                                    type="button"
                                    onClick={handleBack}
                                    className="mp-msg-back-btn"
                                    aria-label="Back to conversations"
                                    style={{
                                        background: 'transparent',
                                        border: 0,
                                        padding: 4,
                                        cursor: 'pointer',
                                        color: 'var(--text-2)',
                                        borderRadius: 6,
                                        display: 'none', // shown via CSS on mobile
                                    }}
                                >
                                    <Icons.arrowL size={18} />
                                </button>

                                <div style={{
                                    width: 36, height: 36, borderRadius: 99,
                                    background: 'var(--mp-blue)', color: 'white',
                                    display: 'grid', placeItems: 'center',
                                    fontSize: 14, fontWeight: 700, flexShrink: 0,
                                }}>
                                    {(convDisplayName(selectedConv) ?? 'D')[0].toUpperCase()}
                                </div>
                                <div style={{ flex: 1, fontWeight: 600, fontSize: 15, color: 'var(--text-1)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {convDisplayName(selectedConv)}
                                </div>

                                {/* Live connection dot */}
                                <div
                                    title={connected ? 'Connected' : connError || 'Connecting…'}
                                    style={{
                                        width: 8, height: 8, borderRadius: 99, flexShrink: 0,
                                        background: connected ? '#22C55E' : '#F59E0B',
                                    }}
                                />
                            </div>

                            {/* Messages */}
                            <div style={{
                                flex: 1,
                                overflowY: 'auto',
                                padding: '16px 20px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 8,
                            }}>
                                {loadingHistory ? (
                                    <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 14, marginTop: 24 }}>
                                        Loading messages…
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 14, marginTop: 40 }}>
                                        No messages yet. Say hello!
                                    </div>
                                ) : (
                                    messages.map((msg, i) => (
                                        <MessageBubble
                                            key={msg.id ?? i}
                                            msg={msg}
                                            mine={isMyMessage(msg.senderId)}
                                        />
                                    ))
                                )}
                                <div ref={bottomRef} />
                            </div>

                            {/* Error banner */}
                            {sendError && (
                                <div style={{
                                    margin: '0 16px 8px',
                                    padding: '8px 12px',
                                    background: 'var(--error-bg, #FBE9E9)',
                                    color: 'var(--error)',
                                    borderRadius: 8,
                                    fontSize: 13,
                                    flexShrink: 0,
                                }}>
                                    {sendError}
                                </div>
                            )}

                            {/* Composer */}
                            <div style={{
                                padding: '12px 16px',
                                borderTop: '1px solid var(--border)',
                                display: 'flex',
                                gap: 8,
                                alignItems: 'flex-end',
                                flexShrink: 0,
                            }}>
                                <textarea
                                    ref={textareaRef}
                                    value={draft}
                                    onChange={e => setDraft(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSend();
                                        }
                                    }}
                                    placeholder="Type a message… (Enter to send)"
                                    rows={1}
                                    style={{
                                        flex: 1,
                                        resize: 'none',
                                        border: '1px solid var(--border)',
                                        borderRadius: 8,
                                        padding: '10px 12px',
                                        fontSize: 14,
                                        fontFamily: 'inherit',
                                        color: 'var(--text-1)',
                                        outline: 'none',
                                        background: 'var(--surface-subtle, #F8F9FA)',
                                        lineHeight: 1.5,
                                    }}
                                    onFocus={e => { e.target.style.borderColor = 'var(--mp-blue)'; }}
                                    onBlur={e => { e.target.style.borderColor = 'var(--border)'; }}
                                />
                                <button
                                    type="button"
                                    onClick={handleSend}
                                    disabled={!draft.trim()}
                                    style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 8,
                                        border: 0,
                                        background: draft.trim() ? 'var(--mp-blue)' : 'var(--surface-subtle, #F0F0F0)',
                                        color: draft.trim() ? 'white' : 'var(--text-3)',
                                        display: 'grid',
                                        placeItems: 'center',
                                        cursor: draft.trim() ? 'pointer' : 'not-allowed',
                                        flexShrink: 0,
                                        transition: 'background 0.15s, color 0.15s',
                                    }}
                                >
                                    <Icons.send size={16} />
                                </button>
                            </div>
                        </>
                    )}
                </main>
            </div>

            <style>{`
                .mp-msg-panel {
                    background: white;
                    border-radius: 12px;
                    border: 1px solid var(--border);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }
                .mp-msg-sidebar { width: 280px; flex-shrink: 0; }
                .mp-msg-thread  { flex: 1; min-width: 0; }

                @media (max-width: 640px) {
                    .mp-msg-sidebar { width: 100%; }
                    .mp-msg-hide-mobile { display: none; }
                    .mp-msg-back-btn { display: inline-flex !important; }
                }
            `}</style>
        </div>
    );
}

/* ── Sub-components ─────────────────────────────────────────────────── */

function EmptyThread({ connError }) {
    return (
        <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            padding: 32,
        }}>
            <Icons.message size={40} style={{ color: 'var(--text-3)' }} />
            <p style={{ margin: 0, fontSize: 15, color: 'var(--text-3)', textAlign: 'center' }}>
                Select a conversation to start messaging
            </p>
            {connError && (
                <p style={{ margin: 0, fontSize: 13, color: 'var(--error)', textAlign: 'center' }}>
                    {connError}
                </p>
            )}
        </div>
    );
}

function ConvItem({ conv, displayName, selected, unreadCount, onSelect }) {
    const hasUnread = unreadCount > 0;
    return (
        <button
            type="button"
            onClick={onSelect}
            style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                border: 0,
                borderLeft: `3px solid ${selected ? 'var(--mp-blue)' : 'transparent'}`,
                background: selected ? '#EFF6FF' : 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
            }}
            onMouseOver={e => { if (!selected) e.currentTarget.style.background = 'var(--surface-subtle, #F8F9FA)'; }}
            onMouseOut={e => { if (!selected) e.currentTarget.style.background = 'transparent'; }}
        >
            <span style={{
                width: 36, height: 36, borderRadius: 99,
                background: selected ? 'var(--mp-blue)' : '#9CA3AF',
                color: 'white',
                display: 'grid', placeItems: 'center',
                fontSize: 13, fontWeight: 700, flexShrink: 0,
            }}>
                {(displayName ?? 'D')[0].toUpperCase()}
            </span>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                    flex: 1, minWidth: 0,
                    fontSize: 14, fontWeight: hasUnread ? 700 : 600,
                    color: 'var(--text-1)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                    {displayName}
                </span>
                {hasUnread && (
                    <span style={{
                        minWidth: 18, height: 18,
                        padding: '0 5px',
                        borderRadius: 99,
                        background: 'var(--mp-blue)',
                        color: 'white',
                        fontSize: 11, fontWeight: 700,
                        display: 'grid', placeItems: 'center',
                        flexShrink: 0,
                    }}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </div>
        </button>
    );
}

function MessageBubble({ msg, mine }) {
    const ts = msg.sentAt ?? msg.createdAt ?? msg.timestamp;
    const pending = mine && String(msg.id ?? '').startsWith(TEMP_PREFIX);
    const time = ts
        ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : null;

    return (
        <div style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
            <div style={{
                maxWidth: '70%',
                padding: '9px 13px',
                borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: mine ? 'var(--mp-blue)' : 'var(--surface-subtle, #F3F4F6)',
                color: mine ? 'white' : 'var(--text-1)',
                fontSize: 14,
                lineHeight: 1.5,
                wordBreak: 'break-word',
                opacity: pending ? 0.6 : 1,
                transition: 'opacity 0.3s',
            }}>
                <div>{msg.content}</div>
                <div style={{
                    fontSize: 11, marginTop: 3, opacity: 0.65,
                    textAlign: mine ? 'right' : 'left',
                }}>
                    {pending ? 'Sending…' : (time ?? '')}
                </div>
            </div>
        </div>
    );
}
