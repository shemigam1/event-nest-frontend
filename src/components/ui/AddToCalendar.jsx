import { buildGoogleUrl, downloadIcs } from '@/utils/calendarUtils';

/**
 * "Add to calendar" button row — renders Google Calendar and .ics (Apple /
 * Outlook) buttons.  Pass `title` + `startTime` (ISO string); `venue` and
 * `description` are optional.  Returns null when required props are missing.
 */
export default function AddToCalendar({ title, startTime, venue, description }) {
    if (!title || !startTime) return null;

    const googleUrl = buildGoogleUrl(title, startTime, venue, description);

    const btn = {
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 13, fontWeight: 600,
        color: 'var(--mp-blue)',
        background: '#EAF1FE',
        border: '1px solid #C2D9F7',
        borderRadius: 8, padding: '7px 14px',
        cursor: 'pointer', fontFamily: 'inherit',
        textDecoration: 'none',
        transition: 'background 0.15s',
        whiteSpace: 'nowrap',
    };

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {/* Google Calendar */}
            <a
                href={googleUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={btn}
                aria-label="Add to Google Calendar"
                onMouseOver={(e) => { e.currentTarget.style.background = '#D6E8FD'; }}
                onMouseOut={(e)  => { e.currentTarget.style.background = '#EAF1FE'; }}
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                    <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M8 14h2v2H8z" fill="currentColor"/>
                    <path d="M11 14h2v2h-2z" fill="currentColor"/>
                </svg>
                Google Calendar
            </a>

            {/* Apple / Outlook .ics */}
            <button
                type="button"
                style={btn}
                aria-label="Download iCal file for Apple Calendar or Outlook"
                onClick={() => downloadIcs(title, startTime, venue, description)}
                onMouseOver={(e) => { e.currentTarget.style.background = '#D6E8FD'; }}
                onMouseOut={(e)  => { e.currentTarget.style.background = '#EAF1FE'; }}
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 3v13M7 11l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M5 20h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Apple / Outlook (.ics)
            </button>
        </div>
    );
}
