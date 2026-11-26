/**
 * "Which day is it for the workers?" — always Europe/Budapest, never the server's or the
 * browser's zone. The Gépüzemnapló / Munkaidő napló rules ("already logged in today", "forgot
 * to log out yesterday") are day-based, so they must agree on where a day starts and ends.
 */
const TZ = "Europe/Budapest";

const parts = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function wall(date: Date) {
  const p = Object.fromEntries(parts.formatToParts(date).map((x) => [x.type, x.value]));
  return {
    y: Number(p.year),
    m: Number(p.month),
    d: Number(p.day),
    h: Number(p.hour),
    min: Number(p.minute),
    s: Number(p.second),
  };
}

/** `YYYY-MM-DD` of the Budapest calendar day containing `date`. */
export function budapestNap(date: Date): string {
  const w = wall(date);
  return `${w.y}-${String(w.m).padStart(2, "0")}-${String(w.d).padStart(2, "0")}`;
}

/** The last millisecond (23:59:59.999 Budapest time) of the day containing `date`. */
export function budapestNapVege(date: Date): Date {
  const w = wall(date);
  const guess = Date.UTC(w.y, w.m - 1, w.d, 23, 59, 59, 999);
  // How far Budapest wall-clock is from UTC at that instant (handles DST).
  const g = wall(new Date(guess));
  const offset = Date.UTC(g.y, g.m - 1, g.d, g.h, g.min, g.s, 999) - guess;
  return new Date(guess - offset);
}
