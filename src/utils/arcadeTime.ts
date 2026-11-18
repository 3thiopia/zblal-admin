export const ADDIS_TIMEZONE = 'Africa/Addis_Ababa';

export interface AddisDateParts {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number;
  minute: number;
  second: number;
  weekdayIndex: number; // 0 = Sun, 1 = Mon ... 6 = Sat
  dateKey: string; // YYYY-MM-DD
}

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function getAddisDateParts(input: Date | string = new Date()): AddisDateParts {
  const date = typeof input === 'string' ? new Date(input) : input;
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: ADDIS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
    hour12: false,
  });

  const parts = formatter.formatToParts(safeDate);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';

  const year = Number(get('year'));
  const month = Number(get('month'));
  const day = Number(get('day'));
  const rawHour = Number(get('hour'));
  const hour = rawHour === 24 ? 0 : rawHour;
  const minute = Number(get('minute'));
  const second = Number(get('second'));
  const weekdayIndex = WEEKDAY_MAP[get('weekday')] ?? 0;

  const dateKey = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(
    day
  ).padStart(2, '0')}`;

  return { year, month, day, hour, minute, second, weekdayIndex, dateKey };
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function addDaysToYmd(year: number, month: number, day: number, deltaDays: number): string {
  const utc = Date.UTC(year, month - 1, day + deltaDays);
  const dt = new Date(utc);
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

export interface AddisPeriodBounds {
  startIso: string;
  endIso: string;
  startMs: number;
  endMs: number;
  label: string;
}

/**
 * Daily period in Africa/Addis_Ababa: local midnight (00:00:00+03:00) to next local midnight.
 */
export function getAddisDayBounds(reference: Date | string = new Date(), dayOffset = 0): AddisPeriodBounds {
  const parts = getAddisDateParts(reference);
  const startKey = addDaysToYmd(parts.year, parts.month, parts.day, dayOffset);
  const [sy, sm, sd] = startKey.split('-').map(Number);
  const endKey = addDaysToYmd(sy, sm, sd, 1);

  const startIso = `${startKey}T00:00:00+03:00`;
  const endIso = `${endKey}T00:00:00+03:00`;

  return {
    startIso,
    endIso,
    startMs: new Date(startIso).getTime(),
    endMs: new Date(endIso).getTime(),
    label: startKey,
  };
}

/**
 * Weekly period in Africa/Addis_Ababa: Monday 00:00:00+03:00 through following Monday 00:00:00+03:00.
 */
export function getAddisWeekBounds(reference: Date | string = new Date(), weekOffset = 0): AddisPeriodBounds {
  const parts = getAddisDateParts(reference);
  // Convert Sunday(0)..Saturday(6) to days since Monday(0..6)
  const daysSinceMonday = (parts.weekdayIndex + 6) % 7;
  const mondayOffset = -daysSinceMonday + weekOffset * 7;
  const startKey = addDaysToYmd(parts.year, parts.month, parts.day, mondayOffset);
  const [sy, sm, sd] = startKey.split('-').map(Number);
  const endKey = addDaysToYmd(sy, sm, sd, 7);

  const startIso = `${startKey}T00:00:00+03:00`;
  const endIso = `${endKey}T00:00:00+03:00`;

  return {
    startIso,
    endIso,
    startMs: new Date(startIso).getTime(),
    endMs: new Date(endIso).getTime(),
    label: `${startKey} to ${addDaysToYmd(sy, sm, sd, 6)}`,
  };
}

export function isTimestampInBounds(
  isoTimestamp: string | undefined | null,
  bounds?: Pick<AddisPeriodBounds, 'startMs' | 'endMs'> | null
): boolean {
  if (!isoTimestamp) return false;
  const ms = new Date(isoTimestamp).getTime();
  if (Number.isNaN(ms)) return false;
  if (!bounds) return true;
  return ms >= bounds.startMs && ms < bounds.endMs;
}

export function formatAddisDateTime(isoDate?: string | null): string {
  if (!isoDate) return '—';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat('en-US', {
    timeZone: ADDIS_TIMEZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatAddisDate(isoDate?: string | null): string {
  if (!isoDate) return '—';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat('en-US', {
    timeZone: ADDIS_TIMEZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function toAddisDateInputValue(isoDate?: string | null): string {
  if (!isoDate) return getAddisDateParts(new Date()).dateKey;
  return getAddisDateParts(isoDate).dateKey;
}

/**
 * Given inclusive start YYYY-MM-DD and end YYYY-MM-DD dates in Africa/Addis_Ababa,
 * return UTC-safe ISO timestamps covering start 00:00:00+03:00 through the day after end 00:00:00+03:00.
 */
export function buildAddisRangeFromDateInputs(startDateYmd: string, endDateYmd: string): {
  startsAt: string;
  endsAt: string;
} {
  const [ey, em, ed] = endDateYmd.split('-').map(Number);
  const exclusiveEndYmd = addDaysToYmd(ey, em, ed, 1);
  return {
    startsAt: `${startDateYmd}T00:00:00+03:00`,
    endsAt: `${exclusiveEndYmd}T00:00:00+03:00`,
  };
}

/**
 * Convert an exclusive end ISO timestamp (e.g. next day midnight) back to an inclusive YYYY-MM-DD input value.
 */
export function toInclusiveAddisEndDateInput(endsAtIso?: string | null): string {
  if (!endsAtIso) return getAddisDateParts(new Date()).dateKey;
  const dt = new Date(endsAtIso);
  if (Number.isNaN(dt.getTime())) return getAddisDateParts(new Date()).dateKey;
  const parts = getAddisDateParts(dt);
  if (parts.hour === 0 && parts.minute === 0 && parts.second === 0) {
    return addDaysToYmd(parts.year, parts.month, parts.day, -1);
  }
  return parts.dateKey;
}
