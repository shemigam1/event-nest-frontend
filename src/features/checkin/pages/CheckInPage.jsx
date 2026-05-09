import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useScanTicketMutation } from '../checkInApi';
import { Icons } from '@/components/ui/Icon';
import Button from '@/components/ui/Button';
import Brand from '@/components/ui/Brand';

/* ── Setup screen ────────────────────────────────── */
function SetupScreen({ onStart, prefillEventId = '', prefillToken = '' }) {
    const [eventId, setEventId] = useState(prefillEventId);
    const [staffToken, setStaffToken] = useState(prefillToken);
    const [showToken, setShowToken] = useState(false);

    const canStart = eventId.trim() && staffToken.trim();

    function handleSubmit(e) {
        e.preventDefault();
        if (!canStart) return;
        onStart({ eventId: eventId.trim(), staffToken: staffToken.trim() });
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--surface-subtle)',
            display: 'grid',
            placeItems: 'center',
            padding: 24,
        }}>
            <div style={{ width: '100%', maxWidth: 440 }}>
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <Brand size={20} />
                    <h1 className="mp-h2" style={{ margin: '20px 0 6px', color: 'var(--text-1)' }}>
                        Check-in Station
                    </h1>
                    <p className="body" style={{ margin: 0, color: 'var(--text-2)' }}>
                        Enter your event ID and staff token to begin.
                    </p>
                </div>

                <form
                    onSubmit={handleSubmit}
                    style={{
                        background: 'white',
                        border: '1px solid var(--border)',
                        borderRadius: 16,
                        padding: 28,
                        boxShadow: 'var(--shadow-card)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 18,
                    }}
                >
                    <Field
                        label="Event ID"
                        placeholder="e.g. evt_001"
                        value={eventId}
                        onChange={setEventId}
                        icon={<Icons.calendar size={17} />}
                    />

                    <div>
                        <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-1)', marginBottom: 6 }}>
                            Staff Token
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Icons.shield size={17} style={{
                                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                                color: 'var(--text-3)', pointerEvents: 'none',
                            }} />
                            <input
                                type={showToken ? 'text' : 'password'}
                                placeholder="ckin_…"
                                value={staffToken}
                                onChange={(e) => setStaffToken(e.target.value)}
                                autoComplete="off"
                                style={{
                                    width: '100%', height: 44, padding: '0 40px 0 38px',
                                    background: 'white', border: '1px solid var(--border)',
                                    borderRadius: 12, fontSize: 15, color: 'var(--text-1)',
                                    fontFamily: staffToken && !showToken ? 'monospace' : 'inherit',
                                    boxSizing: 'border-box',
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowToken((s) => !s)}
                                style={{
                                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: 'var(--text-3)', padding: 4,
                                }}
                                aria-label={showToken ? 'Hide token' : 'Show token'}
                            >
                                <Icons.scan size={16} />
                            </button>
                        </div>
                    </div>

                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        iconRight={<Icons.arrowR size={16} />}
                        disabled={!canStart}
                        style={{ marginTop: 4 }}
                    >
                        Start session
                    </Button>
                </form>

                <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--text-3)' }}>
                    Credentials are provided by the event organiser.
                </p>
            </div>
        </div>
    );
}

/* ── Result card ─────────────────────────────────── */
function ResultCard({ result }) {
    if (!result) return null;

    const isSuccess = result.type === 'success';
    const d = result.data;

    return (
        <div style={{
            borderRadius: 14,
            padding: '20px 24px',
            background: isSuccess ? 'var(--success-bg)' : 'var(--error-bg)',
            border: `1.5px solid ${isSuccess ? 'var(--success)' : 'var(--error)'}`,
            display: 'flex',
            gap: 16,
            alignItems: 'flex-start',
        }}>
            <div style={{
                width: 44, height: 44, borderRadius: 99, flexShrink: 0,
                background: isSuccess ? 'var(--success)' : 'var(--error)',
                color: 'white', display: 'grid', placeItems: 'center',
            }}>
                {isSuccess ? <Icons.check size={22} /> : <Icons.alert size={22} />}
            </div>
            <div style={{ flex: 1 }}>
                {isSuccess ? (
                    <>
                        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--success)', marginBottom: 4 }}>
                            Check-in successful
                        </div>
                        <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--text-1)' }}>
                            {d.attendeeFirstName} {d.attendeeLastName}
                        </div>
                        <div style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 4, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                            <span className="mp-num">{d.seatNumber}</span>
                            <span>{d.tierName}</span>
                        </div>
                    </>
                ) : (
                    <>
                        <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--error)', marginBottom: 4 }}>
                            Check-in failed
                        </div>
                        <div style={{ fontSize: 14, color: 'var(--text-2)' }}>{result.message}</div>
                    </>
                )}
            </div>
        </div>
    );
}

/* ── Scan history row ────────────────────────────── */
function HistoryRow({ entry, isLast }) {
    const time = new Date(entry.checkedInAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const isSuccess = entry.type === 'success';

    return (
        <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 16px',
            borderBottom: isLast ? 0 : '1px solid var(--border)',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{
                    width: 24, height: 24, borderRadius: 99, flexShrink: 0,
                    background: isSuccess ? 'var(--success-bg)' : 'var(--error-bg)',
                    color: isSuccess ? 'var(--success)' : 'var(--error)',
                    display: 'grid', placeItems: 'center',
                }}>
                    {isSuccess ? <Icons.check size={13} /> : <Icons.x size={13} />}
                </span>
                <div>
                    {isSuccess ? (
                        <span style={{ fontSize: 14, color: 'var(--text-1)', fontWeight: 500 }}>
                            {entry.data.attendeeFirstName} {entry.data.attendeeLastName}
                            <span className="mp-num" style={{ color: 'var(--text-3)', fontWeight: 400, marginLeft: 8 }}>
                                {entry.data.seatNumber}
                            </span>
                        </span>
                    ) : (
                        <span style={{ fontSize: 14, color: 'var(--error)' }}>{entry.message}</span>
                    )}
                </div>
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'monospace', flexShrink: 0 }}>{time}</span>
        </div>
    );
}

/* ── Active session ──────────────────────────────── */
function ActiveSession({ credentials, onEnd }) {
    const [checkIn, { isLoading }] = useScanTicketMutation();
    const [qrInput, setQrInput] = useState('');
    const [result, setResult] = useState(null);
    const [history, setHistory] = useState([]);
    const inputRef = useRef(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, [result]);

    const successCount = history.filter((h) => h.type === 'success').length;

    async function handleScan(e) {
        e.preventDefault();
        const qrCode = qrInput.trim();
        if (!qrCode) return;

        setQrInput('');
        try {
            const data = await checkIn({
                eventId: credentials.eventId,
                staffToken: credentials.staffToken,
                qrCode,
            }).unwrap();

            const entry = { type: 'success', data, checkedInAt: data.checkedInAt ?? new Date().toISOString() };
            setResult(entry);
            setHistory((h) => [entry, ...h.slice(0, 49)]);
        } catch (err) {
            const message = err?.data?.message || 'Could not process this ticket. Please try again.';
            const entry = { type: 'error', message, checkedInAt: new Date().toISOString() };
            setResult(entry);
            setHistory((h) => [entry, ...h.slice(0, 49)]);
        }

        inputRef.current?.focus();
    }

    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{
                background: 'white', borderBottom: '1px solid var(--border)',
                padding: '0 24px', height: 64,
                display: 'flex', alignItems: 'center', gap: 16,
                position: 'sticky', top: 0, zIndex: 10,
            }}>
                <button
                    onClick={onEnd}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-2)', fontSize: 14, fontWeight: 500, padding: 0,
                    }}
                >
                    <Icons.arrowL size={16} /> End session
                </button>
                <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
                <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-3)' }}>Event: </span>
                    <span className="mp-num" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
                        {credentials.eventId}
                    </span>
                </div>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: successCount > 0 ? 'var(--success-bg)' : 'var(--surface-subtle)',
                    border: `1px solid ${successCount > 0 ? 'var(--success)' : 'var(--border)'}`,
                    borderRadius: 99, padding: '4px 14px',
                }}>
                    <span style={{ fontSize: 13, color: successCount > 0 ? 'var(--success)' : 'var(--text-3)', fontWeight: 500 }}>
                        Checked in
                    </span>
                    <span className="mp-num" style={{ fontSize: 18, fontWeight: 700, color: successCount > 0 ? 'var(--success)' : 'var(--text-3)' }}>
                        {successCount}
                    </span>
                </div>
            </div>

            {/* Scan area */}
            <div style={{ maxWidth: 640, width: '100%', margin: '0 auto', padding: '32px 24px', flex: 1 }}>
                <form onSubmit={handleScan}>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--text-1)', marginBottom: 8 }}>
                        Scan or enter QR code
                    </label>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <Icons.scan size={18} style={{
                                position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                                color: 'var(--text-3)', pointerEvents: 'none',
                            }} />
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Point scanner at QR code or type here…"
                                value={qrInput}
                                onChange={(e) => setQrInput(e.target.value)}
                                autoComplete="off"
                                autoFocus
                                style={{
                                    width: '100%', height: 52, padding: '0 14px 0 44px',
                                    background: 'white', border: '2px solid var(--mp-blue)',
                                    borderRadius: 12, fontSize: 15, color: 'var(--text-1)',
                                    boxSizing: 'border-box', outline: 'none',
                                }}
                            />
                        </div>
                        <Button
                            type="submit"
                            variant="primary"
                            size="lg"
                            disabled={!qrInput.trim() || isLoading}
                            style={{ height: 52, paddingInline: 24 }}
                        >
                            {isLoading ? '…' : 'Check in'}
                        </Button>
                    </div>
                    <p style={{ marginTop: 8, fontSize: 12, color: 'var(--text-3)' }}>
                        USB barcode scanners work automatically — just scan and the ticket submits.
                    </p>
                </form>

                {/* Result */}
                {result && (
                    <div style={{ marginTop: 24 }}>
                        <ResultCard result={result} />
                    </div>
                )}

                {/* History */}
                {history.length > 0 && (
                    <div style={{ marginTop: 28 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Recent scans
                        </div>
                        <div style={{
                            background: 'white', border: '1px solid var(--border)',
                            borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-card)',
                        }}>
                            {history.slice(0, 10).map((entry, i) => (
                                <HistoryRow key={i} entry={entry} isLast={i === Math.min(history.length, 10) - 1} />
                            ))}
                        </div>
                    </div>
                )}

                {history.length === 0 && !result && (
                    <div style={{
                        marginTop: 48, textAlign: 'center',
                        padding: 40, background: 'white',
                        border: '1px solid var(--border)', borderRadius: 14,
                        boxShadow: 'var(--shadow-card)',
                    }}>
                        <div style={{
                            width: 64, height: 64, borderRadius: 99,
                            background: 'var(--mp-blue-50)', color: 'var(--mp-blue)',
                            display: 'grid', placeItems: 'center', margin: '0 auto 16px',
                        }}>
                            <Icons.scan size={28} />
                        </div>
                        <p className="mp-h4" style={{ margin: '0 0 6px', color: 'var(--text-1)' }}>Ready to scan</p>
                        <p className="body-sm" style={{ margin: 0, color: 'var(--text-2)' }}>
                            Scan a ticket QR code or enter it manually above.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ── Shared field ────────────────────────────────── */
function Field({ label, placeholder, value, onChange, icon }) {
    return (
        <div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-1)', marginBottom: 6 }}>
                {label}
            </label>
            <div style={{ position: 'relative' }}>
                {icon && (
                    <span style={{
                        position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                        color: 'var(--text-3)', pointerEvents: 'none',
                    }}>
                        {icon}
                    </span>
                )}
                <input
                    type="text"
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    style={{
                        width: '100%', height: 44,
                        padding: icon ? '0 14px 0 38px' : '0 14px',
                        background: 'white', border: '1px solid var(--border)',
                        borderRadius: 12, fontSize: 15, color: 'var(--text-1)',
                        boxSizing: 'border-box',
                    }}
                />
            </div>
        </div>
    );
}

/* ── Page ────────────────────────────────────────── */
export default function CheckInPage() {
    const [searchParams] = useSearchParams();
    const [session, setSession] = useState(null);

    // Deep-link from the staff-invite email lands here with credentials in
    // the query string. Capture them once on first render, then scrub the URL
    // via history.replaceState so the token doesn't leak via Referer / browser
    // history / shoulder-surfing.
    const [prefill, setPrefill] = useState(() => ({
        eventId: searchParams.get('eventId') ?? '',
        token: searchParams.get('token') ?? '',
    }));

    useEffect(() => {
        if (prefill.eventId || prefill.token) {
            window.history.replaceState({}, '', '/checkin');
        }
        // first-render only — we don't want every URL change to re-scrub
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (!session) {
        return (
            <SetupScreen
                onStart={(creds) => {
                    setPrefill({ eventId: '', token: '' });
                    setSession(creds);
                }}
                prefillEventId={prefill.eventId}
                prefillToken={prefill.token}
            />
        );
    }

    return <ActiveSession credentials={session} onEnd={() => setSession(null)} />;
}
