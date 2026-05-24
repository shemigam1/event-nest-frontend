import { useState } from 'react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { useCancelContractMutation } from '../contractsApi';

/**
 * Cancel-contract modal with a required reason.
 *
 * The backend already requires `reason` (non-blank, max 1000) and publishes a
 * Kafka notification (`ContractCancelledNotificationEvent`) to the vendor
 * carrying this exact text. So whatever the organiser types lands in the
 * vendor's in-app notification + email verbatim — don't put boilerplate here.
 */
export default function CancelContractModal({ contractId, contractTitle, onDismiss, onCancelled }) {
    const [cancel, state] = useCancelContractMutation();
    const [reason, setReason] = useState('');
    const [err, setErr] = useState('');

    const trimmed = reason.trim();
    const canSubmit = trimmed.length > 0 && trimmed.length <= 1000;

    async function handleSubmit(e) {
        e.preventDefault();
        if (!canSubmit) return;
        setErr('');
        try {
            await cancel({ contractId, reason: trimmed }).unwrap();
            onCancelled?.();
            onDismiss();
        } catch (e) {
            setErr(e?.data?.message ?? 'Failed to cancel contract.');
        }
    }

    return (
        <Modal open onClose={onDismiss} label="Cancel contract" width={460}>
            <div style={{ padding: 24 }}>
                <h3 className="mp-h3" style={{ margin: '0 0 6px', color: 'var(--text-1)' }}>
                    Cancel this contract?
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '0 0 18px' }}>
                    <strong style={{ color: 'var(--text-1)' }}>{contractTitle ?? 'Contract'}</strong>
                    {' '}will be marked as cancelled. The vendor is notified by email and in-app with the reason you provide below.
                </p>

                <form
                    onSubmit={handleSubmit}
                    style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
                >
                    <div>
                        <label
                            htmlFor="cancel-reason"
                            style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 6 }}
                        >
                            Reason <span style={{ color: 'var(--error)' }}>*</span>
                        </label>
                        <textarea
                            id="cancel-reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={4}
                            maxLength={1000}
                            required
                            placeholder="e.g. Vendor unavailable for the date, scope changed, …"
                            style={{
                                width: '100%',
                                padding: '9px 12px',
                                fontSize: 14,
                                border: '1px solid var(--border)',
                                borderRadius: 8,
                                resize: 'vertical',
                                fontFamily: 'inherit',
                                boxSizing: 'border-box',
                                color: 'var(--text-1)',
                                background: 'var(--surface-elevated)',
                            }}
                            autoFocus
                        />
                        <div style={{
                            display: 'flex', justifyContent: 'space-between',
                            marginTop: 4, fontSize: 12, color: 'var(--text-3)',
                        }}>
                            <span>Visible to the vendor.</span>
                            <span>{trimmed.length}/1000</span>
                        </div>
                    </div>

                    {err && (
                        <p style={{ fontSize: 13, color: 'var(--error)', margin: 0 }}>{err}</p>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                        <Button
                            type="button"
                            variant="secondary"
                            size="md"
                            onClick={onDismiss}
                            disabled={state.isLoading}
                        >
                            Keep contract
                        </Button>
                        <Button
                            type="submit"
                            variant="destructive"
                            size="md"
                            disabled={!canSubmit || state.isLoading}
                        >
                            {state.isLoading ? 'Cancelling…' : 'Cancel contract'}
                        </Button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}
