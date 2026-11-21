import { tavolsagKm, type GeoPont } from "./geo";
// Also the forward lookup (`telepulesSzovegbol`): a free-text helyszín → its settlement's centre.
import telepulesek from "./hu-telepulesek.json";

/**
 * Offline "which town is this?" lookup — server-only (the dataset is ~300 KB). Coordinates never
 * leave the server, so there is no third-party geocoder and no per-request cost.
 *
 * Data: GeoNames (https://www.geonames.org), CC BY 4.0 — regenerate with
 * `node scripts/build-hu-telepulesek.mjs`. The result is the *nearest settlement center*, which is
 * right for a "város" field but can name the neighbor right at a border.
 */
const TELEPULESEK = telepulesek as unknown as Array<[string, number, number]>;

/** Beyond this the fix is not in Hungary (or in the middle of nowhere): no name is better than a wrong one. */
export const TELEPULES_MAX_TAVOLSAG_KM = 25;

export type TelepulesTalalat = { nev: string; tavolsagKm: number };

export function legkozelebbiTelepules(
  pont: Pick<GeoPont, "lat" | "lng">,
): TelepulesTalalat | undefined {
  let best: TelepulesTalalat | undefined;
  for (const [nev, lat, lng] of TELEPULESEK) {
    // Cheap reject before the trig: >1° of latitude is >111 km away.
    if (Math.abs(lat - pont.lat) > 1) continue;
    const d = tavolsagKm(pont, { lat, lng });
    if (!best || d < best.tavolsagKm) best = { nev, tavolsagKm: d };
  }
  if (!best || best.tavolsagKm > TELEPULES_MAX_TAVOLSAG_KM) return undefined;
  return best;
}

// --- Forward lookup: "which town does this free text name?" -----------------------------------

export type TelepulesKoordinata = { nev: string; lat: number; lng: number };

/** Same-name entries further apart than this are different places — the name is ambiguous. */
const AZONOS_NEV_MAX_KM = 30;

/** Lower-case, accents removed — for the fallback match ("Ullo" → Üllő). */
export const hajtogat = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("hu-HU");

/**
 * Common Hungarian given names: a capitalised word right before one of these is a surname
 * ("Szentes Péter"), not a town — and a token that is one is never a candidate.
 */
const UTONEVEK = new Set(
  (
    "ádám andrás antal árpád attila balázs béla bence csaba dániel dávid dénes ernő ferenc gábor " +
    "gergely géza györgy gyula henrik imre istván jános józsef károly krisztián lajos lászló " +
    "levente máté mátyás mihály miklós norbert ottó pál péter richárd róbert robi roland sándor " +
    "szabolcs tamás tibor viktor zoltán zsolt jenő kálmán endre bálint márk barnabás " +
    "anna andrea anikó beáta edit erika éva gabriella ildikó judit júlia katalin klára krisztina " +
    "mária márta noémi orsolya piroska rita szilvia tünde zsuzsanna diána barbara dorottya"
  )
    .split(" ")
    .map(hajtogat),
);

type Index = {
  pontos: Map<string, TelepulesKoordinata[]>;
  hajtott: Map<string, TelepulesKoordinata[]>;
};
let index: Index | undefined;

function getIndex(): Index {
  if (index) return index;
  const pontos = new Map<string, TelepulesKoordinata[]>();
  const hajtott = new Map<string, TelepulesKoordinata[]>();
  for (const [nev, lat, lng] of TELEPULESEK) {
    const t = { nev, lat, lng };
    const k1 = nev.toLocaleLowerCase("hu-HU");
    pontos.set(k1, [...(pontos.get(k1) ?? []), t]);
    const k2 = hajtogat(nev);
    hajtott.set(k2, [...(hajtott.get(k2) ?? []), t]);
  }
  index = { pontos, hajtott };
  return index;
}

/**
 * One coordinate for a name: several entries close together (Budapest's districts) average to
 * one point; entries far apart with different spellings or the same name are ambiguous.
 */
function feloldas(
  talalatok: TelepulesKoordinata[] | undefined,
): TelepulesKoordinata | undefined {
  if (!talalatok?.length) return undefined;
  if (new Set(talalatok.map((t) => t.nev)).size > 1) return undefined;
  const elso = talalatok[0]!;
  if (talalatok.some((t) => tavolsagKm(elso, t) > AZONOS_NEV_MAX_KM)) return undefined;
  const lat = talalatok.reduce((s, t) => s + t.lat, 0) / talalatok.length;
  const lng = talalatok.reduce((s, t) => s + t.lng, 0) / talalatok.length;
  return {
    nev: elso.nev,
    lat: Math.round(lat * 1e5) / 1e5,
    lng: Math.round(lng * 1e5) / 1e5,
  };
}

/** The settlement named by `nev` (case-insensitive, accent-insensitive as a fallback). */
export function telepulesKoordinata(nev: string): TelepulesKoordinata | undefined {
  const { pontos, hajtott } = getIndex();
  const n = nev.trim();
  if (!n) return undefined;
  return (
    feloldas(pontos.get(n.toLocaleLowerCase("hu-HU"))) ??
    feloldas(hajtott.get(hajtogat(n)))
  );
}

const nagybetus = (w: string) => /^\p{Lu}/u.test(w);

/**
 * Candidate settlement names in a free-text location, in reading order: a leading "9000_" /
 * "????_" code is dropped, words are split on spaces and punctuation, and each capitalised word
 * (and two-word phrase) is a candidate — hyphenated words also as their parts ("Diósd-albérlet"
 * → "Diósd"). A word followed by a given name is a surname and skipped.
 */
export function telepulesJeloltek(szoveg: string): string[] {
  const tiszta = szoveg.replace(/^[\d?]+_/, " ");
  const szavak = tiszta.split(/[\s,;:()/.\\[\]"'„”!?]+/u).filter(Boolean);
  const jeloltek: string[] = [];
  const add = (j: string) => {
    if (j.length >= 3 && !jeloltek.includes(j)) jeloltek.push(j);
  };
  for (let i = 0; i < szavak.length; i++) {
    const w = szavak[i]!;
    if (!nagybetus(w) || UTONEVEK.has(hajtogat(w))) continue;
    const kov = szavak[i + 1];
    if (kov && UTONEVEK.has(hajtogat(kov))) continue;
    if (kov && nagybetus(kov) && !UTONEVEK.has(hajtogat(kov))) add(`${w} ${kov}`);
    add(w);
    if (w.includes("-")) for (const resz of w.split("-")) if (nagybetus(resz)) add(resz);
  }
  return jeloltek;
}

/**
 * The first settlement a free-text location names ("9000_Somogytúr BG 22…" → Somogytúr,
 * "Dunakeszi SWIETTELSKY telephely" → Dunakeszi), from the offline dataset — undefined for
 * "nincs pozíció", a person's name, or an ambiguous name. Server-only, like the rest of this file.
 */
export function telepulesSzovegbol(
  szoveg: string | undefined | null,
): TelepulesKoordinata | undefined {
  if (!szoveg?.trim()) return undefined;
  for (const j of telepulesJeloltek(szoveg)) {
    const t = telepulesKoordinata(j);
    if (t) return t;
  }
  return undefined;
}
