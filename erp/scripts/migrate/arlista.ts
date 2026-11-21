/**
 * Legacy CRM -> @erp/arlista migration SKELETON.
 *
 * Pure mapping only: this file never connects to a database and never reads any `.env`.
 * A runner (to be written when the cut-over is scheduled) feeds legacy documents (already read
 * from a backup / read-only export) into `planArlistaMigration` and applies the returned
 * operations with upserts keyed by the natural keys below — so re-running is idempotent:
 *
 *   arlista_tetelek                      key: kod
 *   arlista_szolgaltatas_kategoriak      key: kodElotag
 *   arlista_szolgaltatas_alkategoriak    key: (kategoriaKodElotag, nev)
 *   arlista_szolgaltatas_tetelek         key: kod
 *   arlista_arazasi_beallitasok          key: kulcs = "alap"
 *
 * Single-tenant: `tenantId` is dropped. Legacy `_id`s are never reused; cross references
 * (category_id) are resolved through the category prefix, which is the stable natural key.
 * Legacy tenants must be filtered by the runner BEFORE calling in here (one tenant per ERP).
 */

type Datumszeru = Date | string | null | undefined;

export type LegacyPurchaseRecord = {
  _id?: string;
  supplier_name: string;
  supplier_item_number?: string | null;
  net_purchase_price: number;
  purchased_at: Datumszeru;
  notes?: string | null;
};

export type LegacyPriceListItem = {
  item_number: string;
  type: "service" | "product" | "labor" | "package";
  name: string;
  description?: string | null;
  category: string;
  unit: string;
  net_price: number;
  currency: string;
  /** Percent (27) in the legacy model. */
  tax_rate: number;
  is_active: boolean;
  notes?: string | null;
  purchase_records?: LegacyPurchaseRecord[];
  last_purchase_price?: number | null;
  preferred_supplier?: string | null;
  is_archived?: boolean;
  archived_at?: Datumszeru;
  archive_reason?: string | null;
};

export type LegacyServiceCategory = {
  _id: string;
  name: string;
  icon?: string;
  sku_prefix: string;
  color?: string;
  sort_order?: number;
  is_active?: boolean;
  description?: string | null;
};

export type LegacyServiceSubCategory = {
  _id: string;
  category_id: string;
  name: string;
  sort_order?: number;
  is_active?: boolean;
};

export type LegacyServicePriceListItem = {
  category_id: string;
  subcategory_id?: string | null;
  sku: string;
  name: string;
  description?: string | null;
  unit: string;
  pricing_type: "fixed" | "hourly" | "custom" | "unit_based";
  internal_base_price?: number | null;
  hourly_rate_category?: string | null;
  unit_based_tiers?: Array<{
    label: string;
    min_units: number;
    max_units?: number | null;
    base_price: number;
  }>;
  notes?: string | null;
  client_note?: string | null;
  is_active?: boolean;
  is_archived?: boolean;
  archived_at?: Datumszeru;
  archive_reason?: string | null;
  sort_order?: number;
};

export type LegacyPricingSettings = {
  overhead_multiplier: number;
  monthly_fixed_cost: number;
  monthly_productive_hours: number;
  hourly_rates: Record<string, number>;
  client_multipliers: Record<string, number>;
  material_surcharges: Record<string, number>;
  urgency_multipliers: Record<string, number>;
  vat_rate: number;
  min_callout_fee: number;
  min_project_fee: number;
};

const TIPUS: Record<LegacyPriceListItem["type"], string> = {
  product: "termek",
  service: "szolgaltatas",
  labor: "munkadij",
  package: "csomag",
};

const ARAZASI_TIPUS: Record<LegacyServicePriceListItem["pricing_type"], string> = {
  fixed: "fix",
  hourly: "oradij",
  custom: "egyedi",
  unit_based: "egysegalapu",
};

export const ORADIJ_KULCS: Record<string, string> = {
  it_operations: "it_uzemeltetes",
  it_development: "it_fejlesztes",
  security_tech_installer: "biztonsagtechnika_szerelo",
  security_tech_planner: "biztonsagtechnika_tervezo",
  fire_protection_installer: "tuzvedelem_szerelo",
  fire_protection_planner: "tuzvedelem_tervezo",
  electrical_general: "villamossag_altalanos",
  electrical_industrial: "villamossag_ipari",
  project_management: "projektvezetes",
  consulting: "tanacsadas",
};

export const UGYFEL_SZORZO_KULCS: Record<string, string> = {
  individual: "maganszemely",
  smb_occasional: "kkv_eseti",
  smb_6month: "kkv_6_honapos",
  smb_1year: "kkv_1_eves",
  smb_2year: "kkv_2_eves",
  enterprise: "nagyvallalat",
  subcontractor_presence: "alvallalkozo_jelenlet",
  subcontractor_project: "alvallalkozo_projekt",
  pm_external: "kulso_pm",
};

export const ANYAG_POTLEK_KULCS: Record<string, string> = {
  occasional: "eseti",
  contracted: "szerzodott",
  enterprise: "nagyvallalat",
  subcontractor: "alvallalkozo",
};

export const SURGOSSEG_KULCS: Record<string, string> = {
  same_day: "aznapi",
  after_hours: "munkaidon_kivuli",
  weekend: "hetvege",
  night: "ejszakai",
};

const datum = (v: Datumszeru): Date | undefined => {
  if (!v) return undefined;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

const szoveg = (v: string | null | undefined): string | undefined => (v ? v : undefined);

/** Renames the keys of a legacy table; an unknown key is reported, never silently dropped. */
function atnevez(
  forras: Record<string, number>,
  terkep: Record<string, string>,
  figyelmeztetesek: string[],
  tabla: string,
): Record<string, number> {
  const ki: Record<string, number> = {};
  for (const [kulcs, ertek] of Object.entries(forras ?? {})) {
    const uj = terkep[kulcs];
    if (!uj) {
      figyelmeztetesek.push(`${tabla}: ismeretlen kulcs kihagyva: ${kulcs}`);
      continue;
    }
    ki[uj] = ertek;
  }
  return ki;
}

export function mapPriceListItem(l: LegacyPriceListItem) {
  const adatok = (l.purchase_records ?? []).map((p) => ({
    beszallitoNev: p.supplier_name,
    beszallitoCikkszam: szoveg(p.supplier_item_number),
    nettoBeszerzesiAr: p.net_purchase_price,
    beszerzesDatuma: datum(p.purchased_at) ?? new Date(0),
    megjegyzes: szoveg(p.notes),
  }));
  const archivalt = Boolean(l.is_archived);
  return {
    kod: l.item_number,
    tipus: TIPUS[l.type],
    nev: l.name,
    leiras: szoveg(l.description),
    kategoria: l.category,
    egyseg: l.unit,
    nettoAr: l.net_price,
    penznem: l.currency || "HUF",
    afaKulcs: l.tax_rate,
    aktiv: archivalt ? false : l.is_active,
    megjegyzes: szoveg(l.notes),
    beszerzesiAdatok: adatok,
    utolsoBeszerzesiAr: l.last_purchase_price ?? undefined,
    elonyosBeszallito: szoveg(l.preferred_supplier),
    archivalt,
    archivaltAt: datum(l.archived_at),
    archivalasOka: szoveg(l.archive_reason),
  };
}

export function mapServiceCategory(l: LegacyServiceCategory) {
  return {
    nev: l.name,
    ikon: l.icon ?? "Tag",
    kodElotag: l.sku_prefix.toUpperCase(),
    szin: l.color ?? "#6366f1",
    sorrend: l.sort_order ?? 0,
    aktiv: l.is_active ?? true,
    leiras: szoveg(l.description),
  };
}

export function mapPricingSettings(l: LegacyPricingSettings) {
  const figyelmeztetesek: string[] = [];
  return {
    ertek: {
      kulcs: "alap",
      rezsiSzorzo: l.overhead_multiplier,
      haviFixKoltseg: l.monthly_fixed_cost,
      haviTermelekenyOrak: l.monthly_productive_hours,
      oradijak: atnevez(l.hourly_rates, ORADIJ_KULCS, figyelmeztetesek, "hourly_rates"),
      ugyfelSzorzok: atnevez(
        l.client_multipliers,
        UGYFEL_SZORZO_KULCS,
        figyelmeztetesek,
        "client_multipliers",
      ),
      anyagPotlekok: atnevez(
        l.material_surcharges,
        ANYAG_POTLEK_KULCS,
        figyelmeztetesek,
        "material_surcharges",
      ),
      surgossegiSzorzok: atnevez(
        l.urgency_multipliers,
        SURGOSSEG_KULCS,
        figyelmeztetesek,
        "urgency_multipliers",
      ),
      afaKulcs: l.vat_rate,
      minKiszallasiDij: l.min_callout_fee,
      minProjektDij: l.min_project_fee,
    },
    figyelmeztetesek,
  };
}

export type ArlistaMigrationInput = {
  priceListItems: LegacyPriceListItem[];
  serviceCategories: LegacyServiceCategory[];
  serviceSubCategories: LegacyServiceSubCategory[];
  servicePriceListItems: LegacyServicePriceListItem[];
  pricingSettings?: LegacyPricingSettings | null;
};

export type ArlistaUpsert<T> = { kollekcio: string; kulcs: Record<string, unknown>; ertek: T };

/**
 * Builds the idempotent upsert plan. Items whose category cannot be resolved are skipped and
 * reported — the migration never invents a category.
 */
export function planArlistaMigration(input: ArlistaMigrationInput) {
  const figyelmeztetesek: string[] = [];
  const muveletek: Array<ArlistaUpsert<unknown>> = [];

  for (const l of input.priceListItems) {
    muveletek.push({
      kollekcio: "arlista_tetelek",
      kulcs: { kod: l.item_number },
      ertek: mapPriceListItem(l),
    });
  }

  const katElotag = new Map<string, string>();
  for (const k of input.serviceCategories) {
    const m = mapServiceCategory(k);
    katElotag.set(k._id, m.kodElotag);
    muveletek.push({
      kollekcio: "arlista_szolgaltatas_kategoriak",
      kulcs: { kodElotag: m.kodElotag },
      ertek: m,
    });
  }

  const alkatKulcs = new Map<string, { kategoriaKodElotag: string; nev: string }>();
  for (const a of input.serviceSubCategories) {
    const elotag = katElotag.get(a.category_id);
    if (!elotag) {
      figyelmeztetesek.push(`alkategória kihagyva (ismeretlen kategória): ${a.name}`);
      continue;
    }
    alkatKulcs.set(a._id, { kategoriaKodElotag: elotag, nev: a.name });
    muveletek.push({
      kollekcio: "arlista_szolgaltatas_alkategoriak",
      kulcs: { kategoriaKodElotag: elotag, nev: a.name },
      ertek: {
        kategoriaKodElotag: elotag,
        nev: a.name,
        sorrend: a.sort_order ?? 0,
        aktiv: a.is_active ?? true,
      },
    });
  }

  for (const s of input.servicePriceListItems) {
    const elotag = katElotag.get(s.category_id);
    if (!elotag) {
      figyelmeztetesek.push(`szolgáltatás kihagyva (ismeretlen kategória): ${s.sku}`);
      continue;
    }
    const archivalt = Boolean(s.is_archived);
    muveletek.push({
      kollekcio: "arlista_szolgaltatas_tetelek",
      kulcs: { kod: s.sku },
      ertek: {
        kod: s.sku,
        kategoriaKodElotag: elotag,
        alkategoria: s.subcategory_id ? (alkatKulcs.get(s.subcategory_id) ?? null) : null,
        nev: s.name,
        leiras: szoveg(s.description),
        egyseg: s.unit,
        arazasiTipus: ARAZASI_TIPUS[s.pricing_type],
        belsoAlapar: s.internal_base_price ?? undefined,
        oradijKategoria: s.hourly_rate_category
          ? (ORADIJ_KULCS[s.hourly_rate_category] ?? undefined)
          : undefined,
        egysegSavok: (s.unit_based_tiers ?? []).map((t) => ({
          cimke: t.label,
          minEgyseg: t.min_units,
          maxEgyseg: t.max_units ?? null,
          alapar: t.base_price,
        })),
        megjegyzes: szoveg(s.notes),
        ugyfelMegjegyzes: szoveg(s.client_note),
        aktiv: archivalt ? false : (s.is_active ?? true),
        archivalt,
        archivaltAt: datum(s.archived_at),
        archivalasOka: szoveg(s.archive_reason),
        sorrend: s.sort_order ?? 0,
      },
    });
    if (s.hourly_rate_category && !ORADIJ_KULCS[s.hourly_rate_category]) {
      figyelmeztetesek.push(`${s.sku}: ismeretlen óradíj-kategória: ${s.hourly_rate_category}`);
    }
  }

  if (input.pricingSettings) {
    const { ertek, figyelmeztetesek: fig } = mapPricingSettings(input.pricingSettings);
    figyelmeztetesek.push(...fig);
    muveletek.push({
      kollekcio: "arlista_arazasi_beallitasok",
      kulcs: { kulcs: "alap" },
      ertek,
    });
  }

  return { muveletek, figyelmeztetesek };
}
