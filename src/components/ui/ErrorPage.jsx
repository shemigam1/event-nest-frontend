import { useNavigate, useRouteError } from 'react-router';
import Button from './Button';
import Brand from './Brand';
import { Icons } from './Icon';

export default function ErrorPage() {
    const error = useRouteError();
    const navigate = useNavigate();

    const is404 = error?.status === 404;

    const title   = is404 ? 'Page not found' : 'Something went wrong';
    const message = is404
        ? "The page you're looking for doesn't exist or has been moved."
        : 'An unexpected error occurred. Try refreshing, or go back to the home page.';

    const detail = !is404 && (error?.message || error?.statusText || null);

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--surface-subtle)',
            display: 'flex',
            flexDirection: 'column',
        }}>
            {/* Minimal nav */}
            <div style={{
                padding: '0 24px', height: 64,
                display: 'flex', alignItems: 'center',
                background: 'white', borderBottom: '1px solid var(--border)',
            }}>
                <Brand size={18} />
            </div>

            {/* Error content */}
            <div style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 24,
            }}>
                <div style={{
                    maxWidth: 480, width: '100%', textAlign: 'center',
                    background: 'white', border: '1px solid var(--border)',
                    borderRadius: 16, padding: 40, boxShadow: 'var(--shadow-card)',
                }}>
                    <div style={{
                        width: 56, height: 56, borderRadius: 99,
                        background: is404 ? 'var(--surface-subtle)' : 'var(--error-bg)',
                        color: is404 ? 'var(--text-3)' : 'var(--error)',
                        display: 'grid', placeItems: 'center', margin: '0 auto 20px',
                    }}>
                        {is404 ? <Icons.search size={24} /> : <Icons.alert size={24} />}
                    </div>

                    {is404 && (
                        <div className="mp-num" style={{
                            fontSize: 64, fontWeight: 800, color: 'var(--border)',
                            lineHeight: 1, marginBottom: 8,
                        }}>
                            404
                        </div>
                    )}

                    <h1 className="mp-h2" style={{ margin: '0 0 10px', color: 'var(--text-1)' }}>
                        {title}
                    </h1>
                    <p className="body" style={{ margin: '0 0 24px', color: 'var(--text-2)' }}>
                        {message}
                    </p>

                    {detail && (
                        <div style={{
                            margin: '0 0 24px',
                            padding: '10px 14px',
                            background: 'var(--surface-subtle)',
                            borderRadius: 8,
                            fontSize: 12,
                            fontFamily: 'monospace',
                            color: 'var(--text-2)',
                            textAlign: 'left',
                            wordBreak: 'break-all',
                        }}>
                            {detail}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                        <Button variant="secondary" size="md" onClick={() => navigate(-1)}>
                            Go back
                        </Button>
                        <Button variant="primary" size="md" onClick={() => navigate('/')}>
                            Home
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
