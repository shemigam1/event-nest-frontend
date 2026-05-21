import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useSelector } from 'react-redux';
import {
    useGetVendorsQuery,
    useGetMyVendorProfileQuery,
} from '@/features/organiser/vendorsApi';
import { selectIsAuthenticated } from '@/features/auth/authSlice';
import TopNav from '@/components/ui/TopNav';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Icons } from '@/components/ui/Icon';

/* Category chips map 1:1 to the backend's VendorCategory enum (PRD §3.16, table 42).
   `key` is sent as the `?category=` query param when a chip other than "all" is active. */
const CATEGORIES = [
    { key: null,         label: 'All' },
    { key: 'CATERING',   label: 'Catering' },
    { key: 'AV',         label: 'AV & Sound' },
    { key: 'PHOTOGRAPHY', label: 'Photography' },
    { key: 'VENUE',      label: 'Venues' },
    { key: 'DECORATION', label: 'Decoration' },
    { key: 'MUSIC',      label: 'Music & DJs' },
    { key: 'SECURITY',   label: 'Security' },
    { key: 'OTHER',      label: 'Other' },
];

const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.key, c.label]));

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
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const [category, setCategory] = useState(null);
    const [searchInput, setSearchInput] = useState('');

    const vendorsQ = useGetVendorsQuery({ category });
    const { isLoading, isError, refetch } = vendorsQ;

    // Backend returns Page<PublicVendorResponse>; older shape returned a bare array.
    const rawVendors = useMemo(() => {
        const d = vendorsQ.data;
        if (!d) return [];
        if (Array.isArray(d)) return d;
        if (Array.isArray(d.content)) return d.content;
        return [];
    }, [vendorsQ.data]);

    // Personal profile state powers the page-level CTA (Apply / Resubmit / Profile / Pending).
    // Skipped for anonymous callers — the marketplace itself is public.
    const myProfileQ = useGetMyVendorProfileQuery(undefined, { skip: !isAuthenticated });

    // Backend filters by category server-side. The free-text search runs client-side over
    // businessName + bio + serviceAreas so it still works alongside the category chip.
    const vendors = useMemo(() => {
        const q = searchInput.trim().toLowerCase();
        if (!q) return rawVendors;
        return rawVendors.filter((v) => {
            const areas = Array.isArray(v.serviceAreas) ? v.serviceAreas.join(' ') : '';
            const hay = `${v.businessName || ''} ${v.bio || ''} ${areas}`.toLowerCase();
            return hay.includes(q);
        });
    }, [rawVendors, searchInput]);

    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            {/* Anonymous viewers get the marketing top nav; authenticated viewers
                see AppShell's sidebar + TopBar wrapping the route. */}
            {!isAuthenticated && <TopNav />}
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
                    <div style={{ minWidth: 0, flex: '1 1 320px' }}>
                        <h1 className="mp-h1" style={{ margin: 0, color: 'var(--text-1)' }}>
                            Vendor marketplace
                        </h1>
                        <p className="body" style={{ margin: '8px 0 0', color: 'var(--text-2)' }}>
                            Find verified service providers for your event — caterers, photographers,
                            AV technicians, security, and more.
                        </p>
                    </div>
                    {isAuthenticated && !myProfileQ.isLoading && (
                        <PersonalCta
                            status={myProfileQ.data?.status}
                            hasProfile={Boolean(myProfileQ.data)}
                            onApply={() => navigate('/vendor/profile')}
                            onProfile={() => navigate('/vendor')}
                        />
                    )}
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

/* Personal CTA based on the caller's VendorStatus (PENDING/ACTIVE/VERIFIED/SUSPENDED).
   No profile yet → "Become a vendor"; profile exists → reflect status. */
function PersonalCta({ status, hasProfile, onApply, onProfile }) {
    if (!hasProfile) {
        return (
            <Button
                size="md"
                variant="primary"
                icon={<Icons.shield size={14} />}
                onClick={onApply}
            >
                Become a vendor
            </Button>
        );
    }
    if (status === 'VERIFIED') {
        return (
            <Button
                size="md"
                variant="primary"
                icon={<Icons.shield size={14} />}
                onClick={onProfile}
                iconRight={<Icons.arrowR size={13} />}
            >
                My vendor dashboard
            </Button>
        );
    }
    if (status === 'ACTIVE') {
        return (
            <Button
                size="md"
                variant="secondary"
                icon={<Icons.shield size={14} />}
                onClick={onApply}
            >
                Submit for verification
            </Button>
        );
    }
    if (status === 'SUSPENDED') {
        return (
            <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                background: 'var(--error-bg)',
                color: 'var(--error)',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
            }}>
                <Icons.alert size={14} />
                Vendor suspended
            </div>
        );
    }
    // PENDING (default) — either awaiting first submission OR awaiting admin review.
    return (
        <Button
            size="md"
            variant="primary"
            icon={<Icons.clock size={14} />}
            onClick={onApply}
        >
            Continue verification
        </Button>
    );
}

function VendorCard({ vendor, onView }) {
    // Maps onto PublicVendorResponse (PRD §3.16). Marketplace only returns VERIFIED
    // vendors, so the badge is always shown.
    const name        = vendor.businessName || '';
    const service     = CATEGORY_LABEL[vendor.category] ?? vendor.category ?? 'Vendor';
    const bio         = vendor.bio || '';
    const trustScore  = vendor.trustScore != null ? Number(vendor.trustScore) : null;
    const completed   = vendor.completedContracts;
    const disputeRate = vendor.disputeRate != null ? Number(vendor.disputeRate) : null;

    const [bg, fg] = avatarColor(name);

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
                        <span title="Verified vendor" style={{
                            display: 'inline-flex', alignItems: 'center', gap: 3,
                            background: 'var(--mp-blue-50)', color: 'var(--mp-blue)',
                            fontSize: 11, fontWeight: 600,
                            padding: '2px 7px', borderRadius: 99,
                        }}>
                            <Icons.shield size={10} />
                            Verified
                        </span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
                        {service}
                    </div>
                </div>
            </div>

            {/* Trust score + completed contracts */}
            <div style={{ display: 'flex', gap: 16, fontSize: 13, flexWrap: 'wrap', alignItems: 'center' }}>
                {trustScore != null ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-2)' }}>
                        <TrustPill score={trustScore} />
                        <span className="mp-num" style={{ color: 'var(--text-1)', fontWeight: 600 }}>
                            {trustScore.toFixed(0)}
                        </span>
                        <span style={{ color: 'var(--text-3)' }}>trust</span>
                    </span>
                ) : (
                    <span style={{ color: 'var(--text-3)', fontSize: 12 }}>No trust score yet</span>
                )}
                {completed != null && (
                    <span style={{ color: 'var(--text-3)' }}>
                        {completed} contract{completed !== 1 ? 's' : ''} completed
                    </span>
                )}
                {disputeRate != null && disputeRate > 0 && (
                    <span style={{ color: 'var(--warning)', fontWeight: 500 }}>
                        {(disputeRate * 100).toFixed(0)}% disputed
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

/* Trust score badge dot — colour-codes 0..100 per the PRD threshold table
   (≥80 green, 60–79 amber, 40–59 orange, <40 red — the auto-suspend cutoff). */
function TrustPill({ score }) {
    let color = 'var(--success)';
    if (score < 40) color = 'var(--error)';
    else if (score < 60) color = '#E85423';
    else if (score < 80) color = 'var(--warning)';
    return (
        <span style={{
            width: 8, height: 8, borderRadius: 99,
            background: color, flexShrink: 0,
        }} />
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
