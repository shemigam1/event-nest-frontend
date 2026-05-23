import { useState } from 'react';
import { useParams } from 'react-router';
import { useScanTicketMutation } from '../checkinApi';
import TopNav from '@/components/ui/TopNav';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Icons } from '@/components/ui/Icon';

/**
 * Public page used by check-in staff at the gate. Auth is via the staff
 * token (delivered by email when the organiser invited them) — NOT the
 * usual JWT, so this route is not behind PrivateRoute.
 */
export default function CheckInScannerPage() {
    const { eventId } = useParams();
    const [staffToken, setStaffToken] = useState('');
    const [qrCode, setQrCode] = useState('');
    const [lastResult, setLastResult] = useState(null);
    const [scan, scanState] = useScanTicketMutation();

    async function submit(e) {
        e.preventDefault();
        if (!staffToken.trim() || !qrCode.trim()) return;
        try {
            const data = await scan({ eventId, staffToken: staffToken.trim(), qrCode: qrCode.trim() }).unwrap();
            setLastResult({ ok: true, data });
        } catch (err) {
            setLastResult({ ok: false, message: err?.data?.message || 'Scan failed' });
        } finally {
            setQrCode('');
        }
    }

    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            <TopNav showBrowse={false} />
            <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 24px 80px' }}>
                <div style={{ marginBottom: 24 }}>
                    <h1 className="mp-h1" style={{ margin: 0, color: 'var(--text-1)' }}>Check-in</h1>
                    <p className="body" style={{ margin: '6px 0 0', color: 'var(--text-2)' }}>
                        Enter your staff token once, then scan or paste each ticket’s QR.
                    </p>
                </div>

                <form
                    onSubmit={submit}
                    style={{
                        background: 'var(--surface-elevated)', border: '1px solid var(--border)',
                        borderRadius: 16, padding: 24, boxShadow: 'var(--shadow-card)',
                        display: 'flex', flexDirection: 'column', gap: 16,
                    }}
                >
                    <Input
                        label="Staff token"
                        type="password"
                        value={staffToken}
                        onChange={(e) => setStaffToken(e.target.value)}
                        autoComplete="off"
                        required
                        placeholder="Paste the token from your email"
                    />
                    <Input
                        label="Ticket QR code"
                        value={qrCode}
                        onChange={(e) => setQrCode(e.target.value)}
                        autoFocus
                        required
                        placeholder="Scan or paste here"
                    />
                    <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        disabled={scanState.isLoading || !staffToken.trim() || !qrCode.trim()}
                        icon={<Icons.scan size={16} />}
                    >
                        {scanState.isLoading ? 'Checking…' : 'Check in'}
                    </Button>
                </form>

                {lastResult && (
                    <ResultPanel result={lastResult} onDismiss={() => setLastResult(null)} />
                )}
            </div>
        </div>
    );
}

function ResultPanel({ result, onDismiss }) {
    const { ok } = result;
    return (
        <div
            role="status"
            style={{
                marginTop: 20,
                padding: 24,
                borderRadius: 16,
                background: ok ? 'var(--success-bg, #ecfdf5)' : 'var(--error-bg, #fef2f2)',
                border: `1px solid ${ok ? 'var(--success, #10b981)' : 'var(--error, #ef4444)'}`,
                color: ok ? 'var(--success, #065f46)' : 'var(--error, #991b1b)',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                {ok ? <Icons.check size={22} /> : <Icons.alert size={22} />}
                <span className="mp-h4" style={{ margin: 0 }}>
                    {ok ? 'Admitted' : 'Rejected'}
                </span>
            </div>
            {ok ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div className="body-sm">
                        <strong>{result.data.attendeeFirstName} {result.data.attendeeLastName}</strong>
                    </div>
                    <div className="body-sm">
                        {result.data.tierName} · seat <strong>{result.data.seatNumber}</strong>
                    </div>
                </div>
            ) : (
                <p className="body-sm" style={{ margin: 0 }}>{result.message}</p>
            )}
            <button
                type="button"
                onClick={onDismiss}
                style={{ marginTop: 12, background: 'none', border: 0, padding: 0, fontSize: 13, color: 'inherit', textDecoration: 'underline', cursor: 'pointer' }}
            >
                Dismiss
            </button>
        </div>
    );
}
