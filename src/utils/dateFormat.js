const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Formats an ISO datetime string (or Date) into the design's label format.
 * e.g. "2026-05-16T10:00:00" → "Sat 16 May · 10:00 AM"
 */
export function formatEventDate(startTime) {
    if (!startTime) return '';
    const d = new Date(startTime);
    if (isNaN(d.getTime())) return '';

    const day   = DAYS[d.getDay()];
    const date  = d.getDate();
    const month = MONTHS[d.getMonth()];
    const hours = d.getHours();
    const mins  = d.getMinutes().toString().padStart(2, '0');
    const ampm  = hours >= 12 ? 'PM' : 'AM';
    const h     = hours % 12 || 12;

    return `${day} ${date} ${month} · ${h}:${mins} ${ampm}`;
}

/**
 * Returns true when startTime falls in the current calendar month.
 */
export function isThisMonth(startTime) {
    if (!startTime) return false;
    const d    = new Date(startTime);
    const now  = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}
