import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import { useGetEventByIdQuery, useGetEventTiersQuery, useSubmitEventMutation, useDeleteEventMutation } from '@/features/events/eventsApi';
import { useGetEventBookingsQuery } from '../organizerApi';
import ActivityFeed from '@/features/activity/ActivityFeed';
import { useGetCheckInInvitesQuery, useCreateCheckInInviteMutation, useRevokeCheckInInviteMutation } from '@/features/checkin/checkInApi';
import TopNav from '@/components/ui/TopNav';
import Button from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import CapacityBar from '@/components/ui/CapacityBar';
import { Icons } from '@/components/ui/Icon';
import { formatEventDate } from '@/utils/dateFormat';

/* ── Stat tile ───────────────────────────────────── */
function StatTile({ label, value, icon, sub }) {
    return (
        <div style={{
            background: 'white', border: '1px solid var(--border)',
            borderRadius: 12, padding: 20, boxShadow: 'var(--shadow-card)',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 13, fontWeight: 500, color: 'var(--text-2)' }}>
                {icon} {label}
            </div>
            <div className="mp-num" style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1 }}>
                {value}
            </div>
            {sub && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>{sub}</div>}
        </div>
    );
}

/* ── Delete dialog ───────────────────────────────── */
function DeleteDialog({ title, onConfirm, onDismiss, loading }) {
    return (
        <div
            role="dialog"
            aria-label="Delete event"
            onClick={onDismiss}
            style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(2,16,45,0.55)', display: 'grid', placeItems: 'center', padding: 20 }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{ width: '100%', maxWidth: 400, background: 'white', borderRadius: 16, padding: 28, boxShadow: 'var(--shadow-modal)' }}
            >
                <h2 className="mp-h3" style={{ margin: '0 0 8px', color: 'var(--text-1)' }}>Delete event?</h2>
                <p className="body-sm" style={{ margin: '0 0 24px', color: 'var(--text-2)' }}>
                    <strong>{title}</strong> will be permanently deleted. This cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <Button variant="ghost" size="md" onClick={onDismiss} disabled={loading}>Cancel</Button>
                    <Button variant="destructive" size="md" onClick={onConfirm} disabled={loading}>
                        {loading ? 'Deleting…' : 'Delete'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

/* ── Skeleton ────────────────────────────────────── */
function PageSkeleton() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[300, 180, 240].map((h, i) => (
                <div key={i} style={{ height: h, background: 'white', border: '1px solid var(--border)', borderRadius: 12, animation: 'mp-flash 1.6s ease-in-out infinite', opacity: 1 - i * 0.2 }} />
            ))}
        </div>
    );
}

/* ── Page ────────────────────────────────────────── */
export default function OrganizerEventPage() {
    const { id: eventId } = useParams();
    const navigate = useNavigate();

    const eventQuery = useGetEventByIdQuery(eventId);
    const tiersQuery = useGetEventTiersQuery(eventId);
    const bookingsQuery = useGetEventBookingsQuery(eventId);

    const [submitEvent, submitState] = useSubmitEventMutation();
    const [deleteEvent, deleteState] = useDeleteEventMutation();

    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [actionError, setActionError] = useState('');

    async function handleSubmit() {
        setActionError('');
        try { await submitEvent(eventId).unwrap(); }
        catch (err) { setActionError(err?.data?.message || 'Could not submit. Please try again.'); }
    }

    async function handleDelete() {
        setActionError('');
        try {
            await deleteEvent(eventId).unwrap();
            navigate('/organiser');
        } catch (err) {
            setActionError(err?.data?.message || 'Could not delete. Please try again.');
            setShowDeleteDialog(false);
        }
    }

    if (eventQuery.isLoading || tiersQuery.isLoading) {
        return (
            <Shell>
                <BackLink /><PageSkeleton />
            </Shell>
        );
    }

    if (eventQuery.isError || !eventQuery.data) {
        return (
            <Shell>
                <BackLink />
                <div style={{ padding: 48, textAlign: 'center' }}>
                    <Icons.alert size={32} style={{ color: 'var(--error)' }} />
                    <p className="mp-h3" style={{ margin: '12px 0 4px', color: 'var(--text-1)' }}>Event not found</p>
                    <Button variant="secondary" size="md" onClick={() => navigate('/organiser')} style={{ marginTop: 16 }}>
                        Back to console
                    </Button>
                </div>
            </Shell>
        );
    }

    const event = eventQuery.data;
    const tiers = tiersQuery.data ?? [];
    const bookings = bookingsQuery.data ?? [];

    const isDraft = event.status === 'DRAFT';
    const isRejected = isDraft && event.rejectionReason;

    const totalCapacity = tiers.reduce((s, t) => s + (t.totalCapacity ?? 0), 0);
    const totalSold = tiers.reduce((s, t) => s + ((t.totalCapacity ?? 0) - (t.availableCapacity ?? 0)), 0);
    const totalRevenue = tiers.reduce((s, t) => {
        const sold = (t.totalCapacity ?? 0) - (t.availableCapacity ?? 0);
        return s + sold * Number(t.price ?? 0);
    }, 0);
    const confirmedBookings = bookings.filter((b) => b.status === 'CONFIRMED').length;

    return (
        <Shell>
            <BackLink />

            {actionError && (
                <div role="alert" style={{ marginBottom: 16, padding: '10px 16px', background: 'var(--error-bg)', color: 'var(--error)', borderRadius: 10, fontSize: 14 }}>
                    {actionError}
                </div>
            )}

            {/* Event header card */}
            <div style={{
                background: 'white', border: '1px solid var(--border)',
                borderRadius: 16, padding: 28, marginBottom: 20, boxShadow: 'var(--shadow-card)',
            }}>
                {isRejected && (
                    <div style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                        padding: '12px 16px', borderRadius: 10, background: '#FFF8E1',
                        color: '#92400E', fontSize: 14, marginBottom: 20,
                    }}>
                        <Icons.alert size={16} style={{ flexShrink: 0, marginTop: 1, color: '#F59E0B' }} />
                        <div>
                            <strong>Rejected by admin — </strong>{event.rejectionReason}
                            <div style={{ marginTop: 4, fontSize: 13, color: '#78350F' }}>
                                Address the feedback above, then resubmit for approval.
                            </div>
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                            <StatusBadge status={event.status} />
                        </div>
                        <h1 className="mp-h2" style={{ margin: '0 0 12px', color: 'var(--text-1)' }}>
                            {event.title}
                        </h1>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-2)' }}>
                                <Icons.pin size={15} style={{ color: 'var(--text-3)' }} />{event.venue}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-2)' }}>
                                <Icons.calendar size={15} style={{ color: 'var(--text-3)' }} />{formatEventDate(event.startTime)}
                            </div>
                        </div>
                        {event.description && (
                            <p className="body-sm" style={{ margin: '14px 0 0', color: 'var(--text-2)' }}>
                                {event.description}
                            </p>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                        {isDraft && (
                            <Button
                                variant="primary"
                                size="md"
                                onClick={handleSubmit}
                                disabled={submitState.isLoading}
                                iconRight={<Icons.arrowR size={15} />}
                            >
                                {submitState.isLoading ? 'Submitting…' : 'Submit for approval'}
                            </Button>
                        )}
                        {isDraft && (
                            <Button
                                variant="destructive"
                                size="md"
                                onClick={() => setShowDeleteDialog(true)}
                                disabled={deleteState.isLoading}
                            >
                                Delete event
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
                <StatTile label="Tickets sold" value={totalSold.toLocaleString()} icon={<Icons.ticket size={16} />} sub={`of ${totalCapacity.toLocaleString()} capacity`} />
                <StatTile label="Revenue" value={totalRevenue === 0 ? '₦0' : `₦${totalRevenue.toLocaleString()}`} icon={<Icons.wallet size={16} />} />
                <StatTile label="Bookings" value={confirmedBookings} icon={<Icons.users size={16} />} sub="confirmed" />
                <StatTile
                    label="Remaining seats"
                    value={(totalCapacity - totalSold).toLocaleString()}
                    icon={<Icons.scan size={16} />}
                    sub={totalCapacity > 0 ? `${Math.round(((totalCapacity - totalSold) / totalCapacity) * 100)}% available` : null}
                />
            </div>

            {/* Live activity — fed by SSE; updates in real time as bookings and check-ins arrive */}
            <div style={{ marginBottom: 20 }}>
                <ActivityFeed eventId={eventId} max={10} />
            </div>

            {/* Ticket tiers */}
            {tiers.length > 0 && (
                <div style={{
                    background: 'white', border: '1px solid var(--border)',
                    borderRadius: 12, overflow: 'hidden', marginBottom: 20, boxShadow: 'var(--shadow-card)',
                }}>
                    <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontWeight: 600, color: 'var(--text-1)', fontSize: 14 }}>
                        Ticket tiers ({tiers.length})
                    </div>
                    {tiers.map((tier, i) => {
                        const sold = (tier.totalCapacity ?? 0) - (tier.availableCapacity ?? 0);
                        const tierRevenue = sold * Number(tier.price ?? 0);
                        return (
                            <div
                                key={tier.id}
                                style={{
                                    padding: '16px 20px',
                                    borderBottom: i === tiers.length - 1 ? 0 : '1px solid var(--border)',
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                    <div>
                                        <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>{tier.name}</div>
                                        <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
                                            {Number(tier.price) === 0 ? 'Free' : `₦${Number(tier.price).toLocaleString()} per ticket`}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div className="mp-num" style={{ fontWeight: 600, color: 'var(--text-1)' }}>
                                            {tierRevenue === 0 ? '—' : `₦${tierRevenue.toLocaleString()}`}
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{sold} sold</div>
                                    </div>
                                </div>
                                <CapacityBar sold={sold} total={tier.totalCapacity ?? 0} />
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Bookings table */}
            <div style={{
                background: 'white', border: '1px solid var(--border)',
                borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-card)',
            }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 14 }}>Bookings</span>
                    <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{bookings.length} total</span>
                </div>

                {bookingsQuery.isLoading && (
                    <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>Loading bookings…</div>
                )}

                {!bookingsQuery.isLoading && bookings.length === 0 && (
                    <div style={{ padding: 48, textAlign: 'center' }}>
                        <Icons.inbox size={28} style={{ color: 'var(--text-3)' }} />
                        <p className="mp-h4" style={{ margin: '12px 0 4px', color: 'var(--text-1)' }}>No bookings yet</p>
                        <p className="body-sm" style={{ color: 'var(--text-2)', margin: 0 }}>
                            Bookings will appear here once attendees start registering.
                        </p>
                    </div>
                )}

                {bookings.map((booking, i) => {
                    const date = new Date(booking.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                    const isLast = i === bookings.length - 1;
                    const isCancelled = booking.status === 'CANCELLED';
                    return (
                        <div
                            key={booking.id}
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 140px 100px 80px',
                                gap: 16,
                                alignItems: 'center',
                                padding: '14px 20px',
                                borderBottom: isLast ? 0 : '1px solid var(--border)',
                                opacity: isCancelled ? 0.6 : 1,
                            }}
                        >
                            <div>
                                <div style={{ fontWeight: 500, color: 'var(--text-1)' }}>{booking.attendeeName}</div>
                                <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>{booking.attendeeEmail}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 13, color: 'var(--text-1)' }}>{booking.tierName}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                                    {booking.quantity} ticket{booking.quantity !== 1 ? 's' : ''}
                                </div>
                            </div>
                            <div className="mp-num" style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>
                                {booking.totalAmount === 0 ? 'Free' : `₦${booking.totalAmount.toLocaleString()}`}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end' }}>
                                <span style={{
                                    fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                                    background: isCancelled ? 'var(--surface-subtle)' : 'var(--success-bg)',
                                    color: isCancelled ? 'var(--text-3)' : 'var(--success)',
                                }}>
                                    {booking.status}
                                </span>
                                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{date}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Check-in staff */}
            <CheckInStaffSection eventId={eventId} />

            {showDeleteDialog && (
                <DeleteDialog
                    title={event.title}
                    onConfirm={handleDelete}
                    onDismiss={() => setShowDeleteDialog(false)}
                    loading={deleteState.isLoading}
                />
            )}
        </Shell>
    );
}

/* ── Check-in staff section ──────────────────────── */
function CheckInStaffSection({ eventId }) {
    const { data: invites = [], isLoading } = useGetCheckInInvitesQuery(eventId);
    const [createInvite, createState] = useCreateCheckInInviteMutation();
    const [revokeInvite, revokeState] = useRevokeCheckInInviteMutation();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [newToken, setNewToken] = useState(null);
    const [copied, setCopied] = useState(false);
    const [formError, setFormError] = useState('');

    async function handleCreate(e) {
        e.preventDefault();
        if (!name.trim() || !email.trim()) return;
        setFormError('');
        try {
            const result = await createInvite({ eventId, name: name.trim(), email: email.trim() }).unwrap();
            setNewToken(result.rawToken);
            setName('');
            setEmail('');
        } catch (err) {
            setFormError(err?.data?.message || 'Could not create invite. Please try again.');
        }
    }

    async function handleRevoke(inviteId) {
        try { await revokeInvite({ eventId, inviteId }).unwrap(); }
        catch { /* silently fail — list will not update */ }
    }

    function copyToken() {
        if (!newToken) return;
        navigator.clipboard.writeText(newToken).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }

    const statusColor = { ACTIVE: 'var(--success)', REVOKED: 'var(--error)', EXPIRED: 'var(--text-3)' };

    return (
        <div style={{
            background: 'white', border: '1px solid var(--border)',
            borderRadius: 12, overflow: 'hidden', marginTop: 20, boxShadow: 'var(--shadow-card)',
        }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <span style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 14 }}>Check-in Staff</span>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-3)' }}>
                        Staff tokens allow scanning tickets without a full account login.
                    </p>
                </div>
            </div>

            {/* Create form */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface-subtle)' }}>
                <form onSubmit={handleCreate} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 160px' }}>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-2)', marginBottom: 4 }}>Staff name</label>
                        <input
                            type="text"
                            placeholder="e.g. David Okafor"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            style={{
                                width: '100%', height: 38, padding: '0 12px',
                                background: 'white', border: '1px solid var(--border)',
                                borderRadius: 8, fontSize: 14, color: 'var(--text-1)', boxSizing: 'border-box',
                            }}
                        />
                    </div>
                    <div style={{ flex: '1 1 200px' }}>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-2)', marginBottom: 4 }}>Email</label>
                        <input
                            type="email"
                            placeholder="staff@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            style={{
                                width: '100%', height: 38, padding: '0 12px',
                                background: 'white', border: '1px solid var(--border)',
                                borderRadius: 8, fontSize: 14, color: 'var(--text-1)', boxSizing: 'border-box',
                            }}
                        />
                    </div>
                    <Button type="submit" variant="primary" size="sm" disabled={createState.isLoading} icon={<Icons.plus size={14} />}>
                        {createState.isLoading ? 'Creating…' : 'Create invite'}
                    </Button>
                </form>
                {formError && (
                    <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--error)' }}>{formError}</p>
                )}
            </div>

            {/* Newly created token — show once */}
            {newToken && (
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: '#FFFBEB', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <Icons.alert size={16} style={{ color: '#D97706', flexShrink: 0, marginTop: 2 }} />
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#92400E', marginBottom: 6 }}>
                            Token created — copy it now. It will not be shown again.
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            <code style={{
                                flex: 1, background: 'white', border: '1px solid #FCD34D',
                                borderRadius: 6, padding: '6px 10px', fontSize: 13,
                                fontFamily: 'monospace', color: 'var(--text-1)', wordBreak: 'break-all',
                            }}>
                                {newToken}
                            </code>
                            <Button variant="secondary" size="sm" onClick={copyToken}>
                                {copied ? 'Copied!' : 'Copy'}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setNewToken(null)}>
                                Dismiss
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Invite list */}
            {isLoading && (
                <div style={{ padding: '20px', fontSize: 13, color: 'var(--text-3)', textAlign: 'center' }}>Loading staff…</div>
            )}

            {!isLoading && invites.length === 0 && !newToken && (
                <div style={{ padding: '28px 20px', textAlign: 'center' }}>
                    <Icons.users size={24} style={{ color: 'var(--text-3)' }} />
                    <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--text-2)' }}>No check-in staff invited yet.</p>
                </div>
            )}

            {invites.map((invite, i) => {
                const created = new Date(invite.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                const isLast = i === invites.length - 1;
                return (
                    <div
                        key={invite.id}
                        style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '12px 20px',
                            borderBottom: isLast ? 0 : '1px solid var(--border)',
                        }}
                    >
                        <div>
                            <div style={{ fontWeight: 500, color: 'var(--text-1)', fontSize: 14 }}>{invite.name}</div>
                            <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
                                {invite.email} · Added {created}
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{
                                fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                                background: invite.status === 'ACTIVE' ? 'var(--success-bg)' : 'var(--surface-subtle)',
                                color: statusColor[invite.status] ?? 'var(--text-3)',
                            }}>
                                {invite.status}
                            </span>
                            {invite.status === 'ACTIVE' && (
                                <button
                                    onClick={() => handleRevoke(invite.id)}
                                    disabled={revokeState.isLoading}
                                    aria-label={`Revoke ${invite.name}`}
                                    style={{
                                        background: 'none', border: '1px solid var(--border)',
                                        borderRadius: 6, padding: '4px 8px', cursor: 'pointer',
                                        fontSize: 12, color: 'var(--error)', fontWeight: 500,
                                    }}
                                >
                                    Revoke
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function Shell({ children }) {
    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            <TopNav />
            <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 80px' }}>
                {children}
            </div>
        </div>
    );
}

function BackLink() {
    return (
        <Link
            to="/organiser"
            style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                color: 'var(--text-2)', fontSize: 14, textDecoration: 'none', marginBottom: 24,
            }}
        >
            <Icons.arrowL size={16} /> Back to console
        </Link>
    );
}
