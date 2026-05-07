export default function Input({ label, hint, error, icon, style, type = 'text', ...rest }) {
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
          type={type}
          {...rest}
          style={{
            width: '100%',
            height: 44,
            padding: icon ? '0 14px 0 42px' : '0 14px',
            background: 'white',
            border: `1px solid ${error ? 'var(--error)' : 'var(--border)'}`,
            borderRadius: 12,
            fontSize: 16,
            color: 'var(--text-1)',
            transition: 'all var(--motion-fast)',
            ...style,
          }}
        />
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
