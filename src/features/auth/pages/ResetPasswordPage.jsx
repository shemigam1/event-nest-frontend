import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useResetPasswordMutation, useValidateResetTokenQuery } from '../authApi';
import AuthLayout from '@/components/ui/AuthLayout';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icon';

export default function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') || '';
    const navigate = useNavigate();

    const { isLoading: validating, isError: tokenInvalid } = useValidateResetTokenQuery(token, {
        skip: !token,
    });

    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [done, setDone] = useState(false);
    const [error, setError] = useState('');
    const [resetPassword, { isLoading }] = useResetPasswordMutation();

    const mismatch = confirm && password !== confirm;
    const isFormValid = password.length >= 8 && password === confirm;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isFormValid) return;
        setError('');
        try {
            await resetPassword({ token, newPassword: password }).unwrap();
            setDone(true);
        } catch (err) {
            setError(err?.data?.message || 'Could not reset password. The link may have expired.');
        }
    };

    if (!token || tokenInvalid) {
        return (
            <AuthLayout>
                <div style={{
                    width: 56, height: 56, borderRadius: 99,
                    margin: '0 0 16px',
                    background: 'var(--error-bg, #FBE9E9)',
                    color: 'var(--error)',
                    display: 'grid', placeItems: 'center',
                }}>
                    <Icons.alert size={24} />
                </div>
                <h1 className="mp-h2" style={{ margin: 0, color: 'var(--text-1)' }}>
                    Invalid or expired link
                </h1>
                <p className="body" style={{ color: 'var(--text-2)', margin: '8px 0 28px' }}>
                    This password reset link is invalid or has expired. Request a new one.
                </p>
                <Button
                    variant="primary"
                    size="lg"
                    onClick={() => navigate('/forgot-password')}
                    style={{ width: '100%', marginBottom: 12 }}
                >
                    Request new link
                </Button>
                <div style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-2)' }}>
                    <Link to="/login" style={{ color: 'var(--mp-blue)', fontWeight: 600, textDecoration: 'none' }}>
                        Back to sign in
                    </Link>
                </div>
            </AuthLayout>
        );
    }

    if (validating) {
        return (
            <AuthLayout>
                <p className="body" style={{ color: 'var(--text-2)' }}>Verifying link…</p>
            </AuthLayout>
        );
    }

    if (done) {
        return (
            <AuthLayout>
                <div style={{
                    width: 56, height: 56, borderRadius: 99,
                    margin: '0 0 16px',
                    background: 'var(--success-bg, #E6F4EA)',
                    color: 'var(--success, #0F9D58)',
                    display: 'grid', placeItems: 'center',
                }}>
                    <Icons.check size={24} />
                </div>
                <h1 className="mp-h2" style={{ margin: 0, color: 'var(--text-1)' }}>
                    Password reset
                </h1>
                <p className="body" style={{ color: 'var(--text-2)', margin: '8px 0 28px' }}>
                    Your password has been updated. You can now sign in with your new password.
                </p>
                <Button
                    variant="primary"
                    size="lg"
                    onClick={() => navigate('/login')}
                    style={{ width: '100%' }}
                >
                    Sign in
                </Button>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout>
            <h1 className="mp-h2" style={{ margin: 0, color: 'var(--text-1)' }}>
                Set new password
            </h1>
            <p className="body" style={{ color: 'var(--text-2)', margin: '8px 0 28px' }}>
                Choose a strong password — at least 8 characters.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Input
                    label="New password"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    placeholder="••••••••"
                    icon={<Icons.lock size={18} />}
                    autoComplete="new-password"
                    hint="At least 8 characters"
                />

                <Input
                    label="Confirm password"
                    name="confirm"
                    type="password"
                    value={confirm}
                    onChange={(e) => { setConfirm(e.target.value); setError(''); }}
                    placeholder="••••••••"
                    icon={<Icons.lock size={18} />}
                    autoComplete="new-password"
                    error={mismatch ? 'Passwords do not match' : undefined}
                />

                {error && (
                    <div role="alert" style={{
                        background: 'var(--error-bg)',
                        color: 'var(--error)',
                        padding: '10px 12px',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 500,
                    }}>
                        {error}
                    </div>
                )}

                <Button
                    type="submit"
                    size="lg"
                    variant="primary"
                    disabled={isLoading || !isFormValid}
                    style={{ marginTop: 4 }}
                >
                    {isLoading ? 'Updating…' : 'Reset password'}
                </Button>
            </form>
        </AuthLayout>
    );
}
