import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    useGetMeQuery,
    useUpdateProfileMutation,
    useChangePasswordMutation,
} from '@/features/auth/authApi';
import { setUser, selectCurrentUser } from '@/features/auth/authSlice';
import TopNav from '@/components/ui/TopNav';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icon';

/* ── small helpers ── */
function Section({ title, subtitle, children }) {
    return (
        <div style={{
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: 16,
            overflow: 'hidden',
        }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>
                    {title}
                </h2>
                {subtitle && (
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-2)' }}>
                        {subtitle}
                    </p>
                )}
            </div>
            <div style={{ padding: '24px' }}>
                {children}
            </div>
        </div>
    );
}

function Alert({ type, message }) {
    if (!message) return null;
    const isError = type === 'error';
    return (
        <div role="alert" style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 500,
            background: isError ? 'var(--error-bg)' : 'var(--success-bg, #E6F4EA)',
            color: isError ? 'var(--error)' : 'var(--success, #0F7B3E)',
        }}>
            {isError
                ? <Icons.alert size={15} />
                : <Icons.check size={15} />}
            {message}
        </div>
    );
}

/* ── Profile section ── */
function ProfileSection({ profile }) {
    const dispatch = useDispatch();
    const [updateProfile, { isLoading }] = useUpdateProfileMutation();

    const [form, setForm] = useState({
        firstName: profile?.firstName ?? '',
        lastName: profile?.lastName ?? '',
    });
    const [status, setStatus] = useState({ type: '', message: '' });

    useEffect(() => {
        setForm({
            firstName: profile?.firstName ?? '',
            lastName: profile?.lastName ?? '',
        });
    }, [profile]);

    const isDirty =
        form.firstName.trim() !== (profile?.firstName ?? '') ||
        form.lastName.trim()  !== (profile?.lastName ?? '');

    function handleChange(e) {
        setForm(f => ({ ...f, [e.target.name]: e.target.value }));
        setStatus({ type: '', message: '' });
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!isDirty || isLoading) return;
        try {
            const updated = await updateProfile({
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim(),
            }).unwrap();
            dispatch(setUser(updated));
            setStatus({ type: 'success', message: 'Profile updated successfully.' });
        } catch (err) {
            setStatus({ type: 'error', message: err?.data?.message || 'Could not update profile.' });
        }
    }

    const initial = ((profile?.firstName?.[0] ?? '') + (profile?.lastName?.[0] ?? '')).toUpperCase() || '?';

    return (
        <Section title="Profile" subtitle="Update your name and view your account email.">
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Avatar + email row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: 99,
                        background: 'var(--mp-blue)',
                        color: 'white',
                        display: 'grid', placeItems: 'center',
                        fontSize: 22, fontWeight: 700, flexShrink: 0,
                    }}>
                        {initial}
                    </div>
                    <div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>
                            {[profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || '—'}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>
                            {profile?.email || '—'}
                        </div>
                    </div>
                </div>

                {/* Name fields */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <Input
                        label="First name"
                        name="firstName"
                        value={form.firstName}
                        onChange={handleChange}
                        placeholder="Ada"
                        autoComplete="given-name"
                    />
                    <Input
                        label="Last name"
                        name="lastName"
                        value={form.lastName}
                        onChange={handleChange}
                        placeholder="Lovelace"
                        autoComplete="family-name"
                    />
                </div>

                {/* Email read-only */}
                <Input
                    label="Email address"
                    type="email"
                    value={profile?.email ?? ''}
                    readOnly
                    style={{ background: 'var(--surface-subtle)', color: 'var(--text-2)', cursor: 'default' }}
                    hint="Email cannot be changed. Contact support if you need to update it."
                    icon={<Icons.mail size={16} />}
                />

                <Alert type={status.type} message={status.message} />

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        disabled={!isDirty || isLoading}
                    >
                        {isLoading ? 'Saving…' : 'Save changes'}
                    </Button>
                </div>
            </form>
        </Section>
    );
}

/* ── Change password section ── */
function PasswordSection() {
    const [changePassword, { isLoading }] = useChangePasswordMutation();
    const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [status, setStatus] = useState({ type: '', message: '' });

    const passwordMismatch =
        form.newPassword && form.confirmPassword && form.newPassword !== form.confirmPassword;

    const isValid =
        form.currentPassword.length > 0 &&
        form.newPassword.length >= 8 &&
        form.confirmPassword.length >= 8 &&
        form.newPassword === form.confirmPassword;

    function handleChange(e) {
        setForm(f => ({ ...f, [e.target.name]: e.target.value }));
        setStatus({ type: '', message: '' });
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!isValid || isLoading) return;
        try {
            await changePassword({
                currentPassword: form.currentPassword,
                newPassword: form.newPassword,
            }).unwrap();
            setStatus({ type: 'success', message: 'Password changed successfully.' });
            setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            setStatus({ type: 'error', message: err?.data?.message || 'Could not change password. Check your current password.' });
        }
    }

    return (
        <Section title="Change password" subtitle="Use a strong password you don't use elsewhere.">
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Input
                    label="Current password"
                    name="currentPassword"
                    type="password"
                    value={form.currentPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    icon={<Icons.lock size={16} />}
                    autoComplete="current-password"
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <Input
                        label="New password"
                        name="newPassword"
                        type="password"
                        value={form.newPassword}
                        onChange={handleChange}
                        placeholder="••••••••"
                        icon={<Icons.lock size={16} />}
                        error={form.newPassword && form.newPassword.length < 8 ? 'At least 8 characters' : ''}
                        autoComplete="new-password"
                    />
                    <Input
                        label="Confirm new password"
                        name="confirmPassword"
                        type="password"
                        value={form.confirmPassword}
                        onChange={handleChange}
                        placeholder="••••••••"
                        icon={<Icons.lock size={16} />}
                        error={passwordMismatch ? 'Passwords do not match' : ''}
                        autoComplete="new-password"
                    />
                </div>

                <Alert type={status.type} message={status.message} />

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        disabled={!isValid || isLoading}
                    >
                        {isLoading ? 'Updating…' : 'Update password'}
                    </Button>
                </div>
            </form>
        </Section>
    );
}

/* ── Page ── */
export default function SettingsPage() {
    const cachedUser = useSelector(selectCurrentUser);
    const { data: profile, isLoading } = useGetMeQuery();

    const displayProfile = profile ?? cachedUser;

    return (
        <div style={{ minHeight: '100vh', background: 'var(--surface, #F9FAFB)' }}>
            <TopNav showBrowse={false} />

            <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px 60px' }}>
                {/* Page header */}
                <div style={{ marginBottom: 28 }}>
                    <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--text-1)' }}>
                        Settings
                    </h1>
                    <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-2)' }}>
                        Manage your account details and security.
                    </p>
                </div>

                {isLoading && !displayProfile ? (
                    <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)' }}>
                        Loading…
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <ProfileSection profile={displayProfile} />
                        <PasswordSection />
                    </div>
                )}
            </div>
        </div>
    );
}
