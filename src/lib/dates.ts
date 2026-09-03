export const APP_TIMEZONE = "Africa/Casablanca";

export function localDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  return ["year", "month", "day"].map((type) => parts.find((part) => part.type === type)!.value).join("-");
}

// SQL DATE values represent calendar labels, not timezone-shifted instants.
export const dateFromKey = (key: string) => new Date(`${key}T00:00:00.000Z`);
export function isValidDateKey(key: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const date = dateFromKey(key);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === key;
}
export function addDateDays(key: string, days: number) {
  const date = dateFromKey(key);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function mondayKey(date = new Date()) {
  const key = localDateKey(date);
  return addDateDays(key, -((dateFromKey(key).getUTCDay() + 6) % 7));
}

// Resolve local midnight using the offset at that boundary, not today's offset.
// Casablanca changes offset during Ramadan; its transitions are not at midnight.
export function localMidnight(key: string) {
  const target = dateFromKey(key).getTime();
  let instant = target;
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  });
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = formatter.formatToParts(new Date(instant));
    const value = (type: string) => Number(parts.find((part) => part.type === type)!.value);
    const represented = Date.UTC(value("year"), value("month") - 1, value("day"), value("hour"), value("minute"), value("second"));
    const correction = target - represented;
    if (correction === 0) return new Date(instant);
    instant += correction;
  }
  throw new Error("Unable to resolve local midnight");
}

export function weekTimestampRange(startKey: string) {
  return { start: localMidnight(startKey), endExclusive: localMidnight(addDateDays(startKey, 7)) };
}
