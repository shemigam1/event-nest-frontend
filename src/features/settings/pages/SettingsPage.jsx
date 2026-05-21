import { useState, useEffect, useSyncExternalStore } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import {
    useGetMeQuery,
    useUpdateProfileMutation,
    useChangePasswordMutation,
} from '@/features/auth/authApi';
import {
    setUser,
    selectCurrentUser,
    selectIsAdmin,
    selectIsCheckinStaff,
    logout,
} from '@/features/auth/authSlice';
import { getTheme, setTheme, resolveTheme, subscribeTheme } from '@/utils/theme';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icon';

/* ────────────────────────────────────────────────────────────────────────────
   SettingsPage — single-column hub for everything tied to the signed-in account
   that doesn't fit any of the workspace consoles. The route is wrapped by
   AppShell, so we don't render our own top-nav here.

   Sections (top → bottom):
     · Profile           — first/last name editor + read-only email
     · Change password   — current + new, min-8, confirm
     · Appearance        — light / dark / system
     · Account           — read-only role pills + sign out

   Note: workspace switching lives in the TopBar avatar dropdown — it's not
   duplicated here. That dropdown IS the global toggle.
   ──────────────────────────────────────────────────────────────────────── */

/* ── small helpers ── */
function Section({ title, subtitle, danger, children }) {
    return (
        <div style={{
            background: 'var(--surface-elevated, white)',
            border: `1px solid ${danger ? 'var(--error)' : 'var(--border)'}`,
            borderRadius: 16,
            overflow: 'hidden',
        }}>
            <div style={{
                padding: '18px 24px',
                borderBottom: '1px solid var(--border)',
            }}>
                <h2 style={{
                    margin: 0, fontSize: 16, fontWeight: 700,
                    color: danger ? 'var(--error)' : 'var(--text-1)',
                }}>
                    {title}
                </h2>
                {subtitle && (
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-2)' }}>
                        {subtitle}
                    </p>
                )}
            </div>
            <div style={{ padding: '20px 24px' }}>
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

/* ── Appearance section ── */

// Subscribe to theme changes via useSyncExternalStore so the section reflects
// system-preference flips when "system" is selected.
function useTheme() {
    const mode = useSyncExternalStore(
        (cb) => subscribeTheme(cb),
        () => getTheme(),
        () => 'system',
    );
    return { mode, resolved: resolveTheme(mode) };
}

const THEME_OPTIONS = [
    {
        key: 'light',
        label: 'Light',
        hint: 'Bright surfaces, dark text.',
        Preview: () => <ThemePreview bg="#FFFFFF" fg="#02102D" accent="#0357EE" />,
    },
    {
        key: 'dark',
        label: 'Dark',
        hint: 'Low-light friendly.',
        Preview: () => <ThemePreview bg="#0A1124" fg="#F4F6FB" accent="#4D8BFF" />,
    },
    {
        key: 'system',
        label: 'System',
        hint: 'Match your OS setting.',
        Preview: () => (
            <div style={{
                width: 56, height: 38, borderRadius: 8, overflow: 'hidden',
                border: '1px solid var(--border)', display: 'flex', flexShrink: 0,
            }}>
                <div style={{ flex: 1, background: '#FFFFFF' }} />
                <div style={{ flex: 1, background: '#0A1124' }} />
            </div>
        ),
    },
];

function ThemePreview({ bg, fg, accent }) {
    return (
        <div style={{
            width: 56, height: 38, borderRadius: 8, padding: 5,
            background: bg, border: '1px solid var(--border)', flexShrink: 0,
            display: 'flex', flexDirection: 'column', gap: 3,
        }}>
            <div style={{ height: 4, width: '70%', borderRadius: 2, background: fg, opacity: 0.85 }} />
            <div style={{ height: 4, width: '50%', borderRadius: 2, background: fg, opacity: 0.4 }} />
            <div style={{ height: 6, width: '40%', borderRadius: 2, background: accent, marginTop: 2 }} />
        </div>
    );
}

function AppearanceSection() {
    const { mode, resolved } = useTheme();

    return (
        <Section
            title="Appearance"
            subtitle={`Currently rendering in ${resolved} mode${mode === 'system' ? ' (auto)' : ''}.`}
        >
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 12,
            }}>
                {THEME_OPTIONS.map(({ key, label, hint, Preview }) => {
                    const active = mode === key;
                    return (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setTheme(key)}
                            aria-pressed={active}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                padding: '12px 14px',
                                borderRadius: 12,
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                                textAlign: 'left',
                                background: active ? 'var(--mp-blue-50, #EAF1FE)' : 'var(--surface-elevated, white)',
                                border: active ? '2px solid var(--mp-blue)' : '1px solid var(--border)',
                                transition: 'border-color 0.1s, background 0.1s',
                            }}
                        >
                            <Preview />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                    fontSize: 14, fontWeight: 600,
                                    color: active ? 'var(--mp-blue)' : 'var(--text-1)',
                                }}>
                                    {label}
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                                    {hint}
                                </div>
                            </div>
                            {active && (
                                <span style={{
                                    width: 22, height: 22, borderRadius: 99,
                                    background: 'var(--mp-blue)', color: 'white',
                                    display: 'grid', placeItems: 'center', flexShrink: 0,
                                }}>
                                    <Icons.check size={13} />
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </Section>
    );
}

/* ── Account section (roles + sign out) ── */

function AccountSection({ profile }) {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const isAdmin = useSelector(selectIsAdmin);
    const isCheckin = useSelector(selectIsCheckinStaff);

    const roles = [];
    if (isAdmin) roles.push({ label: 'Admin', tone: 'admin' });
    if (isCheckin) roles.push({ label: 'Check-in staff', tone: 'staff' });
    if (!isAdmin && !isCheckin) roles.push({ label: 'Member', tone: 'neutral' });

    const memberSince = profile?.createdAt
        ? new Date(profile.createdAt).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })
        : null;

    function handleSignOut() {
        dispatch(logout());
        navigate('/login', { replace: true });
    }

    return (
        <Section title="Account" subtitle="Account information and session controls.">
            <div style={{
                display: 'flex', flexDirection: 'column', gap: 14,
            }}>
                <Row label="Email">
                    <span style={{ fontSize: 13, color: 'var(--text-1)' }}>{profile?.email ?? '—'}</span>
                </Row>
                {memberSince && (
                    <Row label="Member since">
                        <span style={{ fontSize: 13, color: 'var(--text-1)' }}>{memberSince}</span>
                    </Row>
                )}
                <Row label="Roles">
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {roles.map((r) => (
                            <RolePill key={r.label} {...r} />
                        ))}
                    </div>
                </Row>
            </div>

            <div style={{
                marginTop: 22,
                paddingTop: 18,
                borderTop: '1px solid var(--border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                gap: 12, flexWrap: 'wrap',
            }}>
                <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
                        Sign out of EventNest
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                        Ends this browser session. You'll need to sign in again to continue.
                    </div>
                </div>
                <Button variant="secondary" size="md" onClick={handleSignOut}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Icons.x size={14} />
                        Sign out
                    </span>
                </Button>
            </div>
        </Section>
    );
}

function Row({ label, children }) {
    return (
        <div style={{
            display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', gap: 12,
        }}>
            <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>{label}</span>
            {children}
        </div>
    );
}

function RolePill({ label, tone }) {
    const tones = {
        admin:   { bg: 'var(--warning-bg)', fg: 'var(--warning)' },
        staff:   { bg: 'var(--mp-blue-50, #EAF1FE)', fg: 'var(--mp-blue)' },
        neutral: { bg: 'var(--surface-subtle)', fg: 'var(--text-2)' },
    };
    const t = tones[tone] ?? tones.neutral;
    return (
        <span style={{
            padding: '3px 10px', borderRadius: 99,
            fontSize: 11, fontWeight: 600, letterSpacing: '0.02em',
            background: t.bg, color: t.fg,
        }}>
            {label}
        </span>
    );
}

/* ── Page ── */
export default function SettingsPage() {
    const cachedUser = useSelector(selectCurrentUser);
    const { data: profile, isLoading } = useGetMeQuery();

    const displayProfile = profile ?? cachedUser;

    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px 80px' }}>
                {/* Page header */}
                <div style={{ marginBottom: 28 }}>
                    <h1 className="mp-h1" style={{ margin: 0, color: 'var(--text-1)' }}>
                        Settings
                    </h1>
                    <p className="body" style={{ margin: '6px 0 0', color: 'var(--text-2)' }}>
                        Manage your account, security, and how EventNest looks.
                    </p>
                </div>

                {isLoading && !displayProfile ? (
                    <div style={{
                        padding: 48, textAlign: 'center', color: 'var(--text-3)',
                        background: 'var(--surface-elevated, white)',
                        border: '1px solid var(--border)', borderRadius: 16,
                    }}>
                        Loading…
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <ProfileSection profile={displayProfile} />
                        <PasswordSection />
                        <AppearanceSection />
                        <AccountSection profile={displayProfile} />
                    </div>
                )}
            </div>
        </div>
    );
}
