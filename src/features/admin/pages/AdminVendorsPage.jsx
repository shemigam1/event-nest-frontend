import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useGetAdminVendorsQuery } from '../adminApi';
import Button from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icon';

/* ────────────────────────────────────────────────────────────────────────────
   AdminVendorsPage — paginated list of vendors, filterable by VendorStatus
   (PRD §3.16). Click a row to drill into the detail page where verify /
   reject / suspend / trust-history live.
   ──────────────────────────────────────────────────────────────────────── */

const STATUS_FILTERS = [
    { key: null,        label: 'All' },
    { key: 'PENDING',   label: 'Pending' },
    { key: 'ACTIVE',    label: 'Active' },
    { key: 'VERIFIED',  label: 'Verified' },
    { key: 'SUSPENDED', label: 'Suspended' },
];

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

const STATUS_PILL = {
    PENDING:   { bg: 'var(--warning-bg)',   fg: 'var(--warning)',  label: 'Pending' },
    ACTIVE:    { bg: 'var(--mp-blue-50)',   fg: 'var(--mp-blue)',  label: 'Active' },
    VERIFIED:  { bg: 'var(--success-bg)',   fg: 'var(--success)',  label: 'Verified' },
    SUSPENDED: { bg: 'var(--error-bg)',     fg: 'var(--error)',    label: 'Suspended' },
};

export default function AdminVendorsPage() {
    const navigate = useNavigate();
    const [status, setStatus] = useState(null);
    const [page, setPage]     = useState(0);
    const pageSize = 20;

    const q = useGetAdminVendorsQuery({ status, page, size: pageSize });
    const vendors = q.data?.content ?? [];
    const total = q.data?.totalElements ?? 0;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));

    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 80px' }}>
                <h1 className="mp-h1" style={{ margin: 0, color: 'var(--text-1)' }}>
                    Vendors
                </h1>
                <p className="body" style={{ margin: '8px 0 24px', color: 'var(--text-2)' }}>
                    {q.isLoading ? 'Loading…' : `${total} vendor${total !== 1 ? 's' : ''} total · filter to verify, suspend, or audit trust history.`}
                </p>

                {/* Filter pills */}
                <div className="mp-tab-scroll" style={{
                    display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap',
                }}>
                    {STATUS_FILTERS.map(({ key, label }) => {
                        const active = status === key;
                        return (
                            <button
                                key={String(key)}
                                onClick={() => { setStatus(key); setPage(0); }}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: 99,
                                    border: active ? '2px solid var(--mp-blue)' : '1px solid var(--border)',
                                    background: active ? 'var(--mp-blue-50)' : 'white',
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

                {/* List */}
                {q.isLoading && <Skeleton />}

                {q.isError && (
                    <ErrorCard
                        message={q.error?.data?.message || 'Could not load vendors.'}
                        onRetry={q.refetch}
                    />
                )}

                {!q.isLoading && !q.isError && vendors.length === 0 && (
                    <EmptyCard status={status} />
                )}

                {!q.isLoading && !q.isError && vendors.length > 0 && (
                    <div style={{
                        background: 'white',
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                        overflow: 'hidden',
                    }}>
                        {vendors.map((v, i) => (
                            <VendorRow
                                key={v.id}
                                vendor={v}
                                isLast={i === vendors.length - 1}
                                onView={() => navigate(`/admin/vendors/${v.id}`)}
                            />
                        ))}
                        {pageCount > 1 && (
                            <Paginator
                                page={page}
                                pageCount={pageCount}
                                onPrev={() => setPage((p) => Math.max(0, p - 1))}
                                onNext={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─── Row ───────────────────────── */

function VendorRow({ vendor, isLast, onView }) {
    const v = vendor;
    const pill = STATUS_PILL[v.status] ?? STATUS_PILL.PENDING;
    const trust = v.trustScore != null ? Number(v.trustScore) : null;
    const needsReview = v.verificationSubmittedAt && v.status !== 'VERIFIED';

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto auto',
            gap: 16,
            padding: '14px 20px',
            borderBottom: isLast ? 0 : '1px solid var(--border)',
            alignItems: 'center',
        }}>
            <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 14 }}>
                        {v.businessName || '—'}
                    </span>
                    <span style={{
                        padding: '2px 8px', borderRadius: 99,
                        background: pill.bg, color: pill.fg,
                        fontSize: 11, fontWeight: 600, letterSpacing: '0.02em',
                    }}>
                        {pill.label}
                    </span>
                    {needsReview && (
                        <span style={{
                            padding: '2px 8px', borderRadius: 99,
                            background: 'var(--warning-bg)', color: 'var(--warning)',
                            fontSize: 11, fontWeight: 600,
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                        }}>
                            <Icons.alert size={10} />
                            Awaiting review
                        </span>
                    )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
                    {CATEGORY_LABEL[v.category] ?? v.category ?? 'Uncategorised'}
                    {v.contactEmail && ` · ${v.contactEmail}`}
                </div>
            </div>

            {trust != null && (
                <div style={{ textAlign: 'right', minWidth: 100 }}>
                    <div className="mp-num" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)' }}>
                        {trust.toFixed(0)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>trust score</div>
                </div>
            )}

            <Button size="sm" variant="secondary" onClick={onView} iconRight={<Icons.arrowR size={13} />}>
                Review
            </Button>
        </div>
    );
}

function Paginator({ page, pageCount, onPrev, onNext }) {
    return (
        <div style={{
            padding: 12,
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
        }}>
            <Button size="sm" variant="ghost" onClick={onPrev} disabled={page === 0}>
                ← Prev
            </Button>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                Page {page + 1} of {pageCount}
            </span>
            <Button size="sm" variant="ghost" onClick={onNext} disabled={page >= pageCount - 1}>
                Next →
            </Button>
        </div>
    );
}

function EmptyCard({ status }) {
    return (
        <div style={{
            background: 'white', border: '1px solid var(--border)',
            borderRadius: 12, padding: 60, textAlign: 'center',
        }}>
            <Icons.users size={32} style={{ color: 'var(--text-3)' }} />
            <p className="mp-h4" style={{ marginTop: 12, color: 'var(--text-1)' }}>
                No vendors {status ? `in ${status.toLowerCase()} status` : 'yet'}
            </p>
            <p className="body-sm" style={{ marginTop: 4, color: 'var(--text-2)' }}>
                {status === 'PENDING'
                    ? 'New self-registrations land here for verification review.'
                    : 'When vendors register or get invited, they show up here.'}
            </p>
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
            <Button variant="secondary" size="sm" onClick={onRetry} style={{ marginTop: 12 }}>
                Retry
            </Button>
        </div>
    );
}

function Skeleton() {
    return (
        <div style={{
            background: 'white', border: '1px solid var(--border)',
            borderRadius: 12, overflow: 'hidden',
        }}>
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{
                    height: 64,
                    borderBottom: i < 3 ? '1px solid var(--border)' : 0,
                    background: 'var(--surface-subtle)',
                    animation: 'mp-flash 1.6s ease-in-out infinite',
                }} />
            ))}
        </div>
    );
}
