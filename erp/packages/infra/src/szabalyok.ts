/**
 * Pure rules of the Infra module (no I/O): hostnames, zone lookup, certificate coverage, compose
 * analysis, live stack state. Everything here is unit-tested without a database or providers.
 */
import { parse as parseYaml } from "yaml";
import {
  TANUSITVANY_FIGYELMEZTETES_NAP,
  type StackAllapot,
  type StackTipus,
} from "./constants";

const HOST_RE =
  /^(?=.{1,253}$)(?:[a-z0-9_](?:[a-z0-9_-]{0,61}[a-z0-9_])?\.)+[a-z]{2,63}$/;

export function normalizeHost(raw: string): string {
  return raw.trim().toLowerCase().replace(/\.$/, "");
}

export function hostnevHibas(host: string): string | null {
  if (!HOST_RE.test(host)) return `Érvénytelen hostnév: "${host}".`;
  return null;
}

/** Finds the zone that owns `host` — the longest zone name that is a suffix of it. */
export function zonaKeres<Z extends { name: string }>(
  host: string,
  zonak: Z[],
): Z | null {
  let best: Z | null = null;
  for (const z of zonak) {
    if (host === z.name || host.endsWith(`.${z.name}`)) {
      if (!best || z.name.length > best.name.length) best = z;
    }
  }
  return best;
}

/** `@` for the apex, else the host relative to the zone — used for display only. */
export function relativNev(host: string, zona: string): string {
  return host === zona ? "@" : host.slice(0, -(zona.length + 1));
}

function dnevMatch(domain: string, host: string): boolean {
  if (domain === host) return true;
  if (domain.startsWith("*.")) {
    const base = domain.slice(2);
    // a wildcard covers exactly one extra label
    return host.endsWith(`.${base}`) && !host.slice(0, -(base.length + 1)).includes(".");
  }
  return false;
}

export type CertLite = { id: number; domain_names: string[]; expires_on?: string | null };

export function lejaratNapok(
  expiresOn: string | null | undefined,
  now = new Date(),
): number | null {
  if (!expiresOn) return null;
  const t = Date.parse(
    expiresOn.includes("T") ? expiresOn : `${expiresOn.replace(" ", "T")}Z`,
  );
  if (Number.isNaN(t)) return null;
  return Math.floor((t - now.getTime()) / 86_400_000);
}

export function tanusitvanyLefedi(
  cert: CertLite,
  hosts: string[],
  now = new Date(),
): boolean {
  const nap = lejaratNapok(cert.expires_on, now);
  if (nap !== null && nap < 0) return false;
  return hosts.every((h) => cert.domain_names.some((d) => dnevMatch(d, h)));
}

/**
 * Picks the certificate to reuse for `hosts`: one that covers all of them, preferring the one
 * with the fewest names (most specific) and the latest expiry. `null` → a new one is needed.
 */
export function tanusitvanyValaszt<C extends CertLite>(
  certs: C[],
  hosts: string[],
  now = new Date(),
): C | null {
  const jo = certs.filter((c) => tanusitvanyLefedi(c, hosts, now));
  if (jo.length === 0) return null;
  jo.sort(
    (a, b) =>
      a.domain_names.length - b.domain_names.length ||
      (lejaratNapok(b.expires_on, now) ?? 0) - (lejaratNapok(a.expires_on, now) ?? 0),
  );
  return jo[0] ?? null;
}

export function tanusitvanyKozel(cert: CertLite, now = new Date()): boolean {
  const nap = lejaratNapok(cert.expires_on, now);
  return nap !== null && nap <= TANUSITVANY_FIGYELMEZTETES_NAP;
}

// ------------------------------------------------------------------ compose

export type ComposeSzolgaltatas = {
  nev: string;
  image?: string;
  containerName?: string;
  portok: string[];
};

export type ComposeElemzes =
  { ok: true; szolgaltatasok: ComposeSzolgaltatas[] } | { ok: false; hiba: string };

export function composeElemez(szoveg: string): ComposeElemzes {
  if (!szoveg.trim()) return { ok: false, hiba: "A compose fájl üres." };
  let doc: unknown;
  try {
    doc = parseYaml(szoveg);
  } catch (err) {
    const sor = (err as { linePos?: Array<{ line: number }> }).linePos?.[0]?.line;
    return { ok: false, hiba: `Érvénytelen YAML${sor ? ` (${sor}. sor)` : ""}.` };
  }
  const services = (doc as { services?: unknown } | null)?.services;
  if (!services || typeof services !== "object" || Array.isArray(services)) {
    return { ok: false, hiba: 'A compose fájlból hiányzik a "services" blokk.' };
  }
  const out: ComposeSzolgaltatas[] = [];
  for (const [nev, raw] of Object.entries(services as Record<string, unknown>)) {
    const s = (raw ?? {}) as Record<string, unknown>;
    if (!s.image && !s.build) {
      return { ok: false, hiba: `A(z) "${nev}" szolgáltatásnak nincs image-e.` };
    }
    out.push({
      nev,
      image: typeof s.image === "string" ? s.image : undefined,
      containerName: typeof s.container_name === "string" ? s.container_name : undefined,
      portok: Array.isArray(s.ports) ? s.ports.map(String) : [],
    });
  }
  if (out.length === 0)
    return { ok: false, hiba: "A compose fájlban nincs szolgáltatás." };
  return { ok: true, szolgaltatasok: out };
}

export const STACK_NEV_RE = /^[a-z0-9][a-z0-9_-]*$/;

// ------------------------------------------------------------------ live state

export type KonteinerLite = {
  nev: string;
  state?: string;
};

export function stackAllapot(
  konteinerek: KonteinerLite[],
  elveszett = false,
): StackAllapot {
  if (elveszett) return "elveszett";
  if (konteinerek.length === 0) return "ures";
  const fut = konteinerek.filter((k) => k.state === "running").length;
  const rossz = konteinerek.filter(
    (k) => k.state === "restarting" || k.state === "dead",
  ).length;
  if (rossz > 0) return "hibas";
  if (fut === konteinerek.length) return "fut";
  if (fut === 0) return "leallitva";
  return "reszben";
}

/** A guess for freshly discovered stacks; the operator can change it afterwards. */
export function stackTipusTipp(nev: string): StackTipus {
  if (/^(nginxproxy|portainer|npm|traefik|watchtower|wud)$/i.test(nev)) return "rendszer";
  return "projekt";
}

/** Docker image name without registry host and tag — for display grouping. */
export function imageRovid(image?: string): string {
  if (!image) return "—";
  return image.replace(/^(?:[a-z0-9.-]+\.[a-z]{2,}(?::\d+)?\/)/i, "");
}

export function envSzovegbol(szoveg: string): Array<{ name: string; value: string }> {
  return szoveg
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith("#"))
    .map((s) => {
      const i = s.indexOf("=");
      return i < 0
        ? { name: s, value: "" }
        : { name: s.slice(0, i).trim(), value: s.slice(i + 1) };
    })
    .filter((e) => e.name);
}

export function envSzovegge(env: Array<{ name: string; value: string }>): string {
  return env.map((e) => `${e.name}=${e.value}`).join("\n");
}
