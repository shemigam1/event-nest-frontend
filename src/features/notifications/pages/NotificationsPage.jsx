import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
    useGetMyNotificationsQuery,
    useMarkNotificationAsReadMutation,
} from '../notificationsApi';
import Button from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icon';
import { formatEventDate } from '@/utils/dateFormat';

const TYPE_META = {
    BOOKING_CONFIRMED:        { icon: Icons.ticket, accent: 'var(--accent)',  label: 'Booking confirmed' },
    EVENT_APPROVED:           { icon: Icons.check,  accent: 'var(--success)', label: 'Event approved' },
    EVENT_REJECTED:           { icon: Icons.alert,  accent: 'var(--error)',   label: 'Event rejected' },
    CHECKIN_SUCCESS:          { icon: Icons.scan,   accent: 'var(--accent)',  label: 'Checked in' },
    TICKET_TRANSFER_RECEIVED: { icon: Icons.send,   accent: 'var(--mp-blue)', label: 'Ticket received' },
    TICKET_GIFTED:            { icon: Icons.spark,  accent: 'var(--accent)',  label: 'Ticket gifted to you' },
};

export default function NotificationsPage() {
    const navigate = useNavigate();
    const [page, setPage] = useState(0);
    const query = useGetMyNotificationsQuery({ page, size: 20 });
    const [markAsRead] = useMarkNotificationAsReadMutation();

    const content = query.data?.content ?? [];
    const totalPages = query.data?.totalPages ?? 0;

    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px 80px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 24 }}>
                    <div>
                        <h1 className="mp-h1" style={{ margin: 0, color: 'var(--text-1)' }}>Notifications</h1>
                        <p className="body" style={{ margin: '6px 0 0', color: 'var(--text-2)' }}>
                            Updates on bookings, events, and check-ins.
                        </p>
                    </div>
                </div>

                {query.isLoading && <SkeletonList />}
                {query.isError && <ErrorState onRetry={query.refetch} />}
                {query.isSuccess && content.length === 0 && (
                    <EmptyState onBrowse={() => navigate('/events')} />
                )}

                {query.isSuccess && content.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {content.map((n) => (
                            <NotificationRow
                                key={n.id}
                                notification={n}
                                onMarkRead={() => !n.read && markAsRead(n.id)}
                            />
                        ))}
                    </div>
                )}

                {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 24 }}>
                        <Button
                            size="sm" variant="secondary"
                            onClick={() => setPage((p) => Math.max(0, p - 1))}
                            disabled={page === 0}
                        >
                            Previous
                        </Button>
                        <span className="body-sm" style={{ color: 'var(--text-2)' }}>
                            Page {page + 1} of {totalPages}
                        </span>
                        <Button
                            size="sm" variant="secondary"
                            onClick={() => setPage((p) => p + 1)}
                            disabled={page + 1 >= totalPages}
                        >
                            Next
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}

function NotificationRow({ notification, onMarkRead }) {
    const meta = TYPE_META[notification.type] ?? { icon: Icons.bell, accent: 'var(--text-2)', label: notification.type };
    const IconCmp = meta.icon;

    return (
        <button
            type="button"
            onClick={onMarkRead}
            aria-label={notification.read ? 'Notification' : 'Unread notification — mark as read'}
            style={{
                textAlign: 'left',
                display: 'flex',
                gap: 14,
                alignItems: 'flex-start',
                padding: '18px 20px',
                background: notification.read ? 'white' : 'var(--accent-bg, #eef2ff)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                cursor: notification.read ? 'default' : 'pointer',
                boxShadow: 'var(--shadow-card)',
                width: '100%',
            }}
        >
            <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'var(--surface-subtle)',
                color: meta.accent,
                display: 'grid', placeItems: 'center', flexShrink: 0,
            }}>
                <IconCmp size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: meta.accent, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                        {meta.label}
                    </span>
                    {!notification.read && (
                        <span aria-label="unread" style={{
                            width: 8, height: 8, borderRadius: '50%', background: meta.accent,
                        }} />
                    )}
                </div>
                <div className="mp-h5" style={{ margin: 0, color: 'var(--text-1)' }}>
                    {notification.title}
                </div>
                {notification.message && (
                    <p className="body-sm" style={{ margin: '4px 0 0', color: 'var(--text-2)' }}>
                        {notification.message}
                    </p>
                )}
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-3)' }}>
                    {notification.createdAt ? formatEventDate(notification.createdAt) : ''}
                </div>
            </div>
        </button>
    );
}

function SkeletonList() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[0, 1, 2, 3].map((i) => (
                <div key={i} style={{
                    height: 84,
                    background: 'white',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    animation: 'mp-flash 1.6s ease-in-out infinite',
                    opacity: 1 - i * 0.15,
                }} />
            ))}
        </div>
    );
}

function ErrorState({ onRetry }) {
    return (
        <div style={{ padding: 48, textAlign: 'center' }}>
            <Icons.alert size={32} style={{ color: 'var(--error)' }} />
            <p className="mp-h3" style={{ margin: '12px 0 4px', color: 'var(--text-1)' }}>
                Couldn’t load notifications
            </p>
            <Button variant="secondary" size="md" onClick={onRetry} style={{ marginTop: 12 }}>
                Try again
            </Button>
        </div>
    );
}

function EmptyState({ onBrowse }) {
    return (
        <div style={{
            padding: 48, textAlign: 'center',
            background: 'white', border: '1px solid var(--border)',
            borderRadius: 12, boxShadow: 'var(--shadow-card)',
        }}>
            <Icons.bell size={32} style={{ color: 'var(--text-3)' }} />
            <p className="mp-h3" style={{ margin: '12px 0 4px', color: 'var(--text-1)' }}>
                You’re all caught up
            </p>
            <p className="body-sm" style={{ margin: '0 0 16px', color: 'var(--text-2)' }}>
                You’ll see booking confirmations and event updates here.
            </p>
            <Button variant="secondary" size="md" onClick={onBrowse}>
                Browse events
            </Button>
        </div>
    );
}
