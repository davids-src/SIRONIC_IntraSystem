/**
 * Legacy `Offer` / `Contract` / `ContractTemplate` / `PurchaseOrder` -> `@erp/ertekesites`
 * migration SKELETON.
 *
 * Pure mapping only: no database connection, no `.env` access. A runner (written at cut-over)
 * loads the legacy documents (from a backup / read-only export, ONE tenant), builds the id maps
 * and upserts the returned plain objects keyed by `regiId` (idempotent re-run). `tenantId` is
 * dropped (single-tenant). Document numbers are carried over as `azonosito` (they are already
 * issued to customers); the runner must seed the `ertekesites:*` counters above the highest
 * migrated number (`szamlaloMax`). Rows that cannot be mapped faithfully go to `figyelmeztetesek`.
 */
import type {
  AjanlatAllapot,
  AlairasTipus,
  ElvesztesOk,
  MegrendeloAllapot,
  SzerzodesAllapot,
  SzerzodesTipus,
} from "../../packages/ertekesites/src/constants";
import {
  ajanlatOsszesites,
  kitoltendoValtozok,
  megrendeloOsszesites,
} from "../../packages/ertekesites/src/szamitas";
import type {
  AjanlatSor,
  ArSnapshotAdat,
  MegrendeloSor,
} from "../../packages/ertekesites/src/types";

type Datumszeru = Date | string | null | undefined;
type LegacyId = unknown;

export type LegacyPriceSnapshot = {
  internal_base_price: number;
  client_multiplier: number;
  multiplier_key: string;
  calculated_price: number;
  urgency_multiplier?: number;
  pricing_settings_captured_at?: string | null;
};

export type LegacyOfferLine = {
  price_list_item_id?: string | null;
  service_price_list_item_id?: string | null;
  description: string;
  quantity: number;
  unit: string;
  net_unit_price: number;
  tax_rate: number;
  discount_percent?: number;
  price_snapshot?: LegacyPriceSnapshot | null;
  is_group_parent?: boolean;
  group_id?: string | null;
  purchase_unit_price_snapshot?: number | null;
  internal_cost_unit_price?: number | null;
  line_type?: "product" | "service" | "labor" | "other";
};

export type LegacyOffer = {
  _id: LegacyId;
  offer_number: string;
  title: string;
  contact_id: string;
  currency?: string;
  status?: string;
  valid_until?: Datumszeru;
  notes?: string | null;
  lines?: LegacyOfferLine[];
  is_archived?: boolean;
  archived_at?: Datumszeru;
  archive_reason?: string | null;
  follow_up_date?: Datumszeru;
  follow_up_notes?: string | null;
  sent_at?: Datumszeru;
  lost_reason?: string | null;
  lost_reason_custom?: string | null;
  next_action?: string | null;
  next_action_at?: Datumszeru;
  business_unit?: string | null;
  created_by?: string;
  created_at?: Datumszeru;
};

export type LegacyContractTemplate = {
  _id: LegacyId;
  name: string;
  category: string;
  description?: string | null;
  body: string;
  requires_digital_signature?: boolean;
  is_active?: boolean;
};

export type LegacyContract = {
  _id: LegacyId;
  contract_number: string;
  contact_id: string;
  project_id?: string | null;
  template_id?: string | null;
  type: "generated" | "uploaded";
  category: string;
  name: string;
  status?: string;
  body?: string | null;
  variables_filled?: Record<string, string> | null;
  pdf_url?: string | null;
  portal_visible?: boolean;
  signing_type?: string;
  client_name?: string | null;
  client_signature?: string | null;
  signed_at?: Datumszeru;
  valid_from?: Datumszeru;
  valid_until?: Datumszeru;
  notes?: string | null;
  created_by?: string;
  created_at?: Datumszeru;
};

export type LegacyPurchaseOrder = {
  _id: LegacyId;
  order_number: string;
  supplier_id: string;
  project_id?: string | null;
  offer_id?: string | null;
  status?: string;
  expected_delivery_date?: Datumszeru;
  currency?: string;
  lines?: Array<{
    price_list_item_id?: string | null;
    description: string;
    quantity: number;
    unit: string;
    net_unit_price: number;
    tax_rate: number;
  }>;
  notes?: string | null;
  is_archived?: boolean;
  archived_at?: Datumszeru;
  archive_reason?: string | null;
  created_by?: string;
  created_at?: Datumszeru;
};

type IdMap = ReadonlyMap<string, string> | Readonly<Record<string, string>>;
const lookup = (m: IdMap, k: string | null | undefined): string | undefined =>
  k == null ? undefined : m instanceof Map ? m.get(k) : (m as Record<string, string>)[k];
const str = (v: LegacyId) => String(v);
const date = (v: Datumszeru): Date | undefined => {
  if (!v) return undefined;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
};
const nz = (v: string | null | undefined) => (v ? v : undefined);

export type MigraciosIdMapok = {
  /** legacy Contact._id / Supplier._id -> new Partner id */
  partnerek: IdMap;
  /** legacy user id -> new user id */
  felhasznalok: IdMap;
  /** legacy price-list item id -> new arlista item id */
  arlistaTetelek?: IdMap;
};

export type Figyelmeztetes = { legacyId: string; uzenet: string };

const AJANLAT_ALLAPOT: Record<string, AjanlatAllapot> = {
  draft: "piszkozat",
  ready: "kesz",
  sent: "elkuldve",
  accepted: "elfogadva",
  rejected: "elutasitva",
};
const ELVESZTES: Record<string, ElvesztesOk> = {
  price: "ar",
  competitor: "versenytars",
  project_cancelled: "projekt_elmaradt",
  internal_solution: "belso_megoldas",
  no_response: "nincs_valasz",
  timing: "idozites",
  technical_content: "muszaki_tartalom",
  unknown: "ismeretlen",
  other: "egyeb",
};
const SZERZODES_ALLAPOT: Record<string, SzerzodesAllapot> = {
  draft: "piszkozat",
  sent: "elkuldve",
  signed_digital: "digitalisan_alairt",
  signed_paper: "papiron_alairt",
  cancelled: "torolt",
};
const ALAIRAS: Record<string, AlairasTipus> = {
  digital: "digitalis",
  paper: "papir",
  none: "nincs",
};
const MEGRENDELO_ALLAPOT: Record<string, MegrendeloAllapot> = {
  draft: "piszkozat",
  sent: "elkuldve",
  fulfilled: "teljesitve",
  cancelled: "torolt",
};
const SOR_TIPUS: Record<string, AjanlatSor["sorTipus"]> = {
  product: "termek",
  service: "szolgaltatas",
  labor: "munkadij",
  other: "egyeb",
};

/**
 * Legacy lines only kept a reduced price snapshot (multiplier, base, calculated price). It is
 * carried over as a best-effort `arSnapshot`; fields the legacy model never had are neutral.
 */
function mapSnapshot(
  l: LegacyOfferLine,
  tetelId: string,
  keszult: string,
): ArSnapshotAdat | undefined {
  const s = l.price_snapshot;
  if (!s) return undefined;
  return {
    forras: "szolgaltatas",
    tetelId,
    kod: "",
    nev: l.description,
    egyseg: l.unit,
    arazasiTipus: "migralt",
    belsoAlapar: s.internal_base_price,
    szorzoKulcs: s.multiplier_key,
    ugyfelSzorzo: s.client_multiplier,
    kalkulaltAr: s.calculated_price,
    surgosseg: null,
    surgossegiSzorzo: s.urgency_multiplier ?? 1,
    vegAr: l.net_unit_price,
    egyedi: false,
    egysegDb: null,
    afaKulcs: l.tax_rate,
    penznem: "HUF",
    keszult: s.pricing_settings_captured_at ?? keszult,
  };
}

export function mapAjanlatSor(
  l: LegacyOfferLine,
  idMapok: Pick<MigraciosIdMapok, "arlistaTetelek">,
  keszult: string,
): AjanlatSor {
  const szolgId = l.service_price_list_item_id ?? undefined;
  const termekId = l.price_list_item_id ?? undefined;
  const forras: AjanlatSor["forras"] = szolgId
    ? "szolgaltatas"
    : termekId
      ? "termek"
      : "kezi";
  const ujTetelId = lookup(idMapok.arlistaTetelek ?? {}, szolgId ?? termekId);
  const arSnapshot =
    forras === "szolgaltatas"
      ? mapSnapshot(l, ujTetelId ?? szolgId ?? "", keszult)
      : undefined;
  return {
    forras: forras !== "kezi" && !ujTetelId && !arSnapshot ? "kezi" : forras,
    sorTipus: SOR_TIPUS[l.line_type ?? (szolgId ? "service" : "product")] ?? "termek",
    leiras: l.description,
    mennyiseg: l.quantity,
    egyseg: l.unit,
    nettoEgysegar: l.net_unit_price,
    afaKulcs: l.tax_rate,
    kedvezmenySzazalek: l.discount_percent || undefined,
    csomagId: l.group_id ?? undefined,
    csomagSzulo: l.group_id ? Boolean(l.is_group_parent) : undefined,
    arSnapshot,
    beszerzesiEgysegar: l.purchase_unit_price_snapshot ?? undefined,
    belsoKoltseg: l.internal_cost_unit_price ?? undefined,
  };
}

export function mapAjanlat(l: LegacyOffer, m: MigraciosIdMapok) {
  const figyelmeztetesek: Figyelmeztetes[] = [];
  const partnerId = lookup(m.partnerek, l.contact_id);
  if (!partnerId)
    figyelmeztetesek.push({
      legacyId: str(l._id),
      uzenet: `Ismeretlen partner (${l.contact_id}) — az ajánlat kihagyva`,
    });
  const keszult = (date(l.created_at) ?? new Date(0)).toISOString();
  const sorok = (l.lines ?? []).map((s) => mapAjanlatSor(s, m, keszult));
  const allapot = AJANLAT_ALLAPOT[l.status ?? "ready"] ?? "kesz";
  const osszesites = ajanlatOsszesites(sorok, 0);
  return {
    kihagy: !partnerId,
    figyelmeztetesek,
    ajanlat: {
      regiId: str(l._id),
      azonosito: l.offer_number,
      cim: l.title,
      partnerId: partnerId ?? "",
      penznem: l.currency ?? "HUF",
      allapot,
      ervenyesseg: date(l.valid_until),
      megjegyzes: nz(l.notes),
      sorok,
      osszegek: {
        nettoOsszeg: osszesites.nettoOsszeg,
        globalisKedvezmenySzazalek: 0,
        globalisKedvezmenyOsszeg: 0,
        kedvezmenyesNetto: osszesites.kedvezmenyesNetto,
        afaOsszeg: osszesites.afaOsszeg,
        bruttoOsszeg: osszesites.bruttoOsszeg,
        afaBontas: osszesites.afaBontas,
      },
      utankovetes: date(l.follow_up_date),
      utankovetesMegjegyzes: nz(l.follow_up_notes),
      kuldveAt: date(l.sent_at),
      elvesztesOka: l.lost_reason ? ELVESZTES[l.lost_reason] : undefined,
      elvesztesMegjegyzes: nz(l.lost_reason_custom),
      kovetkezoLepes: nz(l.next_action),
      kovetkezoLepesIdopont: date(l.next_action_at),
      uzletiEgyseg: nz(l.business_unit),
      archivalt: Boolean(l.is_archived),
      archivalasOka: nz(l.archive_reason),
      archivalasIdopont: date(l.archived_at),
      letrehozoUserId: lookup(m.felhasznalok, l.created_by),
      createdAt: date(l.created_at),
    },
  };
}

export function mapSzerzodesSablon(l: LegacyContractTemplate) {
  return {
    regiId: str(l._id),
    nev: l.name,
    kategoria: l.category,
    leiras: nz(l.description),
    szoveg: l.body,
    valtozok: kitoltendoValtozok(l.body),
    digitalisAlairasKell: Boolean(l.requires_digital_signature),
    aktiv: l.is_active !== false,
  };
}

export function mapSzerzodes(
  l: LegacyContract,
  m: MigraciosIdMapok,
  sablonIdMap: IdMap = {},
) {
  const figyelmeztetesek: Figyelmeztetes[] = [];
  const partnerId = lookup(m.partnerek, l.contact_id);
  if (!partnerId)
    figyelmeztetesek.push({
      legacyId: str(l._id),
      uzenet: `Ismeretlen partner (${l.contact_id}) — a szerződés kihagyva`,
    });
  const tipus: SzerzodesTipus = l.type === "uploaded" ? "feltoltott" : "generalt";
  if (tipus === "feltoltott")
    figyelmeztetesek.push({
      legacyId: str(l._id),
      uzenet:
        "Feltöltött PDF: a bináris tartalmat a runnernek a médiatárba kell áttöltenie",
    });
  return {
    kihagy: !partnerId,
    figyelmeztetesek,
    szerzodes: {
      regiId: str(l._id),
      azonosito: l.contract_number,
      nev: l.name,
      kategoria: l.category,
      partnerId: partnerId ?? "",
      tipus,
      allapot: SZERZODES_ALLAPOT[l.status ?? "draft"] ?? "piszkozat",
      sablonId: lookup(sablonIdMap, l.template_id),
      // The legacy body is the already rendered text; the frozen template body is unknown.
      szoveg: nz(l.body),
      valtozok: l.variables_filled ?? {},
      fajlHivatkozas: nz(l.pdf_url),
      alairasTipus: ALAIRAS[l.signing_type ?? "none"] ?? "nincs",
      ugyfelNev: nz(l.client_name),
      alairasAdat: nz(l.client_signature),
      alairtAt: date(l.signed_at),
      ervenyessegKezdete: date(l.valid_from),
      ervenyessegVege: date(l.valid_until),
      projektId: nz(l.project_id),
      portalLathato: Boolean(l.portal_visible),
      megjegyzes: nz(l.notes),
      letrehozoUserId: lookup(m.felhasznalok, l.created_by),
      createdAt: date(l.created_at),
    },
  };
}

export function mapMegrendelo(l: LegacyPurchaseOrder, m: MigraciosIdMapok) {
  const figyelmeztetesek: Figyelmeztetes[] = [];
  const beszallitoId = lookup(m.partnerek, l.supplier_id);
  if (!beszallitoId)
    figyelmeztetesek.push({
      legacyId: str(l._id),
      uzenet: `Ismeretlen beszállító (${l.supplier_id}) — a megrendelőlap kihagyva`,
    });
  const sorok: MegrendeloSor[] = (l.lines ?? []).map((s) => ({
    arlistaTetelId: lookup(m.arlistaTetelek ?? {}, s.price_list_item_id),
    leiras: s.description,
    mennyiseg: s.quantity,
    egyseg: s.unit,
    nettoEgysegar: s.net_unit_price,
    afaKulcs: s.tax_rate,
  }));
  const allapot = MEGRENDELO_ALLAPOT[l.status ?? "draft"] ?? "piszkozat";
  if (allapot === "teljesitve")
    figyelmeztetesek.push({
      legacyId: str(l._id),
      uzenet:
        "Teljesített megrendelő: a készletet a legacy rendszer már bevételezte — a runner NE hívja a bevételezést",
    });
  return {
    kihagy: !beszallitoId,
    figyelmeztetesek,
    megrendelo: {
      regiId: str(l._id),
      azonosito: l.order_number,
      beszallitoId: beszallitoId ?? "",
      projektId: nz(l.project_id),
      ajanlatId: nz(l.offer_id),
      penznem: l.currency ?? "HUF",
      allapot,
      varhatoSzallitas: date(l.expected_delivery_date),
      megjegyzes: nz(l.notes),
      sorok,
      ...megrendeloOsszesites(sorok),
      archivalt: Boolean(l.is_archived),
      archivalasOka: nz(l.archive_reason),
      archivalasIdopont: date(l.archived_at),
      letrehozoUserId: lookup(m.felhasznalok, l.created_by),
      createdAt: date(l.created_at),
    },
  };
}

export type ErtekesitesMigraciosBemenet = {
  ajanlatok: LegacyOffer[];
  szerzodesSablonok: LegacyContractTemplate[];
  szerzodesek: LegacyContract[];
  megrendelok: LegacyPurchaseOrder[];
  idMapok: MigraciosIdMapok;
  /** legacy template id -> new template id (filled by the runner after inserting templates) */
  sablonIdMap?: IdMap;
};

/** Highest numeric suffix per document kind — the runner seeds the counters above it. */
function maxSzam(azonositok: string[]): number {
  return azonositok.reduce((max, a) => {
    const n = Number(/(\d+)\s*$/.exec(a)?.[1] ?? 0);
    return n > max ? n : max;
  }, 0);
}

export function tervezErtekesitesMigraciot(input: ErtekesitesMigraciosBemenet) {
  const ajanlatok = input.ajanlatok.map((l) => mapAjanlat(l, input.idMapok));
  const szerzodesek = input.szerzodesek.map((l) =>
    mapSzerzodes(l, input.idMapok, input.sablonIdMap),
  );
  const megrendelok = input.megrendelok.map((l) => mapMegrendelo(l, input.idMapok));
  const figyelmeztetesek = [
    ...ajanlatok.flatMap((r) => r.figyelmeztetesek),
    ...szerzodesek.flatMap((r) => r.figyelmeztetesek),
    ...megrendelok.flatMap((r) => r.figyelmeztetesek),
  ];
  return {
    /** Upsert keys: `regiId` on every collection. */
    szerzodesSablonok: input.szerzodesSablonok.map(mapSzerzodesSablon),
    ajanlatok: ajanlatok.filter((r) => !r.kihagy).map((r) => r.ajanlat),
    szerzodesek: szerzodesek.filter((r) => !r.kihagy).map((r) => r.szerzodes),
    megrendelok: megrendelok.filter((r) => !r.kihagy).map((r) => r.megrendelo),
    szamlaloMax: {
      "ertekesites:ajanlat": maxSzam(input.ajanlatok.map((l) => l.offer_number)),
      "ertekesites:szerzodes": maxSzam(input.szerzodesek.map((l) => l.contract_number)),
      "ertekesites:megrendelo": maxSzam(input.megrendelok.map((l) => l.order_number)),
    },
    figyelmeztetesek,
  };
}
