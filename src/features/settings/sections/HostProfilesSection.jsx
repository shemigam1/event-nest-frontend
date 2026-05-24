import { useRef, useState } from 'react';
import { useGetKycStatusQuery } from '@/features/auth/authApi';
import {
    useGetMyHostProfilesQuery,
    useCreateHostProfileMutation,
    useUpdateHostProfileMutation,
    useDeleteHostProfileMutation,
    usePresignHostProfileLogoMutation,
} from '@/features/host/hostProfilesApi';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icon';

/* ────────────────────────────────────────────────────────────────────────────
   Host profiles

   A host profile is a business identity. Required to host public events.
   Optional for private events. Users can have multiple — one per business.

   Gating:
     · No KYC verification yet  → section is locked; CTA points at the KYC
       section above
     · KYC verified             → list + add/edit/delete actions

   Logo upload: same presign→PUT pattern as event cover images.
   ──────────────────────────────────────────────────────────────────────── */

const EMPTY_FORM = {
    businessName: '',
    businessEmail: '',
    businessPhone: '',
    logoUrl: '',
    websiteUrl: '',
    instagramHandle: '',
    twitterHandle: '',
    facebookHandle: '',
};

/* ── Locked-state when KYC not done ── */

function LockedView() {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 16, padding: 18,
            background: 'var(--surface-subtle)',
            border: '1px dashed var(--border)',
            borderRadius: 12,
        }}>
            <span style={{
                width: 38, height: 38, borderRadius: 99,
                background: 'var(--surface-elevated, white)',
                color: 'var(--text-3)',
                display: 'grid', placeItems: 'center', flexShrink: 0,
                border: '1px solid var(--border)',
            }}>
                <Icons.lock size={16} />
            </span>
            <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--text-2)' }}>
                Verify your BVN above to start creating host profiles. Public events
                must be hosted under a verified business identity.
            </div>
        </div>
    );
}

/* ── Logo upload (presign + PUT) ── */

function LogoPicker({ profileId, logoUrl, onUploaded }) {
    const fileRef = useRef(null);
    const [presignLogo] = usePresignHostProfileLogoMutation();
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    async function handleFile(file) {
        if (!file || !profileId) return;
        if (file.size > 2 * 1024 * 1024) {
            setError('Logo must be under 2 MB.');
            return;
        }
        if (!/^image\/(png|jpeg|jpg)$/i.test(file.type)) {
            setError('Logo must be a PNG or JPG image.');
            return;
        }
        setError('');
        setUploading(true);
        try {
            const { uploadUrl } = await presignLogo({ id: profileId, mimeType: file.type }).unwrap();
            const res = await fetch(uploadUrl, {
                method: 'PUT',
                headers: { 'Content-Type': file.type },
                body: file,
            });
            if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
            // The server pre-writes publicUrl onto the profile, so refetching
            // the profile list yields the new logoUrl. RTK Query tag
            // invalidation handles that.
            onUploaded?.();
        } catch (err) {
            setError(err?.data?.message || err?.message || 'Upload failed.');
        } finally {
            setUploading(false);
        }
    }

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
                width: 64, height: 64, borderRadius: 12,
                background: 'var(--surface-subtle)',
                border: '1px solid var(--border)',
                overflow: 'hidden',
                display: 'grid', placeItems: 'center',
                color: 'var(--text-3)',
                flexShrink: 0,
            }}>
                {logoUrl
                    ? <img src={logoUrl} alt="Business logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <Icons.image size={20} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFile(e.target.files?.[0])}
                />
                <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading || !profileId}
                >
                    {uploading ? 'Uploading…' : logoUrl ? 'Replace logo' : 'Upload logo'}
                </Button>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>
                    {!profileId
                        ? 'Save the profile first, then upload a logo.'
                        : 'PNG or JPG, max 2 MB. Shown on your public event pages.'}
                </div>
                {error && (
                    <div style={{ fontSize: 12, color: 'var(--error)', marginTop: 4 }}>{error}</div>
                )}
            </div>
        </div>
    );
}

/* ── Editor form (create OR edit) ── */

function HostProfileEditor({ profile, onClose, onSaved }) {
    const isEdit = Boolean(profile?.id);
    const [form, setForm] = useState(profile ? {
        businessName:    profile.businessName    ?? '',
        businessEmail:   profile.businessEmail   ?? '',
        businessPhone:   profile.businessPhone   ?? '',
        logoUrl:         profile.logoUrl         ?? '',
        websiteUrl:      profile.websiteUrl      ?? '',
        instagramHandle: profile.instagramHandle ?? '',
        twitterHandle:   profile.twitterHandle   ?? '',
        facebookHandle:  profile.facebookHandle  ?? '',
    } : EMPTY_FORM);
    const [error, setError] = useState('');

    const [createProfile, createState] = useCreateHostProfileMutation();
    const [updateProfile, updateState] = useUpdateHostProfileMutation();
    const isLoading = createState.isLoading || updateState.isLoading;

    function patch(key, value) {
        setForm((f) => ({ ...f, [key]: value }));
        if (error) setError('');
    }

    function validate() {
        if (!form.businessName.trim()) return 'Business name is required.';
        if (!form.businessEmail.trim() || !/^\S+@\S+\.\S+$/.test(form.businessEmail.trim())) {
            return 'A valid business email is required.';
        }
        if (!form.businessPhone.trim()) return 'Business phone is required.';
        return '';
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const v = validate();
        if (v) { setError(v); return; }

        // Use the standard PATCH semantics on update: send "" to clear an
        // optional field. On create the server treats "" the same as null.
        const body = {
            businessName:    form.businessName.trim(),
            businessEmail:   form.businessEmail.trim(),
            businessPhone:   form.businessPhone.trim(),
            websiteUrl:      form.websiteUrl.trim(),
            instagramHandle: form.instagramHandle.trim(),
            twitterHandle:   form.twitterHandle.trim(),
            facebookHandle:  form.facebookHandle.trim(),
        };

        try {
            const saved = isEdit
                ? await updateProfile({ id: profile.id, ...body }).unwrap()
                : await createProfile(body).unwrap();
            onSaved?.(saved);
            // On create we keep the editor open so the user can upload a logo
            // against the freshly-created profile.
            if (isEdit) onClose?.();
        } catch (err) {
            const fieldErrors = Array.isArray(err?.data?.errors) ? err.data.errors.join('; ') : '';
            setError(fieldErrors || err?.data?.message || 'Could not save host profile.');
        }
    }

    return (
        <form onSubmit={handleSubmit} style={{
            display: 'flex', flexDirection: 'column', gap: 16,
            padding: 18,
            background: 'var(--surface-subtle)',
            border: '1px solid var(--border)',
            borderRadius: 12,
        }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>
                {isEdit ? 'Edit host profile' : 'New host profile'}
            </div>

            {/* Logo — only available once the profile exists (we need its id for the presign URL). */}
            <LogoPicker
                profileId={profile?.id}
                logoUrl={form.logoUrl || profile?.logoUrl}
                onUploaded={() => onSaved?.(null /* refetch by tag */)}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Input
                    label="Business name"
                    value={form.businessName}
                    onChange={(e) => patch('businessName', e.target.value)}
                    placeholder="Your business as customers know it"
                />
                <Input
                    label="Business email"
                    type="email"
                    value={form.businessEmail}
                    onChange={(e) => patch('businessEmail', e.target.value)}
                    placeholder="hello@yourbusiness.com"
                    icon={<Icons.mail size={16} />}
                />
            </div>
            <Input
                label="Business phone"
                value={form.businessPhone}
                onChange={(e) => patch('businessPhone', e.target.value)}
                placeholder="+234 801 234 5678"
                icon={<Icons.phone size={16} />}
            />

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 2 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.02em', marginBottom: 10 }}>
                    SOCIAL MEDIA — OPTIONAL
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <Input
                        label="Website"
                        value={form.websiteUrl}
                        onChange={(e) => patch('websiteUrl', e.target.value)}
                        placeholder="https://yourbusiness.com"
                        icon={<Icons.globe size={16} />}
                    />
                    <Input
                        label="Instagram handle"
                        value={form.instagramHandle}
                        onChange={(e) => patch('instagramHandle', e.target.value)}
                        placeholder="yourhandle"
                    />
                    <Input
                        label="X / Twitter handle"
                        value={form.twitterHandle}
                        onChange={(e) => patch('twitterHandle', e.target.value)}
                        placeholder="yourhandle"
                    />
                    <Input
                        label="Facebook page"
                        value={form.facebookHandle}
                        onChange={(e) => patch('facebookHandle', e.target.value)}
                        placeholder="yourpage"
                    />
                </div>
            </div>

            {error && (
                <div role="alert" style={{
                    padding: '10px 12px', borderRadius: 8,
                    background: 'var(--error-bg)', color: 'var(--error)',
                    fontSize: 13,
                }}>
                    {error}
                </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <Button type="button" variant="ghost" size="md" onClick={onClose}>
                    {isEdit ? 'Cancel' : 'Close'}
                </Button>
                <Button type="submit" variant="primary" size="md" disabled={isLoading}>
                    {isLoading ? 'Saving…' : isEdit ? 'Save changes' : 'Create profile'}
                </Button>
            </div>
        </form>
    );
}

/* ── Profile card (list view) ── */

function ProfileCard({ profile, onEdit, onDelete }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: 14,
            background: 'var(--surface-elevated, white)',
            border: '1px solid var(--border)',
            borderRadius: 12,
        }}>
            <div style={{
                width: 48, height: 48, borderRadius: 10,
                background: 'var(--surface-subtle)',
                border: '1px solid var(--border)',
                overflow: 'hidden',
                display: 'grid', placeItems: 'center',
                color: 'var(--text-3)',
                flexShrink: 0,
            }}>
                {profile.logoUrl
                    ? <img src={profile.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <Icons.image size={18} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>
                    {profile.businessName}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                    {profile.businessEmail}
                    {profile.businessPhone ? ` · ${profile.businessPhone}` : ''}
                </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
                <Button variant="secondary" size="sm" onClick={() => onEdit(profile)}>Edit</Button>
                <Button variant="ghost" size="sm" onClick={() => onDelete(profile)}>
                    <Icons.trash size={14} />
                </Button>
            </div>
        </div>
    );
}

/* ── Section ── */

export default function HostProfilesSection() {
    const { data: kyc } = useGetKycStatusQuery();
    const { data: profiles, isLoading } = useGetMyHostProfilesQuery(undefined, {
        // Don't bother hitting the endpoint if KYC isn't done — the server
        // gating is on create, not list, but it's cleaner UX to wait.
        skip: kyc?.status !== 'VERIFIED',
    });
    const [deleteProfile, deleteState] = useDeleteHostProfileMutation();

    const [editing, setEditing] = useState(null); // null | 'new' | profile object
    const [pendingDelete, setPendingDelete] = useState(null);

    const verified = kyc?.status === 'VERIFIED';

    if (!verified) {
        return <LockedView />;
    }

    async function confirmDelete() {
        if (!pendingDelete) return;
        try {
            await deleteProfile(pendingDelete.id).unwrap();
            setPendingDelete(null);
        } catch (err) {
            // Surface inline; keep modal open.
            alert(err?.data?.message || 'Could not delete profile.');
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', maxWidth: 540 }}>
                    Public events are hosted under a business identity. Add one for each
                    business you run — switch between them when creating an event.
                </p>
                {editing !== 'new' && (
                    <Button variant="primary" size="sm" onClick={() => setEditing('new')}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <Icons.plus size={14} />
                            Add host profile
                        </span>
                    </Button>
                )}
            </div>

            {/* Editor (create or edit) */}
            {editing === 'new' && (
                <HostProfileEditor
                    profile={null}
                    onClose={() => setEditing(null)}
                    onSaved={(saved) => { if (saved) setEditing(saved); /* stay open for logo upload */ }}
                />
            )}
            {editing && typeof editing === 'object' && (
                <HostProfileEditor
                    profile={editing}
                    onClose={() => setEditing(null)}
                    onSaved={() => setEditing(null)}
                />
            )}

            {/* List */}
            {isLoading && !profiles ? (
                <div style={{ padding: 18, fontSize: 13, color: 'var(--text-3)' }}>
                    Loading your host profiles…
                </div>
            ) : profiles?.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {profiles.map((p) => (
                        <ProfileCard
                            key={p.id}
                            profile={p}
                            onEdit={(prof) => setEditing(prof)}
                            onDelete={(prof) => setPendingDelete(prof)}
                        />
                    ))}
                </div>
            ) : (
                editing !== 'new' && (
                    <div style={{
                        padding: 24, textAlign: 'center',
                        background: 'var(--surface-subtle)',
                        border: '1px dashed var(--border)',
                        borderRadius: 12,
                        color: 'var(--text-3)', fontSize: 13,
                    }}>
                        No host profiles yet. Add one to start hosting public events.
                    </div>
                )
            )}

            {/* Delete confirmation */}
            {pendingDelete && (
                <DeleteDialog
                    profile={pendingDelete}
                    onConfirm={confirmDelete}
                    onDismiss={() => setPendingDelete(null)}
                    loading={deleteState.isLoading}
                />
            )}
        </div>
    );
}

function DeleteDialog({ profile, onConfirm, onDismiss, loading }) {
    return (
        <div
            role="dialog"
            aria-label="Delete host profile"
            onClick={onDismiss}
            style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: 'rgba(2,16,45,0.55)',
                display: 'grid', placeItems: 'center', padding: 20,
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: '100%', maxWidth: 420,
                    background: 'var(--surface-elevated, white)',
                    borderRadius: 14,
                    boxShadow: 'var(--shadow-modal)',
                    padding: 24,
                }}
            >
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-1)' }}>
                    Delete this host profile?
                </h3>
                <p style={{ margin: '8px 0 18px', fontSize: 13, color: 'var(--text-2)' }}>
                    <strong>{profile.businessName}</strong> will be removed. Events already
                    published under this profile will keep their existing branding.
                </p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <Button variant="ghost" size="md" onClick={onDismiss} disabled={loading}>
                        Keep
                    </Button>
                    <Button variant="destructive" size="md" onClick={onConfirm} disabled={loading}>
                        {loading ? 'Deleting…' : 'Delete profile'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

