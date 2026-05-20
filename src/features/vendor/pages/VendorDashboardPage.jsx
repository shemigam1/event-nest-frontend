import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useSelector } from 'react-redux';
import {
    useGetMyVendorApplicationsQuery,
    useGetMyVendorVerificationQuery,
} from '@/features/organiser/vendorsApi';
import { selectCurrentUser, selectAuthEmail } from '@/features/auth/authSlice';
import { formatEventDate } from '@/utils/dateFormat';
import TopNav from '@/components/ui/TopNav';
import Button from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icon';
// TODO(Phase F — Messages/chat): The "Received inquiries" panel previously read from
// `useGetReceivedInquiriesQuery` and `useCloseInquiryMutation`. Both endpoints were
// frontend-only and 404'd against the backend (VendorInquiryController only exposes
// POST + POST /confirm). Real inquiries surface as VENDOR_INQUIRY conversations and
// will be re-introduced when the messages/chat surface is built out. The dashboard
// panel + ReceivedInquiryRow renderer are temporarily disabled below.

/* Landing page for vendor activity. Everything important at a glance:
   verification status + tiles + upcoming gigs + recent application
   activity + quick CTAs. Detail views still live at
   /vendor/opportunities, /vendor/applications, /vendor/profile. */

const STATUS_BADGE = {
    PENDING:  { bg: '#FEF4E2', fg: '#B8770A', label: 'Pending review' },
    ACCEPTED: { bg: '#E6F4EA', fg: '#0F9D58', label: 'Accepted' },
    REJECTED: { bg: '#FBE9E9', fg: '#D62828', label: 'Rejected' },
};

const VER_STATE = {
    NOT_REQUESTED: { label: 'Profile not set up', fg: 'var(--text-3)', bg: 'var(--surface-subtle)' },
    PENDING:       { label: 'Awaiting verification', fg: '#B8770A', bg: '#FEF4E2' },
    VERIFIED:      { label: 'Verified vendor',    fg: '#0F7B3E',   bg: '#E6F4EA' },
    REJECTED:      { label: 'Verification rejected', fg: '#D62828', bg: '#FBE9E9' },
};

function ngn(amount) {
    const n = Number(amount ?? 0);
    if (!Number.isFinite(n) || n <= 0) return null;
    return `₦${n.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
}

function isUpcoming(app, nowMs) {
    const end = app.eventEndTime ? new Date(app.eventEndTime).getTime() : null;
    if (end != null && Number.isFinite(end)) return end >= nowMs;
    const start = app.eventStartTime ? new Date(app.eventStartTime).getTime() : null;
    if (start != null && Number.isFinite(start)) return start >= nowMs;
    return true;
}

function relativeTime(iso, nowMs) {
    if (!iso) return '';
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return '';
    const diffMs = Math.max(0, nowMs - t);
    const m = Math.floor(diffMs / 60_000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d ago`;
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function daysUntil(iso, nowMs) {
    if (!iso) return null;
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return null;
    return Math.round((t - nowMs) / 86_400_000);
}

export default function VendorDashboardPage() {
    const navigate = useNavigate();
    const user = useSelector(selectCurrentUser);
    const email = useSelector(selectAuthEmail);
    const firstName = user?.firstName ?? email?.split('@')[0] ?? 'there';

    const apps         = useGetMyVendorApplicationsQuery();
    const verification = useGetMyVendorVerificationQuery();

    const [nowMs]        = useState(() => Date.now());

    const list = useMemo(() => apps.data || [], [apps.data]);

    const counts = useMemo(() => {
        const c = { all: list.length, PENDING: 0, ACCEPTED: 0, REJECTED: 0 };
        for (const a of list) {
            if (c[a.status] !== undefined) c[a.status] += 1;
        }
        return c;
    }, [list]);

    const accepted = useMemo(() => list.filter((a) => a.status === 'ACCEPTED'), [list]);
    const upcoming = useMemo(() => (
        accepted
            .filter((a) => isUpcoming(a, nowMs))
            .sort((a, b) => {
                const at = a.eventStartTime ? new Date(a.eventStartTime).getTime() : Infinity;
                const bt = b.eventStartTime ? new Date(b.eventStartTime).getTime() : Infinity;
                return at - bt;
            })
    ), [accepted, nowMs]);
    const pastCount = accepted.length - upcoming.length;

    // Recent activity feed — newest 5 applications regardless of status.
    const recent = useMemo(() => (
        [...list]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5)
    ), [list]);

    const verStatus = verification.data?.status || 'NOT_REQUESTED';
    const verBadge  = VER_STATE[verStatus] || VER_STATE.NOT_REQUESTED;
    const hasProfile = !!verification.data?.serviceType;

    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            <TopNav />
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 80px' }}>

                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 16,
                    flexWrap: 'wrap',
                    marginBottom: 24,
                }}>
                    <div>
                        <h1 className="mp-h1" style={{ margin: 0, color: 'var(--text-1)' }}>
                            Vendor dashboard
                        </h1>
                        <p className="body" style={{ margin: '6px 0 0', color: 'var(--text-2)' }}>
                            Welcome back, {firstName}. Here&apos;s what&apos;s on your plate.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <Button
                            variant="secondary"
                            size="md"
                            onClick={() => navigate('/vendor/profile')}
                            icon={<Icons.shield size={14} />}
                        >
                            {hasProfile ? 'Edit profile' : 'Set up profile'}
                        </Button>
                        <Button
                            variant="primary"
                            size="md"
                            onClick={() => navigate('/vendor/opportunities')}
                            icon={<Icons.search size={14} />}
                        >
                            Find opportunities
                        </Button>
                    </div>
                </div>

                {/* Verification banner — only when something needs the user's
                    attention. A NOT_REQUESTED state gets a setup nudge;
                    REJECTED shows the admin's reason inline. */}
                {(verStatus === 'NOT_REQUESTED' || verStatus === 'REJECTED') && !verification.isLoading && (
                    <VerificationBanner
                        verification={verification.data}
                        status={verStatus}
                        onAction={() => navigate('/vendor/profile')}
                    />
                )}

                {/* Tiles */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 16,
                    marginBottom: 24,
                }}>
                    <Tile
                        label="Working at"
                        value={apps.isLoading ? '—' : upcoming.length}
                        sub={pastCount > 0 ? `${pastCount} past gig${pastCount !== 1 ? 's' : ''}` : 'upcoming gigs'}
                        icon={<Icons.calendar size={16} />}
                        accent={upcoming.length > 0 ? 'var(--success)' : undefined}
                    />
                    <Tile
                        label="Pending"
                        value={apps.isLoading ? '—' : counts.PENDING}
                        sub="awaiting decision"
                        icon={<Icons.inbox size={16} />}
                        accent={counts.PENDING > 0 ? 'var(--warning)' : undefined}
                    />
                    <Tile
                        label="Accepted"
                        value={apps.isLoading ? '—' : counts.ACCEPTED}
                        sub={counts.all > 0
                            ? `${Math.round((counts.ACCEPTED / counts.all) * 100)}% accept rate`
                            : 'no applications yet'}
                        icon={<Icons.check size={16} />}
                    />
                    <Tile
                        label="Verification"
                        value=""
                        valueNode={
                            <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                padding: '4px 10px',
                                background: verBadge.bg,
                                color: verBadge.fg,
                                fontSize: 12,
                                fontWeight: 600,
                                borderRadius: 99,
                            }}>
                                {verStatus === 'VERIFIED' && <Icons.shield size={11} />}
                                {verBadge.label}
                            </span>
                        }
                        icon={<Icons.shield size={16} />}
                    />
                </div>

                {/* Two-column body */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) 320px',
                    gap: 20,
                    alignItems: 'start',
                }}>
                    {/* Left: upcoming gigs */}
                    <div>
                        <SectionHeader
                            title="Upcoming gigs"
                            count={upcoming.length}
                            action={
                                upcoming.length > 0
                                    ? (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => navigate('/vendor/applications')}
                                            iconRight={<Icons.arrowR size={13} />}
                                        >
                                            See all
                                        </Button>
                                    )
                                    : null
                            }
                        />
                        {apps.isLoading ? (
                            <ListSkeleton rows={2} />
                        ) : upcoming.length === 0 ? (
                            <EmptyCard
                                icon={<Icons.calendar size={20} />}
                                title="No upcoming gigs"
                                body={counts.PENDING > 0
                                    ? `${counts.PENDING} application${counts.PENDING !== 1 ? 's' : ''} pending. Status updates land here once accepted.`
                                    : 'When an organiser accepts your application, the event lands here.'}
                                ctaLabel="Find opportunities"
                                onCta={() => navigate('/vendor/opportunities')}
                            />
                        ) : (
                            <div style={{
                                background: 'white',
                                border: '1px solid var(--border)',
                                borderRadius: 12,
                                overflow: 'hidden',
                            }}>
                                {upcoming.slice(0, 5).map((a, i) => (
                                    <UpcomingRow
                                        key={a.id}
                                        application={a}
                                        nowMs={nowMs}
                                        isLast={i === Math.min(upcoming.length, 5) - 1}
                                        onView={() => navigate(`/events/${a.eventId}`)}
                                    />
                                ))}
                                {upcoming.length > 5 && (
                                    <div style={{
                                        padding: '12px 20px',
                                        background: 'var(--surface-subtle)',
                                        textAlign: 'center',
                                    }}>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => navigate('/vendor/applications')}
                                            iconRight={<Icons.arrowR size={13} />}
                                        >
                                            {upcoming.length - 5} more upcoming
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                        {/* "Received inquiries" panel temporarily disabled — see file-top
                            TODO(Phase F). Inquiries surface as VENDOR_INQUIRY conversations
                            and need the messages/chat module to be wired before they can
                            be re-rendered here meaningfully. */}
                    </div>

                    {/* Right: recent activity */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 24 }}>
                        <div>
                            <SectionHeader title="Recent activity" />
                            {apps.isLoading ? (
                                <ListSkeleton rows={3} />
                            ) : recent.length === 0 ? (
                                <div style={{
                                    background: 'white',
                                    border: '1px solid var(--border)',
                                    borderRadius: 12,
                                    padding: 18,
                                    fontSize: 13,
                                    color: 'var(--text-3)',
                                    textAlign: 'center',
                                }}>
                                    No applications yet.
                                </div>
                            ) : (
                                <div style={{
                                    background: 'white',
                                    border: '1px solid var(--border)',
                                    borderRadius: 12,
                                    overflow: 'hidden',
                                }}>
                                    {recent.map((a, i) => (
                                        <ActivityRow
                                            key={a.id}
                                            application={a}
                                            nowMs={nowMs}
                                            isLast={i === recent.length - 1}
                                            onView={() => navigate('/vendor/applications')}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Quick actions */}
                        <div style={{
                            background: 'white',
                            border: '1px solid var(--border)',
                            borderRadius: 12,
                            padding: 16,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                        }}>
                            <div style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: 'var(--text-3)',
                                letterSpacing: 0.4,
                                marginBottom: 4,
                            }}>
                                QUICK ACTIONS
                            </div>
                            <QuickLink
                                icon={<Icons.inbox size={14} />}
                                label="My applications"
                                onClick={() => navigate('/vendor/applications')}
                            />
                            <QuickLink
                                icon={<Icons.search size={14} />}
                                label="Find opportunities"
                                onClick={() => navigate('/vendor/opportunities')}
                            />
                            <QuickLink
                                icon={<Icons.shield size={14} />}
                                label={hasProfile ? 'Edit my profile' : 'Set up vendor profile'}
                                onClick={() => navigate('/vendor/profile')}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─── Banner + sections ──────────────────────────── */

function VerificationBanner({ verification, status, onAction }) {
    const isRejected = status === 'REJECTED';
    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: 16,
            alignItems: 'center',
            padding: '16px 20px',
            marginBottom: 24,
            borderRadius: 12,
            background: isRejected ? '#FBE9E9' : 'var(--mp-blue-50, #EAF1FE)',
            border: `1px solid ${isRejected ? '#F4C5C5' : 'var(--mp-blue-200, #C4D5F8)'}`,
        }}>
            <div>
                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    fontSize: 11, fontWeight: 700,
                    color: isRejected ? '#D62828' : 'var(--mp-blue)',
                    letterSpacing: 0.4,
                    marginBottom: 4,
                }}>
                    <Icons.alert size={12} />
                    {isRejected ? 'VERIFICATION REJECTED' : 'PROFILE SETUP NEEDED'}
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-1)', fontWeight: 600 }}>
                    {isRejected ? 'Update your profile and resubmit' : 'Set up your vendor profile to start applying'}
                </div>
                <p style={{
                    margin: '4px 0 0',
                    fontSize: 13,
                    color: 'var(--text-2)',
                    lineHeight: 1.5,
                }}>
                    {isRejected
                        ? (verification?.rejectionReason || 'Admin wants more detail. Edit your service type or description and resubmit.')
                        : 'Service type + a short description is all it takes. You don\'t need to be verified to apply, but verification gets you a badge.'}
                </p>
            </div>
            <Button
                variant={isRejected ? 'destructive' : 'primary'}
                size="md"
                onClick={onAction}
                iconRight={<Icons.arrowR size={14} />}
            >
                {isRejected ? 'Update profile' : 'Set up profile'}
            </Button>
        </div>
    );
}

function SectionHeader({ title, count, action }) {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
        }}>
            <div style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--text-1)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
            }}>
                {title}
                {typeof count === 'number' && (
                    <span className="mp-num" style={{
                        fontSize: 11,
                        padding: '2px 7px',
                        borderRadius: 99,
                        fontWeight: 600,
                        background: 'var(--surface-subtle)',
                        color: 'var(--text-3)',
                    }}>
                        {count}
                    </span>
                )}
            </div>
            {action}
        </div>
    );
}

/* ─── Rows ───────────────────────────────────────── */

function UpcomingRow({ application: a, nowMs, isLast, onView }) {
    const amount = ngn(a.proposedAmount);
    const days = daysUntil(a.eventStartTime, nowMs);
    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: '64px 1fr auto',
            gap: 16,
            alignItems: 'center',
            padding: '16px 20px',
            borderBottom: isLast ? 0 : '1px solid var(--border)',
        }}>
            {/* Days-until tile */}
            <div style={{
                textAlign: 'center',
                background: days != null && days <= 7 ? 'var(--mp-navy)' : 'var(--surface-subtle)',
                color: days != null && days <= 7 ? 'white' : 'var(--text-2)',
                padding: '10px 0',
                borderRadius: 10,
            }}>
                <div className="mp-num" style={{
                    fontSize: 22, fontWeight: 700, lineHeight: 1,
                }}>
                    {days != null ? Math.max(0, days) : '—'}
                </div>
                <div style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: 0.5,
                    marginTop: 4,
                    opacity: 0.8,
                }}>
                    {days === 0 ? 'TODAY' : days === 1 ? 'DAY' : 'DAYS'}
                </div>
            </div>

            <div style={{ minWidth: 0 }}>
                <button
                    onClick={onView}
                    style={{
                        background: 'none', border: 0, padding: 0,
                        cursor: 'pointer', fontFamily: 'inherit',
                        fontWeight: 600, color: 'var(--mp-blue)', fontSize: 15,
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        marginBottom: 4,
                    }}
                >
                    {a.eventTitle}
                    <Icons.arrowR size={13} style={{ opacity: 0.7 }} />
                </button>
                <div style={{
                    display: 'flex',
                    gap: 14,
                    fontSize: 13,
                    color: 'var(--text-2)',
                    flexWrap: 'wrap',
                }}>
                    {a.eventStartTime && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Icons.calendar size={12} style={{ color: 'var(--text-3)' }} />
                            {formatEventDate(a.eventStartTime)}
                        </span>
                    )}
                    {a.eventVenue && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Icons.pin size={12} style={{ color: 'var(--text-3)' }} />
                            {a.eventVenue}
                        </span>
                    )}
                </div>
            </div>

            <div style={{ textAlign: 'right' }}>
                <span style={{
                    fontSize: 11,
                    padding: '2px 8px',
                    background: 'var(--surface-subtle)',
                    borderRadius: 6,
                    color: 'var(--text-2)',
                    fontWeight: 600,
                }}>
                    {a.serviceType}
                </span>
                {amount && (
                    <div className="mp-num" style={{
                        marginTop: 4,
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--text-1)',
                    }}>
                        {amount}
                    </div>
                )}
            </div>
        </div>
    );
}

function ActivityRow({ application: a, nowMs, isLast, onView }) {
    const style = STATUS_BADGE[a.status] || STATUS_BADGE.PENDING;
    // Latest meaningful timestamp — reviewedAt wins if present.
    const stamp = a.reviewedAt || a.createdAt;
    const verb = a.reviewedAt
        ? (a.status === 'ACCEPTED' ? 'Accepted' : a.status === 'REJECTED' ? 'Rejected' : 'Reviewed')
        : 'Applied';
    return (
        <button
            onClick={onView}
            style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '12px 16px',
                background: 'white',
                border: 0,
                borderBottom: isLast ? 0 : '1px solid var(--border)',
                cursor: 'pointer',
                fontFamily: 'inherit',
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'var(--surface-subtle)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'white'}
        >
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 4,
                flexWrap: 'wrap',
            }}>
                <span style={{
                    padding: '2px 8px',
                    background: style.bg,
                    color: style.fg,
                    fontSize: 10,
                    fontWeight: 600,
                    borderRadius: 99,
                }}>
                    {style.label}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                    · {verb} {relativeTime(stamp, nowMs)}
                </span>
            </div>
            <div style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-1)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
            }}>
                {a.eventTitle}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                {a.serviceType}
            </div>
        </button>
    );
}

function QuickLink({ icon, label, onClick }) {
    return (
        <button
            onClick={onClick}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '8px 10px',
                background: 'transparent',
                border: 0,
                borderRadius: 8,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--text-1)',
                textAlign: 'left',
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'var(--surface-subtle)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
        >
            <span style={{ color: 'var(--text-3)' }}>{icon}</span>
            {label}
            <Icons.arrowR size={12} style={{ marginLeft: 'auto', color: 'var(--text-3)' }} />
        </button>
    );
}

/* ─── Subcomponents ──────────────────────────────── */

function Tile({ label, value, valueNode, sub, icon, accent }) {
    return (
        <div style={{
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 18,
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
            }}>
                <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>{label}</span>
                {icon && <span style={{ color: 'var(--text-3)' }}>{icon}</span>}
            </div>
            {valueNode ? (
                <div style={{ minHeight: 26 }}>{valueNode}</div>
            ) : (
                <div className="mp-num" style={{
                    fontSize: 26,
                    fontWeight: 700,
                    lineHeight: 1,
                    color: accent || 'var(--text-1)',
                }}>
                    {value}
                </div>
            )}
            {sub && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>{sub}</div>}
        </div>
    );
}

function EmptyCard({ icon, title, body, ctaLabel, onCta }) {
    return (
        <div style={{
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 40,
            textAlign: 'center',
        }}>
            <div style={{
                width: 52, height: 52, borderRadius: 99,
                margin: '0 auto 12px',
                background: 'var(--surface-subtle)',
                display: 'grid', placeItems: 'center',
                color: 'var(--text-3)',
            }}>
                {icon}
            </div>
            <div className="mp-h4" style={{ color: 'var(--text-1)', margin: 0 }}>{title}</div>
            <p className="body-sm" style={{ color: 'var(--text-2)', marginTop: 6 }}>{body}</p>
            {ctaLabel && (
                <Button
                    variant="primary"
                    size="md"
                    onClick={onCta}
                    style={{ marginTop: 14 }}
                    iconRight={<Icons.arrowR size={13} />}
                >
                    {ctaLabel}
                </Button>
            )}
        </div>
    );
}

function ListSkeleton({ rows = 3 }) {
    const row = (op = 1) => ({
        height: 76,
        background: 'white',
        border: '1px solid var(--border)',
        borderRadius: 12,
        marginBottom: 10,
        animation: 'mp-flash 1.6s ease-in-out infinite',
        opacity: op,
    });
    return (
        <div>
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} style={row(1 - i * 0.2)} />
            ))}
        </div>
    );
}
