import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
    useGetMyVendorProfileQuery,
    useCreateMyVendorProfileMutation,
    useUpdateMyVendorProfileMutation,
    useSubmitVerificationMutation,
} from '@/features/organiser/vendorsApi';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Icons } from '@/components/ui/Icon';

/* ────────────────────────────────────────────────────────────────────────────
   Vendor profile setup — backed by the real Phase-7 backend schema
   (VendorController).

   Schema:
     businessName    string (required)
     category        enum   (CATERING | AV | PHOTOGRAPHY | VENUE | DECORATION
                             | MUSIC | SECURITY | OTHER)
     bio             text   optional
     portfolioImages text[] (image URLs)
     serviceAreas    text[] (cities / regions)
     baseRate        decimal optional

   Status flow:
     - No profile             → render the "Set up profile" form
     - PENDING                → form is editable; "Submit for verification"
                                button unlocks the verification queue
     - PENDING + submitted    → status banner "Awaiting verification";
                                verificationSubmittedAt timestamp shown
     - VERIFIED               → editable, public marketplace listing visible
     - REJECTED (no enum,
       reflected by verification-
       RejectionReason)        → admin note rendered; resubmit available
     - SUSPENDED              → form disabled with the suspensionReason
   ──────────────────────────────────────────────────────────────────────── */

const CATEGORIES = [
    { value: 'CATERING',    label: 'Catering' },
    { value: 'AV',          label: 'AV & sound' },
    { value: 'PHOTOGRAPHY', label: 'Photography' },
    { value: 'VENUE',       label: 'Venue' },
    { value: 'DECORATION',  label: 'Decoration' },
    { value: 'MUSIC',       label: 'Music & DJs' },
    { value: 'SECURITY',    label: 'Security' },
    { value: 'OTHER',       label: 'Other' },
];

function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '—'
        : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function VendorProfileSetupPage() {
    const navigate = useNavigate();
    const profileQ = useGetMyVendorProfileQuery();

    if (profileQ.isLoading) return <PageShell><Skeleton /></PageShell>;

    // 404 from the backend = no profile yet. Render the self-register form.
    const isMissing =
        profileQ.isError && (profileQ.error?.status === 404 || profileQ.error?.originalStatus === 404);

    if (isMissing) {
        return (
            <PageShell>
                <ProfileForm initial={null} onCancel={() => navigate(-1)} />
            </PageShell>
        );
    }

    if (profileQ.isError) {
        return (
            <PageShell>
                <ErrorCard
                    message={profileQ.error?.data?.message || 'Could not load your vendor profile.'}
                    onRetry={profileQ.refetch}
                />
            </PageShell>
        );
    }

    const profile = profileQ.data;
    const formKey = `${profile.status}-${profile.verificationSubmittedAt ?? 'never'}-${profile.updatedAt ?? ''}`;

    return (
        <PageShell>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) 280px',
                gap: 20,
                alignItems: 'start',
            }}>
                <ProfileForm key={formKey} initial={profile} onCancel={() => navigate(-1)} />
                <Sidebar profile={profile} />
            </div>
        </PageShell>
    );
}

/* ─── Status sidebar ───────────────────────── */

const STATUS_BADGE = {
    PENDING:   { label: 'Pending verification', bg: 'var(--warning-bg)',   fg: 'var(--warning)' },
    ACTIVE:    { label: 'Active',               bg: 'var(--mp-blue-50)',   fg: 'var(--mp-blue)' },
    VERIFIED:  { label: 'Verified',             bg: 'var(--success-bg)',   fg: 'var(--success)' },
    SUSPENDED: { label: 'Suspended',            bg: 'var(--error-bg)',     fg: 'var(--error)' },
};

function Sidebar({ profile }) {
    const badge = STATUS_BADGE[profile.status] ?? STATUS_BADGE.PENDING;
    const awaitingReview = profile.status !== 'VERIFIED'
        && profile.verificationSubmittedAt
        && !profile.verificationRejectionReason;

    return (
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
                    {profile.status === 'VERIFIED' && <Icons.shield size={11} />}
                    {badge.label}
                </div>

                {profile.status === 'VERIFIED' && profile.verifiedAt && (
                    <p className="body-sm" style={{ color: 'var(--text-2)', margin: 0 }}>
                        Verified on {fmtDate(profile.verifiedAt)}. You appear in the public
                        marketplace.
                    </p>
                )}

                {awaitingReview && (
                    <p className="body-sm" style={{ color: 'var(--text-2)', margin: 0 }}>
                        Submitted {fmtDate(profile.verificationSubmittedAt)}. Admin review
                        usually takes 1–2 business days.
                    </p>
                )}

                {profile.verificationRejectionReason && (
                    <div style={{
                        marginTop: awaitingReview ? 10 : 4,
                        padding: '10px 12px',
                        background: 'var(--error-bg)',
                        borderRadius: 8,
                        fontSize: 13,
                        color: 'var(--text-2)',
                    }}>
                        <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--error)', marginBottom: 4 }}>
                            Admin note
                        </div>
                        {profile.verificationRejectionReason}
                    </div>
                )}

                {profile.suspensionReason && (
                    <div style={{
                        marginTop: 10,
                        padding: '10px 12px',
                        background: 'var(--error-bg)',
                        borderRadius: 8,
                        fontSize: 13,
                        color: 'var(--text-2)',
                    }}>
                        <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--error)', marginBottom: 4 }}>
                            Suspension reason
                        </div>
                        {profile.suspensionReason}
                    </div>
                )}
            </div>

            {/* Trust score (only meaningful when VERIFIED, but always shown for self-awareness) */}
            <div style={{
                background: 'white',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: 18,
            }}>
                <div className="mp-h4" style={{ marginBottom: 10, color: 'var(--text-1)' }}>
                    Trust score
                </div>
                <div className="mp-num" style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1 }}>
                    {profile.trustScore != null ? Number(profile.trustScore).toFixed(0) : '—'}
                    <span style={{ fontSize: 14, color: 'var(--text-3)', fontWeight: 500 }}> / 100</span>
                </div>
                <p className="body-sm" style={{ color: 'var(--text-2)', marginTop: 8 }}>
                    {profile.completedContracts ?? 0} completed · {profile.disputedContracts ?? 0} disputed
                </p>
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
                    <li>Real business name + a specific category</li>
                    <li>Bio that says what you actually deliver</li>
                    <li>Portfolio images of past work</li>
                    <li>The cities you actually serve</li>
                </ul>
            </div>
        </div>
    );
}

/* ─── The form (create OR edit) ───────────────────────── */

function ProfileForm({ initial, onCancel }) {
    const isCreate = !initial;
    const [createProfile, createState] = useCreateMyVendorProfileMutation();
    const [updateProfile, updateState] = useUpdateMyVendorProfileMutation();
    const [submitVerification, verifyState] = useSubmitVerificationMutation();

    const [form, setForm] = useState({
        businessName:    initial?.businessName ?? '',
        category:        initial?.category    ?? '',
        bio:             initial?.bio         ?? '',
        portfolioImages: initial?.portfolioImages ?? [],
        serviceAreas:    initial?.serviceAreas    ?? [],
        baseRate:        initial?.baseRate ?? '',
    });
    const [error, setError]     = useState('');
    const [savedAt, setSavedAt] = useState(null);

    const isSuspended = initial?.status === 'SUSPENDED';
    const isVerified  = initial?.status === 'VERIFIED';

    const busy = createState.isLoading || updateState.isLoading;

    function validate() {
        if (!form.businessName.trim()) return 'Business name is required.';
        if (form.businessName.length > 255) return 'Business name must be 255 characters or fewer.';
        if (!form.category) return 'Pick a category.';
        if (form.bio.length > 2000) return 'Bio must be 2000 characters or fewer.';
        if (form.baseRate !== '' && form.baseRate != null) {
            const n = Number(form.baseRate);
            if (!Number.isFinite(n) || n <= 0) return 'Base rate must be a positive number, or left blank.';
        }
        return '';
    }

    async function handleSave(e) {
        e.preventDefault();
        const v = validate();
        if (v) { setError(v); return; }
        setError('');

        const body = {
            businessName: form.businessName.trim(),
            category: form.category,
            bio: form.bio.trim() || null,
            portfolioImages: form.portfolioImages.filter((u) => u.trim()),
            serviceAreas: form.serviceAreas.filter((a) => a.trim()),
            baseRate: form.baseRate === '' ? null : Number(form.baseRate),
        };

        try {
            if (isCreate) {
                await createProfile(body).unwrap();
            } else {
                await updateProfile({
                    ...body,
                    clearBaseRate: body.baseRate == null,
                }).unwrap();
            }
            setSavedAt(Date.now());
        } catch (err) {
            setError(err?.data?.message || 'Could not save profile.');
        }
    }

    async function handleSubmitForVerification() {
        setError('');
        try {
            await submitVerification({
                // Backend Phase 7 expects { documentUrls, note }. For now we send the
                // portfolio images as document URLs; richer doc upload is a Phase D++ task.
                documentUrls: form.portfolioImages.filter((u) => u.trim()),
                note: null,
            }).unwrap();
            setSavedAt(Date.now());
        } catch (err) {
            setError(err?.data?.message || 'Could not submit for verification.');
        }
    }

    return (
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
                background: 'white',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: 24,
            }}>
                <div className="mp-h4" style={{ margin: '0 0 6px', color: 'var(--text-1)' }}>
                    {isCreate ? 'Set up your vendor profile' : 'Vendor profile'}
                </div>
                <p className="body-sm" style={{ margin: '0 0 18px', color: 'var(--text-2)' }}>
                    Your business name, category and bio show on your marketplace card.
                    Add portfolio images and the cities you serve to stand out.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <Input
                        label="Business name *"
                        value={form.businessName}
                        onChange={(e) => { setForm({ ...form, businessName: e.target.value }); setSavedAt(null); }}
                        disabled={isSuspended}
                        placeholder="e.g. Lekki Lights & Sound"
                    />

                    <label style={{ display: 'block' }}>
                        <span style={{
                            display: 'block', fontSize: 14, fontWeight: 500,
                            color: 'var(--text-1)', marginBottom: 6,
                        }}>
                            Category *
                        </span>
                        <select
                            value={form.category}
                            onChange={(e) => { setForm({ ...form, category: e.target.value }); setSavedAt(null); }}
                            disabled={isSuspended}
                            aria-label="Category"
                            style={{
                                width: '100%', height: 44, padding: '0 14px',
                                background: isSuspended ? 'var(--surface-subtle)' : 'white',
                                border: '1px solid var(--border)', borderRadius: 12,
                                fontSize: 16, fontFamily: 'inherit',
                                color: form.category ? 'var(--text-1)' : 'var(--text-3)',
                                boxSizing: 'border-box',
                                cursor: isSuspended ? 'not-allowed' : 'pointer',
                            }}
                        >
                            <option value="" disabled>Pick a category…</option>
                            {CATEGORIES.map((c) => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                        </select>
                    </label>

                    <label style={{ display: 'block' }}>
                        <span style={{
                            display: 'block', fontSize: 14, fontWeight: 500,
                            color: 'var(--text-1)', marginBottom: 6,
                        }}>
                            About your service
                        </span>
                        <textarea
                            value={form.bio}
                            onChange={(e) => { setForm({ ...form, bio: e.target.value }); setSavedAt(null); }}
                            rows={5}
                            maxLength={2000}
                            disabled={isSuspended}
                            placeholder="What you do, who you've worked with, what makes you a good fit."
                            style={{
                                width: '100%', padding: 12,
                                fontFamily: 'inherit', fontSize: 14,
                                border: '1px solid var(--border)', borderRadius: 8,
                                resize: 'vertical', color: 'var(--text-1)',
                                boxSizing: 'border-box',
                                background: isSuspended ? 'var(--surface-subtle)' : 'white',
                            }}
                        />
                        <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-3)', textAlign: 'right' }}>
                            {form.bio.length} / 2000
                        </div>
                    </label>

                    <Input
                        label="Base rate (₦, optional)"
                        type="number"
                        value={form.baseRate}
                        onChange={(e) => { setForm({ ...form, baseRate: e.target.value }); setSavedAt(null); }}
                        disabled={isSuspended}
                        placeholder="e.g. 250000"
                        min="0"
                        step="0.01"
                    />

                    <TagList
                        label="Service areas"
                        placeholder="Add a city (e.g. Lekki, Victoria Island)"
                        values={form.serviceAreas}
                        disabled={isSuspended}
                        onChange={(v) => { setForm({ ...form, serviceAreas: v }); setSavedAt(null); }}
                    />

                    <TagList
                        label="Portfolio image URLs"
                        placeholder="https://… (paste image URLs one at a time)"
                        values={form.portfolioImages}
                        disabled={isSuspended}
                        onChange={(v) => { setForm({ ...form, portfolioImages: v }); setSavedAt(null); }}
                    />
                </div>
            </div>

            {error && (
                <div role="alert" style={{
                    padding: '10px 14px',
                    background: 'var(--error-bg)',
                    color: 'var(--error)',
                    borderRadius: 8,
                    fontSize: 13,
                }}>
                    {error}
                </div>
            )}

            {savedAt && (
                <div role="status" style={{
                    padding: '10px 14px',
                    background: 'var(--success-bg)',
                    color: 'var(--success)',
                    borderRadius: 8,
                    fontSize: 13,
                    display: 'flex', alignItems: 'center', gap: 8,
                }}>
                    <Icons.check size={15} />
                    Saved.
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 10 }}>
                    <Button type="button" variant="ghost" size="md" onClick={onCancel} disabled={busy}>
                        Cancel
                    </Button>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    {!isCreate && !isVerified && !isSuspended && (
                        <Button
                            type="button"
                            variant="secondary"
                            size="md"
                            onClick={handleSubmitForVerification}
                            disabled={verifyState.isLoading || busy}
                        >
                            {verifyState.isLoading ? 'Submitting…' : 'Submit for verification'}
                        </Button>
                    )}
                    <Button type="submit" variant="primary" size="md" disabled={busy || isSuspended}>
                        {busy ? 'Saving…' : isCreate ? 'Create profile' : 'Save changes'}
                    </Button>
                </div>
            </div>
        </form>
    );
}

/* ─── Simple repeating-input list for tags (serviceAreas / portfolioImages) ─── */

function TagList({ label, placeholder, values, onChange, disabled }) {
    function setAt(i, v) {
        const next = [...values];
        next[i] = v;
        onChange(next);
    }
    function removeAt(i) {
        onChange(values.filter((_, j) => j !== i));
    }
    function add() {
        onChange([...values, '']);
    }
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-1)' }}>{label}</span>
            {values.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic' }}>
                    None yet.
                </div>
            )}
            {values.map((v, i) => (
                <div key={i} style={{ display: 'flex', gap: 8 }}>
                    <Input
                        value={v}
                        onChange={(e) => setAt(i, e.target.value)}
                        placeholder={placeholder}
                        disabled={disabled}
                    />
                    <button
                        type="button"
                        onClick={() => removeAt(i)}
                        disabled={disabled}
                        aria-label="Remove"
                        style={{
                            background: 'transparent', border: 0,
                            color: 'var(--text-3)', cursor: disabled ? 'not-allowed' : 'pointer',
                            padding: '0 4px',
                        }}
                    >
                        <Icons.x size={14} />
                    </button>
                </div>
            ))}
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={add}
                disabled={disabled}
                style={{ alignSelf: 'flex-start' }}
            >
                + Add
            </Button>
        </div>
    );
}

/* ─── Shell + helpers ───────────────────────── */

function PageShell({ children }) {
    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px 80px' }}>
                <div style={{ marginBottom: 24 }}>
                    <h1 className="mp-h1" style={{ margin: 0, color: 'var(--text-1)' }}>
                        My vendor profile
                    </h1>
                    <p className="body" style={{ margin: '8px 0 0', color: 'var(--text-2)' }}>
                        Business name, category, portfolio. Verified vendors show up in the public marketplace.
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
            <div style={block(420)} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={block(160)} />
                <div style={{ ...block(140), opacity: 0.8 }} />
                <div style={{ ...block(160), opacity: 0.6 }} />
            </div>
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
