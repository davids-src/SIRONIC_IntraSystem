/** Client-safe constants of the Infra module — no Mongoose, no Node crypto. */
import type { BadgeTone } from "@erp/ui";

// ---------------------------------------------------------------- Stack

/**
 * What a stack is for. `projekt` = one project (typically one partner, several images);
 * `szolgaltatas` = one service with several sites attached (the sites go to partners);
 * `rendszer` = our own infrastructure (proxy, auth, CRM/ERP…).
 */
export const STACK_TIPUSOK = ["projekt", "szolgaltatas", "rendszer"] as const;
export type StackTipus = (typeof STACK_TIPUSOK)[number];
export const STACK_TIPUS_LABELS: Record<StackTipus, string> = {
  projekt: "Projekt",
  szolgaltatas: "Szolgáltatás",
  rendszer: "Rendszer",
};

/** Live state of a stack, derived from its containers (never stored). */
export const STACK_ALLAPOTOK = [
  "fut",
  "reszben",
  "leallitva",
  "hibas",
  "ures",
  "elveszett",
] as const;
export type StackAllapot = (typeof STACK_ALLAPOTOK)[number];
export const STACK_ALLAPOT_LABELS: Record<StackAllapot, string> = {
  fut: "Fut",
  reszben: "Részben fut",
  leallitva: "Leállítva",
  hibas: "Hibás",
  ures: "Nincs konténer",
  elveszett: "Nincs a Portaineren",
};
export const STACK_ALLAPOT_TONES: Record<StackAllapot, BadgeTone> = {
  fut: "success",
  reszben: "warning",
  leallitva: "neutral",
  hibas: "danger",
  ures: "neutral",
  elveszett: "danger",
};

// ---------------------------------------------------------------- Oldal

export const OLDAL_SEMAK = ["http", "https"] as const;
export type OldalSema = (typeof OLDAL_SEMAK)[number];

export const DNS_TIPUSOK = ["A", "CNAME"] as const;
export type DnsTipus = (typeof DNS_TIPUSOK)[number];

/** A cert is flagged when it expires within this many days. */
export const TANUSITVANY_FIGYELMEZTETES_NAP = 21;

// ---------------------------------------------------------------- Események

export const ESEMENY_CEL_TIPUSOK = [
  "stack",
  "oldal",
  "rendszer",
  "integracio",
  "sablon",
  "webhely",
  "hozzaferes",
] as const;
export type EsemenyCelTipus = (typeof ESEMENY_CEL_TIPUSOK)[number];

export const ESEMENY_MUVELETEK = [
  "szinkron",
  "stack.letrehoz",
  "stack.frissit",
  "stack.ujratelepit",
  "stack.mentes",
  "stack.inditas",
  "stack.leallitas",
  "stack.torles",
  "konteiner.ujraindit",
  "konteiner.frissit",
  "konteiner.inditas",
  "konteiner.leallitas",
  "oldal.letrehoz",
  "oldal.modosit",
  "oldal.torles",
  "oldal.ssl",
  "oldal.ellenorzes",
  "sablon.letrehoz",
  "sablon.modosit",
  "sablon.torles",
  "webhely.letrehoz",
  "webhely.modosit",
  "webhely.torles",
  "webhely.ellenorzes",
  "hozzaferes.letrehoz",
  "hozzaferes.modosit",
  "hozzaferes.torles",
  "hozzaferes.megtekintes",
] as const;
export type EsemenyMuvelet = (typeof ESEMENY_MUVELETEK)[number];

export const ESEMENY_LABELS: Record<EsemenyMuvelet, string> = {
  szinkron: "Szinkron",
  "stack.letrehoz": "Stack létrehozva",
  "stack.frissit": "Image-ek frissítve (pull + újratelepítés)",
  "stack.ujratelepit": "Stack újratelepítve",
  "stack.mentes": "Compose / env mentve",
  "stack.inditas": "Stack elindítva",
  "stack.leallitas": "Stack leállítva",
  "stack.torles": "Stack törölve",
  "konteiner.ujraindit": "Konténer újraindítva",
  "konteiner.frissit": "Konténer image-e frissítve",
  "konteiner.inditas": "Konténer elindítva",
  "konteiner.leallitas": "Konténer leállítva",
  "oldal.letrehoz": "Oldal létrehozva",
  "oldal.modosit": "Oldal módosítva",
  "oldal.torles": "Oldal törölve",
  "oldal.ssl": "SSL tanúsítvány",
  "oldal.ellenorzes": "Oldal ellenőrizve",
  "sablon.letrehoz": "Sablon létrehozva",
  "sablon.modosit": "Sablon módosítva",
  "sablon.torles": "Sablon törölve",
  "webhely.letrehoz": "Webhely felvéve",
  "webhely.modosit": "Webhely módosítva",
  "webhely.torles": "Webhely törölve",
  "webhely.ellenorzes": "Webhely ellenőrizve",
  "hozzaferes.letrehoz": "Hozzáférés felvéve",
  "hozzaferes.modosit": "Hozzáférés módosítva",
  "hozzaferes.torles": "Hozzáférés törölve",
  "hozzaferes.megtekintes": "Hozzáférés jelszava megtekintve",
};

// ---------------------------------------------------------------- Webhelyek (nem stack)

/** Sites that do not run on our Portainer: tracked, assigned to a partner, with their logins. */
export const WEBHELY_TIPUSOK = ["wordpress", "ftp", "egyeb"] as const;
export type WebhelyTipus = (typeof WEBHELY_TIPUSOK)[number];
export const WEBHELY_TIPUS_LABELS: Record<WebhelyTipus, string> = {
  wordpress: "WordPress",
  ftp: "FTP-s webtárhely",
  egyeb: "Egyéb",
};

export const HOZZAFERES_TIPUSOK = [
  "ftp",
  "sftp",
  "ftps",
  "wordpress",
  "cpanel",
  "egyeb",
] as const;
export type HozzaferesTipus = (typeof HOZZAFERES_TIPUSOK)[number];
export const HOZZAFERES_TIPUS_LABELS: Record<HozzaferesTipus, string> = {
  ftp: "FTP",
  sftp: "SFTP",
  ftps: "FTPS",
  wordpress: "WordPress admin",
  cpanel: "Tárhely vezérlőpult",
  egyeb: "Egyéb",
};
/** Default port per access type (0 = none). */
export const HOZZAFERES_PORTOK: Record<HozzaferesTipus, number> = {
  ftp: 21,
  sftp: 22,
  ftps: 21,
  wordpress: 443,
  cpanel: 2083,
  egyeb: 0,
};

// ---------------------------------------------------------------- Integrációk

export const INTEGRACIO_SZOLGALTATOK = [
  "cloudflare",
  "npm",
  "portainer",
  "github",
] as const;
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

// ---------------------------------------------------------------- Viewer (portal)

export type NezoStaff = { kind: "staff"; userId: string };
export type NezoPortal = { kind: "portal"; partnerId: string; portalUserId: string };
export type Nezo = NezoStaff | NezoPortal;

// ---------------------------------------------------------------- Jogosultságok

export const INFRA_PERMISSIONS = {
  stackRead: "infra:stack:read",
  stackWrite: "infra:stack:write",
  stackMuvelet: "infra:stack:muvelet",
  stackDelete: "infra:stack:delete",
  oldalRead: "infra:oldal:read",
  oldalWrite: "infra:oldal:write",
  oldalDelete: "infra:oldal:delete",
  integracioRead: "infra:integracio:read",
  integracioWrite: "infra:integracio:write",
  integracioDelete: "infra:integracio:delete",
  sablonRead: "infra:sablon:read",
  sablonWrite: "infra:sablon:write",
  sablonDelete: "infra:sablon:delete",
  webhelyRead: "infra:webhely:read",
  webhelyWrite: "infra:webhely:write",
  webhelyDelete: "infra:webhely:delete",
  hozzaferesRead: "infra:hozzaferes:read",
  hozzaferesWrite: "infra:hozzaferes:write",
  /** Reveals a stored password (every reveal is audited). */
  hozzaferesTitkos: "infra:hozzaferes:titkos",
} as const;
