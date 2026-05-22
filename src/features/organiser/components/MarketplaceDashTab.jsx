import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useGetVendorsQuery } from '../vendorsApi';
import Button from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icon';

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

function initials(name) {
    if (!name) return '?';
    return name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase() || '?';
}

/* ── Main component ──────────────────────────────── */
export default function MarketplaceDashTab() {
    const navigate  = useNavigate();
    const [search,   setSearch]   = useState('');
    const [category, setCategory] = useState('all');

    const keyword = CATS.find((c) => c.key === category)?.keyword ?? null;
    const { data: rawData = [], isLoading, isError, refetch } =
        useGetVendorsQuery({ serviceType: keyword });

    const vendors = useMemo(() => {
        // transformResponse may return Page object or bare array
        const items = Array.isArray(rawData) ? rawData : (rawData?.content ?? []);
        const q = search.trim().toLowerCase();
        if (!q) return items;
        return items.filter((v) => {
            const hay = [v.businessName, v.category, v.bio]
                .filter(Boolean).join(' ').toLowerCase();
            return hay.includes(q);
        });
    }, [rawData, search]);

    return (
        <div>
            {/* Header */}
            <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: 20,
            }}>
                <div>
                    <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-1)' }}>
                        Vendor Marketplace
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
                        Find and connect with verified vendors for your events
                    </div>
                </div>
                <Button
                    variant="secondary" size="sm"
                    icon={<Icons.arrowR size={14} />}
                    onClick={() => navigate('/vendors')}
                >
                    Full marketplace
                </Button>
            </div>

            {/* Search */}
            <div style={{ marginBottom: 14 }}>
                <div style={{ position: 'relative', display: 'inline-flex', width: '100%', maxWidth: 380 }}>
                    <Icons.search size={15} style={{
                        position: 'absolute', left: 10, top: '50%',
                        transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none',
                    }} />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search vendors by name or service…"
                        style={{
                            width: '100%', padding: '9px 12px 9px 32px',
                            borderRadius: 8, border: '1px solid var(--border)',
                            fontFamily: 'inherit', fontSize: 14,
                            color: 'var(--text-1)', boxSizing: 'border-box', outline: 'none',
                        }}
                        onFocus={(e) => { e.target.style.borderColor = 'var(--mp-blue)'; }}
                        onBlur={(e)  => { e.target.style.borderColor = 'var(--border)'; }}
                    />
                </div>
            </div>

            {/* Category pills */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                {CATS.map(({ key, label }) => {
                    const active = category === key;
                    return (
                        <button
                            key={key}
                            onClick={() => setCategory(key)}
                            style={{
                                padding: '5px 14px', borderRadius: 99, cursor: 'pointer',
                                border: active ? '2px solid var(--mp-blue)' : '1px solid var(--border)',
                                background: active ? '#EAF1FE' : 'white',
                                color: active ? 'var(--mp-blue)' : 'var(--text-2)',
                                fontWeight: active ? 600 : 500, fontSize: 13,
                                fontFamily: 'inherit', transition: 'all 0.12s',
                            }}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>

            {/* Loading */}
            {isLoading && <MktSkeleton />}

            {/* Error */}
            {isError && (
                <div style={{
                    background: 'white', border: '1px solid var(--border)',
                    borderRadius: 12, padding: 40, textAlign: 'center',
                }}>
                    <Icons.alert size={28} style={{ color: 'var(--error)' }} />
                    <p className="body-sm" style={{ marginTop: 8, color: 'var(--text-2)' }}>
                        Could not load vendors.
                    </p>
                    <Button variant="secondary" size="sm" onClick={refetch} style={{ marginTop: 12 }}>
                        Retry
                    </Button>
                </div>
            )}

            {/* Empty */}
            {!isLoading && !isError && vendors.length === 0 && (
                <div style={{ textAlign: 'center', padding: '56px 24px' }}>
                    <div style={{
                        width: 56, height: 56, borderRadius: 99, margin: '0 auto 16px',
                        background: 'var(--surface-subtle)', display: 'grid',
                        placeItems: 'center', color: 'var(--text-3)',
                    }}>
                        <Icons.users size={24} />
                    </div>
                    <div className="mp-h4" style={{ color: 'var(--text-1)', margin: 0 }}>
                        No vendors found
                    </div>
                    <p className="body-sm" style={{ color: 'var(--text-2)', margin: '8px 0 0' }}>
                        Try a different category or search term.
                    </p>
                </div>
            )}

            {/* Grid */}
            {!isLoading && !isError && vendors.length > 0 && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                    gap: 14,
                }}>
                    {vendors.map((v) => (
                        <VendorCard
                            key={v.vendorId ?? v.id}
                            vendor={v}
                            onView={() => navigate(`/vendors/${v.vendorId ?? v.id}`)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

/* ── Vendor card ─────────────────────────────────── */
function VendorCard({ vendor: v, onView }) {
    const name     = v.vendorName || '';
    const verified = v.vendorVerified === true;
    const service  = v.serviceType || '';
    const bio      = v.profileDescription || '';
    const rating   = v.averageRating;
    const events   = v.completedEvents;

    return (
        <div style={{
            background: 'white', border: '1px solid var(--border)',
            borderRadius: 12, padding: 16, boxShadow: 'var(--shadow-card)',
            display: 'flex', flexDirection: 'column', gap: 10,
        }}>
            {/* Avatar + name */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{
                    width: 40, height: 40, borderRadius: 8, flexShrink: 0,
                    background: '#EAF1FE', color: 'var(--mp-blue)',
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
                            <Icons.shield
                                size={12}
                                style={{ color: 'var(--mp-blue)', flexShrink: 0 }}
                                title="Verified vendor"
                            />
                        )}
                    </div>
                    {service && (
                        <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{service}</div>
                    )}
                </div>
            </div>

            {/* Bio */}
            {bio && (
                <p style={{
                    margin: 0, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5,
                    display: '-webkit-box', WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                    {bio}
                </p>
            )}

            {/* Rating / events */}
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                {rating != null
                    ? <>★ <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>
                        {Number(rating).toFixed(1)}</span>
                        {events != null && ` · ${events} events`}
                      </>
                    : events != null
                        ? `${events} event${events !== 1 ? 's' : ''} completed`
                        : 'New vendor'
                }
            </div>

            <Button
                size="sm" variant="secondary"
                onClick={onView}
                style={{ marginTop: 'auto' }}
            >
                View profile
            </Button>
        </div>
    );
}

/* ── Skeleton ────────────────────────────────────── */
function MktSkeleton() {
    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 14,
        }}>
            {[1, 2, 3, 4, 5, 6].map((n) => (
                <div
                    key={n}
                    style={{
                        height: 160, borderRadius: 12,
                        border: '1px solid var(--border)',
                        background: 'var(--surface-subtle)',
                        animation: 'mp-flash 1.6s ease-in-out infinite',
                        opacity: 1 - (n - 1) * 0.12,
                    }}
                />
            ))}
        </div>
    );
}
