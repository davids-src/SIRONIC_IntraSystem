/**
 * Stack template rendering — pure. `{{ KEY }}` placeholders in the compose YAML are replaced by
 * (in increasing priority) the built-ins, the template defaults and the values of the Telepítés.
 * Placeholders flagged `titkos` are secret: their values are stored encrypted, decrypted only at
 * execute time, and shown as `***` in plans, events and previews.
 */
import { SABLON_BEEPITETT_HELYORZOK } from "./constants";

const HELYORZO = /{{\s*([A-Za-z0-9_]+)\s*}}/g;
export const TITOK_MASZK = "***";

export type SablonHelyorzo = {
  kulcs: string;
  cimke: string;
  kotelezo: boolean;
  alapertek?: string;
  titkos: boolean;
};

/** Placeholder keys used by a compose template, in order of first appearance. */
export function sablonHelyorzok(compose: string): string[] {
  const out: string[] = [];
  for (const m of compose.matchAll(HELYORZO)) {
    if (!out.includes(m[1]!)) out.push(m[1]!);
  }
  return out;
}

export type RenderEredmeny = {
  compose: string;
  /** Required placeholders without any value. */
  hianyzo: string[];
  /** Placeholders left as-is (unknown key, not built-in, no value). */
  feloldatlan: string[];
};

export function renderSablon(
  compose: string,
  ertekek: Record<string, string>,
  opciok: {
    helyorzok?: SablonHelyorzo[];
    /** Replace secret values by `***` — for plans, events and previews. */
    maszkolt?: boolean;
    titkosKulcsok?: ReadonlySet<string>;
  } = {},
): RenderEredmeny {
  const helyorzok = opciok.helyorzok ?? [];
  const titkos = new Set<string>(opciok.titkosKulcsok ?? []);
  const alap: Record<string, string> = {};
  for (const h of helyorzok) {
    if (h.titkos) titkos.add(h.kulcs);
    if (h.alapertek !== undefined) alap[h.kulcs] = h.alapertek;
  }
  const mind = { ...alap, ...ertekek };
  const feloldatlan: string[] = [];
  const renderelt = compose.replace(HELYORZO, (egyezes, kulcs: string) => {
    if (!(kulcs in mind)) {
      if (!feloldatlan.includes(kulcs)) feloldatlan.push(kulcs);
      return egyezes;
    }
    return opciok.maszkolt && titkos.has(kulcs) ? TITOK_MASZK : (mind[kulcs] as string);
  });
  const hianyzo = helyorzok
    .filter(
      (h) =>
        h.kotelezo &&
        !(h.kulcs in mind && mind[h.kulcs] !== "") &&
        !(SABLON_BEEPITETT_HELYORZOK as readonly string[]).includes(h.kulcs),
    )
    .map((h) => h.kulcs);
  return { compose: renderelt, hianyzo, feloldatlan };
}
