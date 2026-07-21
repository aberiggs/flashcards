/**
 * Returns the UTC epoch ms of midnight (00:00) at the start of today in
 * the given IANA timezone. Mirrors the server-side
 * `getStartOfTodayInTimezone` in `src/server/queries/stats.ts` so the
 * client's "due today" filter agrees with the dashboard stats.
 *
 * Strategy: format the current instant in the target tz with hour/min/sec,
 * compute ms-since-midnight in that tz, and subtract from `now`. The Y/M/D
 * parts are not needed — only the time-of-day offset matters.
 */
export function startOfTodayInTimezone(timeZone: string): number {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  }).formatToParts(now);

  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const second = Number(parts.find((p) => p.type === "second")?.value ?? "0");

  // Wall-clock ms since midnight in the target tz. The "hour" value can
  // be "24" at midnight with hour12: false in some environments; normalize.
  const normalizedHour = hour === 24 ? 0 : hour;
  const msSinceMidnight = (normalizedHour * 3600 + minute * 60 + second) * 1000;
  return now.getTime() - msSinceMidnight;
}