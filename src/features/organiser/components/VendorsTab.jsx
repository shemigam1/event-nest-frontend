import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
    useGetEventVendorApplicationsQuery,
    useAcceptVendorApplicationMutation,
    useRejectVendorApplicationMutation,
    useRateVendorMutation,
    useGetVendorsQuery,
} from '../vendorsApi';
import Button from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icon';

const STATUS_STYLE = {
    PENDING:  { bg: '#FEF4E2', fg: '#B8770A', label: 'Pending' },
    ACCEPTED: { bg: '#E6F4EA', fg: '#0F9D58', label: 'Accepted' },
    REJECTED: { bg: '#FBE9E9', fg: '#D62828', label: 'Rejected' },
};

const APP_FILTERS = [
    ['all', 'All'], ['PENDING', 'Pending'], ['ACCEPTED', 'Accepted'], ['REJECTED', 'Rejected'],
];

const TABS = [
    { key: 'applications', label: 'Applications' },
    { key: 'marketplace',  label: 'Browse marketplace' },
];

function initials(name) {
    if (!name) return '?';
    return name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase() || '?';
}

function ngn(amount) {
    const n = Number(amount ?? 0);
    if (!Number.isFinite(n) || n <= 0) return null;
    return `₦${n.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
}

function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '—'
        : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ─── Tab entry point ─────────────────────────────── */
export default function VendorsTab({ eventId }) {
    const [activeTab, setActiveTab] = useState('applications');

    return (
        <div>
            {/* Sub-tabs */}
            <div style={{
                display: 'flex', gap: 0, marginBottom: 20,
                borderBottom: '2px solid var(--border)',
            }}>
                {TABS.map(({ key, label }) => {
                    const active = activeTab === key;
                    return (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key)}
                            style={{
                                padding: '10px 18px', border: 0,
                                borderBottom: active ? '2px solid var(--mp-blue)' : '2px solid transparent',
                                background: 'none', cursor: 'pointer',
                                fontFamily: 'inherit', fontSize: 14, fontWeight: active ? 600 : 500,
                                color: active ? 'var(--mp-blue)' : 'var(--text-2)',
                                marginBottom: -2,
                            }}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>

            {activeTab === 'applications' && <ApplicationsPane eventId={eventId} />}
            {activeTab === 'marketplace'  && <MarketplacePane eventId={eventId} />}
        </div>
    );
}

/* ─── Applications pane (unchanged from original) ── */
function ApplicationsPane({ eventId }) {
    const apps = useGetEventVendorApplicationsQuery({ eventId });
    const [accept, acceptState] = useAcceptVendorApplicationMutation();
    const [reject, rejectState] = useRejectVendorApplicationMutation();
    const [rate, rateState]     = useRateVendorMutation();

    const [filter, setFilter]         = useState('all');
    const [actionError, setError]     = useState('');
    const [pendingReject, setPendingReject] = useState(null);
    const [pendingRate,   setPendingRate]   = useState(null);
    const [rateError,     setRateError]    = useState('');

    const list    = useMemo(() => apps.data || [], [apps.data]);
    const counts  = useMemo(() => {
        const c = { all: list.length, PENDING: 0, ACCEPTED: 0, REJECTED: 0 };
        for (const a of list) if (c[a.status] !== undefined) c[a.status] += 1;
        return c;
    }, [list]);
    const filtered = useMemo(() => (
        filter === 'all' ? list : list.filter((a) => a.status === filter)
    ), [list, filter]);

    async function handleAccept(a) {
        setError('');
        try { await accept({ eventId, applicationId: a.id }).unwrap(); }
        catch (err) { setError(err?.data?.message || 'Could not accept application.'); }
    }
    async function handleReject() {
        if (!pendingReject) return;
        setError('');
        try {
            await reject({ eventId, applicationId: pendingReject.id }).unwrap();
            setPendingReject(null);
        } catch (err) { setError(err?.data?.message || 'Could not reject application.'); }
    }
    async function handleRate({ score, comment }) {
        if (!pendingRate) return;
        setRateError('');
        try {
            await rate({ eventId, applicationId: pendingRate.id, score, comment }).unwrap();
            setPendingRate(null);
        } catch (err) { setRateError(err?.data?.message || 'Could not submit rating.'); }
    }

    if (apps.isLoading) return <Skeleton />;
    if (apps.isError) return (
        <ErrorCard message={apps.error?.data?.message || 'Could not load vendor applications.'} onRetry={apps.refetch} />
    );

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 300px',
            gap: 20,
        }}>
            <div style={{ minWidth: 0 }}>
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 16, marginBottom: 20,
                }}>
                    <Tile label="Applications" value={counts.all} icon={<Icons.inbox size={16} />} />
                    <Tile label="Pending" value={counts.PENDING} accent={counts.PENDING > 0 ? 'var(--warning)' : undefined} />
                    <Tile label="Accepted" value={counts.ACCEPTED} accent={counts.ACCEPTED > 0 ? 'var(--success)' : undefined} />
                    <Tile label="Rejected" value={counts.REJECTED} />
                </div>

                <div style={{
                    background: 'white', border: '1px solid var(--border)',
                    borderRadius: 12, overflow: 'hidden',
                }}>
                    <div style={{
                        padding: '14px 20px', borderBottom: '1px solid var(--border)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        gap: 12, flexWrap: 'wrap',
                    }}>
                        <FilterBar filters={APP_FILTERS} counts={counts} active={filter} onChange={setFilter} />
                        <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
                            {filtered.length} application{filtered.length !== 1 ? 's' : ''}
                        </div>
                    </div>

                    {actionError && (
                        <div role="alert" style={{
                            margin: '12px 20px 0', padding: '10px 12px',
                            background: 'var(--error-bg, #FBE9E9)', color: 'var(--error)',
                            borderRadius: 8, fontSize: 13,
                        }}>
                            {actionError}
                        </div>
                    )}

                    {counts.all === 0 ? (
                        <EmptyCard message="No vendor applications yet." sub="Once your event is live, vendors who want to work on it will submit applications here." />
                    ) : filtered.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 50, color: 'var(--text-3)', fontSize: 14 }}>
                            No applications with this status.
                        </div>
                    ) : (
                        filtered.map((a, i) => (
                            <ApplicationRow
                                key={a.id}
                                application={a}
                                isLast={i === filtered.length - 1}
                                onAccept={() => handleAccept(a)}
                                onReject={() => setPendingReject(a)}
                                onRate={() => setPendingRate(a)}
                                busy={
                                    (acceptState.isLoading && acceptState.originalArgs?.applicationId === a.id)
                                    || (rejectState.isLoading && pendingReject?.id === a.id)
                                }
                            />
                        ))
                    )}
                </div>
            </div>

            <aside style={{
                display: 'flex', flexDirection: 'column', gap: 14,
                position: 'sticky', top: 24, height: 'fit-content',
            }}>
                <HowVendorsApplyCard />
            </aside>

            {pendingReject && (
                <ConfirmDialog
                    title="Reject application?"
                    body={<>The application from <strong>{pendingReject.applicantName}</strong> for <strong>{pendingReject.serviceType}</strong> will be rejected.</>}
                    confirmLabel="Reject"
                    loading={rejectState.isLoading}
                    onConfirm={handleReject}
                    onDismiss={() => setPendingReject(null)}
                />
            )}
            {pendingRate && (
                <RateModal
                    application={pendingRate}
                    loading={rateState.isLoading}
                    error={rateError}
                    onSubmit={handleRate}
                    onDismiss={() => { setPendingRate(null); setRateError(''); }}
                />
            )}
        </div>
    );
}
/* ─── Marketplace pane ────────────────────────────── */
/* Marketplace browse view inside the organiser's Vendors tab. Sends
   the user to the public vendor profile page on click — no inquiry CTA,
   no separate chat thread (the inquiry endpoints don't exist on the
   backend). When a chat module lands we'll surface a "Message vendor"
   action here. */
function MarketplacePane() {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('all');

    const CATS = [
        { key: 'all',       label: 'All',       keyword: null },
        { key: 'catering',  label: 'Catering',  keyword: 'cater' },
        { key: 'av',        label: 'AV',        keyword: 'av' },
        { key: 'photo',     label: 'Photo',     keyword: 'photo' },
        { key: 'venue',     label: 'Venue',     keyword: 'venue' },
        { key: 'security',  label: 'Security',  keyword: 'security' },
        { key: 'print',     label: 'Print',     keyword: 'print' },
        { key: 'decor',     label: 'Decor',     keyword: 'decor' },
        { key: 'transport', label: 'Transport', keyword: 'transport' },
    ];

    const keyword = CATS.find((c) => c.key === category)?.keyword || null;
    const { data: rawVendors = [], isLoading, isError, refetch } =
        useGetVendorsQuery({ serviceType: keyword });

    // Backend returns a paginated Page object; extract the content array defensively.
    // Backend doesn't support a name search — apply it client-side.
    const vendors = useMemo(() => {
        const items = Array.isArray(rawVendors) ? rawVendors : (rawVendors?.content ?? []);
        const q = search.trim().toLowerCase();
        if (!q) return items;
        return items.filter((v) => {
            const hay = `${v.vendorName || ''} ${v.serviceType || ''} ${v.profileDescription || ''}`.toLowerCase();
            return hay.includes(q);
        });
    }, [rawVendors, search]);

    function viewVendor(v) {
        navigate(`/vendors/${v.vendorId}`);
    }

    return (
        <div>
            <div style={{ marginBottom: 14 }}>
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name"
                    style={{
                        width: '100%', maxWidth: 360,
                        padding: '9px 12px', borderRadius: 8,
                        border: '1px solid var(--border)',
                        fontFamily: 'inherit', fontSize: 14,
                        color: 'var(--text-1)', boxSizing: 'border-box',
                    }}
                />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                {CATS.map(({ key, label }) => {
                    const active = category === key;
                    return (
                        <button
                            key={key}
                            onClick={() => setCategory(key)}
                            style={{
                                padding: '5px 12px', borderRadius: 99, cursor: 'pointer',
                                border: active ? '2px solid var(--mp-blue)' : '1px solid var(--border)',
                                background: active ? '#EAF1FE' : 'white',
                                color: active ? 'var(--mp-blue)' : 'var(--text-2)',
                                fontWeight: active ? 600 : 500, fontSize: 12,
                                fontFamily: 'inherit',
                            }}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>

            {isLoading && <Skeleton />}
            {isError && <ErrorCard message="Could not load vendors." onRetry={refetch} />}

            {!isLoading && !isError && vendors.length === 0 && (
                <EmptyCard message="No vendors found." sub="Try a different category." />
            )}

            {!isLoading && !isError && vendors.length > 0 && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                    gap: 14,
                }}>
                    {vendors.map((v) => (
                        <MiniVendorCard key={v.vendorId} vendor={v} onView={() => viewVendor(v)} />
                    ))}
                </div>
            )}
        </div>
    );
}

function MiniVendorCard({ vendor, onView }) {
    const name     = vendor.vendorName || '';
    const verified = vendor.vendorVerified === true;
    const service  = vendor.serviceType  || '';
    const bio      = vendor.profileDescription || '';
    const rating   = vendor.averageRating;
    const events   = vendor.completedEvents;

    return (
        <div style={{
            background: 'white', border: '1px solid var(--border)',
            borderRadius: 12, padding: 16,
            display: 'flex', flexDirection: 'column', gap: 10,
        }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{
                    width: 40, height: 40, borderRadius: 8, flexShrink: 0,
                    background: 'var(--surface-subtle)', color: 'var(--text-2)',
                    display: 'grid', placeItems: 'center',
                    fontSize: 13, fontWeight: 700,
                }}>
                    {initials(name)}
                </div>
                <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-1)' }}>
                            {name}
                        </span>
                        {verified && (
                            <Icons.shield size={12} style={{ color: 'var(--mp-blue)' }} title="Verified" />
                        )}
                    </div>
                    {service && <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{service}</div>}
                </div>
            </div>
            {bio && (
                <p style={{
                    margin: 0, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5,
                    display: '-webkit-box', WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                    {bio}
                </p>
            )}
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                {rating != null
                    ? <>★ <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{Number(rating).toFixed(1)}</span>{events != null && ` · ${events} events`}</>
                    : events != null
                        ? `${events} event${events !== 1 ? 's' : ''} completed`
                        : 'New vendor'
                }
            </div>
            <Button size="sm" variant="secondary" onClick={onView} style={{ marginTop: 'auto' }}>
                View profile
            </Button>
        </div>
    );
}

/* ─── Shared subcomponents ────────────────────────── */

function FilterBar({ filters, counts, active, onChange }) {
    return (
        <div style={{
            display: 'flex', gap: 4, padding: 4,
            background: 'var(--surface-subtle)', borderRadius: 10,
            border: '1px solid var(--border)', flexWrap: 'wrap',
        }}>
            {filters.map(([k, l]) => {
                const isActive = active === k;
                const n = k === 'all' ? counts.all : counts[k];
                return (
                    <button
                        key={k}
                        onClick={() => onChange(k)}
                        style={{
                            background: isActive ? 'white' : 'transparent', border: 0,
                            padding: '6px 12px', borderRadius: 7,
                            fontSize: 13, fontWeight: isActive ? 600 : 500,
                            color: isActive ? 'var(--mp-blue)' : 'var(--text-2)',
                            boxShadow: isActive ? 'var(--shadow-card)' : 'none',
                            cursor: 'pointer', fontFamily: 'inherit',
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                        }}
                    >
                        {l}
                        <span className="mp-num" style={{ color: 'var(--text-3)' }}>{n}</span>
                    </button>
                );
            })}
        </div>
    );
}

function Tile({ label, value, icon, accent }) {
    return (
        <div style={{
            background: 'white', border: '1px solid var(--border)',
            borderRadius: 12, padding: 18,
        }}>
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12,
            }}>
                <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>{label}</span>
                {icon && <span style={{ color: 'var(--text-3)' }}>{icon}</span>}
            </div>
            <div className="mp-num" style={{
                fontSize: 26, fontWeight: 700, lineHeight: 1,
                color: accent || 'var(--text-1)',
            }}>
                {value}
            </div>
        </div>
    );
}

function ApplicationRow({ application, isLast, onAccept, onReject, onRate, busy }) {
    const style = STATUS_STYLE[application.status] || STATUS_STYLE.PENDING;
    const isPending  = application.status === 'PENDING';
    const isAccepted = application.status === 'ACCEPTED';
    const eventEnded = application.eventEndTime
        ? new Date(application.eventEndTime) < new Date()
        : false;
    const canRate = isAccepted && eventEnded;
    const amount = ngn(application.proposedAmount);
    return (
        <div style={{
            display: 'grid', gridTemplateColumns: '48px 1fr auto',
            gap: 16, alignItems: 'flex-start',
            padding: '18px 20px',
            borderBottom: isLast ? 0 : '1px solid var(--border)',
        }}>
            <div style={{
                width: 48, height: 48, borderRadius: 10,
                background: 'var(--surface-subtle)', color: 'var(--text-2)',
                display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 700,
            }}>
                {initials(application.applicantName)}
            </div>
            <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{application.applicantName}</span>
                    <span style={{
                        fontSize: 11, padding: '2px 8px',
                        background: 'var(--surface-subtle)', borderRadius: 6,
                        color: 'var(--text-2)', fontWeight: 600,
                    }}>
                        {application.serviceType}
                    </span>
                    <span style={{
                        padding: '2px 9px', background: style.bg, color: style.fg,
                        fontSize: 11, fontWeight: 600, borderRadius: 99,
                    }}>
                        {style.label}
                    </span>
                </div>
                {application.description && (
                    <p className="body-sm" style={{
                        margin: '0 0 8px', color: 'var(--text-2)',
                        whiteSpace: 'pre-wrap', lineHeight: 1.5,
                    }}>
                        {application.description}
                    </p>
                )}
                <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--text-3)', flexWrap: 'wrap' }}>
                    {amount && (
                        <span className="mp-num" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Icons.wallet size={12} />
                            <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{amount}</span>
                            <span>proposed</span>
                        </span>
                    )}
                    <span>· Applied {fmtDate(application.createdAt)}</span>
                </div>
            </div>
            <div style={{ display: 'flex', gap: 8, paddingTop: 4, flexWrap: 'wrap' }}>
                {isPending ? (
                    <>
                        <Button size="sm" variant="primary" icon={<Icons.check size={13} />} onClick={onAccept} disabled={busy}>
                            Accept
                        </Button>
                        <Button size="sm" variant="secondary" icon={<Icons.x size={13} />} onClick={onReject} disabled={busy}>
                            Reject
                        </Button>
                    </>
                ) : canRate ? (
                    <Button size="sm" variant="secondary" icon={<StarIcon size={13} />} onClick={onRate}>
                        Rate vendor
                    </Button>
                ) : (
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>—</span>
                )}
            </div>
        </div>
    );
}

function HowVendorsApplyCard() {
    return (
        <div style={{
            background: 'white', border: '1px solid var(--border)',
            borderRadius: 12, padding: 18,
        }}>
            <Icons.shield size={20} style={{ color: 'var(--mp-blue)' }} />
            <div className="mp-h4" style={{ marginTop: 10, color: 'var(--text-1)' }}>
                How vendors apply
            </div>
            <ol style={{
                margin: '10px 0 0', padding: 0, listStyle: 'none',
                color: 'var(--text-2)', fontSize: 13,
            }}>
                {[
                    'A vendor finds your event on the public page.',
                    'They submit a short pitch with service type and proposed price.',
                    'Their application lands here for you to accept or reject.',
                    'You can also browse the marketplace and reach out directly.',
                ].map((t, i) => (
                    <li key={i} style={{ display: 'flex', gap: 10, padding: '6px 0' }}>
                        <span style={{
                            width: 22, height: 22, borderRadius: 99,
                            background: '#EAF1FE', color: 'var(--mp-blue)',
                            fontSize: 11, fontWeight: 700,
                            display: 'grid', placeItems: 'center', flexShrink: 0,
                        }}>
                            {i + 1}
                        </span>
                        <span style={{ lineHeight: 1.5 }}>{t}</span>
                    </li>
                ))}
            </ol>
        </div>
    );
}

function EmptyCard({ message, sub }) {
    return (
        <div style={{ textAlign: 'center', padding: 50 }}>
            <div style={{
                width: 52, height: 52, borderRadius: 99,
                margin: '0 auto 14px', background: 'var(--surface-subtle)',
                display: 'grid', placeItems: 'center', color: 'var(--text-3)',
            }}>
                <Icons.inbox size={20} />
            </div>
            <div className="mp-h4" style={{ color: 'var(--text-1)', margin: 0 }}>{message}</div>
            {sub && <p className="body-sm" style={{ color: 'var(--text-2)', marginTop: 6 }}>{sub}</p>}
        </div>
    );
}

function ErrorCard({ message, onRetry }) {
    return (
        <div style={{
            background: 'white', border: '1px solid var(--border)',
            borderRadius: 12, padding: 40, textAlign: 'center',
        }}>
            <Icons.alert size={28} style={{ color: 'var(--error)' }} />
            <p className="body-sm" style={{ marginTop: 8, color: 'var(--text-2)' }}>{message}</p>
            {onRetry && (
                <Button variant="secondary" size="sm" onClick={onRetry} style={{ marginTop: 12 }}>
                    Retry
                </Button>
            )}
        </div>
    );
}

function ConfirmDialog({ title, body, confirmLabel, loading, onConfirm, onDismiss }) {
    return (
        <div
            role="dialog"
            aria-label={title}
            onClick={onDismiss}
            style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: 'rgba(2,16,45,0.55)',
                display: 'grid', placeItems: 'center', padding: 20,
            }}
        >
            <div onClick={(e) => e.stopPropagation()} style={{
                width: '100%', maxWidth: 420, background: 'white',
                borderRadius: 16, boxShadow: 'var(--shadow-modal)', padding: 28,
            }}>
                <h2 className="mp-h3" style={{ margin: 0, color: 'var(--text-1)' }}>{title}</h2>
                <p className="body-sm" style={{ margin: '8px 0 24px', color: 'var(--text-2)' }}>{body}</p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <Button variant="ghost" size="md" onClick={onDismiss} disabled={loading}>Cancel</Button>
                    <Button variant="destructive" size="md" onClick={onConfirm} disabled={loading}>
                        {loading ? 'Working…' : confirmLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
}

function StarIcon({ size = 16 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
            <path d="M12 2l2.9 6.3L22 9.3l-5 4.9 1.2 6.8L12 17.8l-6.2 3.2L7 14.2 2 9.3l7.1-1L12 2z" />
        </svg>
    );
}

function RateModal({ application, loading, error, onSubmit, onDismiss }) {
    const [score, setScore] = useState(0);
    const [comment, setComment] = useState('');

    return (
        <div
            role="dialog"
            aria-label="Rate vendor"
            onClick={onDismiss}
            style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: 'rgba(2,16,45,0.55)',
                display: 'grid', placeItems: 'center', padding: 20,
            }}
        >
            <div onClick={(e) => e.stopPropagation()} style={{
                width: '100%', maxWidth: 440, background: 'white',
                borderRadius: 16, boxShadow: 'var(--shadow-modal)', padding: 28,
            }}>
                <h2 className="mp-h3" style={{ margin: 0, color: 'var(--text-1)' }}>
                    Rate {application.applicantName}
                </h2>
                <p className="body-sm" style={{ margin: '6px 0 20px', color: 'var(--text-2)' }}>
                    How did the {application.serviceType} service go?
                </p>

                {/* Star picker */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                        <button
                            key={n}
                            type="button"
                            onClick={() => setScore(n)}
                            aria-label={`${n} star${n !== 1 ? 's' : ''}`}
                            style={{
                                width: 44, height: 44, borderRadius: 10,
                                border: `2px solid ${score >= n ? '#F59E0B' : 'var(--border)'}`,
                                background: score >= n ? '#FFFBEB' : 'white',
                                color: score >= n ? '#F59E0B' : 'var(--text-3)',
                                fontSize: 22, cursor: 'pointer',
                                display: 'grid', placeItems: 'center',
                                transition: 'border-color 0.1s, background 0.1s, color 0.1s',
                            }}
                        >
                            ★
                        </button>
                    ))}
                    {score > 0 && (
                        <span style={{
                            alignSelf: 'center', marginLeft: 8,
                            fontSize: 13, color: 'var(--text-2)', fontWeight: 500,
                        }}>
                            {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][score]}
                        </span>
                    )}
                </div>

                {/* Comment */}
                <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Leave a comment (optional)"
                    rows={3}
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

                {error && (
                    <div role="alert" style={{
                        marginTop: 12, padding: '10px 12px',
                        background: 'var(--error-bg, #FBE9E9)', color: 'var(--error)',
                        borderRadius: 8, fontSize: 13,
                    }}>
                        {error}
                    </div>
                )}

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                    <Button variant="ghost" size="md" onClick={onDismiss} disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary" size="md"
                        onClick={() => onSubmit({ score, comment: comment.trim() || undefined })}
                        disabled={score === 0 || loading}
                    >
                        {loading ? 'Submitting…' : 'Submit rating'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

function Skeleton() {
    const tile = {
        height: 90, background: 'white', border: '1px solid var(--border)',
        borderRadius: 12, animation: 'mp-flash 1.6s ease-in-out infinite',
    };
    const row = {
        height: 96, background: 'var(--surface-subtle)',
        borderBottom: '1px solid var(--border)',
        animation: 'mp-flash 1.6s ease-in-out infinite',
    };
    return (
        <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 20 }}>
                <div style={tile} />
                <div style={{ ...tile, opacity: 0.8 }} />
                <div style={{ ...tile, opacity: 0.6 }} />
                <div style={{ ...tile, opacity: 0.4 }} />
            </div>
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ ...row, height: 50 }} />
                <div style={row} />
                <div style={{ ...row, opacity: 0.7 }} />
                <div style={{ ...row, opacity: 0.4, borderBottom: 0 }} />
            </div>
        </div>
    );
}
