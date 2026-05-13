import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
    useGetMyVendorVerificationQuery,
    useApplyForVerificationMutation,
} from '@/features/organiser/vendorsApi';
import TopNav from '@/components/ui/TopNav';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Icons } from '@/components/ui/Icon';

/* Maps onto the backend VendorVerificationStatus enum:
   NOT_REQUESTED | PENDING | VERIFIED | REJECTED. The user record carries
   serviceType + description directly — there's no separate profile entity. */
const STATUS_BADGE = {
    NOT_REQUESTED: { label: 'Not applied',          bg: 'var(--surface-subtle)', fg: 'var(--text-3)' },
    PENDING:       { label: 'Verification pending', bg: '#FEF4E2',               fg: '#B8770A' },
    VERIFIED:      { label: 'Verified',             bg: '#E6F4EA',               fg: '#0F7B3E' },
    REJECTED:      { label: 'Verification rejected', bg: '#FBE9E9',              fg: '#D62828' },
};

function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '—'
        : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function VendorProfileSetupPage() {
    const navigate = useNavigate();
    const { data: verification, isLoading, isError, error } = useGetMyVendorVerificationQuery();

    if (isLoading) return <PageShell><Skeleton /></PageShell>;

    if (isError) {
        return (
            <PageShell>
                <div style={{
                    background: 'white', border: '1px solid var(--border)',
                    borderRadius: 12, padding: 40, textAlign: 'center',
                }}>
                    <Icons.alert size={28} style={{ color: 'var(--error)' }} />
                    <p className="body-sm" style={{ marginTop: 8, color: 'var(--text-2)' }}>
                        {error?.data?.message || 'Could not load your verification status.'}
                    </p>
                </div>
            </PageShell>
        );
    }

    const status     = verification?.status || 'NOT_REQUESTED';
    const isVerified = status === 'VERIFIED';
    const isPending  = status === 'PENDING';
    const isRejected = status === 'REJECTED';
    const badge      = STATUS_BADGE[status] || STATUS_BADGE.NOT_REQUESTED;

    // Re-mount the form whenever the server-side record changes (after a
    // successful submit). The form owns its draft state via useState
    // initialisers, which means we don't need a useEffect to seed it.
    const formKey = verification
        ? `${status}-${verification.submittedAt ?? 'none'}`
        : 'empty';

    return (
        <PageShell>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) 280px',
                gap: 20,
                alignItems: 'start',
            }}>
                <VerificationForm
                    key={formKey}
                    initial={verification}
                    status={status}
                    onCancel={() => navigate(-1)}
                />

                {/* Sidebar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Status card */}
                    <div style={{
                        background: 'white',
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                        padding: 18,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                            <Icons.shield size={18} style={{ color: 'var(--mp-blue)' }} />
                            <span className="mp-h4" style={{ color: 'var(--text-1)' }}>Status</span>
                        </div>

                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '4px 10px', borderRadius: 99,
                            background: badge.bg, color: badge.fg,
                            fontSize: 12, fontWeight: 600, marginBottom: 12,
                        }}>
                            {isVerified && <Icons.shield size={11} />}
                            {badge.label}
                        </div>

                        {isPending && verification.submittedAt && (
                            <p className="body-sm" style={{ color: 'var(--text-2)', margin: 0 }}>
                                Submitted {fmtDate(verification.submittedAt)}. We&apos;ll email when
                                the review is done.
                            </p>
                        )}

                        {isVerified && verification.verifiedAt && (
                            <p className="body-sm" style={{ color: 'var(--text-2)', margin: 0 }}>
                                Verified on {fmtDate(verification.verifiedAt)}. Edit your details
                                above and resubmit any time to update them.
                            </p>
                        )}

                        {isRejected && verification.rejectionReason && (
                            <div style={{
                                marginTop: 4, padding: '10px 12px',
                                background: '#FBE9E9', borderRadius: 8,
                                fontSize: 13, color: 'var(--text-2)',
                            }}>
                                <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--error)', marginBottom: 4 }}>
                                    Admin note
                                </div>
                                {verification.rejectionReason}
                            </div>
                        )}

                        {status === 'NOT_REQUESTED' && (
                            <p className="body-sm" style={{ color: 'var(--text-2)', margin: 0 }}>
                                Submit your service type + description to apply for the
                                verified badge.
                            </p>
                        )}
                    </div>

                    {/* Tips */}
                    <div style={{
                        background: 'white',
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                        padding: 18,
                    }}>
                        <div className="mp-h4" style={{ marginBottom: 10, color: 'var(--text-1)' }}>
                            What admins look for
                        </div>
                        <ul style={{
                            margin: 0, paddingLeft: 18,
                            color: 'var(--text-2)', fontSize: 13,
                            display: 'flex', flexDirection: 'column', gap: 8,
                        }}>
                            <li>Specific service type — &ldquo;Catering&rdquo; not just &ldquo;Events&rdquo;.</li>
                            <li>What you actually deliver, not marketing fluff.</li>
                            <li>Past events you&apos;ve worked, if any.</li>
                            <li>Anything that proves you&apos;re real (CAC, links, references).</li>
                        </ul>
                    </div>
                </div>
            </div>
        </PageShell>
    );
}

/* The form is keyed by the verification record's identity so re-fetching
   after a submit re-mounts it and reseeds the initial draft state — no
   useEffect required. */
function VerificationForm({ initial, status, onCancel }) {
    const [applyForVerification, applyState] = useApplyForVerificationMutation();

    const [serviceType, setServiceType] = useState(initial?.serviceType || '');
    const [description, setDescription] = useState(initial?.description || '');
    const [formError, setFormError]     = useState('');
    const [savedAt, setSavedAt]         = useState(null);

    const isVerified = status === 'VERIFIED';
    const isPending  = status === 'PENDING';
    const isRejected = status === 'REJECTED';

    const submitLabel = isPending
        ? 'Awaiting admin review'
        : isVerified
            ? 'Resubmit for re-verification'
            : isRejected
                ? 'Resubmit application'
                : 'Submit for verification';

    async function handleSubmit(e) {
        e.preventDefault();
        if (!serviceType.trim()) { setFormError('Service type is required.'); return; }
        if (serviceType.trim().length > 100) {
            setFormError('Service type must be 100 characters or fewer.');
            return;
        }
        setFormError('');
        try {
            await applyForVerification({
                serviceType: serviceType.trim(),
                description: description.trim() || null,
            }).unwrap();
            setSavedAt(Date.now());
        } catch (err) {
            setFormError(err?.data?.message || 'Could not submit. Please try again.');
        }
    }

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
                background: 'white',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: 24,
            }}>
                <div className="mp-h4" style={{ margin: '0 0 6px', color: 'var(--text-1)' }}>
                    Vendor verification
                </div>
                <p className="body-sm" style={{ margin: '0 0 18px', color: 'var(--text-2)' }}>
                    Tell us what you offer and a little about your work. Verified
                    vendors show up in the marketplace with a badge.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <Input
                        label="Service type *"
                        value={serviceType}
                        onChange={(e) => { setServiceType(e.target.value); setFormError(''); setSavedAt(null); }}
                        placeholder="e.g. Catering, Photography, A/V, Security"
                        maxLength={100}
                        disabled={isPending}
                    />

                    <label style={{ display: 'block' }}>
                        <span style={{
                            display: 'block', fontSize: 14, fontWeight: 500,
                            color: 'var(--text-1)', marginBottom: 6,
                        }}>
                            About your service
                        </span>
                        <textarea
                            value={description}
                            onChange={(e) => { setDescription(e.target.value); setFormError(''); setSavedAt(null); }}
                            rows={6}
                            maxLength={2000}
                            disabled={isPending}
                            placeholder="What you do, who you've worked with, what makes you a good fit."
                            style={{
                                width: '100%', padding: 12,
                                fontFamily: 'inherit', fontSize: 14,
                                border: '1px solid var(--border)', borderRadius: 8,
                                resize: 'vertical', color: 'var(--text-1)',
                                boxSizing: 'border-box',
                                background: isPending ? 'var(--surface-subtle)' : 'white',
                            }}
                        />
                        <div style={{
                            marginTop: 4, fontSize: 11, color: 'var(--text-3)', textAlign: 'right',
                        }}>
                            {description.length} / 2000
                        </div>
                    </label>
                </div>
            </div>

            {formError && (
                <div role="alert" style={{
                    padding: '10px 14px', background: '#FBE9E9',
                    color: 'var(--error)', borderRadius: 8, fontSize: 13,
                }}>
                    {formError}
                </div>
            )}

            {savedAt && (
                <div role="status" style={{
                    padding: '10px 14px', background: '#E6F4EA',
                    color: '#0F7B3E', borderRadius: 8, fontSize: 13,
                    display: 'flex', alignItems: 'center', gap: 8,
                }}>
                    <Icons.check size={15} />
                    Submitted. Admin will review and respond.
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <Button type="button" variant="ghost" size="md" onClick={onCancel}>
                    Cancel
                </Button>
                <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={applyState.isLoading || isPending}
                >
                    {applyState.isLoading ? 'Submitting…' : submitLabel}
                </Button>
            </div>
        </form>
    );
}

function PageShell({ children }) {
    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            <TopNav />
            <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px 80px' }}>
                <div style={{ marginBottom: 24 }}>
                    <h1 className="mp-h1" style={{ margin: 0, color: 'var(--text-1)' }}>
                        My vendor profile
                    </h1>
                    <p className="body" style={{ margin: '8px 0 0', color: 'var(--text-2)' }}>
                        Service type + a short description. That&apos;s what shows on your
                        marketplace card.
                    </p>
                </div>
                {children}
            </div>
        </div>
    );
}

function Skeleton() {
    const block = (h) => ({
        height: h, background: 'white', border: '1px solid var(--border)',
        borderRadius: 12, animation: 'mp-flash 1.6s ease-in-out infinite',
    });
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 280px', gap: 20 }}>
            <div style={block(380)} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={block(160)} />
                <div style={{ ...block(140), opacity: 0.7 }} />
            </div>
        </div>
    );
}
