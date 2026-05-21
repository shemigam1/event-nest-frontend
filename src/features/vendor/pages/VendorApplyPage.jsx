import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useSelector } from 'react-redux';
import {
    useGetEventByIdQuery,
    useGetEventTiersQuery,
} from '@/features/events/eventsApi';
import { useGetProgrammeQuery } from '@/features/organiser/programmeApi';
import {
    useGetMyVendorVerificationQuery,
    useGetMyVendorApplicationsQuery,
    useApplyAsVendorMutation,
} from '@/features/organiser/vendorsApi';
import { selectIsAuthenticated, selectCurrentUserId } from '@/features/auth/authSlice';
import { formatEventDate } from '@/utils/dateFormat';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Icons } from '@/components/ui/Icon';
import { withExisting } from '../serviceTypes';

/* Dedicated apply page. Replaces the old modal so vendors can review the
   event details (date, venue, programme, tiers) before pitching. Gates:
     - anon         → redirect to /login with return path
     - no profile   → redirect to /vendor/profile
     - own event    → block (organisers can't pitch their own event)
     - already applied → show status pill instead of the form */
export default function VendorApplyPage() {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const currentUserId   = useSelector(selectCurrentUserId);

    const event       = useGetEventByIdQuery(eventId);
    const tiersQuery  = useGetEventTiersQuery(eventId);
    const programme   = useGetProgrammeQuery(eventId);
    const verification = useGetMyVendorVerificationQuery(undefined, { skip: !isAuthenticated });
    const mine        = useGetMyVendorApplicationsQuery(undefined, { skip: !isAuthenticated });

    const [applyAsVendor, applyState] = useApplyAsVendorMutation();

    // Form state. We re-mount the form via a `key` derived from the
    // verification record's identity once it lands — that's how we seed
    // serviceType without resorting to a useEffect + setState pattern.
    const [description, setDescription] = useState('');
    const [proposedAmount, setAmount]   = useState('');
    const [submitted, setSubmitted]     = useState(false);
    const [error, setError]             = useState('');

    // Anon → login redirect.
    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login', { replace: true, state: { from: `/vendor/apply/${eventId}` } });
        }
    }, [isAuthenticated, navigate, eventId]);

    // No vendor profile → bounce to /vendor/profile with a return path
    // so they land back here after setting one up.
    useEffect(() => {
        if (!isAuthenticated) return;
        if (verification.isLoading) return;
        // Real backend profile has `businessName`; the old `serviceType` field no longer exists.
        const hasProfile = !!verification.data?.businessName;
        if (!hasProfile) {
            navigate('/vendor/profile', {
                replace: true,
                state: { from: `/vendor/apply/${eventId}`, reason: 'needs-profile' },
            });
        }
    }, [isAuthenticated, verification.isLoading, verification.data, navigate, eventId]);

    if (!isAuthenticated || event.isLoading || verification.isLoading) {
        return <Shell><PageSkeleton /></Shell>;
    }
    if (event.isError || !event.data) {
        return (
            <Shell>
                <ErrorBox
                    message={event.error?.data?.message || 'Event not found.'}
                    onBack={() => navigate('/vendor/opportunities')}
                />
            </Shell>
        );
    }

    const e = event.data;
    const isOwnEvent = !!currentUserId && e.createdBy && currentUserId === e.createdBy;
    const isPublished = e.status === 'PUBLISHED';
    // Already-applied detection — the most recent application for this
    // event short-circuits the form.
    const existingApp = (mine.data || []).find((a) => a.eventId === eventId);

    if (isOwnEvent) {
        return (
            <Shell>
                <BackLink onClick={() => navigate(`/events/${eventId}`)} />
                <NoticeCard
                    icon={<Icons.alert size={22} style={{ color: 'var(--text-3)' }} />}
                    title="You can't pitch your own event"
                    body="Organisers can't be vendors on the events they run."
                />
            </Shell>
        );
    }

    if (!isPublished) {
        return (
            <Shell>
                <BackLink onClick={() => navigate(`/events/${eventId}`)} />
                <NoticeCard
                    icon={<Icons.lock size={22} style={{ color: 'var(--text-3)' }} />}
                    title="Not open for vendor applications"
                    body="This event isn't published yet. Check back when it goes live."
                />
            </Shell>
        );
    }

    async function submit(serviceType) {
        if (!serviceType) { setError('Pick a service type.'); return; }
        setError('');
        try {
            await applyAsVendor({
                eventId,
                serviceType,
                description: description.trim() || null,
                proposedAmount: proposedAmount ? Number(proposedAmount) : null,
            }).unwrap();
            setSubmitted(true);
        } catch (err) {
            setError(err?.data?.message || 'Could not submit application.');
        }
    }

    const tiers = tiersQuery.data || [];
    const programmeItems = (programme.data || []).slice().sort((a, b) => {
        const at = a.startTime ? new Date(a.startTime).getTime() : Infinity;
        const bt = b.startTime ? new Date(b.startTime).getTime() : Infinity;
        return at - bt;
    });
    const totalCapacity = tiers.reduce((s, t) => s + (t.totalCapacity ?? 0), 0);

    return (
        <Shell>
            <BackLink onClick={() => navigate(`/events/${eventId}`)} />

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) 360px',
                gap: 20,
                alignItems: 'start',
            }}>
                {/* Left rail: event context */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
                    <EventHeaderCard event={e} totalCapacity={totalCapacity} />

                    {programme.isSuccess && programmeItems.length > 0 && (
                        <ProgrammeCard items={programmeItems} />
                    )}

                    {tiers.length > 0 && (
                        <TiersCard tiers={tiers} />
                    )}

                    {e.description && (
                        <DescriptionCard description={e.description} />
                    )}
                </div>

                {/* Right rail: pitch form */}
                <div style={{ position: 'sticky', top: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {submitted ? (
                        <SuccessCard onDone={() => navigate('/vendor/applications')} />
                    ) : existingApp ? (
                        <AlreadyAppliedCard
                            application={existingApp}
                            onView={() => navigate('/vendor/applications')}
                        />
                    ) : (
                        <PitchForm
                            // Pre-fill the pitch's service-type field with the vendor's
                            // backend category enum (e.g. "PHOTOGRAPHY"). The form will
                            // typically map this to a user-friendly label downstream.
                            initialServiceType={verification.data?.category ?? ''}
                            description={description}
                            setDescription={setDescription}
                            proposedAmount={proposedAmount}
                            setAmount={setAmount}
                            onSubmit={submit}
                            busy={applyState.isLoading}
                            error={error}
                            onCancel={() => navigate(`/events/${eventId}`)}
                        />
                    )}
                </div>
            </div>
        </Shell>
    );
}

/* ─── Cards ──────────────────────────────────────── */

function EventHeaderCard({ event: e, totalCapacity }) {
    return (
        <div style={{
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: 12,
            overflow: 'hidden',
        }}>
            {e.coverImageUrl ? (
                <div
                    role="img"
                    aria-label={e.title}
                    style={{
                        height: 180,
                        backgroundImage: `url(${e.coverImageUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundColor: 'var(--surface-subtle)',
                    }}
                />
            ) : (
                <div
                    className="mp-placeholder"
                    data-label="EVENT"
                    style={{ height: 180 }}
                    aria-hidden="true"
                />
            )}
            <div style={{ padding: 22 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', letterSpacing: 0.4, marginBottom: 8 }}>
                    PITCHING FOR
                </div>
                <h1 className="mp-h1" style={{ margin: 0, color: 'var(--text-1)' }}>
                    {e.title}
                </h1>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 14, fontSize: 14, color: 'var(--text-2)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Icons.calendar size={14} style={{ color: 'var(--text-3)' }} />
                        {formatEventDate(e.startTime)}
                    </span>
                    {e.venue && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <Icons.pin size={14} style={{ color: 'var(--text-3)' }} />
                            {e.venue}
                        </span>
                    )}
                    {totalCapacity > 0 && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <Icons.users size={14} style={{ color: 'var(--text-3)' }} />
                            {totalCapacity.toLocaleString()} capacity
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

function DescriptionCard({ description }) {
    return (
        <Card title="About this event">
            <p style={{ margin: 0, fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {description}
            </p>
        </Card>
    );
}

function ProgrammeCard({ items }) {
    return (
        <Card title={`Run of show (${items.length})`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {items.map((it, i) => (
                    <div key={it.id} style={{
                        display: 'grid',
                        gridTemplateColumns: '110px 1fr',
                        gap: 12,
                        alignItems: 'flex-start',
                        padding: '10px 0',
                        borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 0,
                    }}>
                        <div className="mp-num" style={{
                            fontSize: 12, fontWeight: 600,
                            color: it.startTime ? 'var(--text-1)' : 'var(--text-3)',
                            paddingTop: 2,
                        }}>
                            {it.startTime
                                ? new Date(it.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
                                : '—'}
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 14 }}>
                                {it.title}
                            </div>
                            {it.speakerName && (
                                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                                    {it.speakerName}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}

function TiersCard({ tiers }) {
    return (
        <Card title="Ticket tiers">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {tiers.map((t, i) => {
                    const sold = (t.totalCapacity ?? 0) - (t.availableCapacity ?? 0);
                    const price = Number(t.price ?? 0);
                    return (
                        <div key={t.id} style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr auto',
                            gap: 12,
                            alignItems: 'baseline',
                            padding: '10px 0',
                            borderBottom: i < tiers.length - 1 ? '1px solid var(--border)' : 0,
                        }}>
                            <div>
                                <div style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 14 }}>
                                    {t.name}
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                                    {sold} / {t.totalCapacity} sold
                                </div>
                            </div>
                            <div className="mp-num" style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 14 }}>
                                {price > 0
                                    ? `₦${price.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`
                                    : 'Free'}
                            </div>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
}

/* ─── Pitch form ─────────────────────────────────── */

function PitchForm({
    initialServiceType,
    description, setDescription,
    proposedAmount, setAmount,
    onSubmit, busy, error, onCancel,
}) {
    // Owns serviceType locally — initialised once from the user's
    // verification record. Re-render-safe; if the verification record
    // changes the parent re-mounts via key.
    const [serviceType, setServiceType] = useState(initialServiceType || '');

    function handleSubmit(e) {
        e.preventDefault();
        onSubmit(serviceType);
    }

    return (
        <form onSubmit={handleSubmit} style={{
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 20,
        }}>
            <h3 className="mp-h4" style={{ margin: 0, color: 'var(--text-1)' }}>
                Make your pitch
            </h3>
            <p className="body-sm" style={{ color: 'var(--text-2)', marginTop: 6 }}>
                The organiser sees these three fields plus your profile.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
                <label style={{ display: 'block' }}>
                    <span style={{
                        display: 'block', fontSize: 14, fontWeight: 500,
                        color: 'var(--text-1)', marginBottom: 6,
                    }}>
                        Service type *
                    </span>
                    <select
                        value={serviceType}
                        onChange={(e) => setServiceType(e.target.value)}
                        aria-label="Service type"
                        style={{
                            width: '100%',
                            height: 44,
                            padding: '0 14px',
                            background: 'white',
                            border: '1px solid var(--border)',
                            borderRadius: 12,
                            fontSize: 15,
                            fontFamily: 'inherit',
                            color: serviceType ? 'var(--text-1)' : 'var(--text-3)',
                            boxSizing: 'border-box',
                            cursor: 'pointer',
                        }}
                    >
                        <option value="" disabled>Pick a service type…</option>
                        {withExisting(serviceType).map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                    </select>
                </label>

                <label style={{ display: 'block' }}>
                    <span style={{
                        display: 'block', fontSize: 14, fontWeight: 500,
                        color: 'var(--text-1)', marginBottom: 6,
                    }}>
                        Description <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span>
                    </span>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={4}
                        placeholder="What you'd deliver for this event, links to portfolio, etc."
                        style={{
                            width: '100%', padding: 12,
                            fontFamily: 'inherit', fontSize: 14,
                            border: '1px solid var(--border)', borderRadius: 8,
                            resize: 'vertical', color: 'var(--text-1)',
                            boxSizing: 'border-box',
                        }}
                    />
                </label>

                <Input
                    label="Proposed amount (₦, optional)"
                    type="number"
                    min="0"
                    value={proposedAmount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="500000"
                />
            </div>

            {error && (
                <div role="alert" style={{
                    marginTop: 14,
                    padding: '10px 12px',
                    background: 'var(--error-bg, #FBE9E9)',
                    color: 'var(--error)',
                    borderRadius: 8,
                    fontSize: 13,
                }}>
                    {error}
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
                <Button type="button" variant="ghost" size="md" onClick={onCancel} disabled={busy}>
                    Cancel
                </Button>
                <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={busy || !serviceType}
                >
                    {busy ? 'Submitting…' : 'Submit application'}
                </Button>
            </div>
        </form>
    );
}

function SuccessCard({ onDone }) {
    return (
        <div style={{
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 24,
            textAlign: 'center',
        }}>
            <div style={{
                width: 52, height: 52, borderRadius: 99,
                background: '#E6F4EA', color: '#0F7B3E',
                display: 'grid', placeItems: 'center',
                margin: '0 auto 12px',
            }}>
                <Icons.check size={24} />
            </div>
            <div className="mp-h4" style={{ color: 'var(--text-1)', margin: 0 }}>
                Application sent
            </div>
            <p className="body-sm" style={{ color: 'var(--text-2)', marginTop: 8 }}>
                The organiser will review your pitch. You can track the
                status from your applications dashboard.
            </p>
            <Button
                variant="primary"
                size="md"
                onClick={onDone}
                style={{ marginTop: 14 }}
                iconRight={<Icons.arrowR size={14} />}
            >
                Go to my applications
            </Button>
        </div>
    );
}

function AlreadyAppliedCard({ application, onView }) {
    const status = application.status;
    const style = {
        PENDING:  { bg: '#FEF4E2', fg: '#B8770A', label: 'Pending review' },
        ACCEPTED: { bg: '#E6F4EA', fg: '#0F9D58', label: 'Accepted' },
        REJECTED: { bg: '#FBE9E9', fg: '#D62828', label: 'Rejected' },
    }[status] || { bg: '#F5F7FA', fg: '#4A5468', label: status };

    return (
        <div style={{
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 20,
        }}>
            <div className="mp-h4" style={{ margin: 0, color: 'var(--text-1)' }}>
                You&apos;ve already applied
            </div>
            <p className="body-sm" style={{ color: 'var(--text-2)', marginTop: 6 }}>
                Your previous application for <strong>{application.serviceType}</strong> is on file.
            </p>
            <div style={{
                marginTop: 12,
                display: 'inline-flex',
                padding: '4px 10px',
                borderRadius: 99,
                background: style.bg,
                color: style.fg,
                fontSize: 12,
                fontWeight: 600,
            }}>
                {style.label}
            </div>
            <Button
                variant="secondary"
                size="md"
                onClick={onView}
                iconRight={<Icons.arrowR size={14} />}
                style={{ marginTop: 14, width: '100%' }}
            >
                View my applications
            </Button>
        </div>
    );
}

/* ─── Utility ────────────────────────────────────── */

function Card({ title, children }) {
    return (
        <div style={{
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: 12,
            overflow: 'hidden',
        }}>
            <div style={{
                padding: '12px 18px',
                borderBottom: '1px solid var(--border)',
                fontSize: 13, fontWeight: 600, color: 'var(--text-1)',
            }}>
                {title}
            </div>
            <div style={{ padding: 18 }}>
                {children}
            </div>
        </div>
    );
}

function NoticeCard({ icon, title, body }) {
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
                background: 'var(--surface-subtle)',
                display: 'grid', placeItems: 'center',
                margin: '0 auto 12px',
            }}>
                {icon}
            </div>
            <div className="mp-h4" style={{ color: 'var(--text-1)', margin: 0 }}>{title}</div>
            <p className="body-sm" style={{ color: 'var(--text-2)', marginTop: 8 }}>{body}</p>
        </div>
    );
}

function ErrorBox({ message, onBack }) {
    return (
        <div style={{
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 40,
            textAlign: 'center',
        }}>
            <Icons.alert size={26} style={{ color: 'var(--error)' }} />
            <p className="body-sm" style={{ marginTop: 8, color: 'var(--text-2)' }}>{message}</p>
            <Button variant="secondary" size="sm" onClick={onBack} style={{ marginTop: 12 }}>
                Back to opportunities
            </Button>
        </div>
    );
}

function BackLink({ onClick }) {
    return (
        <button
            onClick={onClick}
            style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'none', border: 0, padding: '0 0 14px',
                cursor: 'pointer', color: 'var(--text-2)',
                fontSize: 13, fontFamily: 'inherit',
            }}
        >
            <Icons.arrowL size={14} />
            Back to event
        </button>
    );
}

function PageSkeleton() {
    const block = (h, op = 1) => ({
        height: h,
        background: 'white',
        border: '1px solid var(--border)',
        borderRadius: 12,
        animation: 'mp-flash 1.6s ease-in-out infinite',
        opacity: op,
    });
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 360px', gap: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={block(280)} />
                <div style={block(200, 0.7)} />
            </div>
            <div style={block(400, 0.5)} />
        </div>
    );
}

function Shell({ children }) {
    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 24px 80px' }}>
                {children}
            </div>
        </div>
    );
}
