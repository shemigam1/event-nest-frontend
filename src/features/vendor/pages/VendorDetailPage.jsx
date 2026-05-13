import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
    useGetVendorByIdQuery,
    useGetVendorScheduleQuery,
    useGetVendorCompletedWorkQuery,
} from '@/features/organiser/vendorsApi';
import TopNav from '@/components/ui/TopNav';
import Button from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icon';

const SECTION_TABS = [
    { key: 'overview',   label: 'Overview' },
    { key: 'schedule',   label: 'Schedule' },
    { key: 'completed',  label: 'Completed work' },
    { key: 'reviews',    label: 'Reviews' },
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

function isUpcoming(dateIso) {
    if (!dateIso) return false;
    return new Date(dateIso) >= new Date();
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

export default function VendorDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [tab, setTab] = useState('overview');

    const vendor   = useGetVendorByIdQuery(id);
    const schedule = useGetVendorScheduleQuery(id, { skip: tab !== 'schedule' });
    const completed = useGetVendorCompletedWorkQuery(id, { skip: tab !== 'completed' && tab !== 'reviews' });

    if (vendor.isLoading) return <Shell><PageSkeleton /></Shell>;

    if (vendor.isError || !vendor.data) {
        return (
            <Shell>
                <div style={{
                    background: 'white', border: '1px solid var(--border)',
                    borderRadius: 12, padding: 60, textAlign: 'center',
                }}>
                    <Icons.alert size={28} style={{ color: 'var(--error)' }} />
                    <p className="body-sm" style={{ marginTop: 8, color: 'var(--text-2)' }}>
                        {vendor.error?.data?.message || 'Vendor profile not found.'}
                    </p>
                    <Button variant="secondary" size="sm" onClick={() => navigate('/vendors')} style={{ marginTop: 12 }}>
                        Back to marketplace
                    </Button>
                </div>
            </Shell>
        );
    }

    const v = vendor.data;
    const [bg, fg] = avatarColor(v.name);

    return (
        <Shell>
            {/* Back link */}
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

            {/* Profile header card */}
            <div style={{
                background: 'white',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: '28px 28px 24px',
                marginBottom: 20,
            }}>
                <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    {/* Avatar */}
                    <div style={{
                        width: 80, height: 80, borderRadius: 16, flexShrink: 0,
                        background: bg, color: fg,
                        display: 'grid', placeItems: 'center',
                        fontSize: 26, fontWeight: 700,
                    }}>
                        {initials(v.name)}
                    </div>

                    {/* Name + meta */}
                    <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-1)' }}>
                                {v.name}
                            </h1>
                            {v.verified && (
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
                            {v.category && (
                                <span style={{
                                    background: 'var(--surface-subtle)',
                                    color: 'var(--text-2)',
                                    fontSize: 12, fontWeight: 600,
                                    padding: '3px 10px', borderRadius: 99,
                                }}>
                                    {v.category}
                                </span>
                            )}
                        </div>

                        {v.lead && (
                            <p style={{ margin: '0 0 8px', fontSize: 15, color: 'var(--text-2)' }}>
                                {v.lead}
                            </p>
                        )}

                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: 'var(--text-3)' }}>
                            {v.city && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                    <Icons.pin size={13} />
                                    {v.city}
                                </span>
                            )}
                            {v.email && (
                                <a
                                    href={`mailto:${v.email}`}
                                    style={{ color: 'var(--mp-blue)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                                >
                                    <Icons.mail size={13} />
                                    {v.email}
                                </a>
                            )}
                            {v.responseHrs != null && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                    <Icons.clock size={13} />
                                    Replies within ~{v.responseHrs}h
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Contact CTA */}
                    <div style={{ flexShrink: 0 }}>
                        {v.email && (
                            <Button
                                variant="primary"
                                size="md"
                                onClick={() => window.open(`mailto:${v.email}`, '_blank')}
                                iconRight={<Icons.arrowR size={14} />}
                            >
                                Contact vendor
                            </Button>
                        )}
                    </div>
                </div>

                {/* Stats row */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                    gap: 16,
                    marginTop: 24,
                    paddingTop: 20,
                    borderTop: '1px solid var(--border)',
                }}>
                    {v.rating != null && (
                        <StatCell label="Rating">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <StarRow rating={v.rating} size={16} />
                                <span className="mp-num" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-1)' }}>
                                    {v.rating.toFixed(1)}
                                </span>
                            </div>
                            {v.reviews != null && (
                                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>
                                    {v.reviews} review{v.reviews !== 1 ? 's' : ''}
                                </div>
                            )}
                        </StatCell>
                    )}
                    {v.eventsCompleted != null && (
                        <StatCell label="Events completed">
                            <span className="mp-num" style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-1)' }}>
                                {v.eventsCompleted}
                            </span>
                        </StatCell>
                    )}
                    {v.priceLabel && (
                        <StatCell label="Pricing">
                            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>
                                {v.priceLabel}
                            </span>
                        </StatCell>
                    )}
                    {v.responseHrs != null && (
                        <StatCell label="Avg. response">
                            <span className="mp-num" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-1)' }}>
                                {v.responseHrs}h
                            </span>
                        </StatCell>
                    )}
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

            {/* Tab content */}
            {tab === 'overview'  && <OverviewTab vendor={v} />}
            {tab === 'schedule'  && <ScheduleTab vendorId={id} query={schedule} />}
            {tab === 'completed' && <CompletedTab vendorId={id} query={completed} />}
            {tab === 'reviews'   && <ReviewsTab query={completed} />}
        </Shell>
    );
}

/* ─── Overview tab ────────────────────────────────── */
function OverviewTab({ vendor: v }) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 280px', gap: 20, alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {v.bio && (
                    <Section title="About">
                        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                            {v.bio}
                        </p>
                    </Section>
                )}

                {v.skills?.length > 0 && (
                    <Section title="Services & skills">
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {v.skills.map((s) => (
                                <span key={s} style={{
                                    padding: '6px 14px',
                                    background: 'var(--surface-subtle)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 99,
                                    fontSize: 13, fontWeight: 500,
                                    color: 'var(--text-1)',
                                }}>
                                    {s}
                                </span>
                            ))}
                        </div>
                    </Section>
                )}

                {!v.bio && !v.skills?.length && (
                    <div style={{
                        background: 'white', border: '1px solid var(--border)',
                        borderRadius: 12, padding: 40, textAlign: 'center',
                        color: 'var(--text-3)', fontSize: 14,
                    }}>
                        No additional details provided yet.
                    </div>
                )}
            </div>

            {/* Sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {v.priceLabel && (
                    <div style={{
                        background: 'white', border: '1px solid var(--border)',
                        borderRadius: 12, padding: 18,
                    }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 6 }}>
                            PRICING
                        </div>
                        <div style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 15 }}>
                            {v.priceLabel}
                        </div>
                        <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 }}>
                            Contact the vendor for a custom quote based on your event size and requirements.
                        </p>
                    </div>
                )}

                <div style={{
                    background: 'white', border: '1px solid var(--border)',
                    borderRadius: 12, padding: 18,
                }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 12 }}>
                        AT A GLANCE
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {v.eventsCompleted != null && (
                            <MetaRow icon={<Icons.check size={14} />} label="Events completed" value={v.eventsCompleted} />
                        )}
                        {v.rating != null && (
                            <MetaRow icon={<span style={{ fontSize: 14, color: '#F59E0B' }}>★</span>} label="Avg. rating" value={`${v.rating.toFixed(1)} / 5`} />
                        )}
                        {v.reviews != null && (
                            <MetaRow icon={<Icons.users size={14} />} label="Reviews" value={v.reviews} />
                        )}
                        {v.responseHrs != null && (
                            <MetaRow icon={<Icons.clock size={14} />} label="Response time" value={`~${v.responseHrs}h`} />
                        )}
                        {v.city && (
                            <MetaRow icon={<Icons.pin size={14} />} label="Location" value={v.city} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─── Schedule tab ────────────────────────────────── */
function ScheduleTab({ query }) {
    if (query.isLoading) return <ListSkeleton />;
    if (query.isError) return (
        <EmptyOrError message="Could not load schedule." onRetry={query.refetch} isError />
    );

    const items = query.data || [];
    const upcoming = items.filter((e) => isUpcoming(e.startDate));
    const past     = items.filter((e) => !isUpcoming(e.startDate));

    if (items.length === 0) {
        return <EmptyOrError message="No scheduled engagements on record." sub="This vendor has no upcoming or historical bookings in the system yet." />;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {upcoming.length > 0 && (
                <Section title={`Upcoming (${upcoming.length})`}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                        {upcoming.map((e, i) => (
                            <EngagementRow
                                key={e.id}
                                engagement={e}
                                isLast={i === upcoming.length - 1}
                                variant="upcoming"
                            />
                        ))}
                    </div>
                </Section>
            )}

            {past.length > 0 && (
                <Section title={`Past engagements (${past.length})`}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                        {past.map((e, i) => (
                            <EngagementRow
                                key={e.id}
                                engagement={e}
                                isLast={i === past.length - 1}
                                variant="past"
                            />
                        ))}
                    </div>
                </Section>
            )}
        </div>
    );
}

/* ─── Completed work tab ──────────────────────────── */
function CompletedTab({ query }) {
    if (query.isLoading) return <ListSkeleton />;
    if (query.isError) return (
        <EmptyOrError message="Could not load completed work." onRetry={query.refetch} isError />
    );

    const items = query.data || [];
    if (items.length === 0) {
        return <EmptyOrError message="No completed work recorded yet." sub="Completed engagements and outcomes will appear here." />;
    }

    return (
        <Section title={`Completed events (${items.length})`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {items.map((e, i) => (
                    <CompletedRow key={e.id} engagement={e} isLast={i === items.length - 1} />
                ))}
            </div>
        </Section>
    );
}

/* ─── Reviews tab ─────────────────────────────────── */
function ReviewsTab({ query }) {
    if (query.isLoading) return <ListSkeleton />;
    if (query.isError) return (
        <EmptyOrError message="Could not load reviews." onRetry={query.refetch} isError />
    );

    const items = (query.data || []).filter((e) => e.review);
    if (items.length === 0) {
        return <EmptyOrError message="No reviews yet." sub="Organisers who've worked with this vendor can leave a review after the event." />;
    }

    const avg = items.reduce((s, e) => s + (e.review.rating || 0), 0) / items.length;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Summary bar */}
            <div style={{
                background: 'white', border: '1px solid var(--border)',
                borderRadius: 12, padding: '18px 24px',
                display: 'flex', gap: 28, alignItems: 'center', flexWrap: 'wrap',
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="mp-num" style={{ fontSize: 40, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1 }}>
                        {avg.toFixed(1)}
                    </div>
                    <StarRow rating={avg} size={18} />
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
                        {items.length} review{items.length !== 1 ? 's' : ''}
                    </div>
                </div>
                <RatingBreakdown reviews={items.map((e) => e.review)} />
            </div>

            {/* Individual reviews */}
            <Section title="All reviews">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {items.map((e, i) => (
                        <ReviewRow key={e.id} engagement={e} isLast={i === items.length - 1} />
                    ))}
                </div>
            </Section>
        </div>
    );
}

/* ─── Row components ──────────────────────────────── */
function EngagementRow({ engagement: e, isLast, variant }) {
    const upcoming = variant === 'upcoming';
    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: 16,
            padding: '16px 20px',
            borderBottom: isLast ? 0 : '1px solid var(--border)',
            alignItems: 'flex-start',
        }}>
            <div>
                <div style={{ fontWeight: 600, color: 'var(--text-1)', marginBottom: 4 }}>
                    {e.eventTitle || 'Untitled event'}
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: 13, color: 'var(--text-3)', flexWrap: 'wrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Icons.calendar size={12} />
                        {fmtDateRange(e.startDate, e.endDate)}
                    </span>
                    {e.venue && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Icons.pin size={12} />
                            {e.venue}
                        </span>
                    )}
                    {e.serviceType && (
                        <span style={{
                            padding: '1px 8px', borderRadius: 6,
                            background: 'var(--surface-subtle)',
                            color: 'var(--text-2)', fontWeight: 500, fontSize: 11,
                        }}>
                            {e.serviceType}
                        </span>
                    )}
                </div>
            </div>
            <span style={{
                padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                background: upcoming ? '#EAF1FE' : 'var(--surface-subtle)',
                color: upcoming ? 'var(--mp-blue)' : 'var(--text-3)',
            }}>
                {upcoming ? 'Upcoming' : 'Past'}
            </span>
        </div>
    );
}

function CompletedRow({ engagement: e, isLast }) {
    const hasMeta = e.attendees != null || e.outcome;
    return (
        <div style={{
            padding: '16px 20px',
            borderBottom: isLast ? 0 : '1px solid var(--border)',
        }}>
            <div style={{
                display: 'grid', gridTemplateColumns: '1fr auto',
                gap: 16, alignItems: 'flex-start', marginBottom: hasMeta ? 10 : 0,
            }}>
                <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-1)', marginBottom: 4 }}>
                        {e.eventTitle || 'Untitled event'}
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 13, color: 'var(--text-3)', flexWrap: 'wrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Icons.calendar size={12} />
                            {fmtDateRange(e.startDate, e.endDate)}
                        </span>
                        {e.venue && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <Icons.pin size={12} />
                                {e.venue}
                            </span>
                        )}
                        {e.serviceType && (
                            <span style={{
                                padding: '1px 8px', borderRadius: 6,
                                background: 'var(--surface-subtle)',
                                color: 'var(--text-2)', fontWeight: 500, fontSize: 11,
                            }}>
                                {e.serviceType}
                            </span>
                        )}
                    </div>
                </div>
                {e.review?.rating != null && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                        <StarRow rating={e.review.rating} />
                        <span className="mp-num" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
                            {e.review.rating.toFixed(1)}
                        </span>
                    </div>
                )}
            </div>

            {/* Outcome + attendees */}
            {hasMeta && (
                <div style={{
                    display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-3)', flexWrap: 'wrap',
                    paddingLeft: 0,
                }}>
                    {e.attendees != null && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Icons.users size={12} />
                            {e.attendees.toLocaleString()} attendees
                        </span>
                    )}
                    {e.outcome && (
                        <span style={{ color: 'var(--text-2)', fontStyle: 'italic' }}>{e.outcome}</span>
                    )}
                </div>
            )}

            {/* Review comment */}
            {e.review?.comment && (
                <blockquote style={{
                    margin: '10px 0 0', padding: '10px 14px',
                    borderLeft: '3px solid var(--border)',
                    color: 'var(--text-2)', fontSize: 13, lineHeight: 1.6,
                    fontStyle: 'italic',
                }}>
                    &ldquo;{e.review.comment}&rdquo;
                    {e.review.organiserName && (
                        <div style={{ marginTop: 4, fontStyle: 'normal', fontSize: 12, color: 'var(--text-3)' }}>
                            — {e.review.organiserName}
                        </div>
                    )}
                </blockquote>
            )}
        </div>
    );
}

function ReviewRow({ engagement: e, isLast }) {
    const r = e.review;
    return (
        <div style={{
            padding: '18px 20px',
            borderBottom: isLast ? 0 : '1px solid var(--border)',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 14 }}>
                        {r.organiserName || 'Anonymous organiser'}
                    </div>
                    {e.eventTitle && (
                        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                            for {e.eventTitle} · {fmtDate(e.endDate || e.startDate)}
                        </div>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                    <StarRow rating={r.rating} />
                    <span className="mp-num" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
                        {r.rating?.toFixed(1)}
                    </span>
                </div>
            </div>
            {r.comment && (
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
                    &ldquo;{r.comment}&rdquo;
                </p>
            )}
        </div>
    );
}

/* ─── Utility components ──────────────────────────── */
function Section({ title, children }) {
    return (
        <div style={{
            background: 'white', border: '1px solid var(--border)',
            borderRadius: 12, overflow: 'hidden',
        }}>
            <div style={{
                padding: '14px 20px', borderBottom: '1px solid var(--border)',
                fontWeight: 600, fontSize: 14, color: 'var(--text-1)',
            }}>
                {title}
            </div>
            <div style={{ padding: 20 }}>
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
        count: reviews.filter((r) => Math.round(r.rating) === n).length,
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

function EmptyOrError({ message, sub, onRetry, isError }) {
    return (
        <div style={{
            background: 'white', border: '1px solid var(--border)',
            borderRadius: 12, padding: 60, textAlign: 'center',
        }}>
            <div style={{
                width: 52, height: 52, borderRadius: 99,
                margin: '0 auto 14px', background: 'var(--surface-subtle)',
                display: 'grid', placeItems: 'center', color: 'var(--text-3)',
            }}>
                {isError ? <Icons.alert size={22} style={{ color: 'var(--error)' }} /> : <Icons.calendar size={22} />}
            </div>
            <div className="mp-h4" style={{ color: 'var(--text-1)', margin: 0 }}>{message}</div>
            {sub && <p className="body-sm" style={{ color: 'var(--text-2)', marginTop: 6 }}>{sub}</p>}
            {onRetry && (
                <Button variant="secondary" size="sm" onClick={onRetry} style={{ marginTop: 12 }}>
                    Retry
                </Button>
            )}
        </div>
    );
}

function ListSkeleton() {
    const row = (op = 1) => ({
        height: 80, background: 'white', border: '1px solid var(--border)',
        borderRadius: 12, marginBottom: 10,
        animation: 'mp-flash 1.6s ease-in-out infinite',
        opacity: op,
    });
    return (
        <>
            <div style={row(1)} />
            <div style={row(0.7)} />
            <div style={row(0.4)} />
        </>
    );
}

function PageSkeleton() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
                height: 200, background: 'white', border: '1px solid var(--border)',
                borderRadius: 16, animation: 'mp-flash 1.6s ease-in-out infinite',
            }} />
            <div style={{
                height: 400, background: 'white', border: '1px solid var(--border)',
                borderRadius: 12, animation: 'mp-flash 1.6s ease-in-out infinite', opacity: 0.7,
            }} />
        </div>
    );
}

function Shell({ children }) {
    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            <TopNav />
            <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 80px' }}>
                {children}
            </div>
        </div>
    );
}
