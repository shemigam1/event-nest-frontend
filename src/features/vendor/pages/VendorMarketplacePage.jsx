import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useGetVendorsQuery } from '@/features/organiser/vendorsApi';
import TopNav from '@/components/ui/TopNav';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Icons } from '@/components/ui/Icon';

/* Category chips map to the backend's ?serviceType= partial-match filter.
   The keyword (lowercase) is what we send — the backend matches it against
   the vendor's serviceType string case-insensitively. */
const CATEGORIES = [
    { key: 'all',         label: 'All',           keyword: null },
    { key: 'catering',    label: 'Catering',      keyword: 'cater' },
    { key: 'av',          label: 'AV & Sound',    keyword: 'av' },
    { key: 'photography', label: 'Photography',   keyword: 'photo' },
    { key: 'venue',       label: 'Venues',        keyword: 'venue' },
    { key: 'security',    label: 'Security',      keyword: 'security' },
    { key: 'print',       label: 'Print & Swag',  keyword: 'print' },
    { key: 'decor',       label: 'Decor',         keyword: 'decor' },
    { key: 'transport',   label: 'Transport',     keyword: 'transport' },
];

function initials(name) {
    if (!name) return '?';
    return name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase() || '?';
}

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

export default function VendorMarketplacePage() {
    const navigate = useNavigate();
    const [category, setCategory] = useState('all');
    const [searchInput, setSearchInput] = useState('');

    const keyword = CATEGORIES.find((c) => c.key === category)?.keyword || null;
    const { data: rawVendors = [], isLoading, isError, refetch } =
        useGetVendorsQuery({ serviceType: keyword });

    // Backend only filters by serviceType. Apply the free-text query
    // client-side across name + service type so the search box still works.
    const vendors = useMemo(() => {
        const q = searchInput.trim().toLowerCase();
        if (!q) return rawVendors;
        return rawVendors.filter((v) => {
            const hay = `${v.vendorName || ''} ${v.serviceType || ''} ${v.profileDescription || ''}`.toLowerCase();
            return hay.includes(q);
        });
    }, [rawVendors, searchInput]);

    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            <TopNav />
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 80px' }}>

                {/* Header */}
                <div style={{ marginBottom: 24 }}>
                    <h1 className="mp-h1" style={{ margin: 0, color: 'var(--text-1)' }}>
                        Vendor marketplace
                    </h1>
                    <p className="body" style={{ margin: '8px 0 0', color: 'var(--text-2)' }}>
                        Find verified service providers for your event — caterers, photographers,
                        AV technicians, security, and more.
                    </p>
                </div>

                {/* Search row — filters client-side over name + service type */}
                <div style={{ marginBottom: 20, maxWidth: 380 }}>
                    <Input
                        placeholder="Search vendors by name or service"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        icon={<Icons.search size={16} />}
                    />
                </div>

                {/* Category chips */}
                <div style={{
                    display: 'flex',
                    gap: 8,
                    flexWrap: 'wrap',
                    marginBottom: 24,
                }}>
                    {CATEGORIES.map(({ key, label }) => {
                        const active = category === key;
                        return (
                            <button
                                key={key}
                                onClick={() => setCategory(key)}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: 99,
                                    border: active ? '2px solid var(--mp-blue)' : '1px solid var(--border)',
                                    background: active ? 'var(--mp-blue-50, #EAF1FE)' : 'white',
                                    color: active ? 'var(--mp-blue)' : 'var(--text-2)',
                                    fontWeight: active ? 600 : 500,
                                    fontSize: 13,
                                    cursor: 'pointer',
                                    fontFamily: 'inherit',
                                    transition: 'all 0.15s',
                                }}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>

                {/* Results */}
                {isLoading && <GridSkeleton />}

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

                {!isLoading && !isError && vendors.length === 0 && (
                    <div style={{
                        background: 'white', border: '1px solid var(--border)',
                        borderRadius: 12, padding: 60, textAlign: 'center',
                    }}>
                        <div style={{
                            width: 52, height: 52, borderRadius: 99,
                            margin: '0 auto 14px',
                            background: 'var(--surface-subtle)',
                            display: 'grid', placeItems: 'center',
                            color: 'var(--text-3)',
                        }}>
                            <Icons.search size={20} />
                        </div>
                        <div className="mp-h4" style={{ color: 'var(--text-1)', margin: 0 }}>
                            No vendors found
                        </div>
                        <p className="body-sm" style={{ color: 'var(--text-2)', marginTop: 6 }}>
                            Try a different category or search term.
                        </p>
                    </div>
                )}

                {!isLoading && !isError && vendors.length > 0 && (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                        gap: 16,
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
        </div>
    );
}

function VendorCard({ vendor, onView }) {
    // Maps onto VendorMarketplaceResponse from the backend.
    const name     = vendor.vendorName || '';
    const verified = vendor.vendorVerified === true;
    const service  = vendor.serviceType || '';
    const bio      = vendor.profileDescription || '';
    const rating   = vendor.averageRating;
    const reviews  = vendor.totalRatings;
    const events   = vendor.completedEvents;

    const [bg, fg] = avatarColor(name);
    const stars = Math.round((rating || 0) * 2) / 2;

    return (
        <div style={{
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
        }}>
            {/* Top row: avatar + name + verified */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{
                    width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                    background: bg, color: fg,
                    display: 'grid', placeItems: 'center',
                    fontSize: 16, fontWeight: 700,
                }}>
                    {initials(name)}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-1)' }}>
                            {name}
                        </span>
                        {verified && (
                            <span title="Verified vendor" style={{
                                display: 'inline-flex', alignItems: 'center', gap: 3,
                                background: '#EAF1FE', color: 'var(--mp-blue)',
                                fontSize: 11, fontWeight: 600,
                                padding: '2px 7px', borderRadius: 99,
                            }}>
                                <Icons.shield size={10} />
                                Verified
                            </span>
                        )}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
                        {service || 'Vendor'}
                    </div>
                </div>
            </div>

            {/* Rating + events */}
            <div style={{ display: 'flex', gap: 16, fontSize: 13, flexWrap: 'wrap' }}>
                {rating != null ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-2)' }}>
                        <StarRow rating={stars} />
                        <span className="mp-num" style={{ color: 'var(--text-1)', fontWeight: 600 }}>
                            {Number(rating).toFixed(1)}
                        </span>
                        {reviews != null && (
                            <span style={{ color: 'var(--text-3)' }}>({reviews})</span>
                        )}
                    </span>
                ) : (
                    <span style={{ color: 'var(--text-3)', fontSize: 12 }}>No ratings yet</span>
                )}
                {events != null && (
                    <span style={{ color: 'var(--text-3)' }}>
                        {events} event{events !== 1 ? 's' : ''} completed
                    </span>
                )}
            </div>

            {/* Bio */}
            {bio && (
                <p style={{
                    margin: 0, fontSize: 13, color: 'var(--text-2)',
                    lineHeight: 1.5,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                }}>
                    {bio}
                </p>
            )}

            {/* Footer: CTA */}
            <div style={{
                marginTop: 'auto',
                paddingTop: 12,
                borderTop: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'flex-end',
            }}>
                <Button size="sm" variant="primary" onClick={onView} iconRight={<Icons.arrowR size={13} />}>
                    View profile
                </Button>
            </div>
        </div>
    );
}

function StarRow({ rating }) {
    return (
        <span style={{ display: 'inline-flex', gap: 1, color: '#F59E0B' }}>
            {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} style={{
                    fontSize: 12,
                    opacity: rating >= n ? 1 : rating >= n - 0.5 ? 0.6 : 0.2,
                }}>
                    ★
                </span>
            ))}
        </span>
    );
}

function GridSkeleton() {
    const card = {
        height: 260,
        background: 'white',
        border: '1px solid var(--border)',
        borderRadius: 12,
        animation: 'mp-flash 1.6s ease-in-out infinite',
    };
    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 16,
        }}>
            <div style={card} />
            <div style={{ ...card, opacity: 0.8 }} />
            <div style={{ ...card, opacity: 0.6 }} />
            <div style={{ ...card, opacity: 0.4 }} />
        </div>
    );
}
