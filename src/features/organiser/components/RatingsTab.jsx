export default function RatingsTab() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '64px 24px', textAlign: 'center', gap: 12,
    }}>
      <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 9v4M12 17h.01M5 21h14a2 2 0 001.7-3L13.7 5a2 2 0 00-3.4 0L3.3 18a2 2 0 001.7 3z"/>
      </svg>
      <div className="h-4" style={{ color: 'var(--text-1)' }}>Rating forms builder</div>
      <div className="body-sm" style={{ color: 'var(--text-3)', maxWidth: 320 }}>
        This feature is under development.
      </div>
    </div>
  );
}
