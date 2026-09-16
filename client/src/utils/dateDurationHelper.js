/**
 * Date and Lease Duration Helpers for TMS Negotiation & Booking System
 */

export const parseLocalDate = (dateVal) => {
    if (!dateVal) return null;
    if (dateVal instanceof Date) return isNaN(dateVal.getTime()) ? null : dateVal;
    if (typeof dateVal === 'string') {
        const clean = dateVal.split('T')[0];
        if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
            const [y, m, d] = clean.split('-').map(Number);
            const parsed = new Date(y, m - 1, d);
            return isNaN(parsed.getTime()) ? null : parsed;
        }
    }
    const parsed = new Date(dateVal);
    return isNaN(parsed.getTime()) ? null : parsed;
};

export const calculateLeaseDuration = (startDate, endDate) => {
    const start = parseLocalDate(startDate);
    const end = parseLocalDate(endDate);
    if (!start || !end || end <= start) return null;

    const diffMs = end.getTime() - start.getTime();
    const days = Math.round(diffMs / (1000 * 60 * 60 * 24));

    let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    const testDate = new Date(start.getFullYear(), start.getMonth() + months, start.getDate());
    if (testDate > end) {
        months--;
    }

    const daysText = `${days} day${days === 1 ? '' : 's'}`;
    let text = daysText;
    if (months >= 1) {
        text += ` • ${months} month${months === 1 ? '' : 's'}`;
    }

    return { days, months, text };
};

export const formatDateSingle = (dateVal) => {
    const d = parseLocalDate(dateVal);
    if (!d) return '—';
    return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
};

export const formatDateRange = (startDate, endDate) => {
    const sStr = formatDateSingle(startDate);
    const eStr = formatDateSingle(endDate);
    if (sStr === '—' && eStr === '—') return '—';
    return `${sStr} → ${eStr}`;
};
