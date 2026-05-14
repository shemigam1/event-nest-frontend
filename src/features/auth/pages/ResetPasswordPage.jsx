import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useResetPasswordMutation, useValidateResetTokenQuery } from '../authApi';
import AuthLayout from '@/components/ui/AuthLayout';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icon';

export default function ResetPasswordPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const [resetPassword, { isLoading: isResetting }] = useResetPasswordMutation();
    const { data: tokenValidation, isLoading: isValidating, isError: isTokenError } = useValidateResetTokenQuery(token, {
        skip: !token,
    });

    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => {
                navigate('/login', { replace: true });
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [successMessage, navigate]);

    const isFormValid =
        formData.password.length >= 8 &&
        formData.confirmPassword.length >= 8 &&
        formData.password === formData.confirmPassword;

    const passwordMismatch = formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (errorMessage) setErrorMessage('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isFormValid || !token) return;

        try {
            await resetPassword({
                token,
                password: formData.password,
                confirmPassword: formData.confirmPassword,
            }).unwrap();
            setSuccessMessage('Password reset successful. Redirecting to login…');
        } catch (err) {
            setErrorMessage(err?.data?.message || 'Could not reset password. Please try again.');
        }
    };

    // Loading state - validating token
    if (isValidating) {
        return (
            <AuthLayout>
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <div style={{ animation: 'mp-spin 2s linear infinite', marginBottom: 16 }}>
                        <Icons.loader size={32} style={{ color: 'var(--mp-blue)' }} />
                    </div>
                    <p style={{ color: 'var(--text-2)' }}>Validating reset link…</p>
                </div>
            </AuthLayout>
        );
    }

    // Success state
    if (successMessage) {
        return (
            <AuthLayout>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: 56, height: 56, borderRadius: 99,
                        margin: '0 auto 16px',
                        background: 'var(--success-bg, #E6F4EA)',
                        color: 'var(--success, #0F9D58)',
                        display: 'grid', placeItems: 'center',
                    }}>
                        <Icons.check size={24} />
                    </div>
                    <h1 className="mp-h2" style={{ margin: '0 0 8px', color: 'var(--text-1)' }}>
                        Password reset successful
                    </h1>
                    <p className="body" style={{ color: 'var(--text-2)', margin: '8px 0 28px' }}>
                        {successMessage}
                    </p>
                </div>
            </AuthLayout>
        );
    }

    // Invalid token state
    if (isTokenError || !tokenValidation) {
        return (
            <AuthLayout>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: 56, height: 56, borderRadius: 99,
                        margin: '0 auto 16px',
                        background: 'var(--error-bg, #FBE9E9)',
                        color: 'var(--error)',
                        display: 'grid', placeItems: 'center',
                    }}>
                        <Icons.alert size={24} />
                    </div>
                    <h1 className="mp-h2" style={{ margin: '0 0 8px', color: 'var(--text-1)' }}>
                        Invalid or expired link
                    </h1>
                    <p className="body" style={{ color: 'var(--text-2)', margin: '8px 0 28px' }}>
                        This password reset link has expired or is invalid. Please request a new one.
                    </p>

                    <Link to="/forgot-password" style={{ color: 'var(--mp-blue)', fontWeight: 600, textDecoration: 'none' }}>
                        <Button variant="primary" size="lg">
                            Request new link
                        </Button>
                    </Link>
                </div>
            </AuthLayout>
        );
    }

    // Valid token - show form
    return (
        <AuthLayout>
            <h1 className="mp-h2" style={{ margin: 0, color: 'var(--text-1)' }}>
                Create new password
            </h1>
            <p className="body" style={{ color: 'var(--text-2)', margin: '8px 0 28px' }}>
                Enter a new password for your account.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Input
                    label="New password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    icon={<Icons.lock size={18} />}
                    error={formData.password && formData.password.length < 8 ? 'Password must be at least 8 characters' : ''}
                    autoComplete="new-password"
                />

                <Input
                    label="Confirm password"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    icon={<Icons.lock size={18} />}
                    error={passwordMismatch ? 'Passwords do not match' : ''}
                    autoComplete="new-password"
                />

                {errorMessage && (
                    <div role="alert" style={{
                        background: 'var(--error-bg)',
                        color: 'var(--error)',
                        padding: '10px 12px',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 500,
                    }}>
                        {errorMessage}
                    </div>
                )}

                <Button
                    type="submit"
                    size="lg"
                    variant="primary"
                    disabled={isResetting || !isFormValid}
                    style={{ marginTop: 4 }}
                >
                    {isResetting ? 'Resetting…' : 'Reset password'}
                </Button>

                <div style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-2)', marginTop: 4 }}>
                    <Link to="/login" style={{ color: 'var(--mp-blue)', fontWeight: 600, textDecoration: 'none' }}>
                        Back to login
                    </Link>
                </div>
            </form>
        </AuthLayout>
    );
}
