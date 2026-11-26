const TZ = "Europe/Budapest";

const DATE_TIME = new Intl.DateTimeFormat("hu-HU", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const DATE_UTC = new Intl.DateTimeFormat("hu-HU", {
  timeZone: "UTC",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * A date cell as people read it: `2026. 11. 26.` or, when there is a time of day,
 * `2026. 11. 26. 14:30` — never the raw `Thu Nov 26 2026 … GMT+0100 (…)` of `String(date)`.
 * A date without a time (stored as UTC midnight, or a plain `YYYY-MM-DD`) shows only the day.
 * Returns `undefined` when the value is not a date.
 */
export function formatDateCell(value: unknown): string | undefined {
  let d: Date;
  if (value instanceof Date) d = value;
  else if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}(T|$)/.test(value)) {
    if (value.length === 10) return DATE_UTC.format(new Date(`${value}T00:00:00Z`));
    d = new Date(value);
  } else return undefined;
  if (Number.isNaN(d.getTime())) return undefined;
  const dateOnly = d.getUTCHours() + d.getUTCMinutes() + d.getUTCSeconds() === 0;
  return dateOnly ? DATE_UTC.format(d) : DATE_TIME.format(d);
}
