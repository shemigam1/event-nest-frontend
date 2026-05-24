import { useState } from 'react';
import { useSelector } from 'react-redux';
import {
    useGetPoolQuery,
    useContributeMutation,
} from '@/features/organiser/contributionsApi';
import { selectIsAuthenticated } from '@/features/auth/authSlice';
import { formatNaira } from '@/utils/currency';
import Button from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icon';

/**
 * Public contribution widget — dropped into EventDetailPage for any visitor to see
 * and contribute to the event's crowd-funded pool.
 *
 * Visibility rules (enforced by both backend and this component):
 *  - pool.isPublic = true  → shown to everyone, including anonymous visitors
 *  - pool.isPublic = false → backend returns 404 for anonymous callers, so the
 *    widget silently renders nothing; authenticated users see it normally
 *  - pool.isActive = false → summary shown but form is replaced with a
 *    "Contributions are closed" notice
 *  - No pool at all (404)  → renders nothing
 */
export default function ContributionWidget({ eventId }) {
    const isAuthenticated = useSelector(selectIsAuthenticated);

    // Backend 404 = no pool / private pool for anon — either way we render nothing.
    const poolQ = useGetPoolQuery(eventId, { skip: !eventId });

    const [contribute, contributeState] = useContributeMutation();

    const [formOpen, setFormOpen] = useState(false);
    const [amount, setAmount]     = useState('');
    const [message, setMessage]   = useState('');
    const [anonymous, setAnonymous] = useState(false);
    const [error, setError]       = useState('');
    const [success, setSuccess]   = useState(null); // { amount, message }

    // Don't render the widget at all when there is no pool (or it's private + anon).
    const missing = poolQ.isError &&
        (poolQ.error?.status === 404 || poolQ.error?.originalStatus === 404);
    if (poolQ.isLoading || missing || !poolQ.data) return null;

    const pool = poolQ.data;
    const pct  = pool.progressPercent != null
        ? Math.min(100, Number(pool.progressPercent))
        : null;
    const overGoal = pool.goalAmount && Number(pool.currentAmount) >= Number(pool.goalAmount);

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        const num = Number(amount);
        if (!amount || !Number.isFinite(num) || num <= 0) {
            setError('Please enter a valid amount greater than zero.');
            return;
        }
        try {
            await contribute({
                eventId,
                amount: num,
                message: message.trim() || null,
                isAnonymous: isAuthenticated ? anonymous : true,
            }).unwrap();
            setSuccess({ amount: num, msg: message.trim() });
            setFormOpen(false);
            setAmount('');
            setMessage('');
            setAnonymous(false);
        } catch (err) {
            setError(err?.data?.message || 'Could not record your contribution. Please try again.');
        }
    }

    function handleOpenForm() {
        setSuccess(null);
        setError('');
        setFormOpen(true);
    }

    return (
        <div style={{
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            overflow: 'hidden',
            marginTop: 24,
        }}>
            {/* Header */}
            <div style={{
                display: 'flex', gap: 14, alignItems: 'flex-start',
                padding: '20px 24px 0',
            }}>
                <span style={{
                    width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                    background: 'linear-gradient(135deg, #3b4cca, #5c6fe0)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <Icons.gift size={20} style={{ color: 'white' }} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>
                        {pool.title}
                    </div>
                    {pool.description && (
                        <p style={{
                            fontSize: 13, color: 'var(--text-2)', margin: '4px 0 0',
                            lineHeight: 1.5, textWrap: 'pretty',
                        }}>
                            {pool.description}
                        </p>
                    )}
                </div>
            </div>

            {/* Progress */}
            <div style={{ padding: '16px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                    <span className="mp-num" style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-1)' }}>
                        {formatNaira(pool.currentAmount)}
                    </span>
                    {pool.goalAmount && (
                        <span className="mp-num" style={{ fontSize: 13, color: 'var(--text-3)' }}>
                            of {formatNaira(pool.goalAmount)} goal
                        </span>
                    )}
                </div>

                {pct != null && (
                    <>
                        <div style={{ height: 8, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
                            <div style={{
                                height: '100%',
                                width: `${pct}%`,
                                background: overGoal
                                    ? 'var(--success)'
                                    : 'linear-gradient(90deg, #3b4cca, #5c6fe0)',
                                borderRadius: 99,
                                transition: 'width 0.5s ease',
                            }} />
                        </div>
                        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-3)' }}>
                            {pct.toFixed(1)}% funded
                            {' · '}
                            {pool.contributorCount} {pool.contributorCount === 1 ? 'contributor' : 'contributors'}
                        </div>
                    </>
                )}

                {pct == null && (
                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                        Open-ended pool
                        {' · '}
                        {pool.contributorCount} {pool.contributorCount === 1 ? 'contributor' : 'contributors'}
                    </div>
                )}
            </div>

            {/* Success banner */}
            {success && (
                <div style={{
                    margin: '0 24px 16px',
                    padding: '12px 16px',
                    background: 'var(--success-bg)',
                    border: '1px solid var(--success)',
                    borderRadius: 10,
                    display: 'flex', alignItems: 'center', gap: 10,
                }}>
                    <Icons.check size={16} style={{ color: 'var(--success)', flexShrink: 0 }} />
                    <div style={{ fontSize: 13, color: 'var(--success)', fontWeight: 600 }}>
                        Thanks for contributing {formatNaira(success.amount)}!
                        {success.msg && (
                            <span style={{ fontWeight: 400 }}> Your message has been recorded.</span>
                        )}
                    </div>
                </div>
            )}

            {/* CTA or inline form */}
            <div style={{ padding: '0 24px 20px' }}>
                {!pool.isActive ? (
                    <div style={{
                        padding: '12px 16px',
                        background: 'var(--surface-subtle)',
                        border: '1px solid var(--border)',
                        borderRadius: 10,
                        fontSize: 13,
                        color: 'var(--text-3)',
                        display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                        <Icons.lock size={14} />
                        Contributions are closed for this event.
                    </div>
                ) : !formOpen ? (
                    <Button
                        variant="primary"
                        size="md"
                        onClick={handleOpenForm}
                        iconRight={<Icons.arrowR size={14} />}
                        style={{ width: '100%' }}
                    >
                        Contribute
                    </Button>
                ) : (
                    <form
                        onSubmit={handleSubmit}
                        style={{
                            marginTop: 4,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 12,
                            padding: '16px 0 0',
                            borderTop: '1px solid var(--border)',
                        }}
                    >
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>
                            Make a contribution
                        </div>

                        {/* Amount */}
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>
                                Amount (₦)
                            </label>
                            <div style={{ position: 'relative' }}>
                                <span style={{
                                    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                                    fontSize: 14, fontWeight: 600, color: 'var(--text-3)',
                                    pointerEvents: 'none',
                                }}>₦</span>
                                <input
                                    type="number"
                                    min="1"
                                    step="0.01"
                                    placeholder="e.g. 5000"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    required
                                    autoFocus
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px 10px 28px',
                                        fontSize: 15,
                                        fontFamily: 'inherit',
                                        fontWeight: 600,
                                        border: '1px solid var(--border)',
                                        borderRadius: 8,
                                        background: 'var(--surface-subtle)',
                                        color: 'var(--text-1)',
                                        boxSizing: 'border-box',
                                        outline: 'none',
                                    }}
                                />
                            </div>
                            {/* Quick-pick chips */}
                            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                                {[1000, 2500, 5000, 10000].map((v) => (
                                    <button
                                        key={v}
                                        type="button"
                                        onClick={() => setAmount(String(v))}
                                        style={{
                                            padding: '4px 12px',
                                            borderRadius: 99,
                                            border: '1px solid var(--border)',
                                            background: Number(amount) === v ? 'var(--mp-blue)' : 'var(--surface-elevated)',
                                            color: Number(amount) === v ? 'white' : 'var(--text-2)',
                                            fontSize: 12, fontWeight: 600,
                                            cursor: 'pointer', fontFamily: 'inherit',
                                            transition: 'background 0.15s, color 0.15s',
                                        }}
                                    >
                                        {formatNaira(v)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Message */}
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>
                                Message <span style={{ fontWeight: 400, color: 'var(--text-3)' }}>(optional)</span>
                            </label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                maxLength={1000}
                                rows={2}
                                placeholder="Leave a note for the organiser…"
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    fontSize: 13,
                                    fontFamily: 'inherit',
                                    border: '1px solid var(--border)',
                                    borderRadius: 8,
                                    background: 'var(--surface-subtle)',
                                    color: 'var(--text-1)',
                                    resize: 'vertical',
                                    boxSizing: 'border-box',
                                    outline: 'none',
                                    lineHeight: 1.5,
                                }}
                            />
                        </div>

                        {/* Anonymous toggle — only meaningful for logged-in users */}
                        {isAuthenticated && (
                            <label style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                fontSize: 13, color: 'var(--text-2)', cursor: 'pointer',
                            }}>
                                <input
                                    type="checkbox"
                                    checked={anonymous}
                                    onChange={(e) => setAnonymous(e.target.checked)}
                                    style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--mp-blue)' }}
                                />
                                Keep my name private (show as "Anonymous Guest")
                            </label>
                        )}

                        {!isAuthenticated && (
                            <div style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Icons.users size={12} />
                                You're contributing as an anonymous guest.
                                <span
                                    style={{ color: 'var(--mp-blue)', fontWeight: 600, cursor: 'pointer' }}
                                    onClick={() => {/* parent handles auth redirect */}}
                                >
                                    Sign in
                                </span>
                                to attach your name.
                            </div>
                        )}

                        {error && (
                            <div role="alert" style={{
                                padding: '10px 14px',
                                background: 'var(--error-bg)',
                                color: 'var(--error)',
                                border: '1px solid var(--error)',
                                borderRadius: 8,
                                fontSize: 13,
                            }}>
                                {error}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => { setFormOpen(false); setError(''); }}
                                disabled={contributeState.isLoading}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="primary"
                                size="sm"
                                disabled={contributeState.isLoading}
                            >
                                {contributeState.isLoading ? 'Recording…' : 'Confirm contribution'}
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
