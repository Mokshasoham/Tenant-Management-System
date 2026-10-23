/**
 * calendarDateUtils.js
 * Comprehensive timezone-aware date helpers for the TMS Notification Calendar.
 *
 * Adheres strictly to browser-local timezone policies, ensuring all daily boundaries
 * (00:00:00.000 to 23:59:59.999 local) are converted to exact UTC ISO strings for database queries.
 */

export const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Returns the browser's IANA timezone (e.g. 'Asia/Kolkata', 'America/New_York')
 */
export function getBrowserTimezone() {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
        return 'UTC';
    }
}

/**
 * Returns the browser's timezone offset in minutes
 */
export function getBrowserTimezoneOffset() {
    return new Date().getTimezoneOffset();
}

/**
 * Formats a Date object into 'YYYY-MM-DD' using local date components
 */
export function formatDateKey(date) {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Parses 'YYYY-MM-DD' into a local Date object set to local midnight
 */
export function parseDateKey(dateKey) {
    if (!dateKey || typeof dateKey !== 'string') return new Date();
    const parts = dateKey.split('-');
    if (parts.length !== 3) return new Date();
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day, 0, 0, 0, 0);
}

/**
 * Returns exact UTC ISO boundaries for a local day (00:00:00.000 to 23:59:59.999 local)
 */
export function getLocalDayBoundaries(dateOrKey) {
    const d = typeof dateOrKey === 'string' ? parseDateKey(dateOrKey) : new Date(dateOrKey);
    const year = d.getFullYear();
    const month = d.getMonth();
    const day = d.getDate();

    const startLocal = new Date(year, month, day, 0, 0, 0, 0);
    const endLocal = new Date(year, month, day, 23, 59, 59, 999);

    return {
        startDate: startLocal.toISOString(),
        endDate: endLocal.toISOString(),
        dateKey: formatDateKey(startLocal)
    };
}

/**
 * Generates the full Monday-through-Sunday grid for a given year and month (0-indexed).
 * Fills leading days from the previous month and trailing days from the next month.
 */
export function getMonthGrid(year, monthIndex) {
    const firstDayOfMonth = new Date(year, monthIndex, 1);
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    // Monday is index 0 in our grid (JS getDay(): Sun=0, Mon=1, ..., Sat=6)
    const mondayFirstOffset = (firstDayOfMonth.getDay() + 6) % 7;

    // Total cells required (must be multiple of 7)
    const totalDays = Math.ceil((mondayFirstOffset + daysInMonth) / 7) * 7;

    const todayKey = formatDateKey(new Date());
    const days = [];

    for (let i = 0; i < totalDays; i++) {
        const dayNumberOffset = i - mondayFirstOffset + 1;
        const cellDate = new Date(year, monthIndex, dayNumberOffset);
        const cellKey = formatDateKey(cellDate);

        days.push({
            date: cellDate,
            dayNumber: cellDate.getDate(),
            dateKey: cellKey,
            isCurrentMonth: cellDate.getMonth() === monthIndex,
            isToday: cellKey === todayKey,
            isLeading: dayNumberOffset < 1,
            isTrailing: dayNumberOffset > daysInMonth
        });
    }

    const firstGridDate = days[0].date;
    const lastGridDate = days[days.length - 1].date;

    const gridStartIso = new Date(
        firstGridDate.getFullYear(),
        firstGridDate.getMonth(),
        firstGridDate.getDate(),
        0, 0, 0, 0
    ).toISOString();

    const gridEndIso = new Date(
        lastGridDate.getFullYear(),
        lastGridDate.getMonth(),
        lastGridDate.getDate(),
        23, 59, 59, 999
    ).toISOString();

    return {
        year,
        monthIndex,
        monthName: MONTH_NAMES[monthIndex],
        days,
        gridStartIso,
        gridEndIso
    };
}

/**
 * Formats a friendly readable title for a selected date
 * Example: "Friday, October 23, 2026"
 */
export function formatFriendlyDate(dateOrKey) {
    const d = typeof dateOrKey === 'string' ? parseDateKey(dateOrKey) : new Date(dateOrKey);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}
