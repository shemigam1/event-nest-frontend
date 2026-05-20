/**
 * All monetary amounts from the backend are in kobo (NGN × 100).
 * These helpers convert and format for display.
 */

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
