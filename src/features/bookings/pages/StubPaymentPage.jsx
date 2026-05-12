import { useSearchParams, useNavigate } from 'react-router';
import Button from '@/components/ui/Button';
import TopNav from '@/components/ui/TopNav';
import { Icons } from '@/components/ui/Icon';

export default function StubPaymentPage() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const ref = params.get('ref') ?? '';
    const amount = params.get('amount');

    function pay() {
        navigate(`/payment-result?transactionReference=${encodeURIComponent(ref)}&status=SUCCESS`);
    }

    function cancel() {
        navigate(`/payment-result?transactionReference=${encodeURIComponent(ref)}&status=FAILED`);
    }

    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            <TopNav />
            <div style={{ maxWidth: 480, margin: '0 auto', padding: '48px 24px 80px' }}>
                <div style={{
                    background: 'white',
                    border: '1px solid var(--border)',
                    borderRadius: 16,
                    boxShadow: 'var(--shadow-card)',
                    padding: 32,
                    textAlign: 'center',
                }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        background: '#FFF7ED', color: '#C2410C',
                        padding: '6px 14px', borderRadius: 99,
                        fontSize: 12, fontWeight: 600, marginBottom: 24,
                    }}>
                        DEV — Stub Payment Gateway
                    </div>

                    <div style={{
                        width: 64, height: 64, borderRadius: 99,
                        background: 'var(--mp-blue-50)', color: 'var(--mp-blue)',
                        display: 'grid', placeItems: 'center', margin: '0 auto 20px',
                    }}>
                        <Icons.ticket size={28} />
                    </div>

                    <h1 className="mp-h2" style={{ margin: '0 0 8px', color: 'var(--text-1)' }}>
                        Complete Payment
                    </h1>

                    {amount && (
                        <p className="mp-num" style={{
                            fontSize: 32, fontWeight: 700, color: 'var(--text-1)', margin: '0 0 8px',
                        }}>
                            ₦{Number(amount).toLocaleString()}
                        </p>
                    )}

                    <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '0 0 32px', wordBreak: 'break-all' }}>
                        Ref: {ref}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <Button variant="primary" size="lg" onClick={pay} style={{ width: '100%' }}>
                            Pay now (simulate success)
                        </Button>
                        <Button variant="ghost" size="lg" onClick={cancel} style={{ width: '100%' }}>
                            Cancel payment (simulate failure)
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
