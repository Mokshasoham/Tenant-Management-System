/**
 * server/src/utils/visitTimeHelper.js
 *
 * Dedicated date, time slot, and timezone helper for Property Inspection Visits.
 * Ensures consistent UTC instant storage and comparison while respecting
 * property/user local timezones (defaults to Asia/Kolkata).
 */

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

export const STANDARD_TIME_SLOTS = [
  '09:00 AM - 10:00 AM',
  '10:00 AM - 11:00 AM',
  '11:00 AM - 12:00 PM',
  '02:00 PM - 03:00 PM',
  '03:00 PM - 04:00 PM',
  '04:00 PM - 05:00 PM',
  '05:00 PM - 06:00 PM'
];

export const STANDARD_SLOTS = STANDARD_TIME_SLOTS;

/**
 * Validates and parses a time slot string into numerical hours/minutes.
 * Example input: "04:00 PM - 05:00 PM"
 *
 * @param {string} timeSlot
 * @returns {{ startHour: number, startMinute: number, endHour: number, endMinute: number } | null}
 */
export const parseTimeSlot = (timeSlot) => {
  if (!timeSlot || typeof timeSlot !== 'string') return null;
  const trimmed = timeSlot.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;

  const [, sH, sM, sMeridiem, eH, eM, eMeridiem] = match;

  let startHour = parseInt(sH, 10);
  const startMinute = parseInt(sM, 10);
  let endHour = parseInt(eH, 10);
  const endMinute = parseInt(eM, 10);

  if (startHour < 1 || startHour > 12 || endHour < 1 || endHour > 12) return null;
  if (startMinute < 0 || startMinute > 59 || endMinute < 0 || endMinute > 59) return null;

  if (sMeridiem.toUpperCase() === 'PM' && startHour < 12) startHour += 12;
  if (sMeridiem.toUpperCase() === 'AM' && startHour === 12) startHour = 0;

  if (eMeridiem.toUpperCase() === 'PM' && endHour < 12) endHour += 12;
  if (eMeridiem.toUpperCase() === 'AM' && endHour === 12) endHour = 0;

  return { startHour, startMinute, endHour, endMinute };
};

/**
 * Calculates accurate timezone offset in milliseconds for any IANA timezone.
 * Handles DST shifts and arbitrary historical/future dates.
 */
export const getTimezoneOffsetMs = (timeZone = DEFAULT_TIMEZONE, date = new Date()) => {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      fractionalSecondDigits: 3
    });
    const parts = formatter.formatToParts(date);
    const partMap = {};
    for (const p of parts) partMap[p.type] = p.value;

    let h = partMap.hour;
    if (h === '24') h = '00';
    const formattedIso = `${partMap.year}-${partMap.month}-${partMap.day}T${h}:${partMap.minute}:${partMap.second}.${partMap.fractionalSecond || '000'}Z`;
    const tzAsUtc = new Date(formattedIso).getTime();
    return tzAsUtc - date.getTime();
  } catch {
    // Fallback to 5.5 hours for Asia/Kolkata if invalid timezone passed
    return 5.5 * 60 * 60 * 1000;
  }
};

/**
 * Extracts a normalized YYYY-MM-DD string from a Date object or string.
 */
export const normalizeDateString = (dateVal) => {
  if (!dateVal) return null;
  if (typeof dateVal === 'string') {
    const clean = dateVal.trim().split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  }
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
};

/**
 * Computes exact UTC Date instances for the start and end of a given visit slot.
 *
 * @param {object} params
 * @param {string|Date} params.visitDate - "YYYY-MM-DD" or Date
 * @param {string} params.timeSlot - e.g. "04:00 PM - 05:00 PM"
 * @param {string} [params.timezone] - IANA timezone, defaults to Asia/Kolkata
 * @returns {{ slotStartTime: Date, slotEndTime: Date, timezone: string } | null}
 */
export const calculateSlotInstants = ({ visitDate, timeSlot, timezone = DEFAULT_TIMEZONE }) => {
  const cleanDate = normalizeDateString(visitDate);
  if (!cleanDate) return null;

  const parsedSlot = parseTimeSlot(timeSlot);
  if (!parsedSlot) return null;

  const [y, mon, d] = cleanDate.split('-').map(Number);

  // 1. Calculate slot start UTC
  const startTargetUtc = Date.UTC(y, mon - 1, d, parsedSlot.startHour, parsedSlot.startMinute, 0);
  const startOffsetMs = getTimezoneOffsetMs(timezone, new Date(startTargetUtc));
  const slotStartTime = new Date(startTargetUtc - startOffsetMs);

  // 2. Calculate slot end UTC
  const endTargetUtc = Date.UTC(y, mon - 1, d, parsedSlot.endHour, parsedSlot.endMinute, 0);
  const endOffsetMs = getTimezoneOffsetMs(timezone, new Date(endTargetUtc));
  const slotEndTime = new Date(endTargetUtc - endOffsetMs);

  return { slotStartTime, slotEndTime, timezone };
};

/**
 * Checks whether a given slot starts strictly in the future.
 *
 * @param {object} params
 * @param {Date} [params.slotStartTime]
 * @param {string|Date} [params.visitDate]
 * @param {string} [params.timeSlot]
 * @param {string} [params.timezone]
 * @param {Date} [params.referenceTime] - Injectable for testing (defaults to new Date())
 * @returns {boolean}
 */
export const isSlotInFuture = ({
  slotStartTime,
  visitDate,
  timeSlot,
  timezone = DEFAULT_TIMEZONE,
  referenceTime,
  now
}) => {
  const clock = referenceTime || now || new Date();
  let startTime = slotStartTime;
  if (!startTime && visitDate && timeSlot) {
    const calculated = calculateSlotInstants({ visitDate, timeSlot, timezone });
    startTime = calculated?.slotStartTime;
  }
  if (!startTime || !(startTime instanceof Date) || isNaN(startTime.getTime())) {
    return false;
  }
  return startTime.getTime() > clock.getTime();
};

/**
 * Checks whether a given slot has already expired (start time <= referenceTime).
 */
export const isSlotExpired = ({
  slotStartTime,
  visitDate,
  timeSlot,
  timezone = DEFAULT_TIMEZONE,
  referenceTime,
  now
}) => {
  return !isSlotInFuture({ slotStartTime, visitDate, timeSlot, timezone, referenceTime, now });
};
