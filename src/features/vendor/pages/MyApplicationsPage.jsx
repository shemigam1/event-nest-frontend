import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useGetMyVendorApplicationsQuery } from '@/features/organiser/vendorsApi';
import TopNav from '@/components/ui/TopNav';
import Button from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icon';

const STATUS_STYLE = {
    PENDING:  { bg: '#FEF4E2', fg: '#B8770A', label: 'Pending review' },
    ACCEPTED: { bg: '#E6F4EA', fg: '#0F9D58', label: 'Accepted' },
    REJECTED: { bg: '#FBE9E9', fg: '#D62828', label: 'Rejected' },
};

const FILTERS = [
    ['all',      'All'],
    ['PENDING',  'Pending'],
    ['ACCEPTED', 'Accepted'],
    ['REJECTED', 'Rejected'],
];

function ngn(amount) {
    const n = Number(amount ?? 0);
    if (!Number.isFinite(n) || n <= 0) return null;
    return `₦${n.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
}

function formatTimestamp(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function MyApplicationsPage() {
    const navigate = useNavigate();
    const apps = useGetMyVendorApplicationsQuery();
    const [filter, setFilter] = useState('all');

    const list = useMemo(() => apps.data || [], [apps.data]);
    const counts = useMemo(() => {
        const c = { all: list.length, PENDING: 0, ACCEPTED: 0, REJECTED: 0 };
        for (const a of list) {
            if (c[a.status] !== undefined) c[a.status] += 1;
        }
        return c;
    }, [list]);

    const filtered = useMemo(() => (
        filter === 'all' ? list : list.filter((a) => a.status === filter)
    ), [list, filter]);

    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            <TopNav />
            <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 80px' }}>

                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 28,
                    gap: 16,
                    flexWrap: 'wrap',
                }}>
                    <div>
                        <h1 className="mp-h1" style={{ margin: 0, color: 'var(--text-1)' }}>
                            My vendor applications
                        </h1>
                        <p className="body" style={{ margin: '6px 0 0', color: 'var(--text-2)' }}>
                            Events you&apos;ve pitched for. Status updates land here as
                            organisers review your applications.
                        </p>
                    </div>
                    <Button
                        variant="primary"
                        size="md"
                        icon={<Icons.search size={14} />}
                        onClick={() => navigate('/vendor/opportunities')}
                    >
                        Find opportunities
                    </Button>
                </div>

                {/* Tiles */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 16,
                    marginBottom: 24,
                }}>
                    <Tile label="Total" value={apps.isLoading ? '—' : counts.all} icon={<Icons.inbox size={16} />} />
                    <Tile
                        label="Pending"
                        value={apps.isLoading ? '—' : counts.PENDING}
                        accent={counts.PENDING > 0 ? 'var(--warning)' : undefined}
                    />
                    <Tile
                        label="Accepted"
                        value={apps.isLoading ? '—' : counts.ACCEPTED}
                        accent={counts.ACCEPTED > 0 ? 'var(--success)' : undefined}
                    />
                    <Tile label="Rejected" value={apps.isLoading ? '—' : counts.REJECTED} />
                </div>

                {/* List card */}
                <div style={{
                    background: 'white',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    overflow: 'hidden',
                }}>
                    <div style={{
                        padding: '14px 20px',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 12,
                        flexWrap: 'wrap',
                    }}>
                        <div style={{
                            display: 'flex',
                            gap: 4,
                            padding: 4,
                            background: 'var(--surface-subtle)',
                            borderRadius: 10,
                            border: '1px solid var(--border)',
                            flexWrap: 'wrap',
                        }}>
                            {FILTERS.map(([k, l]) => {
                                const active = filter === k;
                                const n = k === 'all' ? counts.all : counts[k];
                                return (
                                    <button
                                        key={k}
                                        onClick={() => setFilter(k)}
                                        style={{
                                            background: active ? 'white' : 'transparent',
                                            border: 0,
                                            padding: '6px 12px',
                                            borderRadius: 7,
                                            fontSize: 13,
                                            fontWeight: active ? 600 : 500,
                                            color: active ? 'var(--mp-blue)' : 'var(--text-2)',
                                            boxShadow: active ? 'var(--shadow-card)' : 'none',
                                            cursor: 'pointer',
                                            fontFamily: 'inherit',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 4,
                                        }}
                                    >
                                        {l}
                                        <span className="mp-num" style={{ color: 'var(--text-3)' }}>{n}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {apps.isLoading && <Skeleton />}

                    {apps.isError && !apps.isLoading && (
                        <div style={{ padding: 40, textAlign: 'center' }}>
                            <Icons.alert size={28} style={{ color: 'var(--error)' }} />
                            <p className="body-sm" style={{ marginTop: 8, color: 'var(--text-2)' }}>
                                {apps.error?.data?.message || 'Could not load your applications.'}
                            </p>
                            <Button variant="secondary" size="sm" onClick={apps.refetch} style={{ marginTop: 12 }}>
                                Retry
                            </Button>
                        </div>
                    )}

                    {apps.isSuccess && list.length === 0 && (
                        <EmptyState onBrowse={() => navigate('/vendor/opportunities')} />
                    )}

                    {apps.isSuccess && list.length > 0 && filtered.length === 0 && (
                        <div style={{
                            padding: 50,
                            textAlign: 'center',
                            color: 'var(--text-3)',
                            fontSize: 14,
                        }}>
                            No applications with this status.
                        </div>
                    )}

                    {apps.isSuccess && filtered.map((a, i) => (
                        <ApplicationRow
                            key={a.id}
                            application={a}
                            isLast={i === filtered.length - 1}
                            onView={() => navigate(`/events/${a.eventId}`)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

function Tile({ label, value, sub, icon, accent }) {
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
            <div className="mp-num" style={{
                fontSize: 26,
                fontWeight: 700,
                lineHeight: 1,
                color: accent || 'var(--text-1)',
            }}>
                {value}
            </div>
            {sub && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>{sub}</div>}
        </div>
    );
}

function ApplicationRow({ application, isLast, onView }) {
    const style = STATUS_STYLE[application.status] || STATUS_STYLE.PENDING;
    const amount = ngn(application.proposedAmount);
    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: 16,
            alignItems: 'flex-start',
            padding: '18px 20px',
            borderBottom: isLast ? 0 : '1px solid var(--border)',
        }}>
            <div style={{ minWidth: 0 }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 6,
                    flexWrap: 'wrap',
                }}>
                    <button
                        onClick={onView}
                        style={{
                            background: 'none',
                            border: 0,
                            padding: 0,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            fontWeight: 600,
                            color: 'var(--mp-blue)',
                            fontSize: 15,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                        }}
                    >
                        {application.eventTitle}
                        <Icons.arrowR size={13} style={{ opacity: 0.7 }} />
                    </button>
                    <span style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        background: 'var(--surface-subtle)',
                        borderRadius: 6,
                        color: 'var(--text-2)',
                        fontWeight: 600,
                    }}>
                        {application.serviceType}
                    </span>
                    <span style={{
                        padding: '2px 9px',
                        background: style.bg,
                        color: style.fg,
                        fontSize: 11,
                        fontWeight: 600,
                        borderRadius: 99,
                    }}>
                        {style.label}
                    </span>
                </div>
                {application.description && (
                    <p className="body-sm" style={{
                        margin: '0 0 8px',
                        color: 'var(--text-2)',
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.5,
                    }}>
                        {application.description}
                    </p>
                )}
                <div style={{
                    display: 'flex',
                    gap: 14,
                    fontSize: 12,
                    color: 'var(--text-3)',
                    flexWrap: 'wrap',
                }}>
                    {amount && (
                        <span className="mp-num" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Icons.wallet size={12} />
                            <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{amount}</span>
                            <span>proposed</span>
                        </span>
                    )}
                    <span>· Applied {formatTimestamp(application.createdAt)}</span>
                    {application.reviewedAt && (
                        <span>· Reviewed {formatTimestamp(application.reviewedAt)}</span>
                    )}
                </div>
            </div>
        </div>
    );
}

function EmptyState({ onBrowse }) {
    return (
        <div style={{ textAlign: 'center', padding: 50 }}>
            <div style={{
                width: 52, height: 52, borderRadius: 99,
                margin: '0 auto 14px',
                background: 'var(--surface-subtle)',
                display: 'grid', placeItems: 'center',
                color: 'var(--text-3)',
            }}>
                <Icons.inbox size={20} />
            </div>
            <div className="mp-h4" style={{ color: 'var(--text-1)', margin: 0 }}>
                You haven&apos;t applied yet
            </div>
            <p className="body-sm" style={{ color: 'var(--text-2)', marginTop: 6 }}>
                Browse open events and pitch the ones that match what you do.
            </p>
            <Button
                variant="primary"
                size="md"
                icon={<Icons.search size={14} />}
                onClick={onBrowse}
                style={{ marginTop: 16 }}
            >
                Find opportunities
            </Button>
        </div>
    );
}

function Skeleton() {
    const row = {
        height: 96,
        background: 'var(--surface-subtle)',
        borderBottom: '1px solid var(--border)',
        animation: 'mp-flash 1.6s ease-in-out infinite',
    };
    return (
        <>
            <div style={row} />
            <div style={{ ...row, opacity: 0.7 }} />
            <div style={{ ...row, opacity: 0.4, borderBottom: 0 }} />
        </>
    );
}
