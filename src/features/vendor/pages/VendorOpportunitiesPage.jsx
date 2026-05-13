import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useGetPublishedEventsQuery } from '@/features/events/eventsApi';
import {
    useGetMyVendorApplicationsQuery,
    useGetMyVendorVerificationQuery,
    useApplyAsVendorMutation,
} from '@/features/organiser/vendorsApi';
import { formatEventDate } from '@/utils/dateFormat';
import TopNav from '@/components/ui/TopNav';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { Icons } from '@/components/ui/Icon';

export default function VendorOpportunitiesPage() {
    const navigate = useNavigate();
    const events = useGetPublishedEventsQuery();
    const mine = useGetMyVendorApplicationsQuery();
    // "Profile" in this build is a verification record on the user — a single
    // serviceType + description pair. Required before applying; verification
    // approval is NOT required.
    const { data: myProfile, isLoading: profileLoading } = useGetMyVendorVerificationQuery();

    const [query, setQuery] = useState('');
    const [target, setTarget] = useState(null);

    const list = useMemo(() => events.data || [], [events.data]);
    const filtered = useMemo(() => {
        if (!query.trim()) return list;
        const q = query.toLowerCase();
        return list.filter((e) => (
            (e.title || '').toLowerCase().includes(q)
            || (e.venue || '').toLowerCase().includes(q)
        ));
    }, [list, query]);

    // eventId → application (the most recent one for that event, if any).
    const appliedByEvent = useMemo(() => {
        const map = {};
        for (const a of (mine.data || [])) {
            if (!map[a.eventId]) map[a.eventId] = a;
        }
        return map;
    }, [mine.data]);

    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            <TopNav />
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 80px' }}>
                {/* Header */}
                <div style={{ marginBottom: 24 }}>
                    <h1 className="mp-h1" style={{ margin: 0, color: 'var(--text-1)' }}>
                        Vendor opportunities
                    </h1>
                    <p className="body" style={{ margin: '8px 0 0', color: 'var(--text-2)' }}>
                        Browse published events and pitch the ones you&apos;d be great for.
                        Any account can apply — no separate vendor signup.
                    </p>
                </div>

                {/* Hero hint */}
                <div style={{
                    background: 'var(--mp-navy)',
                    color: 'white',
                    borderRadius: 12,
                    padding: '18px 22px',
                    marginBottom: 24,
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: 16,
                    alignItems: 'center',
                }}>
                    <div>
                        <div style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: 'rgba(255,255,255,0.65)',
                            letterSpacing: 0.4,
                        }}>
                            HOW IT WORKS
                        </div>
                        <div className="mp-h4" style={{ color: 'white', marginTop: 4 }}>
                            Apply → organiser reviews → get accepted
                        </div>
                        <p style={{
                            fontSize: 13,
                            color: 'rgba(255,255,255,0.75)',
                            marginTop: 6,
                            lineHeight: 1.5,
                        }}>
                            Submit a short pitch with service type, scope, and price.
                            Track every application from <strong style={{ color: 'white' }}>My applications</strong>.
                        </p>
                    </div>
                    <Button
                        variant="onDark"
                        size="md"
                        onClick={() => navigate('/vendor/applications')}
                        iconRight={<Icons.arrowR size={14} />}
                    >
                        My applications
                    </Button>
                </div>

                {/* Search */}
                <div style={{ marginBottom: 20, maxWidth: 420 }}>
                    <Input
                        placeholder="Search by event title or venue"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        icon={<Icons.search size={18} />}
                    />
                </div>

                {events.isLoading && <GridSkeleton />}

                {events.isError && (
                    <div style={{
                        background: 'white',
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                        padding: 40,
                        textAlign: 'center',
                    }}>
                        <Icons.alert size={28} style={{ color: 'var(--error)' }} />
                        <p className="body-sm" style={{ marginTop: 8, color: 'var(--text-2)' }}>
                            Could not load events.
                        </p>
                        <Button variant="secondary" size="sm" onClick={events.refetch} style={{ marginTop: 12 }}>
                            Retry
                        </Button>
                    </div>
                )}

                {events.isSuccess && list.length === 0 && (
                    <EmptyState />
                )}

                {events.isSuccess && list.length > 0 && filtered.length === 0 && (
                    <div style={{
                        background: 'white',
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                        padding: 40,
                        textAlign: 'center',
                        color: 'var(--text-3)',
                    }}>
                        No events match &ldquo;{query}&rdquo;.
                    </div>
                )}

                {events.isSuccess && filtered.length > 0 && (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                        gap: 16,
                    }}>
                        {filtered.map((event) => (
                            <OpportunityCard
                                key={event.id}
                                event={event}
                                application={appliedByEvent[event.id]}
                                onApply={() => setTarget(event)}
                                onView={() => navigate(`/events/${event.id}`)}
                            />
                        ))}
                    </div>
                )}
            </div>

            <ApplyAsVendorModal
                event={target}
                profile={myProfile}
                profileLoading={profileLoading}
                onClose={() => setTarget(null)}
                onGoToProfile={() => navigate('/vendor/profile')}
            />
        </div>
    );
}

/* ─── Card ─────────────────────────────────────────── */
function OpportunityCard({ event, application, onApply, onView }) {
    const applied = !!application;

    return (
        <div style={{
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: 12,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
        }}>
            {event.coverImageUrl ? (
                <div
                    role="img"
                    aria-label={event.title}
                    style={{
                        height: 140,
                        backgroundImage: `url(${event.coverImageUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundColor: 'var(--surface-subtle)',
                    }}
                />
            ) : (
                <div
                    className="mp-placeholder"
                    data-label="EVENT"
                    style={{ height: 140 }}
                    aria-hidden="true"
                />
            )}
            <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                <button
                    onClick={onView}
                    style={{
                        background: 'none',
                        border: 0,
                        padding: 0,
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                    }}
                >
                    <h3 className="mp-h4" style={{ margin: 0, color: 'var(--text-1)' }}>
                        {event.title}
                    </h3>
                </button>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    fontSize: 13,
                    color: 'var(--text-2)',
                }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Icons.calendar size={13} style={{ color: 'var(--text-3)' }} />
                        {formatEventDate(event.startTime)}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Icons.pin size={13} style={{ color: 'var(--text-3)' }} />
                        {event.venue}
                    </span>
                </div>

                <div style={{ marginTop: 'auto', paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                    {applied ? (
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 8,
                            flexWrap: 'wrap',
                        }}>
                            <ApplicationStatusPill status={application.status} />
                            <Button size="sm" variant="ghost" onClick={onView}>
                                View event
                            </Button>
                        </div>
                    ) : (
                        <Button
                            size="sm"
                            variant="primary"
                            onClick={onApply}
                            iconRight={<Icons.arrowR size={13} />}
                            style={{ width: '100%' }}
                        >
                            Apply as vendor
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

function ApplicationStatusPill({ status }) {
    const style = {
        PENDING:  { bg: '#FEF4E2', fg: '#B8770A', label: 'Pending review' },
        ACCEPTED: { bg: '#E6F4EA', fg: '#0F9D58', label: 'Accepted' },
        REJECTED: { bg: '#FBE9E9', fg: '#D62828', label: 'Rejected' },
    }[status] || { bg: '#F5F7FA', fg: '#4A5468', label: status };
    return (
        <span style={{
            padding: '4px 10px',
            background: style.bg,
            color: style.fg,
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 99,
        }}>
            {style.label}
        </span>
    );
}

/* ─── Apply modal ─────────────────────────────────── */
function ApplyAsVendorModal({ event, profile, profileLoading, onClose, onGoToProfile }) {
    const [applyAsVendor, state] = useApplyAsVendorMutation();
    const [proposedAmount, setAmount] = useState('');
    const [note, setNote]             = useState('');
    const [error, setError]           = useState('');
    const [submitted, setSubmitted]   = useState(false);

    function close() {
        setAmount(''); setNote(''); setError(''); setSubmitted(false);
        onClose();
    }

    async function submit() {
        setError('');
        try {
            await applyAsVendor({
                eventId: event.id,
                serviceType: profile.serviceType,
                description: note.trim() || profile.description || null,
                proposedAmount: proposedAmount ? Number(proposedAmount) : null,
            }).unwrap();
            setSubmitted(true);
        } catch (err) {
            setError(err?.data?.message || 'Could not submit application.');
        }
    }

    // A "profile" exists once the user has filled in a service type — that's
    // what we'll send on the application. Verification approval isn't required.
    const hasProfile = !!profile && !!profile.serviceType;
    const profileName = profile
        ? `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim() || profile.email || 'My profile'
        : '';

    return (
        <Modal open={!!event} onClose={close} width={480} label="Apply as vendor">
            {event && (
                <div style={{ padding: 24 }}>
                    {/* ── Success ── */}
                    {submitted && (
                        <>
                            <div style={{
                                width: 56, height: 56, borderRadius: 99,
                                background: '#E6F4EA', color: '#0F9D58',
                                display: 'grid', placeItems: 'center',
                                margin: '0 auto 14px',
                            }}>
                                <Icons.check size={26} />
                            </div>
                            <h3 className="mp-h3" style={{ margin: 0, color: 'var(--text-1)', textAlign: 'center' }}>
                                Application sent!
                            </h3>
                            <p className="body-sm" style={{ color: 'var(--text-2)', marginTop: 8, textAlign: 'center' }}>
                                The organiser will see your profile and pitch for{' '}
                                <strong>{event.title}</strong>. Track status from My applications.
                            </p>
                            <Button
                                variant="primary" size="md" onClick={close}
                                style={{ display: 'block', margin: '20px auto 0' }}
                            >
                                Done
                            </Button>
                        </>
                    )}

                    {/* ── No profile yet ── */}
                    {!submitted && !profileLoading && !hasProfile && (
                        <>
                            <div style={{
                                width: 56, height: 56, borderRadius: 99,
                                background: '#FEF4E2', color: '#B8770A',
                                display: 'grid', placeItems: 'center',
                                margin: '0 auto 14px',
                            }}>
                                <Icons.users size={24} />
                            </div>
                            <h3 className="mp-h3" style={{ margin: 0, color: 'var(--text-1)', textAlign: 'center' }}>
                                Set up your vendor profile first
                            </h3>
                            <p className="body-sm" style={{ color: 'var(--text-2)', marginTop: 8, textAlign: 'center' }}>
                                Organisers review your profile when they get your application.
                                Create yours — it only takes a minute — then come back to apply for{' '}
                                <strong>{event.title}</strong>.
                            </p>
                            <p className="body-sm" style={{
                                color: 'var(--text-3)', marginTop: 6, textAlign: 'center', fontSize: 12,
                            }}>
                                You don&apos;t need to be verified to apply. Any active profile works.
                            </p>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 20 }}>
                                <Button variant="ghost" size="md" onClick={close}>
                                    Cancel
                                </Button>
                                <Button
                                    variant="primary" size="md"
                                    onClick={onGoToProfile}
                                    iconRight={<Icons.arrowR size={14} />}
                                >
                                    Create vendor profile
                                </Button>
                            </div>
                        </>
                    )}

                    {/* ── Loading profile ── */}
                    {!submitted && profileLoading && (
                        <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>
                            Loading…
                        </div>
                    )}

                    {/* ── Has profile → confirm pitch ── */}
                    {!submitted && !profileLoading && hasProfile && (
                        <>
                            <h3 className="mp-h3" style={{ margin: 0, color: 'var(--text-1)' }}>
                                Apply for this event
                            </h3>
                            <p className="body-sm" style={{ color: 'var(--text-2)', marginTop: 4 }}>
                                Pitching for <strong>{event.title}</strong>.
                            </p>

                            {/* Profile preview */}
                            <div style={{
                                marginTop: 16,
                                padding: '12px 14px',
                                background: 'var(--surface-subtle)',
                                border: '1px solid var(--border)',
                                borderRadius: 10,
                                display: 'flex', gap: 12, alignItems: 'flex-start',
                            }}>
                                <div style={{
                                    width: 40, height: 40, borderRadius: 8, flexShrink: 0,
                                    background: '#EAF1FE', color: 'var(--mp-blue)',
                                    display: 'grid', placeItems: 'center',
                                    fontSize: 14, fontWeight: 700,
                                }}>
                                    {(profileName[0] || '?').toUpperCase()}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
                                    }}>
                                        <span style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 14 }}>
                                            {profileName}
                                        </span>
                                        {profile.vendorVerified && (
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: 3,
                                                background: '#EAF1FE', color: 'var(--mp-blue)',
                                                fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 99,
                                            }}>
                                                <Icons.shield size={10} /> Verified
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
                                        {profile.serviceType}
                                    </div>
                                    {profile.description && (
                                        <div style={{
                                            fontSize: 12, color: 'var(--text-3)', marginTop: 4,
                                            display: '-webkit-box', WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                        }}>
                                            {profile.description}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
                                <Input
                                    label="Proposed amount (₦, optional)"
                                    type="number"
                                    min="0"
                                    value={proposedAmount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="e.g. 500000"
                                />
                                <label style={{ display: 'block' }}>
                                    <span style={{
                                        display: 'block', fontSize: 14, fontWeight: 500,
                                        color: 'var(--text-1)', marginBottom: 6,
                                    }}>
                                        Note to organiser{' '}
                                        <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span>
                                    </span>
                                    <textarea
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        rows={3}
                                        placeholder="Any specific angle, availability detail, or anything relevant to this event."
                                        style={{
                                            width: '100%', padding: 12,
                                            fontFamily: 'inherit', fontSize: 14,
                                            border: '1px solid var(--border)', borderRadius: 8,
                                            resize: 'vertical', color: 'var(--text-1)',
                                            boxSizing: 'border-box',
                                        }}
                                    />
                                </label>
                            </div>

                            {error && (
                                <div role="alert" style={{
                                    marginTop: 12, padding: '10px 12px',
                                    background: '#FBE9E9', color: 'var(--error)',
                                    borderRadius: 8, fontSize: 13,
                                }}>
                                    {error}
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
                                <Button variant="ghost" size="md" onClick={close} disabled={state.isLoading}>
                                    Cancel
                                </Button>
                                <Button
                                    variant="primary" size="md"
                                    onClick={submit}
                                    disabled={state.isLoading}
                                >
                                    {state.isLoading ? 'Submitting…' : 'Submit application'}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </Modal>
    );
}

function EmptyState() {
    return (
        <div style={{
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 60,
            textAlign: 'center',
        }}>
            <div style={{
                width: 56, height: 56, borderRadius: 99,
                margin: '0 auto 14px',
                background: 'var(--surface-subtle)',
                display: 'grid', placeItems: 'center',
                color: 'var(--text-3)',
            }}>
                <Icons.calendar size={22} />
            </div>
            <div className="mp-h4" style={{ color: 'var(--text-1)', margin: 0 }}>
                No published events right now
            </div>
            <p className="body-sm" style={{ color: 'var(--text-2)', marginTop: 6 }}>
                Check back soon — organisers publish events all the time.
            </p>
        </div>
    );
}

function GridSkeleton() {
    const card = {
        height: 280,
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
        </div>
    );
}
