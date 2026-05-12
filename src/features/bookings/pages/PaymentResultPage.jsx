import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { useVerifyPaymentMutation } from '../bookingsApi';
import { POLL_INTERVAL_MS, MAX_POLLS } from '../paymentConfig';
import Button from '@/components/ui/Button';
import TopNav from '@/components/ui/TopNav';
import { Icons } from '@/components/ui/Icon';

export default function PaymentResultPage() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const transactionRef = params.get('transactionReference') ?? '';

    const [verifyPayment] = useVerifyPaymentMutation();
    const [status, setStatus] = useState('verifying'); // verifying | paid | failed | error
    const [pollCount, setPollCount] = useState(0);
    const timerRef = useRef(null);

    useEffect(() => {
        if (!transactionRef) {
            setStatus('error');
            return;
        }
        verify();
        return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function verify() {
        try {
            const result = await verifyPayment(transactionRef).unwrap();
            const payStatus = result.status ?? result.paymentStatus;
            if (payStatus === 'PAID') {
                setStatus('paid');
            } else if (payStatus === 'FAILED') {
                setStatus('failed');
            } else {
                // PENDING — keep polling
                setPollCount((c) => {
                    const next = c + 1;
                    if (next >= MAX_POLLS) {
                        setStatus('pending_timeout');
                    } else {
                        timerRef.current = setTimeout(verify, POLL_INTERVAL_MS);
                    }
                    return next;
                });
            }
        } catch {
            setStatus('error');
        }
    }

    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            <TopNav />
            <div style={{ maxWidth: 480, margin: '0 auto', padding: '48px 24px 80px' }}>
                <div
                    data-testid="payment-result-card"
                    style={{
                        background: 'white',
                        border: '1px solid var(--border)',
                        borderRadius: 16,
                        boxShadow: 'var(--shadow-card)',
                        padding: 32,
                        textAlign: 'center',
                    }}
                >
                    {status === 'verifying' && <VerifyingView pollCount={pollCount} />}
                    {status === 'paid' && <PaidView onTickets={() => navigate('/tickets')} onMore={() => navigate('/events')} />}
                    {status === 'failed' && <FailedView onRetry={() => navigate(-2)} onBrowse={() => navigate('/events')} />}
                    {status === 'pending_timeout' && <PendingTimeoutView onTickets={() => navigate('/tickets')} />}
                    {status === 'error' && <ErrorView onBrowse={() => navigate('/events')} />}
                </div>
            </div>
        </div>
    );
}

function VerifyingView({ pollCount }) {
    return (
        <>
            <Spinner />
            <h2 className="mp-h2" style={{ margin: '20px 0 8px', color: 'var(--text-1)' }}>
                Confirming payment…
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-2)', margin: 0 }}>
                This usually takes a few seconds.
                {pollCount > 2 && ' Still waiting on confirmation from the payment gateway.'}
            </p>
        </>
    );
}

function PaidView({ onTickets, onMore }) {
    return (
        <>
            <div style={{
                width: 64, height: 64, margin: '0 auto', borderRadius: 99,
                background: 'var(--success-bg)', color: 'var(--success)',
                display: 'grid', placeItems: 'center',
            }}>
                <Icons.check size={28} />
            </div>
            <h2 className="mp-h2" style={{ margin: '20px 0 8px', color: 'var(--text-1)' }}>
                Payment confirmed!
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-2)', margin: '0 0 28px' }}>
                Your tickets have been issued. Check your email for confirmation.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button variant="primary" size="lg" icon={<Icons.ticket size={16} />} onClick={onTickets}>
                    View tickets
                </Button>
                <Button variant="secondary" size="lg" onClick={onMore}>
                    Browse more
                </Button>
            </div>
        </>
    );
}

function FailedView({ onRetry, onBrowse }) {
    return (
        <>
            <div style={{
                width: 64, height: 64, margin: '0 auto', borderRadius: 99,
                background: 'var(--error-bg)', color: 'var(--error)',
                display: 'grid', placeItems: 'center',
            }}>
                <Icons.alert size={28} />
            </div>
            <h2 className="mp-h2" style={{ margin: '20px 0 8px', color: 'var(--text-1)' }}>
                Payment failed
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-2)', margin: '0 0 28px' }}>
                Your payment was not completed. No charge has been made.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button variant="primary" size="lg" onClick={onRetry}>
                    Try again
                </Button>
                <Button variant="ghost" size="lg" onClick={onBrowse}>
                    Browse events
                </Button>
            </div>
        </>
    );
}

function PendingTimeoutView({ onTickets }) {
    return (
        <>
            <div style={{
                width: 64, height: 64, margin: '0 auto', borderRadius: 99,
                background: '#FFF7ED', color: '#C2410C',
                display: 'grid', placeItems: 'center',
            }}>
                <Icons.alert size={28} />
            </div>
            <h2 className="mp-h2" style={{ margin: '20px 0 8px', color: 'var(--text-1)' }}>
                Payment pending
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-2)', margin: '0 0 28px' }}>
                We are still waiting for confirmation from the payment gateway.
                Your tickets will appear automatically once confirmed — usually within a few minutes.
            </p>
            <Button variant="primary" size="lg" icon={<Icons.ticket size={16} />} onClick={onTickets}>
                Check my tickets
            </Button>
        </>
    );
}

function ErrorView({ onBrowse }) {
    return (
        <>
            <div style={{
                width: 64, height: 64, margin: '0 auto', borderRadius: 99,
                background: 'var(--error-bg)', color: 'var(--error)',
                display: 'grid', placeItems: 'center',
            }}>
                <Icons.alert size={28} />
            </div>
            <h2 className="mp-h2" style={{ margin: '20px 0 8px', color: 'var(--text-1)' }}>
                Something went wrong
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-2)', margin: '0 0 28px' }}>
                We could not verify your payment status. If you were charged, your tickets
                will appear in your account once confirmed.
            </p>
            <Button variant="secondary" size="lg" onClick={onBrowse}>
                Browse events
            </Button>
        </>
    );
}

function Spinner() {
    return (
        <div style={{
            width: 48, height: 48, margin: '0 auto',
            border: '3px solid var(--border)',
            borderTopColor: 'var(--mp-blue)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
        }} />
    );
}
