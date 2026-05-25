import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { useScanTicketMutation } from '../checkinApi';
import { useGetEventByIdQuery } from '@/features/events/eventsApi';
import TopNav from '@/components/ui/TopNav';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Icons } from '@/components/ui/Icon';

/**
 * Public page used by check-in staff at the gate. Auth is via the staff
 * token (delivered by email when the organiser invited them) — NOT the
 * usual JWT, so this route is not behind PrivateRoute.
 *
 * For multi-day events the staff must select the current event day before
 * scanning; for single-day events the day is auto-resolved by the backend.
 */
export default function CheckInScannerPage() {
    const { eventId } = useParams();
    const [staffToken, setStaffToken] = useState('');
    const [ticketCode, setTicketCode] = useState('');
    const [selectedDayId, setSelectedDayId] = useState(null);
    const [lastResult, setLastResult] = useState(null);
    const [scan, scanState] = useScanTicketMutation();

    const { data: event } = useGetEventByIdQuery(eventId, { skip: !eventId });
    const days = event?.eventDays ?? [];
    const isMultiDay = days.length > 1;

    // Auto-select today's day on load
    const todayIso = new Date().toISOString().slice(0, 10);
    useEffect(() => {
        if (days.length === 1) {
            setSelectedDayId(days[0].id);
        } else if (days.length > 1) {
            const todayDay = days.find((d) => d.dayDate === todayIso);
            if (todayDay) setSelectedDayId(todayDay.id);
        }
    }, [days.length]); // eslint-disable-line react-hooks/exhaustive-deps

    async function submit(e) {
        e.preventDefault();
        if (!staffToken.trim() || !ticketCode.trim()) return;
        try {
            const data = await scan({
                eventId,
                staffToken: staffToken.trim(),
                ticketCode: ticketCode.trim(),
                ...(selectedDayId ? { eventDayId: selectedDayId } : {}),
            }).unwrap();
            setLastResult({ ok: true, data });
        } catch (err) {
            setLastResult({ ok: false, message: err?.data?.message || err?.data?.errors?.[0] || 'Scan failed' });
        } finally {
            setTicketCode('');
        }
    }

    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            <TopNav showBrowse={false} />
            <div className="mp-page-wrap" style={{ maxWidth: 560, margin: '0 auto', padding: '32px 24px 80px' }}>
                <div style={{ marginBottom: 24 }}>
                    <h1 className="mp-h1" style={{ margin: 0, color: 'var(--text-1)' }}>Check-in</h1>
                    <p className="body" style={{ margin: '6px 0 0', color: 'var(--text-2)' }}>
                        Enter your staff token once, then scan or paste each ticket&apos;s QR.
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

                    {/* Day selector — only shown for multi-day events */}
                    {isMultiDay && (
                        <div>
                            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-1)', marginBottom: 8 }}>
                                Event day
                            </label>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {days.map((d) => {
                                    const isSelected = d.id === selectedDayId;
                                    const dateStr = new Date(d.dayDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
                                    const isToday = d.dayDate === todayIso;
                                    return (
                                        <button
                                            key={d.id}
                                            type="button"
                                            onClick={() => setSelectedDayId(d.id)}
                                            style={{
                                                padding: '6px 14px', borderRadius: 99,
                                                border: `1.5px solid ${isSelected ? 'var(--mp-blue)' : 'var(--border)'}`,
                                                background: isSelected ? 'var(--mp-blue-50)' : 'transparent',
                                                color: isSelected ? 'var(--mp-blue)' : 'var(--text-2)',
                                                fontSize: 13, fontWeight: isSelected ? 600 : 400,
                                                cursor: 'pointer', transition: 'all 0.15s',
                                            }}
                                        >
                                            {d.label || dateStr}
                                            {isToday && <span style={{ marginLeft: 5, fontSize: 11, opacity: 0.7 }}>(today)</span>}
                                        </button>
                                    );
                                })}
                            </div>
                            {!selectedDayId && (
                                <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--error)' }}>
                                    Select the day you are scanning for.
                                </p>
                            )}
                        </div>
                    )}

                    <Input
                        label="Ticket QR code"
                        value={ticketCode}
                        onChange={(e) => setTicketCode(e.target.value)}
                        autoFocus
                        required
                        placeholder="Scan or paste here"
                    />
                    <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        disabled={
                            scanState.isLoading ||
                            !staffToken.trim() ||
                            !ticketCode.trim() ||
                            (isMultiDay && !selectedDayId)
                        }
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
                    {ok
                        ? result.data.firstScan ? 'Admitted' : 'Already checked in today'
                        : 'Rejected'}
                </span>
            </div>
            {ok ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div className="body-sm">
                        <strong>{result.data.holderName}</strong>
                    </div>
                    <div className="body-sm">
                        {result.data.tierName}
                        {result.data.seatLabel && <> · seat <strong>{result.data.seatLabel}</strong></>}
                        {result.data.eventDayLabel && <> · <span style={{ opacity: 0.7 }}>{result.data.eventDayLabel}</span></>}
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
