import { useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import { useSelector } from 'react-redux';
import { useGetVendorProfileQuery, useGetEventVendorProfileQuery } from '@/features/organiser/vendorsApi';
import { useGetConversationsQuery } from '@/features/messages/messagesApi';
import { selectIsAuthenticated } from '@/features/auth/authSlice';
import TopNav from '@/components/ui/TopNav';
import Button from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icon';
import { useSendInquiryMutation } from '@/features/vendor/inquiriesApi';
import { useGetOrganizerEventsQuery } from '@/features/organiser/organizerApi';

const SECTION_TABS = [
    { key: 'overview',  label: 'Overview' },
    { key: 'schedule',  label: 'Schedule' },
    { key: 'completed', label: 'Completed work' },
    { key: 'reviews',   label: 'Reviews' },
];

const AVATAR_COLORS = [
    ['#E8F0FE', '#1967D2'],
    ['#FEF0E6', '#C85A00'],
    ['#E6F4EA', '#0F7B3E'],
    ['#F3E8FE', '#7B2FBE'],
    ['#FDE8EA', '#C62828'],
];

function avatarColor(name = '') {
    const idx = (name.charCodeAt(0) || 0) % AVATAR_COLORS.length;
    return AVATAR_COLORS[idx];
}

function initials(name) {
    if (!name) return '?';
    return name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase() || '?';
}

/* Map the backend's PublicVendorResponse (PRD §3.16) onto the legacy field
   names this page was originally written against. Keeps the render below
   unchanged while talking to the real API. */
const CATEGORY_LABEL = {
    CATERING:    'Catering',
    AV:          'AV & Sound',
    PHOTOGRAPHY: 'Photography',
    VENUE:       'Venue',
    DECORATION:  'Decoration',
    MUSIC:       'Music & DJs',
    SECURITY:    'Security',
    OTHER:       'Other',
};
function adaptVendor(v) {
    if (!v) return v;
    return {
        ...v,
        vendorName:         v.vendorName         ?? v.businessName,
        vendorVerified:     v.vendorVerified     ?? true, // marketplace returns VERIFIED only
        serviceType:        v.serviceType        ?? CATEGORY_LABEL[v.category] ?? v.category,
        profileDescription: v.profileDescription ?? v.bio,
        // averageRating / totalRatings come from a separate rating system not surfaced
        // by the backend marketplace yet — leave undefined so the page falls back to
        // its "No ratings yet" copy. The hero shows the trust score separately.
        completedEvents:    v.completedEvents    ?? v.completedContracts ?? 0,
    };
}

function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '—'
        : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtDateRange(start, end) {
    const s = fmtDate(start);
    if (!end) return s;
    const e = fmtDate(end);
    return s === e ? s : `${s} – ${e}`;
}

function ngn(amount) {
    if (amount == null) return null;
    const n = Number(amount);
    if (!Number.isFinite(n)) return null;
    return `₦${n.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
}

function StarRow({ rating, size = 14 }) {
    const filled = Math.round((rating || 0) * 2) / 2;
    return (
        <span style={{ display: 'inline-flex', gap: 1, color: '#F59E0B', fontSize: size }}>
            {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} style={{ opacity: filled >= n ? 1 : filled >= n - 0.5 ? 0.5 : 0.2 }}>★</span>
            ))}
        </span>
    );
}

/* ─── Page ────────────────────────────────────────── */

export default function VendorDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [tab, setTab] = useState('overview');

    const isAuthenticated = useSelector(selectIsAuthenticated);
    const { data: existingConversations = [] } = useGetConversationsQuery(undefined, { skip: !isAuthenticated });
    const [inquiryOpen, setInquiryOpen] = useState(false);

    const handleContactVendor = (existingConvId) => {
        navigate(`/messages?c=${existingConvId}`);
    };

    // When navigated from the organiser's event applications pane, location.state
    // carries the eventId so we can call the authenticated event-scoped endpoint
    // which serves non-VERIFIED applicant vendors. Otherwise fall back to the
    // public marketplace endpoint (VERIFIED only).
    const eventId = location.state?.eventId ?? null;
    const publicProfile  = useGetVendorProfileQuery(id, { skip: !!eventId });
    const eventProfile   = useGetEventVendorProfileQuery({ eventId, vendorId: id }, { skip: !eventId });
    const profile = eventId ? eventProfile : publicProfile;

    if (profile.isLoading) return <Shell><PageSkeleton /></Shell>;

    if (profile.isError || !profile.data) {
        return (
            <Shell>
                <div style={{
                    background: 'var(--surface-elevated)', border: '1px solid var(--border)',
                    borderRadius: 12, padding: 60, textAlign: 'center',
                }}>
                    <Icons.alert size={28} style={{ color: 'var(--error)' }} />
                    <p className="body-sm" style={{ marginTop: 8, color: 'var(--text-2)' }}>
                        {profile.error?.data?.message || 'Vendor profile not found.'}
                    </p>
                    <Button variant="secondary" size="sm" onClick={() => navigate('/vendors')} style={{ marginTop: 12 }}>
                        Back to marketplace
                    </Button>
                </div>
            </Shell>
        );
    }

    // Backend returns PublicVendorResponse (PRD §3.16). The page was originally written
    // against an older shape (vendorName / serviceType / profileDescription / averageRating
    // / completedEvents). adaptVendor() maps the new fields onto the legacy names so the
    // page renders unchanged. Marketplace only returns VERIFIED vendors, so the badge is on.
    const v = adaptVendor(profile.data);
    const upcoming  = v.upcomingSchedule || [];
    const completed = v.completedWork    || [];
    const ratedWork = completed.filter((c) => c.ratingScore != null);
    const [bg, fg] = avatarColor(v.vendorName);

    const vendorUserIdStr = String(v.userId || v.id || id);
    const existingConv = existingConversations.find((conv) => {
        const participants = conv.participants ?? conv.members ?? [];
        return participants.some(
            (p) =>
                String(p.userId ?? '') === vendorUserIdStr ||
                String(p.id ?? '')     === vendorUserIdStr
        );
    });

    return (
        <>
        <Shell>
            <button
                onClick={() => navigate(-1)}
                style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: 'none', border: 0, padding: '0 0 16px',
                    cursor: 'pointer', color: 'var(--text-2)',
                    fontSize: 13, fontFamily: 'inherit',
                }}
            >
                <Icons.arrowL size={14} />
                Back
            </button>

            {/* Profile header */}
            <div style={{
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: '28px 28px 24px',
                marginBottom: 20,
            }}>
                <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div style={{
                        width: 80, height: 80, borderRadius: 16, flexShrink: 0,
                        background: bg, color: fg,
                        display: 'grid', placeItems: 'center',
                        fontSize: 26, fontWeight: 700,
                    }}>
                        {initials(v.vendorName)}
                    </div>

                    <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-1)' }}>
                                {v.vendorName}
                            </h1>
                            {v.vendorVerified && (
                                <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                    background: '#EAF1FE', color: 'var(--mp-blue)',
                                    fontSize: 12, fontWeight: 600,
                                    padding: '3px 10px', borderRadius: 99,
                                }}>
                                    <Icons.shield size={11} />
                                    Verified vendor
                                </span>
                            )}
                            {v.serviceType && (
                                <span style={{
                                    background: 'var(--surface-subtle)',
                                    color: 'var(--text-2)',
                                    fontSize: 12, fontWeight: 600,
                                    padding: '3px 10px', borderRadius: 99,
                                }}>
                                    {v.serviceType}
                                </span>
                            )}
                        </div>

                        {v.profileDescription && (
                            <p style={{
                                margin: '4px 0 0', fontSize: 14, color: 'var(--text-2)',
                                lineHeight: 1.5, whiteSpace: 'pre-wrap',
                            }}>
                                {v.profileDescription}
                            </p>
                        )}

                        {v.email && (
                            <div style={{ marginTop: 10, fontSize: 13 }}>
                                <a
                                    href={`mailto:${v.email}`}
                                    style={{
                                        color: 'var(--mp-blue)', textDecoration: 'none',
                                        display: 'inline-flex', alignItems: 'center', gap: 5,
                                    }}
                                >
                                    <Icons.mail size={13} />
                                    {v.email}
                                </a>
                            </div>
                        )}
                    </div>

                    <div style={{ flexShrink: 0, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {!existingConv && (
                            <Button
                                variant="secondary"
                                size="md"
                                onClick={() => {
                                    if (!isAuthenticated) {
                                        navigate('/login', { state: { from: `/vendors/${id}` } });
                                        return;
                                    }
                                    setInquiryOpen(true);
                                }}
                                icon={<Icons.send size={15} />}
                            >
                                Send inquiry
                            </Button>
                        )}
                        {existingConv && (
                            <Button
                                variant="primary"
                                size="md"
                                onClick={() => handleContactVendor(existingConv.id)}
                                icon={<Icons.message size={15} />}
                            >
                                Message vendor
                            </Button>
                        )}
                    </div>
                </div>

                {/* Stats row */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: 16,
                    marginTop: 24,
                    paddingTop: 20,
                    borderTop: '1px solid var(--border)',
                }}>
                    <StatCell label="Rating">
                        {v.averageRating != null ? (
                            <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <StarRow rating={v.averageRating} size={16} />
                                    <span className="mp-num" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-1)' }}>
                                        {Number(v.averageRating).toFixed(1)}
                                    </span>
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>
                                    {v.totalRatings} rating{v.totalRatings !== 1 ? 's' : ''}
                                </div>
                            </>
                        ) : (
                            <span style={{ fontSize: 13, color: 'var(--text-3)' }}>No ratings yet</span>
                        )}
                    </StatCell>
                    <StatCell label="Completed events">
                        <span className="mp-num" style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-1)' }}>
                            {completed.length}
                        </span>
                    </StatCell>
                    <StatCell label="Upcoming">
                        <span className="mp-num" style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-1)' }}>
                            {upcoming.length}
                        </span>
                    </StatCell>
                    <StatCell label="Status">
                        <span style={{
                            fontSize: 14, fontWeight: 600,
                            color: v.vendorVerified ? 'var(--success)' : 'var(--text-3)',
                        }}>
                            {v.vendorVerified ? 'Verified' : 'Unverified'}
                        </span>
                    </StatCell>
                </div>
            </div>

            {/* Section tabs */}
            <div style={{
                display: 'flex', gap: 0,
                borderBottom: '2px solid var(--border)',
                marginBottom: 20,
            }}>
                {SECTION_TABS.map(({ key, label }) => {
                    const active = tab === key;
                    return (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            style={{
                                padding: '10px 20px', border: 0,
                                borderBottom: active ? '2px solid var(--mp-blue)' : '2px solid transparent',
                                background: 'none', cursor: 'pointer',
                                fontFamily: 'inherit', fontSize: 14,
                                fontWeight: active ? 600 : 500,
                                color: active ? 'var(--mp-blue)' : 'var(--text-2)',
                                marginBottom: -2,
                            }}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>

            {tab === 'overview'  && <OverviewTab vendor={v} />}
            {tab === 'schedule'  && <ScheduleTab items={upcoming} />}
            {tab === 'completed' && <CompletedTab items={completed} />}
            {tab === 'reviews'   && <ReviewsTab items={ratedWork} />}
        </Shell>
        {inquiryOpen && (
            <InquiryModal
                vendorId={v.userId || v.id || id}
                onDismiss={() => setInquiryOpen(false)}
            />
        )}
        </>
    );
}

/* ─── Overview tab ────────────────────────────────── */
function OverviewTab({ vendor: v }) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 280px', gap: 20, alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {v.profileDescription ? (
                    <Section title="About" padBody>
                        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                            {v.profileDescription}
                        </p>
                    </Section>
                ) : (
                    <div style={{
                        background: 'var(--surface-elevated)', border: '1px solid var(--border)',
                        borderRadius: 12, padding: 40, textAlign: 'center',
                        color: 'var(--text-3)', fontSize: 14,
                    }}>
                        This vendor hasn&apos;t added a description yet.
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{
                    background: 'var(--surface-elevated)', border: '1px solid var(--border)',
                    borderRadius: 12, padding: 18,
                }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 12 }}>
                        AT A GLANCE
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <MetaRow icon={<Icons.check size={14} />} label="Completed events" value={v.completedWork?.length ?? 0} />
                        <MetaRow icon={<Icons.calendar size={14} />} label="Upcoming events" value={v.upcomingSchedule?.length ?? 0} />
                        {v.averageRating != null && (
                            <MetaRow
                                icon={<span style={{ fontSize: 14, color: '#F59E0B' }}>★</span>}
                                label="Avg. rating"
                                value={`${Number(v.averageRating).toFixed(1)} / 5`}
                            />
                        )}
                        <MetaRow
                            icon={<Icons.users size={14} />}
                            label="Total ratings"
                            value={v.totalRatings ?? 0}
                        />
                        {v.serviceType && (
                            <MetaRow icon={<Icons.spark size={14} />} label="Service" value={v.serviceType} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─── Schedule tab ────────────────────────────────── */
function ScheduleTab({ items }) {
    if (items.length === 0) {
        return <EmptyOrError message="No upcoming engagements." sub="Accepted vendor applications on future events will appear here." />;
    }
    return (
        <Section title={`Upcoming (${items.length})`}>
            <div>
                {items.map((e, i) => (
                    <ScheduleRow key={e.applicationId} item={e} isLast={i === items.length - 1} variant="upcoming" />
                ))}
            </div>
        </Section>
    );
}

/* ─── Completed work tab ──────────────────────────── */
function CompletedTab({ items }) {
    if (items.length === 0) {
        return <EmptyOrError message="No completed work yet." sub="Engagements move here once the event has ended." />;
    }
    return (
        <Section title={`Completed events (${items.length})`}>
            <div>
                {items.map((e, i) => (
                    <ScheduleRow key={e.applicationId} item={e} isLast={i === items.length - 1} variant="completed" />
                ))}
            </div>
        </Section>
    );
}

/* ─── Reviews tab ─────────────────────────────────── */
function ReviewsTab({ items }) {
    const avg = useMemo(() => {
        if (items.length === 0) return 0;
        return items.reduce((s, r) => s + (r.ratingScore || 0), 0) / items.length;
    }, [items]);

    if (items.length === 0) {
        return <EmptyOrError message="No reviews yet." sub="Organisers can rate this vendor 1–5 stars after the event ends." />;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
                background: 'var(--surface-elevated)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '18px 24px',
                display: 'flex', gap: 28, alignItems: 'center', flexWrap: 'wrap',
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="mp-num" style={{ fontSize: 40, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1 }}>
                        {avg.toFixed(1)}
                    </div>
                    <StarRow rating={avg} size={18} />
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
                        {items.length} rating{items.length !== 1 ? 's' : ''}
                    </div>
                </div>
                <RatingBreakdown reviews={items} />
            </div>

            <Section title="All reviews">
                <div>
                    {items.map((r, i) => (
                        <ReviewRow key={r.applicationId} item={r} isLast={i === items.length - 1} />
                    ))}
                </div>
            </Section>
        </div>
    );
}

/* ─── Row components ──────────────────────────────── */
function ScheduleRow({ item, isLast, variant }) {
    const upcoming = variant === 'upcoming';
    const amount = ngn(item.agreedAmount);
    return (
        <div style={{
            padding: '16px 20px',
            borderBottom: isLast ? 0 : '1px solid var(--border)',
        }}>
            <div style={{
                display: 'grid', gridTemplateColumns: '1fr auto',
                gap: 16, alignItems: 'flex-start',
            }}>
                <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-1)', marginBottom: 4 }}>
                        {item.eventTitle || 'Untitled event'}
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 13, color: 'var(--text-3)', flexWrap: 'wrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Icons.calendar size={12} />
                            {fmtDateRange(item.eventStartTime, item.eventEndTime)}
                        </span>
                        {item.eventVenue && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <Icons.pin size={12} />
                                {item.eventVenue}
                            </span>
                        )}
                        {item.serviceType && (
                            <span style={{
                                padding: '1px 8px', borderRadius: 6,
                                background: 'var(--surface-subtle)',
                                color: 'var(--text-2)', fontWeight: 500, fontSize: 11,
                            }}>
                                {item.serviceType}
                            </span>
                        )}
                        {amount && (
                            <span className="mp-num" style={{ color: 'var(--text-2)', fontWeight: 600 }}>
                                {amount}
                            </span>
                        )}
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {item.ratingScore != null && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <StarRow rating={item.ratingScore} />
                            <span className="mp-num" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
                                {item.ratingScore}
                            </span>
                        </span>
                    )}
                    <span style={{
                        padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                        background: upcoming ? '#EAF1FE' : 'var(--surface-subtle)',
                        color: upcoming ? 'var(--mp-blue)' : 'var(--text-3)',
                    }}>
                        {upcoming ? 'Upcoming' : 'Completed'}
                    </span>
                </div>
            </div>
            {item.ratingComment && (
                <blockquote style={{
                    margin: '10px 0 0', padding: '10px 14px',
                    borderLeft: '3px solid var(--border)',
                    color: 'var(--text-2)', fontSize: 13, lineHeight: 1.6,
                    fontStyle: 'italic',
                }}>
                    &ldquo;{item.ratingComment}&rdquo;
                </blockquote>
            )}
        </div>
    );
}

function ReviewRow({ item, isLast }) {
    return (
        <div style={{
            padding: '18px 20px',
            borderBottom: isLast ? 0 : '1px solid var(--border)',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 14 }}>
                        {item.eventTitle || 'Event'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                        {fmtDate(item.eventEndTime || item.eventStartTime)}
                        {item.serviceType ? ` · ${item.serviceType}` : ''}
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                    <StarRow rating={item.ratingScore} />
                    <span className="mp-num" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
                        {item.ratingScore}
                    </span>
                </div>
            </div>
            {item.ratingComment && (
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
                    &ldquo;{item.ratingComment}&rdquo;
                </p>
            )}
        </div>
    );
}

/* ─── Utility components ──────────────────────────── */
function Section({ title, children, padBody = false }) {
    return (
        <div style={{
            background: 'var(--surface-elevated)', border: '1px solid var(--border)',
            borderRadius: 12, overflow: 'hidden',
        }}>
            <div style={{
                padding: '14px 20px', borderBottom: '1px solid var(--border)',
                fontWeight: 600, fontSize: 14, color: 'var(--text-1)',
            }}>
                {title}
            </div>
            <div style={padBody ? { padding: '16px 20px' } : {}}>
                {children}
            </div>
        </div>
    );
}

function StatCell({ label, children }) {
    return (
        <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 6 }}>
                {label.toUpperCase()}
            </div>
            {children}
        </div>
    );
}

function MetaRow({ icon, label, value }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-2)' }}>
                <span style={{ color: 'var(--text-3)' }}>{icon}</span>
                {label}
            </span>
            <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{value}</span>
        </div>
    );
}

function RatingBreakdown({ reviews }) {
    const counts = [5, 4, 3, 2, 1].map((n) => ({
        star: n,
        count: reviews.filter((r) => Math.round(r.ratingScore) === n).length,
    }));
    const max = Math.max(...counts.map((c) => c.count), 1);

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {counts.map(({ star, count }) => (
                <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-3)', width: 12, textAlign: 'right' }}>
                        {star}
                    </span>
                    <span style={{ color: '#F59E0B', fontSize: 12 }}>★</span>
                    <div style={{
                        flex: 1, height: 6, background: 'var(--border)',
                        borderRadius: 99, overflow: 'hidden',
                    }}>
                        <div style={{
                            height: '100%', borderRadius: 99,
                            background: '#F59E0B',
                            width: `${(count / max) * 100}%`,
                            transition: 'width 0.3s',
                        }} />
                    </div>
                    <span className="mp-num" style={{ fontSize: 12, color: 'var(--text-3)', width: 20 }}>
                        {count}
                    </span>
                </div>
            ))}
        </div>
    );
}

function EmptyOrError({ message, sub }) {
    return (
        <div style={{
            background: 'var(--surface-elevated)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 60, textAlign: 'center',
        }}>
            <div style={{
                width: 52, height: 52, borderRadius: 99,
                margin: '0 auto 14px', background: 'var(--surface-subtle)',
                display: 'grid', placeItems: 'center', color: 'var(--text-3)',
            }}>
                <Icons.calendar size={22} />
            </div>
            <div className="mp-h4" style={{ color: 'var(--text-1)', margin: 0 }}>{message}</div>
            {sub && <p className="body-sm" style={{ color: 'var(--text-2)', marginTop: 6 }}>{sub}</p>}
        </div>
    );
}

function PageSkeleton() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
                height: 200, background: 'var(--surface-elevated)', border: '1px solid var(--border)',
                borderRadius: 16, animation: 'mp-flash 1.6s ease-in-out infinite',
            }} />
            <div style={{
                height: 400, background: 'var(--surface-elevated)', border: '1px solid var(--border)',
                borderRadius: 12, animation: 'mp-flash 1.6s ease-in-out infinite', opacity: 0.7,
            }} />
        </div>
    );
}

/* ─── Inquiry modal ───────────────────────────────── */

function InquiryModal({ vendorId, onDismiss }) {
    const navigate = useNavigate();
    const [sendInquiry, { isLoading }] = useSendInquiryMutation();
    const { data: events = [], isLoading: eventsLoading } = useGetOrganizerEventsQuery();

    const [eventId,     setEventId]     = useState('');
    const [message,     setMessage]     = useState('');
    const [serviceType, setServiceType] = useState('');
    const [error,       setError]       = useState('');

    async function handleSubmit() {
        setError('');
        try {
            // Backend only has vendorProfileId + openingMessage.
            // Combine the optional serviceType into the opening message so it
            // surfaces in the chat thread rather than being silently dropped.
            const parts = [];
            if (serviceType.trim()) parts.push(`Service type: ${serviceType.trim()}`);
            if (message.trim())     parts.push(message.trim());
            const openingMessage = parts.join('\n\n') || undefined;

            const result = await sendInquiry({
                eventId,
                vendorId,
                openingMessage,
            }).unwrap();
            const convId = result?.conversation?.id ?? result?.conversationId;
            if (convId) {
                navigate(`/messages?c=${convId}`);
            } else {
                navigate('/messages');
            }
        } catch (err) {
            setError(err?.data?.message || 'Could not send inquiry.');
        }
    }

    const canSubmit = !eventsLoading && eventId && message.trim().length > 0;

    return (
        <div
            role="dialog"
            aria-label="Send inquiry"
            onClick={onDismiss}
            style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: 'rgba(2,16,45,0.55)',
                display: 'grid', placeItems: 'center', padding: 20,
            }}
        >
            <div onClick={(e) => e.stopPropagation()} style={{
                width: '100%', maxWidth: 480, background: 'var(--surface-elevated)',
                borderRadius: 16, boxShadow: 'var(--shadow-modal)', padding: 28,
            }}>
                <h2 className="mp-h3" style={{ margin: 0, color: 'var(--text-1)' }}>
                    Send inquiry
                </h2>
                <p className="body-sm" style={{ margin: '6px 0 20px', color: 'var(--text-2)' }}>
                    Let this vendor know about your event and what you need.
                </p>

                {/* Event selector */}
                <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 6 }}>
                        For which event?
                    </div>
                    {eventsLoading ? (
                        <div style={{
                            height: 40, background: 'var(--surface-subtle)',
                            borderRadius: 8, animation: 'mp-flash 1.6s ease-in-out infinite',
                        }} />
                    ) : events.length === 0 ? (
                        <div style={{
                            padding: '10px 12px', background: 'var(--surface-subtle)',
                            borderRadius: 8, fontSize: 13, color: 'var(--text-3)',
                        }}>
                            You have no events.{' '}
                            <button
                                onClick={() => navigate('/events/new')}
                                style={{
                                    color: 'var(--mp-blue)', background: 'none', border: 0,
                                    cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, padding: 0,
                                }}
                            >
                                Create one first.
                            </button>
                        </div>
                    ) : (
                        <select
                            value={eventId}
                            onChange={(e) => setEventId(e.target.value)}
                            style={{
                                width: '100%', boxSizing: 'border-box',
                                padding: '9px 12px', borderRadius: 8,
                                border: '1px solid var(--border)',
                                fontFamily: 'inherit', fontSize: 14,
                                color: eventId ? 'var(--text-1)' : 'var(--text-3)',
                                background: 'var(--surface-elevated)', cursor: 'pointer',
                            }}
                        >
                            <option value="">Select an event…</option>
                            {events.map((ev) => (
                                <option key={ev.id} value={ev.id}>{ev.title}</option>
                            ))}
                        </select>
                    )}
                </div>

                {/* Service type */}
                <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 6 }}>
                        Service type{' '}
                        <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span>
                    </div>
                    <input
                        value={serviceType}
                        onChange={(e) => setServiceType(e.target.value)}
                        placeholder="e.g. Photography, Catering, AV"
                        style={{
                            width: '100%', boxSizing: 'border-box',
                            padding: '9px 12px', borderRadius: 8,
                            border: '1px solid var(--border)',
                            fontFamily: 'inherit', fontSize: 14, color: 'var(--text-1)',
                        }}
                        onFocus={(e) => { e.target.style.borderColor = 'var(--mp-blue)'; }}
                        onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }}
                    />
                </div>

                {/* Message */}
                <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 6 }}>
                        Message
                    </div>
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Describe what you need, when the event is, and any specific requirements…"
                        rows={4}
                        style={{
                            width: '100%', boxSizing: 'border-box',
                            padding: '10px 12px', borderRadius: 8,
                            border: '1px solid var(--border)',
                            fontFamily: 'inherit', fontSize: 14, color: 'var(--text-1)',
                            resize: 'vertical', outline: 'none',
                        }}
                        onFocus={(e) => { e.target.style.borderColor = 'var(--mp-blue)'; }}
                        onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }}
                    />
                </div>

                {error && (
                    <div role="alert" style={{
                        marginBottom: 16, padding: '10px 12px',
                        background: 'var(--error-bg, #FBE9E9)', color: 'var(--error)',
                        borderRadius: 8, fontSize: 13,
                    }}>
                        {error}
                    </div>
                )}

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <Button variant="ghost" size="md" onClick={onDismiss} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary" size="md"
                        onClick={handleSubmit}
                        disabled={!canSubmit || isLoading}
                        icon={<Icons.send size={15} />}
                    >
                        {isLoading ? 'Sending…' : 'Send inquiry'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

function Shell({ children }) {
    // Anonymous viewers get the marketing top nav; authenticated viewers see
    // AppShell's sidebar + TopBar wrapping the route.
    const isAuthenticated = useSelector(selectIsAuthenticated);
    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            {!isAuthenticated && <TopNav />}
            <div className="mp-page-wrap" style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 80px' }}>
                {children}
            </div>
        </div>
    );
}
