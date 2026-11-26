/**
 * Pure legacy → new mapping for the Partner module (docs/17 §1.5, INVENTORY_MAPPING.md).
 * No database access here — `migration.ts` applies the results. Legacy documents are plain
 * objects as stored by `packages/db` (`Contact`, `Supplier`, `Lead`); the legacy `tenantId` is
 * dropped (decision #1, single-tenant).
 *
 * Dropped on purpose (not part of Phase 1): `has_portal_access`, `portal_permissions` (Phase 6
 * portal), `active_services`, `contract_type` (project-level, belongs to `projekt`),
 * `active_price_multiplier_key` (a cache recomputed by `arlista`).
 */
import type {
  AlvallalkozoiJelenletTipus,
  AlvallalkozoiMunkaterulet,
  AlvallalkozoiSzamlazasiCiklus,
  ArazasiSzerzodesTipus,
  ErdeklodoAllapot,
  ErdeklodoTevekenysegTipus,
  PartnerSzerep,
  PartnerTipus,
  UgyfelKategoria,
} from "./constants";

type LegacyId = unknown; // ObjectId | string — only its string form is used

export type LegacyAddress = {
  street?: string;
  city?: string;
  zip?: string;
  country?: string;
};

export type LegacyContact = {
  _id: LegacyId;
  contact_number?: string;
  partner_id?: string | null;
  type?: string;
  name: string;
  short_name?: string | null;
  tax_number?: string | null;
  registration_number?: string | null;
  address?: LegacyAddress | null;
  billing_address?: LegacyAddress | null;
  contact_persons?: Array<{
    name: string;
    title?: string | null;
    phone?: string | null;
    email?: string | null;
    is_primary?: boolean;
  }>;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  tags?: string[];
  partner_role?: string | null;
  client_category?: string | null;
  pricing_contract_type?: string | null;
  contract_start_date?: Date | null;
  contract_end_date?: Date | null;
  contract_renewal_reminder_days?: number | null;
  subcontractor_work_types?: string[];
  subcontractor_presence_type?: string | null;
  subcontractor_billing_cycle?: string | null;
  is_archived?: boolean;
  archived_reason?: string | null;
  archived_at?: Date | null;
};

export type LegacySupplier = {
  _id: LegacyId;
  partner_id?: string;
  name: string;
  tax_number?: string | null;
  registration_number?: string | null;
  headquarters?: string | null;
  email?: string | null;
  phone?: string | null;
  bank_account?: string | null;
  notes?: string | null;
};

export type LegacyLead = {
  _id: LegacyId;
  lead_number?: string;
  company_name: string;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  source?: string | null;
  category?: string | null;
  industry?: string | null;
  assigned_to?: string | null;
  assigned_user_name?: string | null;
  estimated_value?: number | null;
  status?: string;
  next_action?: string | null;
  next_action_at?: Date | null;
  notes?: string | null;
  contact_id?: string | null;
  offer_id?: string | null;
  business_unit?: string | null;
  lost_reason?: string | null;
  lost_reason_custom?: string | null;
  activities?: Array<{
    type: string;
    timestamp?: Date;
    user_id: string;
    user_name: string;
    text: string;
    entity_type?: string | null;
    entity_id?: string | null;
  }>;
  createdAt?: Date;
  is_archived?: boolean;
  archived_reason?: string | null;
  archived_at?: Date | null;
};

const TIPUS: Record<string, PartnerTipus> = {
  company: "ceg",
  individual: "magansemely",
  one_time: "eseti",
};
const SZEREP: Record<string, PartnerSzerep> = {
  client: "ugyfel",
  subcontractor_employer: "alvallalkozo_megbizo",
  supplier: "beszallito",
  mixed: "vegyes",
};
const KATEGORIA: Record<string, UgyfelKategoria> = {
  individual: "magansemely",
  smb: "kkv",
  enterprise: "nagyvallalat",
};
const SZERZODES: Record<string, ArazasiSzerzodesTipus> = {
  occasional: "eseti",
  "6month": "6_honap",
  "1year": "1_ev",
  "2year": "2_ev",
};
const MUNKATERULET: Record<string, AlvallalkozoiMunkaterulet> = {
  it: "it",
  security_tech: "biztonsagtechnika",
  fire_protection: "tuzvedelem",
  electrical: "villamos",
  pm: "projektvezetes",
};
const JELENLET: Record<string, AlvallalkozoiJelenletTipus> = {
  daily_presence: "napi",
  project_based: "projektalapu",
  both: "mindketto",
};
const CIKLUS: Record<string, AlvallalkozoiSzamlazasiCiklus> = {
  weekly: "heti",
  monthly: "havi",
};

export const LEGACY_LEAD_STATUS: Record<string, ErdeklodoAllapot> = {
  target: "cel",
  contacted: "megkeresve",
  replied: "valaszolt",
  meeting: "talalkozo",
  quotation_needed: "arajanlat_szukseges",
  quotation_sent: "arajanlat_elkuldve",
  follow_up: "utankovetes",
  negotiation: "targyalas",
  won: "megnyert",
  lost: "elveszett",
  no_response: "nincs_valasz",
  later: "kesobb",
  not_relevant: "nem_relevans",
};
const TEVEKENYSEG: Record<string, ErdeklodoTevekenysegTipus> = {
  call: "hivas",
  email: "email",
  meeting: "talalkozo",
  note: "jegyzet",
  status_change: "allapotvaltas",
  offer_created: "ajanlat_letrehozva",
  follow_up: "utanakovetes",
};

const text = (v: unknown): string | undefined => {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t ? t : undefined;
};
const idString = (v: unknown): string => String(v);

type MigraltCim = {
  iranyitoszam?: string;
  varos?: string;
  utca?: string;
  orszag?: string;
};

function mapCim(a?: LegacyAddress | null): MigraltCim | undefined {
  if (!a) return undefined;
  const cim = {
    iranyitoszam: text(a.zip),
    varos: text(a.city),
    utca: text(a.street),
    orszag: text(a.country),
  };
  return cim.iranyitoszam || cim.varos || cim.utca || cim.orszag ? cim : undefined;
}

export type MigraltPartner = {
  regiForras: "contact" | "supplier";
  regiId: string;
  regiAzonosito?: string;
  tipus: PartnerTipus;
  nev: string;
  rovidNev?: string;
  adoszam?: string;
  cegjegyzekszam?: string;
  szekhely?: MigraltCim;
  szamlazasiCim?: MigraltCim;
  telefon?: string;
  email?: string;
  bankszamlaszam?: string;
  kapcsolattartok: Array<{
    nev: string;
    beosztas?: string;
    telefon?: string;
    email?: string;
    elsodleges: boolean;
  }>;
  cimkek: string[];
  megjegyzes?: string;
  partnerSzerep?: PartnerSzerep;
  ugyfelKategoria?: UgyfelKategoria;
  arazasiSzerzodesTipus?: ArazasiSzerzodesTipus;
  szerzodesKezdete?: Date;
  szerzodesVege?: Date;
  megujitasEmlekeztetoNap: number;
  alvallalkozoMunkateruletek: AlvallalkozoiMunkaterulet[];
  alvallalkozoJelenletTipus?: AlvallalkozoiJelenletTipus;
  alvallalkozoSzamlazasiCiklus?: AlvallalkozoiSzamlazasiCiklus;
  archivalt: boolean;
  archivalasOka?: string;
  archivalasIdopont?: Date;
};

export function mapContact(c: LegacyContact): MigraltPartner {
  return {
    regiForras: "contact",
    regiId: idString(c._id),
    regiAzonosito: text(c.partner_id) ?? text(c.contact_number),
    tipus: (c.type && TIPUS[c.type]) || "ceg",
    nev: c.name.trim(),
    rovidNev: text(c.short_name),
    adoszam: text(c.tax_number),
    cegjegyzekszam: text(c.registration_number),
    szekhely: mapCim(c.address),
    szamlazasiCim: mapCim(c.billing_address),
    telefon: text(c.phone),
    email: text(c.email),
    kapcsolattartok: (c.contact_persons ?? [])
      .filter((p) => text(p.name))
      .map((p) => ({
        nev: p.name.trim(),
        beosztas: text(p.title),
        telefon: text(p.phone),
        email: text(p.email),
        elsodleges: Boolean(p.is_primary),
      })),
    cimkek: (c.tags ?? []).map((t) => t.trim()).filter(Boolean),
    megjegyzes: text(c.notes),
    partnerSzerep: c.partner_role ? SZEREP[c.partner_role] : undefined,
    ugyfelKategoria: c.client_category ? KATEGORIA[c.client_category] : undefined,
    arazasiSzerzodesTipus: c.pricing_contract_type
      ? SZERZODES[c.pricing_contract_type]
      : undefined,
    szerzodesKezdete: c.contract_start_date ?? undefined,
    szerzodesVege: c.contract_end_date ?? undefined,
    megujitasEmlekeztetoNap: c.contract_renewal_reminder_days ?? 30,
    alvallalkozoMunkateruletek: (c.subcontractor_work_types ?? [])
      .map((w) => MUNKATERULET[w])
      .filter((w): w is AlvallalkozoiMunkaterulet => Boolean(w)),
    alvallalkozoJelenletTipus: c.subcontractor_presence_type
      ? JELENLET[c.subcontractor_presence_type]
      : undefined,
    alvallalkozoSzamlazasiCiklus: c.subcontractor_billing_cycle
      ? CIKLUS[c.subcontractor_billing_cycle]
      : undefined,
    archivalt: Boolean(c.is_archived),
    archivalasOka: text(c.archived_reason),
    archivalasIdopont: c.archived_at ?? undefined,
  };
}

/** A Supplier is folded in as a Partner with the `beszallito` role. */
export function mapSupplier(s: LegacySupplier): MigraltPartner {
  return {
    regiForras: "supplier",
    regiId: idString(s._id),
    regiAzonosito: text(s.partner_id),
    tipus: "ceg",
    nev: s.name.trim(),
    adoszam: text(s.tax_number),
    cegjegyzekszam: text(s.registration_number),
    // Legacy keeps the seat as one free-text line.
    szekhely: text(s.headquarters) ? { utca: text(s.headquarters) } : undefined,
    telefon: text(s.phone),
    email: text(s.email),
    bankszamlaszam: text(s.bank_account),
    kapcsolattartok: [],
    cimkek: [],
    megjegyzes: text(s.notes),
    partnerSzerep: "beszallito",
    megujitasEmlekeztetoNap: 30,
    alvallalkozoMunkateruletek: [],
    archivalt: false,
  };
}

/** Legacy ids that have no counterpart in the new system are resolved by the caller. */
export type LeadContext = {
  /** Legacy user id → new User id (string ObjectId), or undefined when unknown. */
  userId: (legacyId: string) => string | undefined;
  /** Legacy contact id → new Partner id. */
  partnerId: (legacyContactId: string) => string | undefined;
  /** Used for history/activity authorship when the legacy user cannot be resolved. */
  fallbackUserId: string;
};

export type MigraltErdeklodo = {
  regiId: string;
  regiAzonosito?: string;
  cegNev: string;
  kapcsolattartoNev?: string;
  email?: string;
  telefon?: string;
  weboldal?: string;
  forras?: string;
  kategoria?: string;
  iparag?: string;
  felelosId?: string;
  felelosNev?: string;
  becsultErtek?: number;
  allapot: ErdeklodoAllapot;
  kovetkezoLepes?: string;
  kovetkezoLepesIdopont?: Date;
  megjegyzes?: string;
  partnerId?: string;
  ajanlatId?: string;
  uzletiEgyseg?: string;
  elvesztesOka?: string;
  tevekenysegek: Array<{
    tipus: ErdeklodoTevekenysegTipus;
    idopont: Date;
    felhasznaloId: string;
    felhasznaloNev: string;
    szoveg: string;
    entitasTipus?: string;
    entitasId?: string;
  }>;
  archivalt: boolean;
  archivalasOka?: string;
  archivalasIdopont?: Date;
  letrehozva?: Date;
};

export function mapLead(l: LegacyLead, ctx: LeadContext): MigraltErdeklodo {
  const lostParts = [text(l.lost_reason), text(l.lost_reason_custom)].filter(Boolean);
  return {
    regiId: idString(l._id),
    regiAzonosito: text(l.lead_number),
    cegNev: l.company_name.trim(),
    kapcsolattartoNev: text(l.contact_name),
    email: text(l.email),
    telefon: text(l.phone),
    weboldal: text(l.website),
    forras: text(l.source),
    kategoria: text(l.category),
    iparag: text(l.industry),
    felelosId: l.assigned_to ? ctx.userId(l.assigned_to) : undefined,
    felelosNev: text(l.assigned_user_name),
    becsultErtek: l.estimated_value ?? undefined,
    allapot: (l.status && LEGACY_LEAD_STATUS[l.status]) || "cel",
    kovetkezoLepes: text(l.next_action),
    kovetkezoLepesIdopont: l.next_action_at ?? undefined,
    megjegyzes: text(l.notes),
    partnerId: l.contact_id ? ctx.partnerId(l.contact_id) : undefined,
    ajanlatId: text(l.offer_id),
    uzletiEgyseg: text(l.business_unit),
    elvesztesOka: lostParts.length > 0 ? lostParts.join(": ") : undefined,
    tevekenysegek: (l.activities ?? []).map((a) => ({
      tipus: TEVEKENYSEG[a.type] ?? "jegyzet",
      idopont: a.timestamp ?? l.createdAt ?? new Date(0),
      felhasznaloId: ctx.userId(a.user_id) ?? ctx.fallbackUserId,
      felhasznaloNev: a.user_name,
      szoveg: a.text,
      entitasTipus: text(a.entity_type),
      entitasId: text(a.entity_id),
    })),
    archivalt: Boolean(l.is_archived),
    archivalasOka: text(l.archived_reason),
    archivalasIdopont: l.archived_at ?? undefined,
    letrehozva: l.createdAt,
  };
}
