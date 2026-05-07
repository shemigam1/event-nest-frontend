import { Link } from 'react-router';
import Brand from './Brand';

export default function AuthLayout({ children }) {
    return (
        <div style={{
            minHeight: '100vh',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            background: 'white',
        }}>
            <aside style={{
                background: 'var(--mp-navy)',
                color: 'white',
                padding: '64px 56px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
            }}>
                <Link to="/" style={{ textDecoration: 'none' }}>
                    <Brand color="white" size={20} />
                </Link>
                <div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.08em' }}>
                        EVENTNEST
                    </span>
                    <h2 className="mp-h1" style={{ margin: '12px 0 0', color: 'white' }}>
                        One account.<br/>Many roles per event.
                    </h2>
                    <p className="body-lg" style={{ marginTop: 16, color: 'rgba(255,255,255,0.75)', maxWidth: 440 }}>
                        Organise your own conference, attend a colleague&apos;s launch, work check-in
                        at a partner event — all from the same login.
                    </p>
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
                    Capstone 8 · Moniepoint DreamDev
                </div>
            </aside>

            <main style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 40,
            }}>
                <div style={{ width: '100%', maxWidth: 380 }}>
                    {children}
                </div>
            </main>
        </div>
    );
}
