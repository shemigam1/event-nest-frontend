import { Link } from 'react-router';
import Brand from '@/components/ui/Brand';

/* ────────────────────────────────────────────────────────────────────────────
   LegalPage — shared minimal layout for /terms and /privacy.

   Reachable both anonymously (linked from the signup form's T&C checkbox) and
   authenticated (will eventually surface from Settings → Legal). The page is
   listed in AppShell's ALWAYS_NO_SIDEBAR set so the AppShell doesn't render
   its sidebar/TopBar over it — keeps the legal copy distraction-free.

   Pass `title`, `lastUpdated` (ISO date or any display string), and a `body`
   slot containing the actual content (paragraphs, sections, h2s).
   ──────────────────────────────────────────────────────────────────────── */
export default function LegalPage({ title, lastUpdated, children }) {
    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--surface-page)',
            color: 'var(--text-1)',
        }}>
            {/* Slim top bar — just brand + back link, no nav noise. */}
            <header style={{
                position: 'sticky',
                top: 0,
                zIndex: 30,
                background: 'var(--surface-elevated)',
                borderBottom: '1px solid var(--border)',
                padding: '14px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
            }}>
                <Link to="/" style={{ textDecoration: 'none' }}>
                    <Brand size={18} />
                </Link>
                <Link
                    to="/register"
                    style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--mp-blue)',
                        textDecoration: 'none',
                    }}
                >
                    Back to signup
                </Link>
            </header>

            <main style={{
                maxWidth: 720,
                margin: '0 auto',
                padding: '40px 24px 80px',
            }}>
                <h1 className="mp-h1" style={{ margin: 0 }}>{title}</h1>
                {lastUpdated && (
                    <p style={{
                        margin: '6px 0 32px',
                        fontSize: 13,
                        color: 'var(--text-3)',
                    }}>
                        Last updated {lastUpdated}
                    </p>
                )}

                <div style={{
                    fontSize: 15,
                    lineHeight: 1.7,
                    color: 'var(--text-2)',
                }}>
                    {children}
                </div>
            </main>
        </div>
    );
}

/* Small typographic helper used by both pages — keeps section headings
   visually consistent without polluting the global CSS. */
export function Section({ title, children }) {
    return (
        <section style={{ marginTop: 28 }}>
            <h2 className="mp-h3" style={{
                margin: '0 0 10px',
                color: 'var(--text-1)',
            }}>
                {title}
            </h2>
            <div>{children}</div>
        </section>
    );
}
