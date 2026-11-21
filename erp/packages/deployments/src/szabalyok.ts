/**
 * Pure rules of the pipeline — no I/O, no Mongoose, so they are unit-testable and safe in the
 * client. The dependency graph, the status derivation (docs/deployments/04 §2/§4) and the
 * per-step idempotency intent (§7).
 */
import { createHash } from "node:crypto";
import {
  LEPES_KULCSOK,
  type LepesAllapot,
  type LepesKulcs,
  type TelepitesAllapot,
} from "./constants";

export type LepesDef = { fuggosegek: LepesKulcs[]; kihagyhato: boolean };

/** Dependency graph + skippability (docs/deployments/04 §4). */
export const LEPES_DEFINICIOK: Record<LepesKulcs, LepesDef> = {
  cloudflare_zona: { fuggosegek: [], kihagyhato: true },
  ns_delegalas: { fuggosegek: ["cloudflare_zona"], kihagyhato: true },
  dns_rekordok: { fuggosegek: ["ns_delegalas"], kihagyhato: true },
  ssl_tanusitvany: { fuggosegek: ["dns_rekordok"], kihagyhato: true },
  proxy_host: { fuggosegek: ["ssl_tanusitvany"], kihagyhato: true },
  image_epites: { fuggosegek: [], kihagyhato: true },
  stack_letrehozas: { fuggosegek: ["proxy_host", "image_epites"], kihagyhato: true },
  stack_inditas: { fuggosegek: ["stack_letrehozas"], kihagyhato: false },
};

/** The slice of a stored step the rules need. */
export type LepesAdat = { kulcs: LepesKulcs; allapot: LepesAllapot };

const KESZ: readonly LepesAllapot[] = ["kesz", "adoptalva"];
export const lepesKesz = (a: LepesAllapot) => KESZ.includes(a);

/**
 * Deployment status from its steps. `piszkozat` when nothing started; `serult` when something
 * failed after something succeeded; `elo` when every required step is done/adopted/skipped.
 * Archived / suspended / registry-only deployments keep their status.
 */
export function levezetTelepitesAllapot(
  jelenlegi: TelepitesAllapot,
  lepesek: readonly LepesAdat[],
): TelepitesAllapot {
  if (jelenlegi === "archivalt" || jelenlegi === "felfuggesztve") return jelenlegi;
  if (jelenlegi === "nyilvantartas" && lepesek.length === 0) return jelenlegi;
  const hibas = lepesek.some((l) => l.allapot === "hibas");
  const volt = lepesek.some((l) => lepesKesz(l.allapot));
  if (hibas && volt) return "serult";
  const mind = lepesek.every((l) =>
    l.allapot === "kihagyva" ? LEPES_DEFINICIOK[l.kulcs].kihagyhato : lepesKesz(l.allapot),
  );
  if (lepesek.length > 0 && mind) return "elo";
  return lepesek.some((l) => l.allapot !== "fuggo") ? "kiepites" : "piszkozat";
}

/** The intent of a step — the part of the Telepítés whose change makes a re-execute meaningful. */
export type TelepitesSzandek = {
  domain: string;
  wwwAtiranyitas: boolean;
  dns: unknown;
  proxy: unknown;
  image: unknown;
  stack: unknown;
};

const SZANDEK: Record<LepesKulcs, (t: TelepitesSzandek) => unknown> = {
  cloudflare_zona: (t) => ({ domain: t.domain }),
  ns_delegalas: (t) => ({ domain: t.domain }),
  dns_rekordok: (t) => ({ domain: t.domain, dns: t.dns, www: t.wwwAtiranyitas }),
  ssl_tanusitvany: (t) => ({ domain: t.domain, www: t.wwwAtiranyitas }),
  proxy_host: (t) => ({ domain: t.domain, proxy: t.proxy }),
  image_epites: (t) => ({ image: t.image }),
  stack_letrehozas: (t) => ({ stack: t.stack, image: t.image }),
  stack_inditas: (t) => ({ stack: (t.stack as { nev?: string } | undefined)?.nev }),
};

/** sha256(telepitesId + step + canonical intent) — docs/deployments/04 §7. */
export function idempotenciaKulcs(
  telepitesId: string,
  kulcs: LepesKulcs,
  szandek: TelepitesSzandek,
): string {
  return createHash("sha256")
    .update(`${telepitesId}:${kulcs}:${JSON.stringify(SZANDEK[kulcs](szandek))}`)
    .digest("hex");
}

export const ervenyesLepesKulcs = (k: string): k is LepesKulcs =>
  (LEPES_KULCSOK as readonly string[]).includes(k);
