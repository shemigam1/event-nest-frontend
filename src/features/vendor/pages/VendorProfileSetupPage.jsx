import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
    useGetMyVendorProfileQuery,
    useUpsertMyVendorProfileMutation,
    useApplyForVerificationMutation,
} from '@/features/organiser/vendorsApi';
import TopNav from '@/components/ui/TopNav';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Icons } from '@/components/ui/Icon';

const CATEGORIES = [
    { key: 'CATERING',  label: 'Catering' },
    { key: 'AV',        label: 'AV & Sound' },
    { key: 'PHOTO',     label: 'Photography' },
    { key: 'VENUE',     label: 'Venues' },
    { key: 'SECURITY',  label: 'Security' },
    { key: 'PRINT',     label: 'Print & Swag' },
    { key: 'DECOR',     label: 'Decor' },
    { key: 'TRANSPORT', label: 'Transport' },
];

const VERIFICATION_STATUS = {
    NONE:     { label: 'Not applied',          bg: 'var(--surface-subtle)', fg: 'var(--text-3)' },
    PENDING:  { label: 'Verification pending', bg: '#FEF4E2', fg: '#B8770A' },
    APPROVED: { label: 'Verified',             bg: '#E6F4EA', fg: '#0F7B3E' },
    REJECTED: { label: 'Verification rejected', bg: '#FBE9E9', fg: '#D62828' },
};

export default function VendorProfileSetupPage() {
    const navigate = useNavigate();
    const { data: profile, isLoading, isError, error } = useGetMyVendorProfileQuery();
    const [upsert, upsertState] = useUpsertMyVendorProfileMutation();
    const [applyVerification, verifyState] = useApplyForVerificationMutation();

    const [form, setForm] = useState({
        name: '', lead: '', city: '', category: '',
        bio: '', priceLabel: '', skills: '', email: '',
        responseHrs: '',
    });
    const [skillInput, setSkillInput] = useState('');
    const [saveError, setSaveError] = useState('');
    const [saved, setSaved] = useState(false);
    const [verifyError, setVerifyError] = useState('');

    useEffect(() => {
        if (!profile) return;
        setForm({
            name:        profile.name        || '',
            lead:        profile.lead        || '',
            city:        profile.city        || '',
            category:    profile.category    || '',
            bio:         profile.bio         || '',
            priceLabel:  profile.priceLabel  || '',
            email:       profile.email       || '',
            responseHrs: profile.responseHrs != null ? String(profile.responseHrs) : '',
        });
        setSkillInput((profile.skills || []).join(', '));
    }, [profile]);

    function set(k, v) {
        setForm((f) => ({ ...f, [k]: v }));
        setSaved(false);
        setSaveError('');
    }

    async function handleSave(e) {
        e.preventDefault();
        if (!form.name.trim()) { setSaveError('Business / display name is required.'); return; }
        if (!form.category)    { setSaveError('Please choose a primary category.'); return; }
        setSaveError('');
        const skills = skillInput.split(',').map((s) => s.trim()).filter(Boolean);
        try {
            await upsert({
                name:        form.name.trim(),
                lead:        form.lead.trim() || null,
                city:        form.city.trim() || null,
                category:    form.category,
                bio:         form.bio.trim() || null,
                priceLabel:  form.priceLabel.trim() || null,
                email:       form.email.trim() || null,
                responseHrs: form.responseHrs ? Number(form.responseHrs) : null,
                skills,
            }).unwrap();
            setSaved(true);
        } catch (err) {
            setSaveError(err?.data?.message || 'Could not save profile. Please try again.');
        }
    }

    async function handleApplyVerification() {
        setVerifyError('');
        try {
            await applyVerification().unwrap();
        } catch (err) {
            setVerifyError(err?.data?.message || 'Could not submit verification request.');
        }
    }

    const verStatus = profile?.verificationStatus || 'NONE';
    const verStyle  = VERIFICATION_STATUS[verStatus] || VERIFICATION_STATUS.NONE;
    const canApplyVerification = (verStatus === 'NONE' || verStatus === 'REJECTED') && !!profile?.id;

    // A 404 means the user has no vendor profile yet — that's the normal
    // "create" flow. Any other error is a real failure.
    const isNotFound = isError && error?.status === 404;
    const isRealError = isError && !isNotFound;

    if (isLoading) return <PageShell><Skeleton /></PageShell>;

    if (isRealError) {
        return (
            <PageShell>
                <div style={{
                    background: 'white', border: '1px solid var(--border)',
                    borderRadius: 12, padding: 40, textAlign: 'center',
                }}>
                    <Icons.alert size={28} style={{ color: 'var(--error)' }} />
                    <p className="body-sm" style={{ marginTop: 8, color: 'var(--text-2)' }}>
                        {error?.data?.message || 'Could not load your profile. Please try again.'}
                    </p>
                </div>
            </PageShell>
        );
    }

    return (
        <PageShell>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) 280px',
                gap: 20,
                alignItems: 'start',
            }}>
                {/* Main form */}
                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{
                        background: 'white',
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                        padding: 24,
                    }}>
                        <div className="mp-h4" style={{ margin: '0 0 18px', color: 'var(--text-1)' }}>
                            Profile details
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <Input
                                label="Business / display name *"
                                value={form.name}
                                onChange={(e) => set('name', e.target.value)}
                                placeholder="e.g. Lagos Catering Co."
                            />
                            <Input
                                label="Tagline"
                                value={form.lead}
                                onChange={(e) => set('lead', e.target.value)}
                                placeholder="e.g. Premium catering for corporate events"
                            />

                            <div>
                                <label style={{
                                    display: 'block', fontSize: 14, fontWeight: 500,
                                    color: 'var(--text-1)', marginBottom: 8,
                                }}>
                                    Primary category *
                                </label>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {CATEGORIES.map(({ key, label }) => {
                                        const active = form.category === key;
                                        return (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => set('category', key)}
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
                                                }}
                                            >
                                                {label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <Input
                                    label="City"
                                    value={form.city}
                                    onChange={(e) => set('city', e.target.value)}
                                    placeholder="Lagos"
                                />
                                <Input
                                    label="Contact email"
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => set('email', e.target.value)}
                                    placeholder="hello@yourbusiness.com"
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <Input
                                    label="Typical response time (hours)"
                                    type="number"
                                    min="1"
                                    value={form.responseHrs}
                                    onChange={(e) => set('responseHrs', e.target.value)}
                                    placeholder="24"
                                />
                                <Input
                                    label="Price label"
                                    value={form.priceLabel}
                                    onChange={(e) => set('priceLabel', e.target.value)}
                                    placeholder="From ₦150,000 / event"
                                />
                            </div>

                            <label style={{ display: 'block' }}>
                                <span style={{
                                    display: 'block', fontSize: 14, fontWeight: 500,
                                    color: 'var(--text-1)', marginBottom: 6,
                                }}>
                                    Bio
                                </span>
                                <textarea
                                    value={form.bio}
                                    onChange={(e) => set('bio', e.target.value)}
                                    rows={5}
                                    placeholder="Tell organisers what you do, who you've worked with, and what makes you great."
                                    style={{
                                        width: '100%', padding: 12,
                                        fontFamily: 'inherit', fontSize: 14,
                                        border: '1px solid var(--border)', borderRadius: 8,
                                        resize: 'vertical', color: 'var(--text-1)',
                                        boxSizing: 'border-box',
                                    }}
                                />
                            </label>

                            <label style={{ display: 'block' }}>
                                <span style={{
                                    display: 'block', fontSize: 14, fontWeight: 500,
                                    color: 'var(--text-1)', marginBottom: 6,
                                }}>
                                    Skills / services
                                    <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>{' '}(comma-separated)</span>
                                </span>
                                <input
                                    value={skillInput}
                                    onChange={(e) => { setSkillInput(e.target.value); setSaved(false); }}
                                    placeholder="Buffet setup, Cocktail service, Menu design"
                                    style={{
                                        width: '100%', padding: '10px 12px',
                                        fontFamily: 'inherit', fontSize: 14,
                                        border: '1px solid var(--border)', borderRadius: 8,
                                        color: 'var(--text-1)', boxSizing: 'border-box',
                                    }}
                                />
                            </label>
                        </div>
                    </div>

                    {saveError && (
                        <div role="alert" style={{
                            padding: '10px 14px', background: '#FBE9E9',
                            color: 'var(--error)', borderRadius: 8, fontSize: 13,
                        }}>
                            {saveError}
                        </div>
                    )}

                    {saved && (
                        <div role="status" style={{
                            padding: '10px 14px', background: '#E6F4EA',
                            color: '#0F7B3E', borderRadius: 8, fontSize: 13,
                            display: 'flex', alignItems: 'center', gap: 8,
                        }}>
                            <Icons.check size={15} />
                            Profile saved.
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                        <Button type="button" variant="ghost" size="md" onClick={() => navigate(-1)}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            size="md"
                            disabled={upsertState.isLoading}
                        >
                            {upsertState.isLoading ? 'Saving…' : profile ? 'Save changes' : 'Create profile'}
                        </Button>
                    </div>
                </form>

                {/* Sidebar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Verification card */}
                    <div style={{
                        background: 'white',
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                        padding: 18,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                            <Icons.shield size={18} style={{ color: 'var(--mp-blue)' }} />
                            <span className="mp-h4" style={{ color: 'var(--text-1)' }}>Verification</span>
                        </div>
                        <p className="body-sm" style={{ color: 'var(--text-2)', marginTop: 0 }}>
                            Verified vendors get a badge and rank higher in search results. We check
                            your CAC registration, portfolio, and references.
                        </p>

                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '4px 10px', borderRadius: 99,
                            background: verStyle.bg, color: verStyle.fg,
                            fontSize: 12, fontWeight: 600, marginBottom: 12,
                        }}>
                            {verStatus === 'APPROVED' && <Icons.shield size={11} />}
                            {verStyle.label}
                        </div>

                        {verifyError && (
                            <p style={{ fontSize: 12, color: 'var(--error)', margin: '0 0 10px' }}>
                                {verifyError}
                            </p>
                        )}

                        {canApplyVerification && (
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleApplyVerification}
                                disabled={verifyState.isLoading || !profile}
                                style={{ width: '100%' }}
                            >
                                {verifyState.isLoading ? 'Submitting…' : 'Apply for verification'}
                            </Button>
                        )}
                        {!canApplyVerification && !profile && (
                            <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>
                                Save your profile first to apply for verification.
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
                            Profile tips
                        </div>
                        <ul style={{
                            margin: 0, paddingLeft: 18,
                            color: 'var(--text-2)', fontSize: 13,
                            display: 'flex', flexDirection: 'column', gap: 8,
                        }}>
                            <li>Add a clear, specific tagline — organisers skim quickly.</li>
                            <li>List your key skills as tags; they show on every card.</li>
                            <li>Give a realistic response-time estimate; it builds trust.</li>
                            <li>Add a price label so you get fewer dead-end enquiries.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </PageShell>
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
                        This is what organisers see when they browse the marketplace.
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
            <div style={block(500)} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={block(180)} />
                <div style={{ ...block(140), opacity: 0.7 }} />
            </div>
        </div>
    );
}
