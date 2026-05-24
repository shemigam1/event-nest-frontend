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
   Vendor profile setup — sectioned form layout.

   Backend schema (VendorController, Phase 7):
     businessName, category, bio, portfolioImages[], serviceAreas[], baseRate.
   Status flow: PENDING → (admin review) → VERIFIED / REJECTED / SUSPENDED.

   Visual structure is borrowed from Partiful's "Add Business" sheet:
   clearly-labelled section cards, icon-prefixed inputs, chip-style lists,
   and a Cancel + primary action row at the bottom. Only fields the backend
   actually supports are wired up; placeholders / "coming soon" sections are
   not included so users don't fill in fields that quietly vanish.
   ──────────────────────────────────────────────────────────────────────── */

const CATEGORIES = [
    { value: 'CATERING',    label: 'Catering',    color: '#F59E0B' },
    { value: 'AV',          label: 'AV & sound',  color: '#8B5CF6' },
    { value: 'PHOTOGRAPHY', label: 'Photography', color: '#EC4899' },
    { value: 'VENUE',       label: 'Venue',       color: '#3B82F6' },
    { value: 'DECORATION',  label: 'Decoration',  color: '#10B981' },
    { value: 'MUSIC',       label: 'Music & DJs', color: '#EF4444' },
    { value: 'SECURITY',    label: 'Security',    color: '#6B7280' },
    { value: 'OTHER',       label: 'Other',       color: '#9CA3AF' },
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

    const isMissing =
        (profileQ.isError && (profileQ.error?.status === 404 || profileQ.error?.originalStatus === 404))
        || (!profileQ.isError && !profileQ.data);

    if (isMissing) {
        return (
            <PageShell isCreate>
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
                gridTemplateColumns: 'minmax(0, 1fr) 300px',
                gap: 20,
                alignItems: 'start',
            }}>
                <ProfileForm key={formKey} initial={profile} onCancel={() => navigate(-1)} />
                <Sidebar profile={profile} />
            </div>
        </PageShell>
    );
}

/* ─── Reusable section card ────────────────────────────────────────────── */

function SectionCard({ icon, title, subtitle, children }) {
    return (
        <section style={{
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: 24,
        }}>
            <header style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: subtitle ? 4 : 18,
            }}>
                {icon && (
                    <span style={{
                        width: 32, height: 32, borderRadius: 8,
                        display: 'inline-grid', placeItems: 'center',
                        background: 'var(--mp-blue-50, #EAF1FE)',
                        color: 'var(--mp-blue)',
                        flexShrink: 0,
                    }}>
                        {icon}
                    </span>
                )}
                <h2 className="mp-h4" style={{
                    margin: 0, color: 'var(--text-1)', fontSize: 16, fontWeight: 600,
                }}>
                    {title}
                </h2>
            </header>
            {subtitle && (
                <p className="body-sm" style={{
                    margin: '0 0 18px',
                    color: 'var(--text-2)',
                    paddingLeft: 44,
                }}>
                    {subtitle}
                </p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {children}
            </div>
        </section>
    );
}

/* ─── Category select with colour dot ─────────────────────────────────── */

function CategorySelect({ value, onChange, disabled }) {
    const selected = CATEGORIES.find((c) => c.value === value);
    return (
        <label style={{ display: 'block' }}>
            <span style={{
                display: 'block', fontSize: 14, fontWeight: 500,
                color: 'var(--text-1)', marginBottom: 6,
            }}>
                Category *
            </span>
            <span style={{ position: 'relative', display: 'block' }}>
                <span style={{
                    position: 'absolute',
                    left: 14, top: '50%', transform: 'translateY(-50%)',
                    width: 12, height: 12, borderRadius: '50%',
                    background: selected?.color ?? 'var(--text-3)',
                    pointerEvents: 'none',
                }} />
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    aria-label="Category"
                    style={{
                        width: '100%', height: 44,
                        padding: '0 38px 0 36px',
                        background: 'var(--surface-elevated)',
                        border: '1px solid var(--border)', borderRadius: 12,
                        fontSize: 16, fontFamily: 'inherit',
                        color: value ? 'var(--text-1)' : 'var(--text-3)',
                        boxSizing: 'border-box',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        appearance: 'none',
                        WebkitAppearance: 'none',
                    }}
                >
                    <option value="" disabled>Select a category…</option>
                    {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                </select>
                <span style={{
                    position: 'absolute', right: 14, top: '50%',
                    transform: 'translateY(-50%)', color: 'var(--text-3)',
                    pointerEvents: 'none', display: 'flex',
                }}>
                    <Icons.chevronD size={16} />
                </span>
            </span>
        </label>
    );
}

/* ─── Chip-style service-area input ───────────────────────────────────── */

function ServiceAreasInput({ values, onChange, disabled }) {
    const [draft, setDraft] = useState('');

    function addChip() {
        const v = draft.trim();
        if (!v) return;
        if (values.includes(v)) { setDraft(''); return; }
        onChange([...values, v]);
        setDraft('');
    }
    function removeAt(i) {
        onChange(values.filter((_, j) => j !== i));
    }
    function onKeyDown(e) {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addChip();
        } else if (e.key === 'Backspace' && !draft && values.length) {
            removeAt(values.length - 1);
        }
    }

    return (
        <div>
            <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                    <Input
                        icon={<Icons.pin size={16} />}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={onKeyDown}
                        placeholder="e.g. Lekki, Victoria Island"
                        disabled={disabled}
                    />
                </div>
                <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={addChip}
                    disabled={disabled || !draft.trim()}
                >
                    Add
                </Button>
            </div>
            {values.length > 0 && (
                <div style={{
                    display: 'flex', flexWrap: 'wrap', gap: 8,
                    marginTop: 12,
                }}>
                    {values.map((v, i) => (
                        <span key={`${v}-${i}`} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '6px 10px 6px 12px',
                            background: 'var(--mp-blue-50, #EAF1FE)',
                            color: 'var(--mp-blue)',
                            borderRadius: 99,
                            fontSize: 13, fontWeight: 500,
                        }}>
                            {v}
                            <button
                                type="button"
                                onClick={() => removeAt(i)}
                                disabled={disabled}
                                aria-label={`Remove ${v}`}
                                style={{
                                    background: 'transparent', border: 0, padding: 0,
                                    color: 'inherit', cursor: disabled ? 'not-allowed' : 'pointer',
                                    display: 'inline-flex', opacity: 0.7,
                                }}
                            >
                                <Icons.x size={12} />
                            </button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ─── Portfolio image card grid ───────────────────────────────────────── */

function PortfolioGrid({ values, onChange, disabled }) {
    const [draft, setDraft] = useState('');

    function add() {
        const v = draft.trim();
        if (!v) return;
        if (values.includes(v)) { setDraft(''); return; }
        onChange([...values, v]);
        setDraft('');
    }
    function removeAt(i) {
        onChange(values.filter((_, j) => j !== i));
    }

    return (
        <div>
            <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                    <Input
                        icon={<Icons.link size={16} />}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
                        placeholder="Paste image URL — https://…"
                        disabled={disabled}
                    />
                </div>
                <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={add}
                    disabled={disabled || !draft.trim()}
                    iconLeft={<Icons.plus size={14} />}
                >
                    Add
                </Button>
            </div>

            {values.length === 0 ? (
                <div style={{
                    marginTop: 12,
                    padding: '28px 16px',
                    border: '1.5px dashed var(--border)',
                    borderRadius: 12,
                    textAlign: 'center',
                    color: 'var(--text-3)',
                    background: 'var(--surface-subtle)',
                }}>
                    <div style={{ display: 'inline-flex', marginBottom: 8 }}>
                        <Icons.image size={24} />
                    </div>
                    <div className="body-sm" style={{ color: 'var(--text-2)' }}>
                        No portfolio images yet.
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
                        Add a few links to past work so organisers can see what you do.
                    </div>
                </div>
            ) : (
                <div style={{
                    marginTop: 12,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                    gap: 12,
                }}>
                    {values.map((url, i) => (
                        <div key={`${url}-${i}`} style={{
                            position: 'relative',
                            aspectRatio: '1 / 1',
                            borderRadius: 12,
                            overflow: 'hidden',
                            border: '1px solid var(--border)',
                            background: 'var(--surface-subtle)',
                        }}>
                            {/* eslint-disable-next-line jsx-a11y/img-redundant-alt */}
                            <img
                                src={url}
                                alt={`Portfolio image ${i + 1}`}
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.parentElement
                                        .querySelector('[data-fallback]').style.display = 'flex';
                                }}
                                style={{
                                    width: '100%', height: '100%',
                                    objectFit: 'cover', display: 'block',
                                }}
                            />
                            <div data-fallback style={{
                                display: 'none',
                                position: 'absolute', inset: 0,
                                alignItems: 'center', justifyContent: 'center',
                                color: 'var(--text-3)',
                                fontSize: 11, padding: 8, textAlign: 'center',
                                wordBreak: 'break-all',
                            }}>
                                Can&apos;t load preview
                            </div>
                            <button
                                type="button"
                                onClick={() => removeAt(i)}
                                disabled={disabled}
                                aria-label="Remove image"
                                style={{
                                    position: 'absolute', top: 6, right: 6,
                                    width: 26, height: 26, borderRadius: '50%',
                                    background: 'rgba(0,0,0,0.6)', color: 'white',
                                    border: 0, cursor: disabled ? 'not-allowed' : 'pointer',
                                    display: 'inline-grid', placeItems: 'center',
                                }}
                            >
                                <Icons.x size={12} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ─── Status sidebar ──────────────────────────────────────────────────── */

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 84 }}>
            {/* Status card */}
            <div style={{
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 14, padding: 18,
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
                        Verified on {fmtDate(profile.verifiedAt)}. You appear in the public marketplace.
                    </p>
                )}

                {awaitingReview && (
                    <p className="body-sm" style={{ color: 'var(--text-2)', margin: 0 }}>
                        Submitted {fmtDate(profile.verificationSubmittedAt)}. Admin review usually takes 1–2 business days.
                    </p>
                )}

                {profile.verificationRejectionReason && (
                    <div style={{
                        marginTop: awaitingReview ? 10 : 4,
                        padding: '10px 12px',
                        background: 'var(--error-bg)',
                        borderRadius: 8, fontSize: 13, color: 'var(--text-2)',
                    }}>
                        <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--error)', marginBottom: 4 }}>
                            Admin note
                        </div>
                        {profile.verificationRejectionReason}
                    </div>
                )}

                {profile.suspensionReason && (
                    <div style={{
                        marginTop: 10, padding: '10px 12px',
                        background: 'var(--error-bg)',
                        borderRadius: 8, fontSize: 13, color: 'var(--text-2)',
                    }}>
                        <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--error)', marginBottom: 4 }}>
                            Suspension reason
                        </div>
                        {profile.suspensionReason}
                    </div>
                )}
            </div>

            {/* Trust score */}
            <div style={{
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 14, padding: 18,
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
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 14, padding: 18,
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

/* ─── The form ────────────────────────────────────────────────────────── */

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
        // Contact + socials
        businessAddress: initial?.businessAddress ?? '',
        businessEmail:   initial?.businessEmail   ?? '',
        businessPhone:   initial?.businessPhone   ?? '',
        websiteUrl:      initial?.websiteUrl      ?? '',
        instagramHandle: initial?.instagramHandle ?? '',
        twitterHandle:   initial?.twitterHandle   ?? '',
        facebookHandle:  initial?.facebookHandle  ?? '',
        // KYC
        bvn:                        initial?.bvn                        ?? '',
        businessRegistrationNumber: initial?.businessRegistrationNumber ?? '',
    });
    const [error, setError]     = useState('');
    const [savedAt, setSavedAt] = useState(null);

    const isSuspended = initial?.status === 'SUSPENDED';
    const isVerified  = initial?.status === 'VERIFIED';
    const isPending   = initial?.status === 'PENDING';

    // BVN and business registration number are write-once: once the vendor has
    // saved either field the backend masks the value and we lock the input so
    // the masked string is never mistakenly sent back as the raw value.
    const bvnLocked = !isCreate && !!initial?.bvn;
    const brnLocked = !isCreate && !!initial?.businessRegistrationNumber;

    const busy = createState.isLoading || updateState.isLoading;

    function patch(field, value) {
        setForm((f) => ({ ...f, [field]: value }));
        setSavedAt(null);
    }

    function validate() {
        if (!form.businessName.trim()) return 'Business name is required.';
        if (form.businessName.length > 255) return 'Business name must be 255 characters or fewer.';
        if (!form.category) return 'Pick a category.';
        if (form.bio.length > 2000) return 'Bio must be 2000 characters or fewer.';
        if (form.baseRate !== '' && form.baseRate != null) {
            const n = Number(form.baseRate);
            if (!Number.isFinite(n) || n <= 0) return 'Base rate must be a positive number, or left blank.';
        }
        if (!bvnLocked && form.bvn && !/^\d{11}$/.test(form.bvn.trim())) {
            return 'BVN must be exactly 11 digits.';
        }
        if (form.businessEmail && !/^\S+@\S+\.\S+$/.test(form.businessEmail.trim())) {
            return 'Business email must be a valid email address.';
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
            // Contact + socials. We always send "" for cleared fields on update
            // so the backend can null them out; on create the backend treats ""
            // the same as null via blankToNull().
            businessAddress: form.businessAddress.trim(),
            businessEmail:   form.businessEmail.trim(),
            businessPhone:   form.businessPhone.trim(),
            websiteUrl:      form.websiteUrl.trim(),
            instagramHandle: form.instagramHandle.trim(),
            twitterHandle:   form.twitterHandle.trim(),
            facebookHandle:  form.facebookHandle.trim(),
            // KYC — omit locked fields so the masked display value is never
            // written back to the backend as if it were the real secret.
            ...(bvnLocked ? {} : { bvn: form.bvn.trim() }),
            ...(brnLocked ? {} : { businessRegistrationNumber: form.businessRegistrationNumber.trim() }),
        };

        try {
            if (isCreate) {
                await createProfile(body).unwrap();
            } else {
                await updateProfile({ ...body, clearBaseRate: body.baseRate == null }).unwrap();
            }
            setSavedAt(Date.now());
        } catch (err) {
            const apiMsg = err?.data?.message;
            const fieldErrors = Array.isArray(err?.data?.errors) ? err.data.errors.join('; ') : '';
            setError(fieldErrors || apiMsg || 'Could not save profile.');
        }
    }

    async function handleSubmitForVerification() {
        setError('');
        try {
            await submitVerification({
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

            {/* Basic information */}
            <SectionCard
                icon={<Icons.building size={16} />}
                title="Basic information"
                subtitle="Your business name and category — this is what shows on your marketplace card."
            >
                <Input
                    icon={<Icons.building size={16} />}
                    label="Business name *"
                    value={form.businessName}
                    onChange={(e) => patch('businessName', e.target.value)}
                    disabled={isSuspended}
                    placeholder="e.g. Lekki Lights & Sound"
                />
                <CategorySelect
                    value={form.category}
                    onChange={(v) => patch('category', v)}
                    disabled={isSuspended}
                />
            </SectionCard>

            {/* What you offer */}
            <SectionCard
                icon={<Icons.spark size={16} />}
                title="What you offer"
                subtitle="Tell organisers what you do, who you've worked with, and what makes you a good fit."
            >
                <label style={{ display: 'block' }}>
                    <span style={{
                        display: 'block', fontSize: 14, fontWeight: 500,
                        color: 'var(--text-1)', marginBottom: 6,
                    }}>
                        Describe your services
                    </span>
                    <textarea
                        value={form.bio}
                        onChange={(e) => patch('bio', e.target.value)}
                        rows={5}
                        maxLength={2000}
                        disabled={isSuspended}
                        placeholder="What you do, who you've worked with, what makes you a good fit."
                        style={{
                            width: '100%', padding: 14,
                            fontFamily: 'inherit', fontSize: 14,
                            border: '1px solid var(--border)', borderRadius: 12,
                            resize: 'vertical', color: 'var(--text-1)',
                            boxSizing: 'border-box',
                            background: 'var(--surface-elevated)',
                        }}
                    />
                    <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-3)', textAlign: 'right' }}>
                        {form.bio.length} / 2000
                    </div>
                </label>

                <Input
                    icon={<Icons.wallet size={16} />}
                    label="Base rate (₦, optional)"
                    type="number"
                    value={form.baseRate}
                    onChange={(e) => patch('baseRate', e.target.value)}
                    disabled={isSuspended}
                    placeholder="e.g. 250000"
                    min="0"
                    step="0.01"
                    hint="The typical starting price for a booking. Helps organisers shortlist you faster."
                />
            </SectionCard>

            {/* Service areas */}
            <SectionCard
                icon={<Icons.pin size={16} />}
                title="Service areas"
                subtitle="Which cities or neighbourhoods do you serve? Hit Enter or comma to add."
            >
                <ServiceAreasInput
                    values={form.serviceAreas}
                    onChange={(v) => patch('serviceAreas', v)}
                    disabled={isSuspended}
                />
            </SectionCard>

            {/* Social media & contact */}
            <SectionCard
                icon={<Icons.globe size={16} />}
                title="Social media & contact"
                subtitle="How can organisers reach you? Public — shown on your marketplace listing."
            >
                <Input
                    icon={<Icons.pin size={16} />}
                    label="Business address"
                    value={form.businessAddress}
                    onChange={(e) => patch('businessAddress', e.target.value)}
                    disabled={isSuspended}
                    placeholder="12 Admiralty Way, Lekki Phase 1, Lagos"
                />
                <Input
                    icon={<Icons.mail size={16} />}
                    label="Business email"
                    type="email"
                    value={form.businessEmail}
                    onChange={(e) => patch('businessEmail', e.target.value)}
                    disabled={isSuspended}
                    placeholder="hello@yourbusiness.com"
                />
                <Input
                    icon={<Icons.phone size={16} />}
                    label="Business phone"
                    value={form.businessPhone}
                    onChange={(e) => patch('businessPhone', e.target.value)}
                    disabled={isSuspended}
                    placeholder="+234 801 234 5678"
                />
                <Input
                    prefix="https://"
                    label="Website"
                    value={form.websiteUrl.replace(/^https?:\/\//, '')}
                    onChange={(e) => patch('websiteUrl', e.target.value
                        ? `https://${e.target.value.replace(/^https?:\/\//, '')}`
                        : '')}
                    disabled={isSuspended}
                    placeholder="www.yourbusiness.com"
                />
                <Input
                    prefix="instagram.com/"
                    label="Instagram"
                    value={form.instagramHandle}
                    onChange={(e) => patch('instagramHandle', e.target.value)}
                    disabled={isSuspended}
                    placeholder="@yourhandle"
                />
                <Input
                    prefix="x.com/"
                    label="X (Twitter)"
                    value={form.twitterHandle}
                    onChange={(e) => patch('twitterHandle', e.target.value)}
                    disabled={isSuspended}
                    placeholder="@yourhandle"
                />
                <Input
                    prefix="facebook.com/"
                    label="Facebook"
                    value={form.facebookHandle}
                    onChange={(e) => patch('facebookHandle', e.target.value)}
                    disabled={isSuspended}
                    placeholder="yourpage"
                />
            </SectionCard>

            {/* Business & KYC */}
            <SectionCard
                icon={<Icons.shield size={16} />}
                title="Business & KYC details"
                subtitle="Required for verification. Private — only you and EventNest admins ever see these."
            >
                <Input
                    icon={bvnLocked ? <Icons.lock size={16} /> : <Icons.shield size={16} />}
                    label="Bank Verification Number (BVN)"
                    value={form.bvn}
                    onChange={(e) => patch('bvn', e.target.value.replace(/\D/g, '').slice(0, 11))}
                    disabled={isSuspended || bvnLocked}
                    placeholder="11-digit BVN"
                    inputMode="numeric"
                    maxLength={11}
                    hint={bvnLocked
                        ? 'BVN is locked after first submission. Contact support if you need to update it.'
                        : 'Your BVN is never shown on your public profile or shared with organisers.'}
                />
                <Input
                    icon={brnLocked ? <Icons.lock size={16} /> : <Icons.building size={16} />}
                    label="Business registration number"
                    value={form.businessRegistrationNumber}
                    onChange={(e) => patch('businessRegistrationNumber', e.target.value)}
                    disabled={isSuspended || brnLocked}
                    placeholder="e.g. RC-1234567"
                    hint={brnLocked
                        ? 'Registration number is locked after first submission. Contact support if you need to update it.'
                        : 'Your CAC / RC number. Helps EventNest verify your business.'}
                />
            </SectionCard>

            {/* Portfolio */}
            <SectionCard
                icon={<Icons.image size={16} />}
                title="Portfolio"
                subtitle="Show off past work — paste image URLs of events you've delivered."
            >
                <PortfolioGrid
                    values={form.portfolioImages}
                    onChange={(v) => patch('portfolioImages', v)}
                    disabled={isSuspended}
                />
            </SectionCard>

            {/* Status messages */}
            {error && (
                <div role="alert" style={{
                    padding: '12px 16px',
                    background: 'var(--error-bg)', color: 'var(--error)',
                    borderRadius: 12, fontSize: 13,
                    display: 'flex', alignItems: 'center', gap: 8,
                }}>
                    <Icons.alert size={16} />
                    {error}
                </div>
            )}

            {savedAt && (
                <div role="status" style={{
                    padding: '12px 16px',
                    background: 'var(--success-bg)', color: 'var(--success)',
                    borderRadius: 12, fontSize: 13,
                    display: 'flex', alignItems: 'center', gap: 8,
                }}>
                    <Icons.check size={16} />
                    Saved.
                </div>
            )}

            {/* Action bar */}
            <div style={{
                position: 'sticky', bottom: 0,
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 14, padding: 14,
                display: 'flex', justifyContent: 'space-between',
                gap: 10, flexWrap: 'wrap',
                boxShadow: '0 -4px 16px -8px rgba(0,0,0,0.08)',
            }}>
                <Button type="button" variant="ghost" size="md" onClick={onCancel} disabled={busy}>
                    Cancel
                </Button>
                <div style={{ display: 'flex', gap: 10 }}>
                    {!isCreate && !isVerified && !isSuspended && (
                        <Button
                            type="button"
                            variant="secondary"
                            size="md"
                            onClick={handleSubmitForVerification}
                            disabled={verifyState.isLoading || busy || isPending}
                            iconLeft={<Icons.shield size={14} />}
                            title={isPending ? 'Your submission is under admin review' : undefined}
                        >
                            {verifyState.isLoading ? 'Submitting…'
                                : isPending ? 'Pending review…'
                                : 'Submit for verification'}
                        </Button>
                    )}
                    <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        disabled={busy || isSuspended}
                        iconLeft={isCreate ? <Icons.plus size={14} /> : <Icons.check size={14} />}
                    >
                        {busy ? 'Saving…' : isCreate ? 'Create profile' : 'Save changes'}
                    </Button>
                </div>
            </div>
        </form>
    );
}

/* ─── Shell ──────────────────────────────────────────────────────────── */

function PageShell({ children, isCreate }) {
    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            <div className="mp-page-wrap" style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px 80px' }}>
                <div style={{ marginBottom: 24 }}>
                    <h1 className="mp-h1" style={{ margin: 0, color: 'var(--text-1)' }}>
                        {isCreate ? 'Set up your vendor profile' : 'My vendor profile'}
                    </h1>
                    <p className="body" style={{ margin: '8px 0 0', color: 'var(--text-2)' }}>
                        {isCreate
                            ? 'Tell organisers about your business. Verified vendors show up in the public marketplace.'
                            : 'Business name, category, portfolio. Verified vendors show up in the public marketplace.'}
                    </p>
                </div>
                {children}
            </div>
        </div>
    );
}

function Skeleton() {
    const block = (h) => ({
        height: h, background: 'var(--surface-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 14, animation: 'mp-flash 1.6s ease-in-out infinite',
    });
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={block(180)} />
                <div style={{ ...block(220), opacity: 0.9 }} />
                <div style={{ ...block(140), opacity: 0.8 }} />
                <div style={{ ...block(220), opacity: 0.7 }} />
            </div>
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
            background: 'var(--surface-elevated)', border: '1px solid var(--border)',
            borderRadius: 14, padding: 40, textAlign: 'center',
        }}>
            <Icons.alert size={28} style={{ color: 'var(--error)' }} />
            <p className="body-sm" style={{ marginTop: 8, color: 'var(--text-2)' }}>{message}</p>
            <Button variant="secondary" size="sm" onClick={onRetry} style={{ marginTop: 12 }}>
                Retry
            </Button>
        </div>
    );
}
