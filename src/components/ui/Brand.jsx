export default function Brand({ size = 20, color, kicker }) {
  const c = color || 'var(--text-1)';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <span style={{
        width: size + 8,
        height: size + 8,
        borderRadius: 8,
        background: 'var(--mp-blue)',
        color: 'white',
        display: 'grid',
        placeItems: 'center',
        fontSize: size - 2,
        fontWeight: 700,
        flexShrink: 0,
      }}>
        N
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
        <span style={{ fontSize: size, fontWeight: 700, color: c, letterSpacing: '-0.02em' }}>
          EventNest
        </span>
        {kicker && (
          <span style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.10em',
            color: 'var(--text-3)',
            textTransform: 'uppercase',
            marginTop: 2,
          }}>
            {kicker}
          </span>
        )}
      </span>
    </span>
  );
}
