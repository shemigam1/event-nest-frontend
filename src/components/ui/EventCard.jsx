import { useNavigate } from 'react-router';
import { StatusBadge } from './Badge';
import { Icons } from './Icon';

export default function EventCard({ event, onClick }) {
  const navigate = useNavigate();
  const lowest = Math.min(...(event.tiers || [{ price: 0 }]).map(t => t.price));
  const totalCap = (event.tiers || []).reduce((s, t) => s + (t.total ?? t.totalCapacity ?? 0), 0) || 100;
  const totalSold = (event.tiers || []).reduce((s, t) => s + (t.sold ?? 0), 0) || 0;
  const pct = (totalSold / totalCap) * 100;

  const handleClick = () => {
    if (onClick) onClick(event);
    else navigate(`/events/${event.id}`);
  };

  return (
    <button
      onClick={handleClick}
      style={{
        background: 'white',
        border: '1px solid var(--border)',
        borderRadius: 12,
        boxShadow: 'var(--shadow-card)',
        overflow: 'hidden',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'all var(--motion-fast)',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
      }}
      onMouseOver={e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-elevated)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseOut={e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-card)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div
        className="mp-placeholder"
        data-label={event.imageNote || 'EVENT IMAGE'}
        style={{ height: 160 }}
      />
      <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <StatusBadge status={event.status} size="sm" />
          {pct >= 75 && (
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--warning)' }}>
              · Selling fast
            </span>
          )}
        </div>
        <h3 className="mp-h4" style={{ margin: 0, color: 'var(--text-1)' }}>
          {event.title}
        </h3>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          marginTop: 12,
          fontSize: 14,
          color: 'var(--text-2)',
        }}>
          <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
            <Icons.calendar size={15} style={{ color: 'var(--text-3)' }} />
            {event.dateLabel}
          </span>
          <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
            <Icons.pin size={15} style={{ color: 'var(--text-3)' }} />
            {event.venue}
          </span>
        </div>
        <div style={{
          marginTop: 16,
          paddingTop: 16,
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span className="mp-num" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>
            {lowest > 0 && (
              <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-3)' }}>from </span>
            )}
            {lowest === 0 ? 'Free' : `₦${lowest.toLocaleString()}`}
          </span>
          <span className="mp-num" style={{ fontSize: 12, color: 'var(--text-3)' }}>
            {totalSold}/{totalCap} sold
          </span>
        </div>
      </div>
    </button>
  );
}
