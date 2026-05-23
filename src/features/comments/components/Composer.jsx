import { useState } from 'react';
import Button from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icon';

const MAX_LEN = 2000;

/* The composer is intentionally simple — multi-line autosizing textarea,
   character counter (shown only as you approach the cap), and a single
   submit. Used for both top-level comments and inline replies; the parent
   passes the `placeholder` + `submitLabel` and handles the network call. */
export default function Composer({
    onSubmit,
    busy = false,
    placeholder = 'Share your thoughts…',
    submitLabel = 'Post',
    autoFocus = false,
    onCancel,
    initialValue = '',
    error = '',
}) {
    const [value, setValue] = useState(initialValue);

    const trimmed = value.trim();
    const isEmpty = trimmed.length === 0;
    const overLimit = trimmed.length > MAX_LEN;
    const showCounter = trimmed.length > MAX_LEN * 0.8;

    async function handleSubmit(e) {
        e.preventDefault();
        if (isEmpty || overLimit) return;
        const ok = await onSubmit(trimmed);
        if (ok) setValue('');
    }

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <textarea
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={placeholder}
                autoFocus={autoFocus}
                rows={onCancel ? 3 : 2}
                disabled={busy}
                style={{
                    width: '100%',
                    minHeight: onCancel ? 80 : 60,
                    padding: '10px 14px',
                    background: 'var(--surface-elevated)',
                    border: `1px solid ${overLimit ? 'var(--error)' : 'var(--border)'}`,
                    borderRadius: 10,
                    fontSize: 14,
                    color: 'var(--text-1)',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                }}
            />

            {error && (
                <div role="alert" style={{ fontSize: 12, color: 'var(--error)' }}>
                    {error}
                </div>
            )}

            <div style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <span style={{
                    fontSize: 11,
                    color: overLimit ? 'var(--error)' : 'var(--text-3)',
                    visibility: showCounter ? 'visible' : 'hidden',
                }}>
                    {trimmed.length} / {MAX_LEN}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                    {onCancel && (
                        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
                            Cancel
                        </Button>
                    )}
                    <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        disabled={busy || isEmpty || overLimit}
                        iconRight={<Icons.arrowR size={13} />}
                    >
                        {busy ? 'Posting…' : submitLabel}
                    </Button>
                </div>
            </div>
        </form>
    );
}
