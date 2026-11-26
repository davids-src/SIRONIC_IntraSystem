/**
 * Task chat helpers (#68) — pure, client-safe: @mentions are written as "@Teljes Név" in the
 * text (readable when edited, no hidden markup); the server and the bubble renderer find them
 * against the thread's participants with the same function.
 */

export type UzenetResztvevo = { id: string; nev: string };

/** A participant of the thread as the chat header and the mention picker show them. */
export type SzalResztvevo = UzenetResztvevo & {
  szerep: "kiado" | "felelos" | "kozremukodo";
  /** Profile picture URL, when the account has one. */
  kep?: string;
  /** Still on the task (copy not withdrawn / handed on). */
  aktiv: boolean;
};

/** One bubble. Old comments (`regi`) are read-only and carry whose copy they were on. */
export type UzenetSor = {
  id: string;
  szerzoId?: string;
  szerzoNev: string;
  /** Empty for a deleted message. */
  szoveg: string;
  mikor: string;
  szerkesztve?: string;
  torolt: boolean;
  mediaIds: string[];
  emlitettIds: string[];
  valasz?: { id: string; szerzoNev: string; szoveg: string; torolt: boolean };
  /** The viewer wrote it — may edit / delete it. */
  sajat: boolean;
  /** Comment from before the shared chat (#68) — read-only. */
  regi?: boolean;
  /** Old private comment of a group copy: "csak X és a kiadó látta". */
  cimke?: string;
};

/** A task's whole conversation for one viewer. */
export type FeladatSzal = {
  kulcs: string;
  uzenetek: UzenetSor[];
  resztvevok: SzalResztvevo[];
  /** The viewer may write (participant, and something of the task is still open). */
  irhat: boolean;
  /** Who has seen the last message (not its author), with when. */
  latta: Array<{ id: string; nev: string; kep?: string }>;
};

export type UzenetSzegmens =
  | { tipus: "szoveg"; szoveg: string }
  | { tipus: "emlites"; szoveg: string; userId: string };

const kisbetu = (s: string) => s.toLocaleLowerCase("hu");

/** A name ends where a letter or digit does not follow ("@Kiss Anna," ok, "@Kiss Annabella" not). */
function hatar(szoveg: string, i: number): boolean {
  const c = szoveg[i];
  return c === undefined || !/[\p{L}\p{N}_]/u.test(c);
}

/**
 * Splits a message into text and mention segments. Longest name first, so "@Kiss Anna Mária"
 * wins over "@Kiss Anna"; matching ignores case. An "@" with no participant name after it
 * stays plain text (e-mail addresses too).
 */
export function uzenetSzegmensek(
  szoveg: string,
  resztvevok: readonly UzenetResztvevo[],
): UzenetSzegmens[] {
  const nevek = [...resztvevok]
    .filter((r) => r.nev.trim())
    .sort((a, b) => b.nev.length - a.nev.length);
  const out: UzenetSzegmens[] = [];
  let buf = "";
  let i = 0;
  const kicsi = kisbetu(szoveg);
  while (i < szoveg.length) {
    const elotte = i === 0 ? " " : szoveg[i - 1]!;
    if (szoveg[i] === "@" && !/[\p{L}\p{N}.]/u.test(elotte)) {
      const talalt = nevek.find(
        (r) =>
          kicsi.startsWith(kisbetu(r.nev), i + 1) && hatar(szoveg, i + 1 + r.nev.length),
      );
      if (talalt) {
        if (buf) out.push({ tipus: "szoveg", szoveg: buf });
        buf = "";
        const hossz = talalt.nev.length + 1;
        out.push({
          tipus: "emlites",
          szoveg: szoveg.slice(i, i + hossz),
          userId: talalt.id,
        });
        i += hossz;
        continue;
      }
    }
    buf += szoveg[i];
    i += 1;
  }
  if (buf) out.push({ tipus: "szoveg", szoveg: buf });
  return out;
}

/** The participants mentioned in a message, each once, in order of first mention. */
export function emlitettek(
  szoveg: string,
  resztvevok: readonly UzenetResztvevo[],
): string[] {
  const ids: string[] = [];
  for (const s of uzenetSzegmensek(szoveg, resztvevok))
    if (s.tipus === "emlites" && !ids.includes(s.userId)) ids.push(s.userId);
  return ids;
}

/**
 * The "@…" being typed right before the caret, for the mention picker: `{ kezdet, keres }`
 * when the caret is inside a mention token, otherwise null. A mention may contain one space
 * ("@Kiss A") so full names can be typed.
 */
export function aktivEmlites(
  szoveg: string,
  kurzor: number,
): { kezdet: number; keres: string } | null {
  const elotte = szoveg.slice(0, kurzor);
  const at = elotte.lastIndexOf("@");
  if (at < 0) return null;
  if (at > 0 && /[\p{L}\p{N}.]/u.test(elotte[at - 1]!)) return null;
  const keres = elotte.slice(at + 1);
  if (keres.length > 40 || /\n/.test(keres) || (keres.match(/\s/g)?.length ?? 0) > 2)
    return null;
  return { kezdet: at, keres };
}

/** Replaces the typed "@ki" token with the full "@Név " — returns the new text and caret. */
export function beszurEmlites(
  szoveg: string,
  kurzor: number,
  kezdet: number,
  nev: string,
): { szoveg: string; kurzor: number } {
  const beszurt = `@${nev} `;
  const uj = szoveg.slice(0, kezdet) + beszurt + szoveg.slice(kurzor);
  return { szoveg: uj, kurzor: kezdet + beszurt.length };
}

/** Short quote of a message for a reply ("> …"), one line. */
export function idezet(szoveg: string, max = 90): string {
  const egy = szoveg.replace(/\s+/g, " ").trim();
  return egy.length > max ? `${egy.slice(0, max - 1)}…` : egy;
}
