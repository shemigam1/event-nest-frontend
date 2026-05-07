import { useNavigate } from 'react-router';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated } from '@/features/auth/authSlice';
import Brand from './Brand';
import Button from './Button';
import UserMenu from './UserMenu';

/**
 * Shared top navigation bar.
 *
 * variant:
 *   - "light"       white background (used inside the app)
 *   - "transparent" navy/glass header (used over the dark hero)
 */
export default function TopNav({ variant = 'light', showBrowse = true }) {
    const navigate = useNavigate();
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const onDark = variant === 'transparent';

    const styles = onDark
        ? {
            background: 'rgba(2,16,45,0.92)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
        }
        : {
            background: 'white',
            borderBottom: '1px solid var(--border)',
        };

    const browseStyle = onDark
        ? { color: 'rgba(255,255,255,0.75)' }
        : { color: 'var(--text-2)' };

    return (
        <nav data-testid="topnav" style={{
            position: 'sticky',
            top: 0,
            zIndex: 50,
            padding: '0 24px',
            height: 64,
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            ...styles,
        }}>
            <button
                onClick={() => navigate('/')}
                style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }}
                aria-label="EventNest home"
            >
                <Brand size={18} color={onDark ? 'white' : undefined} />
            </button>
            <div style={{ flex: 1 }} />
            {showBrowse && (
                <button
                    onClick={() => navigate('/events')}
                    style={{
                        background: 'none',
                        border: 0,
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: 'pointer',
                        padding: '8px 0',
                        ...browseStyle,
                    }}
                >
                    Browse events
                </button>
            )}
            {isAuthenticated ? (
                <UserMenu onDark={onDark} />
            ) : (
                <>
                    <Button
                        size="sm"
                        variant={onDark ? 'onDark' : 'secondary'}
                        onClick={() => navigate('/login')}
                    >
                        Sign in
                    </Button>
                    <Button size="sm" variant="primary" onClick={() => navigate('/register')}>
                        Get started
                    </Button>
                </>
            )}
        </nav>
    );
}
