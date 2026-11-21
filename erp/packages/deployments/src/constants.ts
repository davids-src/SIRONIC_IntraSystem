/** Client-safe constants of the Telepítések module — no Mongoose, no Node crypto. */
import type { BadgeTone } from "@erp/ui";

// ---------------------------------------------------------------- Pipeline steps

/** Pipeline order — also the creation order of a new Telepítés's steps. */
export const LEPES_KULCSOK = [
  "cloudflare_zona",
  "ns_delegalas",
  "dns_rekordok",
  "ssl_tanusitvany",
  "proxy_host",
  "image_epites",
  "stack_letrehozas",
  "stack_inditas",
] as const;
export type LepesKulcs = (typeof LEPES_KULCSOK)[number];

export const LEPES_LABELS: Record<LepesKulcs, string> = {
  cloudflare_zona: "Cloudflare zóna",
  ns_delegalas: "NS delegálás",
  dns_rekordok: "DNS rekordok",
  ssl_tanusitvany: "SSL tanúsítvány",
  proxy_host: "Proxy host (NPM)",
  image_epites: "Image build (GitHub)",
  stack_letrehozas: "Stack létrehozása (Portainer)",
  stack_inditas: "Stack indítása",
};

/**
 * Step states. Mapping to the shared `@erp/core/folyamat` vocabulary (see `folyamat-terkep.ts`):
 * fuggo → tervezett · fut → aktiv · kezi → aktiv (waits on a human) · kesz/adoptalva → kesz ·
 * hibas → elutasitva (waits for the operator) · kihagyva → kihagyva.
 */
export const LEPES_ALLAPOTOK = [
  "fuggo",
  "fut",
  "kesz",
  "hibas",
  "kihagyva",
  "adoptalva",
  "kezi",
] as const;
export type LepesAllapot = (typeof LEPES_ALLAPOTOK)[number];

export const LEPES_ALLAPOT_LABELS: Record<LepesAllapot, string> = {
  fuggo: "Függőben",
  fut: "Fut",
  kesz: "Kész",
  hibas: "Hibás",
  kihagyva: "Kihagyva",
  adoptalva: "Adoptálva",
  kezi: "Kézi beavatkozás kell",
};

export const LEPES_ALLAPOT_TONES: Record<LepesAllapot, BadgeTone> = {
  fuggo: "neutral",
  fut: "info",
  kesz: "success",
  hibas: "danger",
  kihagyva: "neutral",
  adoptalva: "success",
  kezi: "warning",
};

/** A step that blocks the pipeline until someone acts (Teendőim). */
export const LEPES_AKADALY_ALLAPOTOK: readonly LepesAllapot[] = ["hibas", "kezi"];

// ---------------------------------------------------------------- Telepítés

export const TELEPITES_ALLAPOTOK = [
  "piszkozat",
  "kiepites",
  "elo",
  "serult",
  "felfuggesztve",
  "archivalt",
  "nyilvantartas",
] as const;
export type TelepitesAllapot = (typeof TELEPITES_ALLAPOTOK)[number];

export const TELEPITES_ALLAPOT_LABELS: Record<TelepitesAllapot, string> = {
  piszkozat: "Piszkozat",
  kiepites: "Kiépítés alatt",
  elo: "Él",
  serult: "Sérült (hibás lépés)",
  felfuggesztve: "Felfüggesztve",
  archivalt: "Archivált",
  nyilvantartas: "Csak nyilvántartás",
};

export const TELEPITES_ALLAPOT_TONES: Record<TelepitesAllapot, BadgeTone> = {
  piszkozat: "neutral",
  kiepites: "info",
  elo: "success",
  serult: "danger",
  felfuggesztve: "warning",
  archivalt: "neutral",
  nyilvantartas: "neutral",
};

export const TELEPITES_FORRASOK = ["letrehozott", "importalt", "nyilvantartas"] as const;
export type TelepitesForras = (typeof TELEPITES_FORRASOK)[number];

/** Absorbed DomainHosting record kinds (decision D12). */
export const LEJARAT_TIPUSOK = ["domain", "hosting", "ssl"] as const;
export type LejaratTipus = (typeof LEJARAT_TIPUSOK)[number];
export const LEJARAT_TIPUS_LABELS: Record<LejaratTipus, string> = {
  domain: "Domain",
  hosting: "Hosting",
  ssl: "SSL",
};
/** A lejárat within this many days is shown as a Teendő. */
export const LEJARAT_FIGYELMEZTETES_NAPOK = 30;

export const DNS_REKORD_TIPUSOK = ["A", "CNAME"] as const;
export const PROXY_SEMAK = ["http", "https"] as const;

export const TELEPITES_EVENT_TIPUSOK = [
  "lepes_terv",
  "lepes_inditas",
  "lepes_ok",
  "lepes_hiba",
  "lepes_adopt",
  "lepes_kihagy",
  "lepes_ellenorzes",
  "lepes_visszaallit",
  "ujratelepites",
  "szamlazas",
  "import",
  "megjegyzes",
] as const;
export type TelepitesEventTipus = (typeof TELEPITES_EVENT_TIPUSOK)[number];

export const TELEPITES_EVENT_LABELS: Record<TelepitesEventTipus, string> = {
  lepes_terv: "Terv (dry-run)",
  lepes_inditas: "Lépés indítva",
  lepes_ok: "Lépés sikeres",
  lepes_hiba: "Lépés hibás",
  lepes_adopt: "Adoptálás",
  lepes_kihagy: "Kihagyás",
  lepes_ellenorzes: "Ellenőrzés",
  lepes_visszaallit: "Kihagyás visszavonva",
  ujratelepites: "Újratelepítés",
  szamlazas: "Számlázás",
  import: "Import",
  megjegyzes: "Megjegyzés",
};

export const ESEMENY_SZEREPLO_TIPUSOK = ["munkatars", "portal", "rendszer", "webhook"] as const;
export type EsemenySzereploTipus = (typeof ESEMENY_SZEREPLO_TIPUSOK)[number];

// ---------------------------------------------------------------- Csomag / Fizetés

export const SZAMLAZASI_CIKLUSOK = ["havi", "negyedeves", "eves"] as const;
export type SzamlazasiCiklus = (typeof SZAMLAZASI_CIKLUSOK)[number];
export const SZAMLAZASI_CIKLUS_LABELS: Record<SzamlazasiCiklus, string> = {
  havi: "Havi",
  negyedeves: "Negyedéves",
  eves: "Éves",
};
export const CIKLUS_HONAPOK: Record<SzamlazasiCiklus, number> = {
  havi: 1,
  negyedeves: 3,
  eves: 12,
};

/** Stored payment states. "Késedelmes" is never stored — see `fizetesAllapot`. */
export const FIZETES_TAROLT_ALLAPOTOK = ["esedekes", "fizetve", "elengedve", "torolve"] as const;
export type FizetesTaroltAllapot = (typeof FIZETES_TAROLT_ALLAPOTOK)[number];

/** Effective states (stored + computed overdue). */
export const FIZETES_ALLAPOTOK = [
  "esedekes",
  "keso",
  "fizetve",
  "elengedve",
  "torolve",
] as const;
export type FizetesAllapot = (typeof FIZETES_ALLAPOTOK)[number];
export const FIZETES_ALLAPOT_LABELS: Record<FizetesAllapot, string> = {
  esedekes: "Esedékes",
  keso: "Késedelmes",
  fizetve: "Fizetve",
  elengedve: "Elengedve",
  torolve: "Törölve",
};
export const FIZETES_ALLAPOT_TONES: Record<FizetesAllapot, BadgeTone> = {
  esedekes: "info",
  keso: "danger",
  fizetve: "success",
  elengedve: "neutral",
  torolve: "neutral",
};

// ---------------------------------------------------------------- Integrációk

export const INTEGRACIO_SZOLGALTATOK = ["cloudflare", "npm", "portainer", "github"] as const;
export type IntegracioSzolgaltato = (typeof INTEGRACIO_SZOLGALTATOK)[number];
export const INTEGRACIO_LABELS: Record<IntegracioSzolgaltato, string> = {
  cloudflare: "Cloudflare",
  npm: "Nginx Proxy Manager",
  portainer: "Portainer",
  github: "GitHub",
};
/** Names of the credential fields each provider needs (values are never returned). */
export const INTEGRACIO_HITELESITO_MEZOK: Record<IntegracioSzolgaltato, string[]> = {
  cloudflare: ["api_token"],
  npm: ["email", "password"],
  portainer: ["api_key"],
  github: ["token"],
};

// ---------------------------------------------------------------- Sablon

/** Built-in placeholders every stack render provides. */
export const SABLON_BEEPITETT_HELYORZOK = ["STACK_NAME", "IMAGE", "IMAGE_TAG", "DOMAIN"] as const;

// ---------------------------------------------------------------- Viewer (portal filter)

export type NezoStaff = { kind: "staff"; userId: string };
/**
 * A partner-portal user. `partnerAdmin` sees every deployment of the partner; everyone else only
 * the ones granted through `PartnerTelepitesHozzaferes`.
 */
export type NezoPortal = {
  kind: "portal";
  partnerId: string;
  portalUserId: string;
  partnerAdmin: boolean;
};
export type Nezo = NezoStaff | NezoPortal;

// ---------------------------------------------------------------- Jogosultságok

export const DEPLOYMENTS_PERMISSIONS = {
  telepitesRead: "deployments:telepites:read",
  telepitesWrite: "deployments:telepites:write",
  telepitesDelete: "deployments:telepites:delete",
  telepitesFuttat: "deployments:telepites:futtat",
  csomagRead: "deployments:csomag:read",
  csomagWrite: "deployments:csomag:write",
  csomagDelete: "deployments:csomag:delete",
  fizetesRead: "deployments:fizetes:read",
  fizetesWrite: "deployments:fizetes:write",
  fizetesDelete: "deployments:fizetes:delete",
  integracioRead: "deployments:integracio:read",
  integracioWrite: "deployments:integracio:write",
  integracioDelete: "deployments:integracio:delete",
  sablonRead: "deployments:sablon:read",
  sablonWrite: "deployments:sablon:write",
  sablonDelete: "deployments:sablon:delete",
} as const;
