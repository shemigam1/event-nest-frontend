export default function Tile({ label, value, delta, sub, icon, accent }) {
  return (
    <div style={{
      background: 'var(--surface-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: 20,
      boxShadow: 'var(--shadow-card)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)' }}>{label}</span>
        {icon && (
          <span style={{
            width: 28, height: 28, borderRadius: 8,
            background: accent || 'var(--mp-blue-50)',
            color: accent ? 'white' : 'var(--mp-blue)',
            display: 'grid', placeItems: 'center',
          }}>
            {icon}
          </span>
        )}
      </div>
      <div className="mp-num" style={{
        fontSize: 28, fontWeight: 700, color: 'var(--text-1)',
        lineHeight: 1.1, letterSpacing: '-0.01em',
      }}>
        {value}
      </div>
      {(sub || delta) && (
        <div style={{ marginTop: 8, display: 'flex', gap: 10, alignItems: 'center' }}>
          {delta && (
            <span style={{
              fontSize: 12, fontWeight: 600,
              color: delta.up ? 'var(--success)' : 'var(--error)',
            }}>
              {delta.up ? '↑' : '↓'} {delta.label}
            </span>
          )}
          {sub && (
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{sub}</span>
          )}
        </div>
      )}
    </div>
  );
}
