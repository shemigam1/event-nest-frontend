import { useState } from 'react';
import { Icons } from './Icon';

/* ────────────────────────────────────────────────────────────────────────────
   Input — base text/email/password field.

   When `type="password"`, an eye / eye-off button is rendered on the right
   side that toggles visibility. The toggle is local to this Input instance,
   so each password field manages its own show/hide state. Every caller in
   the app (Login, Register, Reset password, Settings change-password) gets
   the toggle for free — no per-page wiring.

   Set `noToggle` to opt out of the password toggle if a caller really needs
   the field to stay masked (e.g. on a confirm-PIN field where exposure is a
   threat).
   ──────────────────────────────────────────────────────────────────────── */
export default function Input({
  label,
  hint,
  error,
  icon,
  style,
  type = 'text',
  noToggle = false,
  ...rest
}) {
  const isPassword = type === 'password';
  const [revealed, setRevealed] = useState(false);
  const showToggle = isPassword && !noToggle;
  // When revealed, swap the underlying input to type=text so the browser
  // actually renders the characters.
  const effectiveType = isPassword && revealed ? 'text' : type;

  return (
    <label style={{ display: 'block' }}>
      {label && (
        <span style={{
          display: 'block',
          fontSize: 14,
          fontWeight: 500,
          color: 'var(--text-1)',
          marginBottom: 6,
        }}>
          {label}
        </span>
      )}
      <span style={{ position: 'relative', display: 'block' }}>
        {icon && (
          <span style={{
            position: 'absolute',
            left: 14,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-3)',
            display: 'flex',
            pointerEvents: 'none',
          }}>
            {icon}
          </span>
        )}
        <input
          type={effectiveType}
          {...rest}
          style={{
            width: '100%',
            height: 44,
            // Pad the right edge when the toggle button is shown so the eye
            // doesn't overlap the user's typed characters.
            padding: `0 ${showToggle ? 44 : 14}px 0 ${icon ? 42 : 14}px`,
            background: 'var(--surface-elevated)',
            border: `1px solid ${error ? 'var(--error)' : 'var(--border)'}`,
            borderRadius: 12,
            fontSize: 16,
            color: 'var(--text-1)',
            transition: 'all var(--motion-fast)',
            ...style,
          }}
        />
        {showToggle && (
          <button
            type="button"
            onClick={() => setRevealed(v => !v)}
            aria-label={revealed ? 'Hide password' : 'Show password'}
            aria-pressed={revealed}
            // Match the icon row height so the click target is comfortable
            // (44 × 44) without inflating the layout.
            style={{
              position: 'absolute',
              right: 4,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 36,
              height: 36,
              display: 'grid',
              placeItems: 'center',
              background: 'transparent',
              border: 0,
              borderRadius: 8,
              color: 'var(--text-3)',
              cursor: 'pointer',
              padding: 0,
            }}
            onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text-1)'; }}
            onMouseOut={(e)  => { e.currentTarget.style.color = 'var(--text-3)'; }}
          >
            {revealed ? <Icons.eyeOff size={18} /> : <Icons.eye size={18} />}
          </button>
        )}
      </span>
      {hint && !error && (
        <span style={{ display: 'block', fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>
          {hint}
        </span>
      )}
      {error && (
        <span style={{ display: 'block', fontSize: 12, color: 'var(--error)', marginTop: 6 }}>
          {error}
        </span>
      )}
    </label>
  );
}
