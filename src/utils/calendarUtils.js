/**
 * Shared calendar utilities used by AddToCalendar, TicketCard, and any
 * booking confirmation screen that needs "Add to calendar" buttons.
 */

/** Convert an ISO date string to iCal / Google Calendar format: YYYYMMDDTHHmmssZ */
export function toCalFmt(iso, offsetHours = 0) {
    const d = new Date(iso);
    if (offsetHours) d.setTime(d.getTime() + offsetHours * 60 * 60 * 1000);
    return d.toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
}

/** Build a Google Calendar "Add event" URL. */
export function buildGoogleUrl(title, startIso, venue, description) {
    const start = toCalFmt(startIso);
    const end   = toCalFmt(startIso, 2); // default 2-hour duration
    const p = new URLSearchParams({
        action: 'TEMPLATE',
        text:   title,
        dates:  `${start}/${end}`,
        ...(venue       && { location: venue }),
        ...(description && { details:  description }),
    });
    return `https://calendar.google.com/calendar/render?${p}`;
}

/** Trigger a browser download of a .ics file (Apple Calendar / Outlook). */
export function downloadIcs(title, startIso, venue, description) {
    const start = toCalFmt(startIso);
    const end   = toCalFmt(startIso, 2);
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//EventNest//EN',
        'BEGIN:VEVENT',
        `DTSTART:${start}`,
        `DTEND:${end}`,
        `SUMMARY:${title}`,
        description ? `DESCRIPTION:${description}` : '',
        venue       ? `LOCATION:${venue}`          : '',
        'END:VEVENT',
        'END:VCALENDAR',
    ].filter(Boolean).join('\r\n');

    const blob = new Blob([lines], { type: 'text/calendar;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), {
        href:     url,
        download: `${title.replace(/[^\w\s-]/g, '')}.ics`,
    });
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}
