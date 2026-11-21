/**
 * Billing rules — pure (docs/deployments/08). Anniversary billing: a period starts on
 * `kovetkezoSzamlazas` and the next one starts one cycle later (month arithmetic clamps to the
 * end of a shorter month). Overdue is computed lazily from the period end; it is never stored,
 * so no cron is needed to keep the board correct.
 */
import {
  CIKLUS_HONAPOK,
  type FizetesAllapot,
  type FizetesTaroltAllapot,
  type SzamlazasiCiklus,
} from "./constants";

const NAP_MS = 86_400_000;

/** UTC midnight of the day containing `d`. */
export const napKezdet = (d: Date): Date =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

/** `d` + `honapok` months, day clamped to the target month's length. */
export function honapHozzaad(d: Date, honapok: number): Date {
  const ev = d.getUTCFullYear();
  const ho = d.getUTCMonth() + honapok;
  const utolso = new Date(Date.UTC(ev, ho + 1, 0)).getUTCDate();
  return new Date(
    Date.UTC(
      ev,
      ho,
      Math.min(d.getUTCDate(), utolso),
      d.getUTCHours(),
      d.getUTCMinutes(),
      d.getUTCSeconds(),
      d.getUTCMilliseconds(),
    ),
  );
}

export const ciklusLeptet = (d: Date, ciklus: SzamlazasiCiklus, n = 1): Date =>
  honapHozzaad(d, CIKLUS_HONAPOK[ciklus] * n);

/** Last day (inclusive, UTC midnight) of the period starting at `kezdet`. */
export const idoszakVege = (kezdet: Date, ciklus: SzamlazasiCiklus): Date =>
  new Date(napKezdet(ciklusLeptet(kezdet, ciklus)).getTime() - NAP_MS);

/** Effective state: a still-open payment whose period ended before today is "késedelmes". */
export function fizetesAllapot(
  tarolt: FizetesTaroltAllapot,
  idoszakVeg: Date,
  most: Date,
): FizetesAllapot {
  if (tarolt === "esedekes" && idoszakVeg.getTime() < napKezdet(most).getTime())
    return "keso";
  return tarolt;
}

export type ArForras = {
  arFelulirasHuf?: number | null;
  szamlazasiCiklus?: SzamlazasiCiklus | null;
};
export type CsomagAr = { arHuf: number; alapCiklus: SzamlazasiCiklus };

/** amount = override ?? package price; cycle = own ?? package default (docs/deployments/08 §1). */
export function hatekonyAr(t: ArForras, csomag: CsomagAr | null): number | null {
  if (t.arFelulirasHuf != null) return t.arFelulirasHuf;
  return csomag ? csomag.arHuf : null;
}
export function hatekonyCiklus(
  t: ArForras,
  csomag: CsomagAr | null,
): SzamlazasiCiklus | null {
  return t.szamlazasiCiklus ?? csomag?.alapCiklus ?? null;
}

/**
 * Period starts to create until the next billing date is in the future. `maxDb` guards a
 * forgotten, years-old start date from producing hundreds of rows in one go.
 */
export function esedekesIdoszakok(
  kovetkezo: Date,
  ciklus: SzamlazasiCiklus,
  most: Date,
  maxDb = 24,
): { kezdetek: Date[]; ujKovetkezo: Date } {
  const kezdetek: Date[] = [];
  let k = kovetkezo;
  while (k.getTime() <= most.getTime() && kezdetek.length < maxDb) {
    kezdetek.push(k);
    k = ciklusLeptet(k, ciklus);
  }
  return { kezdetek, ujKovetkezo: k };
}
