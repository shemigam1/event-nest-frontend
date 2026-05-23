import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useForgotPasswordMutation } from '../authApi';
import AuthLayout from '@/components/ui/AuthLayout';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icon';

const COOLDOWN_SECS = 60;

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [cooldown, setCooldown] = useState(0);
    const [forgotPassword, { isLoading }] = useForgotPasswordMutation();

    // Tick the cooldown down by 1 every second until it reaches 0.
    useEffect(() => {
        if (cooldown <= 0) return;
        const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
        return () => clearTimeout(id);
    }, [cooldown]);

    const isFormValid = email.trim() && email.includes('@');

    const handleChange = (e) => {
        setEmail(e.target.value);
        if (errorMessage) setErrorMessage('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isFormValid || cooldown > 0) return;
        try {
            await forgotPassword({ email: email.trim() }).unwrap();
            setSuccessMessage('Check your email for a password reset link. The link expires in 1 hour.');
            setEmail('');
            setCooldown(COOLDOWN_SECS);
        } catch (err) {
            setErrorMessage(err?.data?.message || 'Could not send reset link. Please try again.');
        }
    };

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
                        Check your email
                    </h1>
                    <p className="body" style={{ color: 'var(--text-2)', margin: '8px 0 28px' }}>
                        {successMessage}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <Button
                            variant="secondary"
                            size="lg"
                            disabled={cooldown > 0}
                            onClick={() => {
                                setSuccessMessage('');
                                setEmail('');
                            }}
                        >
                            {cooldown > 0
                                ? `Resend in ${cooldown}s`
                                : 'Send another link'}
                        </Button>
                        <div style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-2)' }}>
                            <Link to="/login" style={{ color: 'var(--mp-blue)', fontWeight: 600, textDecoration: 'none' }}>
                                Back to login
                            </Link>
                        </div>
                    </div>
                </div>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout>
            <h1 className="mp-h2" style={{ margin: 0, color: 'var(--text-1)' }}>
                Reset your password
            </h1>
            <p className="body" style={{ color: 'var(--text-2)', margin: '8px 0 28px' }}>
                Enter your email and we'll send you a link to reset your password.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Input
                    label="Email"
                    type="email"
                    value={email}
                    onChange={handleChange}
                    placeholder="you@company.com"
                    icon={<Icons.mail size={18} />}
                    autoComplete="email"
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
                    disabled={isLoading || !isFormValid || cooldown > 0}
                    style={{ marginTop: 4 }}
                >
                    {isLoading ? 'Sending…' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Send reset link'}
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
