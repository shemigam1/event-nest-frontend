/**
 * AdminEscrowPage — COMING SOON
 *
 * Design decision (2026-05-23):
 * The full escrow-disputes admin workflow (list disputes, rule for vendor /
 * organiser, flag escrow violation) is deferred to a future release.
 *
 * Backend gap: GET /api/v1/admin/escrow/disputes does not exist yet.
 * The PATCH ruling and flag-violation endpoints exist but are not exposed
 * in the UI until the list endpoint and enriched AdminDisputeResponse DTO
 * are built.
 *
 * When ready to implement, see the plan recorded in the project memory file.
 */

export default function AdminEscrowPage() {
    return (
        <div style={{
            background: 'var(--surface-subtle)',
            minHeight: '100vh',
            display: 'grid',
            placeItems: 'center',
            padding: 40,
        }}>
            <div style={{
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                boxShadow: 'var(--shadow-card)',
                padding: '56px 48px',
                textAlign: 'center',
                maxWidth: 480,
                width: '100%',
            }}>
                {/* Shield / escrow icon */}
                <div style={{
                    width: 64,
                    height: 64,
                    borderRadius: 16,
                    background: 'var(--mp-blue-50)',
                    display: 'grid',
                    placeItems: 'center',
                    margin: '0 auto 24px',
                }}>
                    <svg width={32} height={32} viewBox="0 0 24 24" fill="none"
                        stroke="var(--mp-blue)" strokeWidth={1.75}
                        strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                </div>

                <span style={{
                    display: 'inline-block',
                    background: 'var(--warning-bg)',
                    color: 'var(--warning)',
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    padding: '3px 10px',
                    borderRadius: 99,
                    marginBottom: 16,
                    textTransform: 'uppercase',
                }}>
                    Coming soon
                </span>

                <h1 className="mp-h2" style={{ margin: '0 0 12px', color: 'var(--text-1)' }}>
                    Escrow disputes
                </h1>

                <p className="body" style={{ margin: '0 0 24px', color: 'var(--text-2)', lineHeight: 1.6 }}>
                    The dispute adjudication panel is under development. When live, you'll be
                    able to review open milestone disputes, rule in favour of vendors or
                    organisers, and flag escrow violations — all from this screen.
                </p>

                <div style={{
                    background: 'var(--surface-subtle)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    padding: '14px 18px',
                    textAlign: 'left',
                }}>
                    <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
                        Planned features
                    </p>
                    {[
                        'Paginated dispute list filtered by status (Open / Ruled)',
                        'Rich dispute cards — event, vendor, organiser, milestone amount',
                        'One-click ruling with mandatory admin notes',
                        'Escrow violation flag (−35 trust event)',
                    ].map((item) => (
                        <div key={item} style={{
                            display: 'flex', alignItems: 'flex-start', gap: 8,
                            fontSize: 13, color: 'var(--text-2)', marginBottom: 6,
                        }}>
                            <span style={{ color: 'var(--mp-blue)', marginTop: 1, flexShrink: 0 }}>•</span>
                            {item}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
