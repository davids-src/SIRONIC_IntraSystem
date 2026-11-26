/**
 * Forgiving text matching shared by every table (server regex + client filter):
 * - the input is split into terms on spaces, `;` and `,` — every term has to match
 *   ("086 2016 hunga" finds "RSZ-086-1-2016 · Hungaropharma"), in any order;
 * - a term is a fragment, not a whole word, and ignores case and Hungarian accents
 *   ("hunga" finds "Hungária", "szerzodes" finds "szerződés").
 */

const GROUPS = ["aáàâä", "eéèêë", "iíìîï", "oóòôöő", "uúùûüű", "cç", "nñ"];

const FOLD = new Map<string, string>();
for (const g of GROUPS) for (const ch of g) FOLD.set(ch, g[0]!);

/** Lower-cases and strips accents: `Hungária` → `hungaria`. */
export function foldText(value: string): string {
  let out = "";
  for (const ch of value.toLowerCase()) out += FOLD.get(ch) ?? ch;
  return out;
}

/** The terms of a free-text input; empty when it holds none. */
export function searchTerms(input: string): string[] {
  return input
    .split(/[\s;,]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

const escapeRegex = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** A regex source matching the term in any accent / case variant (for MongoDB `$regex`). */
export function termRegexSource(term: string): string {
  let out = "";
  for (const ch of term.toLowerCase()) {
    const base = FOLD.get(ch);
    if (base) {
      const group = GROUPS.find((g) => g[0] === base)!;
      out += `[${group}${group.toUpperCase()}]`;
    } else out += escapeRegex(ch);
  }
  return out;
}

/** True when every term of `input` occurs in `hay` (accent- and case-insensitive). */
export function matchesTerms(hay: string, terms: string[]): boolean {
  const folded = foldText(hay);
  return terms.every((t) => folded.includes(foldText(t)));
}
