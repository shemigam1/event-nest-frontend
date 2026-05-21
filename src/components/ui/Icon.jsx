const Icon = ({ d, size = 20, fill = false, strokeWidth = 1.5, style, ...rest }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill ? 'currentColor' : 'none'}
    stroke={fill ? 'none' : 'currentColor'}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0, ...style }}
    {...rest}
  >
    {typeof d === 'string' ? <path d={d} /> : d}
  </svg>
);

export const Icons = {
  search:    p => <Icon {...p} d="M21 21l-4.3-4.3M11 19a8 8 0 110-16 8 8 0 010 16z" />,
  arrowR:    p => <Icon {...p} d="M5 12h14M13 5l7 7-7 7" />,
  arrowL:    p => <Icon {...p} d="M19 12H5M11 5l-7 7 7 7" />,
  check:     p => <Icon {...p} d="M5 13l4 4L19 7" />,
  x:         p => <Icon {...p} d="M18 6L6 18M6 6l12 12" />,
  pin:       p => <Icon {...p} d={<><path d="M12 22s7-7.5 7-13a7 7 0 10-14 0c0 5.5 7 13 7 13z" /><circle cx="12" cy="9" r="2.5" /></>} />,
  calendar:  p => <Icon {...p} d={<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>} />,
  clock:     p => <Icon {...p} d={<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>} />,
  ticket:    p => <Icon {...p} d="M3 9a2 2 0 012-2h14a2 2 0 012 2v2a2 2 0 100 4v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 100-4V9zM12 7v10" />,
  shield:    p => <Icon {...p} d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z" />,
  users:     p => <Icon {...p} d={<><circle cx="9" cy="8" r="3.5" /><path d="M3 20c.7-3.5 3.2-5.5 6-5.5s5.3 2 6 5.5" /><circle cx="17" cy="9" r="2.5" /><path d="M16 14c2.4.3 4.3 2 5 5" /></>} />,
  bell:      p => <Icon {...p} d="M6 8a6 6 0 1112 0c0 5 2 6 2 8H4c0-2 2-3 2-8zM10 21h4" />,
  spark:     p => <Icon {...p} d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3z" />,
  scan:      p => <Icon {...p} d="M3 7V5a2 2 0 012-2h2M21 7V5a2 2 0 00-2-2h-2M3 17v2a2 2 0 002 2h2M21 17v2a2 2 0 01-2 2h-2M7 12h10" />,
  signal:    p => <Icon {...p} d="M5 12c0-3.9 3.1-7 7-7s7 3.1 7 7M8 12c0-2.2 1.8-4 4-4s4 1.8 4 4M11 12h2" />,
  bolt:      p => <Icon {...p} d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />,
  alert:     p => <Icon {...p} d="M12 9v4M12 17h.01M5 21h14a2 2 0 001.7-3L13.7 5a2 2 0 00-3.4 0L3.3 18a2 2 0 001.7 3z" />,
  plus:      p => <Icon {...p} d="M12 5v14M5 12h14" />,
  more:      p => <Icon {...p} d={<><circle cx="5" cy="12" r="1.5" fill="currentColor" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /><circle cx="19" cy="12" r="1.5" fill="currentColor" /></>} />,
  download:  p => <Icon {...p} d="M12 4v12M6 12l6 6 6-6M4 20h16" />,
  inbox:     p => <Icon {...p} d="M22 13h-6l-2 3h-4l-2-3H2M5 7l-3 6v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3-6a2 2 0 00-1.8-1.2H6.8A2 2 0 005 7z" />,
  mail:      p => <Icon {...p} d={<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>} />,
  lock:      p => <Icon {...p} d={<><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" /></>} />,
  eye:       p => <Icon {...p} d={<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>} />,
  eyeOff:    p => <Icon {...p} d={<><path d="M17.94 17.94A10.94 10.94 0 0112 19c-6.5 0-10-7-10-7a18.46 18.46 0 014.66-5.36M9.9 4.24A10.66 10.66 0 0112 4c6.5 0 10 7 10 7a18.5 18.5 0 01-2.16 3.19M14.12 14.12a3 3 0 11-4.24-4.24" /><path d="M1 1l22 22" /></>} />,
  grid:      p => <Icon {...p} d={<><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>} />,
  list:      p => <Icon {...p} d="M4 6h16M4 12h16M4 18h16" />,
  trend:     p => <Icon {...p} d="M3 17l6-6 4 4 8-8M14 7h7v7" />,
  wallet:    p => <Icon {...p} d={<><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M3 10h18M16 14h2" /></>} />,
  chevronD:  p => <Icon {...p} d="M6 9l6 6 6-6" />,
  chevronR:  p => <Icon {...p} d="M9 6l6 6-6 6" />,
  chevronL:  p => <Icon {...p} d="M15 6l-6 6 6 6" />,
  message:   p => <Icon {...p} d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />,
  send:      p => <Icon {...p} d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />,
  settings:  p => <Icon {...p} d={<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></>} />,
};

export default Icon;
