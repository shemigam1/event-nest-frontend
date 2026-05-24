const ROLE_STYLE = {
  ATTENDEE:      { bg: '#EAF1FE', fg: '#0247c7', label: 'Attendee',  shape: 'square' },
  ORGANISER:     { bg: '#E6F4EA', fg: '#0F9D58', label: 'Organiser', shape: 'rounded' },
  CHECKIN_STAFF: { bg: '#FEF4E2', fg: '#B8770A', label: 'Check-in',  shape: 'pill' },
  ADMIN:         { bg: '#02102D', fg: '#FFFFFF',  label: 'Admin',     shape: 'square' },
};

export function RoleBadge({ role, size = 'md' }) {
  const s = ROLE_STYLE[role] || ROLE_STYLE.ATTENDEE;
  const r = s.shape === 'square' ? 4 : s.shape === 'rounded' ? 8 : 99;
  const px = size === 'sm' ? '3px 8px' : '4px 10px';
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      background: s.bg,
      color: s.fg,
      padding: px,
      borderRadius: r,
      fontSize: size === 'sm' ? 11 : 12,
      fontWeight: 600,
      letterSpacing: '0.01em',
      lineHeight: 1.2,
    }}>
      {s.label}
    </span>
  );
}

const STATUS_STYLE = {
  DRAFT:            { bg: '#F5F7FA', fg: '#4A5468', label: 'Draft' },
  PENDING_APPROVAL: { bg: '#FEF4E2', fg: '#B8770A', label: 'Pending approval' },
  PUBLISHED:        { bg: '#E6F4EA', fg: '#0F9D58', label: 'Published' },
  CANCELLED:        { bg: '#FBE9E9', fg: '#D62828', label: 'Cancelled' },
  REJECTED:         { bg: '#FBE9E9', fg: '#D62828', label: 'Rejected' },
  CONFIRMED:        { bg: '#E6F4EA', fg: '#0F9D58', label: 'Confirmed' },
  VALID:            { bg: '#E6F4EA', fg: '#0F9D58', label: 'Valid' },
  USED:             { bg: '#F5F7FA', fg: '#4A5468', label: 'Used' },
  REFUNDED:         { bg: '#FBE9E9', fg: '#D62828', label: 'Refunded' },
  // Booking payment statuses
  PAID:             { bg: '#E6F4EA', fg: '#0F9D58', label: 'Paid' },
  PENDING_PAYMENT:  { bg: '#FEF4E2', fg: '#B8770A', label: 'Pending payment' },
  FAILED:           { bg: '#FBE9E9', fg: '#D62828', label: 'Payment failed' },
  // Ticket statuses
  PENDING_CLAIM:    { bg: '#FEF4E2', fg: '#B8770A', label: 'Pending claim' },
};

export function StatusBadge({ status, size = 'md', icon }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.DRAFT;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      background: s.bg,
      color: s.fg,
      padding: size === 'sm' ? '3px 8px' : '4px 10px',
      borderRadius: 99,
      fontSize: size === 'sm' ? 11 : 12,
      fontWeight: 600,
      lineHeight: 1.2,
    }}>
      {icon}
      {s.label}
    </span>
  );
}
