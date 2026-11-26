/** ISO-8601 week helpers (Monday-based) — a week is identified by `{ ev, het }`. */

export type Het = { ev: number; het: number };

/** The ISO week a calendar date belongs to (the ISO year may differ from the calendar year). */
export function isoHet(datum: Date): Het {
  const d = new Date(Date.UTC(datum.getFullYear(), datum.getMonth(), datum.getDate()));
  const nap = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - nap);
  const evEleje = Date.UTC(d.getUTCFullYear(), 0, 1);
  const het = Math.ceil(((d.getTime() - evEleje) / 86_400_000 + 1) / 7);
  return { ev: d.getUTCFullYear(), het };
}

/** Monday of the ISO week (UTC midnight). */
export function hetHetfo({ ev, het }: Het): Date {
  const jan4 = new Date(Date.UTC(ev, 0, 4));
  const nap = jan4.getUTCDay() || 7;
  const hetfo = new Date(jan4);
  hetfo.setUTCDate(jan4.getUTCDate() - (nap - 1) + (het - 1) * 7);
  return hetfo;
}

/** Number of ISO weeks in a year (52 or 53). */
export function hetekSzama(ev: number): number {
  return isoHet(new Date(ev, 11, 28)).het;
}

/** Moves a week by `delta` weeks, rolling over the year boundary correctly. */
export function hetEltolas(h: Het, delta: number): Het {
  const m = hetHetfo(h);
  m.setUTCDate(m.getUTCDate() + delta * 7);
  return isoHet(new Date(m.getUTCFullYear(), m.getUTCMonth(), m.getUTCDate()));
}

export function hetCimke({ ev, het }: Het): string {
  return `${ev}. ${het}. hét`;
}
