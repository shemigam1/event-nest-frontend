export default function CapacityBar({ sold, total, label, showPct = true }) {
  const pct = total > 0 ? Math.min(100, Math.round((sold / total) * 100)) : 0;
  return (
    <div>
      {label && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 6,
        }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)' }}>{label}</span>
          {showPct && (
            <span className="mp-num" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>
              {sold.toLocaleString()}{' '}
              <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>/ {total.toLocaleString()}</span>
            </span>
          )}
        </div>
      )}
      <div style={{ height: 6, background: 'var(--surface-subtle)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: pct >= 90 ? 'var(--warning)' : 'var(--mp-blue)',
          transition: 'width var(--motion-default)',
          borderRadius: 99,
        }} />
      </div>
    </div>
  );
}
