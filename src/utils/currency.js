/**
 * All monetary amounts from the backend are in kobo (NGN × 100).
 * These helpers convert and format for display.
 *
 * Exception: contribution pool amounts (ContributionPool, EventContribution)
 * are stored in kobo too, but user-facing form inputs accept naira. Use
 * nairaToKobo() before sending contribution amounts to the backend.
 */

/** Convert a naira amount entered by a user into kobo for the backend. */
export function nairaToKobo(naira) {
    if (naira == null || Number.isNaN(Number(naira))) return 0;
    return Math.round(Number(naira) * 100);
}

/** Format a naira value that is already in naira (not kobo) — e.g. quick-pick chip labels. */
export function formatNairaDirect(naira, opts = {}) {
    if (naira == null || Number.isNaN(Number(naira))) return '₦0';
    return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
        ...opts,
    }).format(Number(naira));
}

export function koboToNaira(kobo) {
    if (kobo == null || Number.isNaN(kobo)) return 0;
    return kobo / 100;
}

export function formatNaira(kobo, opts = {}) {
    const naira = koboToNaira(kobo);
    if (naira === 0 && opts.zeroLabel) return opts.zeroLabel;
    return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
        ...opts,
    }).format(naira);
}

export function formatNairaCompact(kobo) {
    const naira = koboToNaira(kobo);
    if (naira >= 1_000_000) return `₦${(naira / 1_000_000).toFixed(1)}M`;
    if (naira >= 1_000) return `₦${(naira / 1_000).toFixed(0)}k`;
    return `₦${naira.toLocaleString('en-NG')}`;
}
