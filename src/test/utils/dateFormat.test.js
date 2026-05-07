import { formatEventDate, isThisMonth } from '@/utils/dateFormat';

describe('formatEventDate', () => {
    test('formats a Saturday morning correctly', () => {
        // 2026-05-16 is a Saturday, 10:00 AM
        expect(formatEventDate('2026-05-16T10:00:00')).toBe('Sat 16 May · 10:00 AM');
    });

    test('formats a Wednesday evening correctly', () => {
        // 2026-05-20 is a Wednesday, 9:00 AM
        expect(formatEventDate('2026-05-20T09:00:00')).toBe('Wed 20 May · 9:00 AM');
    });

    test('formats a PM time correctly', () => {
        expect(formatEventDate('2026-05-30T14:00:00')).toBe('Sat 30 May · 2:00 PM');
    });

    test('handles noon as 12:00 PM', () => {
        expect(formatEventDate('2026-06-01T12:00:00')).toMatch('12:00 PM');
    });

    test('handles midnight as 12:00 AM', () => {
        expect(formatEventDate('2026-06-01T00:00:00')).toMatch('12:00 AM');
    });

    test('pads minutes to two digits', () => {
        expect(formatEventDate('2026-06-01T10:05:00')).toMatch('10:05 AM');
    });

    test('returns empty string for null input', () => {
        expect(formatEventDate(null)).toBe('');
    });

    test('returns empty string for undefined input', () => {
        expect(formatEventDate(undefined)).toBe('');
    });

    test('returns empty string for an invalid date string', () => {
        expect(formatEventDate('not-a-date')).toBe('');
    });
});

describe('isThisMonth', () => {
    test('returns true for a date in the current month', () => {
        const now = new Date();
        const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-15T10:00:00`;
        expect(isThisMonth(thisMonth)).toBe(true);
    });

    test('returns false for a date in a past month', () => {
        expect(isThisMonth('2020-01-01T10:00:00')).toBe(false);
    });

    test('returns false for a date in a future month', () => {
        expect(isThisMonth('2099-12-01T10:00:00')).toBe(false);
    });

    test('returns false for null', () => {
        expect(isThisMonth(null)).toBe(false);
    });
});
