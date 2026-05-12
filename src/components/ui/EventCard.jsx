import { useNavigate } from 'react-router';
import { StatusBadge } from './Badge';
import { Icons } from './Icon';

export default function EventCard({ event, onClick }) {
  const navigate = useNavigate();
  const tiers = event.tiers || [];
  const prices = tiers.length ? tiers.map(t => Number(t.price ?? 0)) : [0];
  const lowest = Math.min(...prices);
  // Backend gives `totalCapacity` + `availableCapacity`; mock/legacy data uses
  // `total` + `sold`. Handle both.
  const totalCap = tiers.reduce((s, t) => s + (t.total ?? t.totalCapacity ?? 0), 0) || 0;
  const totalSold = tiers.reduce(
    (s, t) => s + (t.sold ?? ((t.totalCapacity ?? 0) - (t.availableCapacity ?? 0))),
    0,
  );
  const pct = totalCap ? (totalSold / totalCap) * 100 : 0;

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
      {event.coverImageUrl ? (
        <div
          style={{
            height: 160,
            backgroundImage: `url(${event.coverImageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundColor: 'var(--surface-subtle)',
          }}
          role="img"
          aria-label={event.title}
        />
      ) : (
        <div
          className="mp-placeholder"
          data-label={event.imageNote || 'EVENT IMAGE'}
          style={{ height: 160 }}
        />
      )}
      <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <StatusBadge status={event.status} size="sm" />
          {event.status === 'PUBLISHED' && (
            <span
              aria-label="Tickets on sale"
              style={{
                display: 'inline-flex',
                gap: 4,
                alignItems: 'center',
                fontSize: 11,
                color: 'var(--success)',
                fontWeight: 600,
              }}
            >
              <span className="mp-live-dot" />Live
            </span>
          )}
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
          {totalCap > 0 && (
            <span className="mp-num" style={{ fontSize: 12, color: 'var(--text-3)' }}>
              {totalSold}/{totalCap} sold
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
