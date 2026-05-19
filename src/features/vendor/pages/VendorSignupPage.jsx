import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated } from '@/features/auth/authSlice';
import { Icons } from '@/components/ui/Icon';

export default function VendorSignupPage() {
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const navigate = useNavigate();

    // Authenticated users don't need to sign up — send them straight to profile setup
    useEffect(() => {
        if (isAuthenticated) navigate('/vendor/profile', { replace: true });
    }, [isAuthenticated, navigate]);

    if (isAuthenticated) return null;

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--surface-page)',
            padding: 24,
        }}>
            <div style={{
                maxWidth: 480,
                width: '100%',
                background: 'white',
                borderRadius: 16,
                border: '1px solid var(--border)',
                padding: '40px 36px',
                textAlign: 'center',
            }}>
                <div style={{
                    width: 56, height: 56, borderRadius: 16,
                    background: 'var(--mp-blue-50, #EAF1FE)',
                    display: 'grid', placeItems: 'center',
                    margin: '0 auto 20px',
                }}>
                    <Icons.users size={26} style={{ color: 'var(--mp-blue)' }} />
                </div>

                <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-1)', margin: '0 0 8px' }}>
                    Become a vendor
                </h1>
                <p style={{ fontSize: 14, color: 'var(--text-2)', margin: '0 0 28px', lineHeight: 1.6 }}>
                    Join EventNest as a vendor to offer your services at events.
                    Create a free account to get started, then complete your vendor profile.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <Link
                        to="/register"
                        style={{
                            display: 'block',
                            padding: '12px 24px',
                            background: 'var(--mp-blue)',
                            color: 'white',
                            borderRadius: 10,
                            fontWeight: 600,
                            fontSize: 14,
                            textDecoration: 'none',
                        }}
                    >
                        Create an account
                    </Link>
                    <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>
                        Already have an account?{' '}
                        <Link to="/login" style={{ color: 'var(--mp-blue)', fontWeight: 500 }}>
                            Sign in
                        </Link>
                        {' '}and go to{' '}
                        <Link to="/vendor/profile" style={{ color: 'var(--mp-blue)', fontWeight: 500 }}>
                            Vendor profile
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
