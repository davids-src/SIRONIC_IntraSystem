/**
 * Legacy `Ticket` / `Worklog` / `MaintenancePlan` -> `@erp/szerviz` migration SKELETON.
 *
 * Pure mapping only: no database connection, no `.env` access. A runner (written at cut-over)
 * loads the legacy documents (from a backup / read-only export, ONE tenant), builds the id maps
 * and upserts the returned plain objects keyed by `regiId` (idempotent re-run). `tenantId` is
 * dropped (single-tenant). Ticket / worklog numbers are carried over as `azonosito` (already
 * issued to customers); the runner must seed the `szerviz:hibajegy` / `szerviz:munkalap`
 * counters above `szamlaloMax`. Rows that cannot be mapped faithfully go to `figyelmeztetesek`.
 *
 * Migrated FINALIZED worklogs are marked `keszletKiadva: true`: the legacy system handled the
 * stock itself, so the new stock port must never issue them again.
 */
import type {
  HibajegyAllapot,
  HibajegyForras,
  HibajegyPrioritas,
  MegjegyzesSzerepkor,
  MunkalapAllapot,
} from "../../packages/szerviz/src/constants";
import { alairasHiba } from "../../packages/szerviz/src/szabalyok";
import type { ArSnapshotAdat, MunkalapSor } from "../../packages/szerviz/src/types";

type Datumszeru = Date | string | null | undefined;

export type SzervizIdMapok = {
  /** Legacy contact id -> new partner id + display name snapshot. */
  partnerek: ReadonlyMap<string, { id: string; nev: string }>;
  /** Legacy CrmUser id -> new User id + name. */
  felhasznalok: ReadonlyMap<string, { id: string; nev: string }>;
  /** Legacy price-list item id -> new árlista item id. */
  arlistaTetelek: ReadonlyMap<string, string>;
  /** Legacy project id -> new projekt id (optional; unmapped -> link dropped with a warning). */
  projektek?: ReadonlyMap<string, string>;
  /** Legacy ticket id -> new hibajegy id (for worklog links). */
  hibajegyek?: ReadonlyMap<string, string>;
};

export type LegacyTicket = {
  _id: string;
  ticket_number: string;
  contact_id?: string | null;
  one_time_contact_name?: string | null;
  one_time_contact_phone?: string | null;
  created_by: string;
  assigned_to?: string | null;
  source: string;
  priority: string;
  status: string;
  category: string;
  title: string;
  description: string;
  project_id?: string | null;
  location?: string | null;
  affected_items?: string | null;
  comments?: Array<{
    _id: string;
    author_id: string;
    author_role: string;
    message: string;
    is_internal: boolean;
    created_at: Datumszeru;
  }>;
  resolution_notes?: string | null;
  resolved_at?: Datumszeru;
  is_archived?: boolean;
  archived_at?: Datumszeru;
  archive_reason?: string | null;
  created_at?: Datumszeru;
};

export type LegacyWorklogItem = {
  description: string;
  quantity: number;
  unit: string;
  unit_price?: number | null;
  price_list_item_id?: string | null;
  service_price_list_item_id?: string | null;
  price_snapshot?: {
    internal_base_price: number;
    client_multiplier: number;
    multiplier_key: string;
    calculated_price: number;
    urgency_multiplier?: number;
    pricing_settings_captured_at?: string | null;
  } | null;
};

export type LegacyWorklog = {
  _id: string;
  worklog_number: string;
  contact_id?: string | null;
  one_time_contact_name?: string | null;
  one_time_contact_phone?: string | null;
  project_id?: string | null;
  ticket_id?: string | null;
  created_by: string;
  status: string;
  work_date: Datumszeru;
  work_start?: string | null;
  work_end?: string | null;
  technician_name: string;
  technician_signature?: string | null;
  client_name?: string | null;
  client_signature?: string | null;
  site_address?: string | null;
  work_category: string;
  work_description: string;
  items?: LegacyWorklogItem[];
  travel_km?: number | null;
  notes?: string | null;
  is_archived?: boolean;
  archive_reason?: string | null;
  archived_at?: Datumszeru;
  updated_at?: Datumszeru;
};

export type LegacyMaintenancePlan = {
  _id: string;
  title: string;
  contact_id: string;
  project_id?: string | null;
  frequency_months: number;
  next_due_date: Datumszeru;
  is_active?: boolean;
  template_title: string;
  template_description?: string | null;
  template_category?: string | null;
  template_priority?: string | null;
  template_assigned_to?: string | null;
  advance_days?: number | null;
  created_by: string;
};

const datum = (d: Datumszeru): Date | undefined => {
  if (!d) return undefined;
  const x = d instanceof Date ? d : new Date(d);
  return Number.isNaN(x.getTime()) ? undefined : x;
};
const szoveg = (s?: string | null) => (s && s.trim() ? s.trim() : undefined);

const ALLAPOT: Record<string, HibajegyAllapot> = {
  new: "uj",
  in_progress: "folyamatban",
  waiting: "varakozik",
  resolved: "megoldva",
  closed: "lezart",
};
const FORRAS: Record<string, HibajegyForras> = {
  crm: "crm",
  partner_portal: "portal",
  phone: "telefon",
  email: "email",
  walk_in: "szemelyes",
};
const PRIORITAS: Record<string, HibajegyPrioritas> = {
  low: "alacsony",
  medium: "kozepes",
  high: "magas",
  critical: "kritikus",
};
const SZEREPKOR: Record<string, MegjegyzesSzerepkor> = {
  crm_staff: "munkatars",
  partner: "partner",
};

type Warn = string[];

export function mapHibajegy(l: LegacyTicket, ids: SzervizIdMapok, w: Warn = []) {
  const ref = `Hibajegy ${l.ticket_number}`;
  const partner = l.contact_id ? ids.partnerek.get(l.contact_id) : undefined;
  if (l.contact_id && !partner) w.push(`${ref}: ismeretlen partner (${l.contact_id})`);
  const felelos = l.assigned_to ? ids.felhasznalok.get(l.assigned_to) : undefined;
  if (l.assigned_to && !felelos) w.push(`${ref}: ismeretlen felelős (${l.assigned_to})`);
  const allapot = ALLAPOT[l.status];
  if (!allapot) w.push(`${ref}: ismeretlen státusz "${l.status}" -> új`);
  const forras = FORRAS[l.source];
  if (!forras) w.push(`${ref}: ismeretlen forrás "${l.source}" -> crm`);
  const prioritas = PRIORITAS[l.priority];
  if (!prioritas) w.push(`${ref}: ismeretlen prioritás "${l.priority}" -> közepes`);
  const projektId = l.project_id ? ids.projektek?.get(l.project_id) : undefined;
  if (l.project_id && !projektId) w.push(`${ref}: a projekt hivatkozás nem képezhető le`);
  const keszult = datum(l.created_at) ?? new Date();

  const megjegyzesek = (l.comments ?? []).map((c) => {
    const szerzo = ids.felhasznalok.get(c.author_id);
    const szerepkor = SZEREPKOR[c.author_role] ?? "munkatars";
    if (!szerzo && szerepkor === "munkatars")
      w.push(`${ref}: ismeretlen megjegyzés-szerző (${c.author_id})`);
    return {
      szerzoId: szerzo?.id ?? c.author_id,
      szerzoNev:
        szerzo?.nev ??
        (szerepkor === "partner" ? (partner?.nev ?? "Partner") : "Ismeretlen"),
      szerepkor,
      uzenet: c.message,
      // The internal flag is carried over 1:1 — it is what keeps the note away from the portal.
      belso: c.is_internal === true,
      letrehozva: datum(c.created_at) ?? keszult,
    };
  });

  return {
    regiId: String(l._id),
    azonosito: l.ticket_number,
    partnerId: partner?.id,
    partnerNev: partner?.nev,
    egyszeriNev: szoveg(l.one_time_contact_name),
    egyszeriTelefon: szoveg(l.one_time_contact_phone),
    letrehozoId: ids.felhasznalok.get(l.created_by)?.id ?? l.created_by,
    forras: forras ?? ("crm" as HibajegyForras),
    prioritas: prioritas ?? ("kozepes" as HibajegyPrioritas),
    allapot: allapot ?? ("uj" as HibajegyAllapot),
    kategoria: l.category,
    targy: l.title,
    leiras: l.description,
    projektId,
    helyszin: szoveg(l.location),
    erintettTetelek: szoveg(l.affected_items),
    megoldasJegyzet: szoveg(l.resolution_notes),
    megoldva: datum(l.resolved_at),
    felelosId: felelos?.id,
    felelosNev: felelos?.nev,
    megjegyzesek,
    archivalt: l.is_archived === true,
    archivalasOka: l.is_archived ? szoveg(l.archive_reason) : undefined,
    archivalasIdopont: l.is_archived ? datum(l.archived_at) : undefined,
    createdAt: keszult,
  };
}

function snapshotbol(
  it: LegacyWorklogItem,
  tetelId: string,
  forras: "termek" | "szolgaltatas",
): ArSnapshotAdat | undefined {
  const s = it.price_snapshot;
  if (!s) return undefined;
  const surgos = s.urgency_multiplier ?? 1;
  return {
    forras,
    tetelId,
    kod: "",
    nev: it.description,
    egyseg: it.unit,
    arazasiTipus: "migralt",
    belsoAlapar: s.internal_base_price,
    szorzoKulcs: s.multiplier_key || null,
    ugyfelSzorzo: s.client_multiplier,
    kalkulaltAr: s.calculated_price,
    surgosseg: null,
    surgossegiSzorzo: surgos,
    vegAr: it.unit_price ?? s.calculated_price * surgos,
    egyedi: false,
    egysegDb: null,
    afaKulcs: 27,
    penznem: "HUF",
    keszult: s.pricing_settings_captured_at ?? new Date(0).toISOString(),
  };
}

const MUNKA_EGYSEGEK = new Set(["óra", "ora", "h", "hour", "perc", "min"]);

export function mapMunkalapSor(
  it: LegacyWorklogItem,
  ids: SzervizIdMapok,
  ref: string,
  w: Warn,
): MunkalapSor {
  const termekId = it.price_list_item_id
    ? ids.arlistaTetelek.get(it.price_list_item_id)
    : undefined;
  const szolgId = it.service_price_list_item_id
    ? ids.arlistaTetelek.get(it.service_price_list_item_id)
    : undefined;
  if (it.price_list_item_id && !termekId)
    w.push(`${ref}: ismeretlen árlista termék (${it.price_list_item_id})`);
  if (it.service_price_list_item_id && !szolgId)
    w.push(`${ref}: ismeretlen árlista szolgáltatás (${it.service_price_list_item_id})`);
  const base = {
    leiras: it.description,
    mennyiseg: it.quantity,
    egyseg: it.unit,
    nettoEgysegar: it.unit_price ?? undefined,
    // The legacy system already handled the stock; the new port must not issue it again.
    keszletbolKiad: false,
  };
  if (szolgId)
    return {
      ...base,
      tipus: "munka",
      forras: "szolgaltatas",
      arlistaTetelId: szolgId,
      arSnapshot: snapshotbol(it, szolgId, "szolgaltatas"),
    };
  if (termekId)
    return {
      ...base,
      tipus: "anyag",
      forras: "termek",
      arlistaTetelId: termekId,
      arSnapshot: snapshotbol(it, termekId, "termek"),
    };
  return {
    ...base,
    tipus: MUNKA_EGYSEGEK.has(it.unit.toLowerCase()) ? "munka" : "anyag",
    forras: "kezi",
  };
}

function alairasAtvesz(
  ertek: string | null | undefined,
  ref: string,
  mit: string,
  w: Warn,
) {
  const s = szoveg(ertek);
  if (!s) return undefined;
  const hiba = alairasHiba(s);
  if (hiba) {
    w.push(`${ref}: ${mit} aláírás nem vihető át (${hiba})`);
    return undefined;
  }
  return s;
}

export function mapMunkalap(l: LegacyWorklog, ids: SzervizIdMapok, w: Warn = []) {
  const ref = `Munkalap ${l.worklog_number}`;
  const partner = l.contact_id ? ids.partnerek.get(l.contact_id) : undefined;
  if (l.contact_id && !partner) w.push(`${ref}: ismeretlen partner (${l.contact_id})`);
  const allapot: MunkalapAllapot = l.status === "finalized" ? "lezart" : "piszkozat";
  if (l.status !== "finalized" && l.status !== "draft")
    w.push(`${ref}: ismeretlen státusz "${l.status}" -> piszkozat`);
  const hibajegyId = l.ticket_id ? ids.hibajegyek?.get(l.ticket_id) : undefined;
  if (l.ticket_id && !hibajegyId)
    w.push(`${ref}: a hibajegy hivatkozás nem képezhető le`);
  const projektId = l.project_id ? ids.projektek?.get(l.project_id) : undefined;
  if (l.project_id && !projektId) w.push(`${ref}: a projekt hivatkozás nem képezhető le`);
  const munkaDatum = datum(l.work_date);
  if (!munkaDatum) w.push(`${ref}: hiányzó munkadátum`);
  const ugyfelAlairas = alairasAtvesz(l.client_signature, ref, "ügyfél", w);
  const ugyfelNev = szoveg(l.client_name);
  if (ugyfelAlairas && !ugyfelNev) w.push(`${ref}: aláírás ügyfélnév nélkül`);

  return {
    regiId: String(l._id),
    azonosito: l.worklog_number,
    partnerId: partner?.id,
    partnerNev: partner?.nev,
    egyszeriNev: szoveg(l.one_time_contact_name),
    egyszeriTelefon: szoveg(l.one_time_contact_phone),
    projektId,
    hibajegyId,
    letrehozoId: ids.felhasznalok.get(l.created_by)?.id ?? l.created_by,
    allapot,
    munkaDatum: munkaDatum ?? new Date(0),
    munkaKezdet: szoveg(l.work_start),
    munkaVege: szoveg(l.work_end),
    szerelo: l.technician_name,
    szereloAlairas: alairasAtvesz(l.technician_signature, ref, "szerelő", w),
    ugyfelNev,
    ugyfelAlairas,
    helyszin: szoveg(l.site_address),
    kategoria: l.work_category,
    leiras: l.work_description,
    sorok: (l.items ?? []).map((it) => mapMunkalapSor(it, ids, ref, w)),
    utazasKm: l.travel_km ?? undefined,
    megjegyzes: szoveg(l.notes),
    lezarva: allapot === "lezart" ? datum(l.updated_at) : undefined,
    keszletKiadva: allapot === "lezart",
    keszletKiadas:
      allapot === "lezart"
        ? {
            ok: true,
            idopont: datum(l.updated_at) ?? new Date(0),
            uzenet: "Migrált munkalap",
          }
        : undefined,
    archivalt: l.is_archived === true,
    archivalasOka: l.is_archived ? szoveg(l.archive_reason) : undefined,
    archivalasIdopont: l.is_archived ? datum(l.archived_at) : undefined,
  };
}

export function mapKarbantartasiTerv(
  l: LegacyMaintenancePlan,
  ids: SzervizIdMapok,
  w: Warn = [],
) {
  const ref = `Karbantartási terv "${l.title}"`;
  const partner = ids.partnerek.get(l.contact_id);
  if (!partner) w.push(`${ref}: ismeretlen partner (${l.contact_id}) — a terv kihagyva`);
  const felelos = l.template_assigned_to
    ? ids.felhasznalok.get(l.template_assigned_to)
    : undefined;
  if (l.template_assigned_to && !felelos)
    w.push(`${ref}: ismeretlen felelős (${l.template_assigned_to})`);
  const kovetkezo = datum(l.next_due_date);
  if (!kovetkezo) w.push(`${ref}: hiányzó esedékesség — a terv kihagyva`);
  const prioritas = PRIORITAS[l.template_priority ?? "medium"] ?? "kozepes";
  if (!partner || !kovetkezo) return null;
  return {
    regiId: String(l._id),
    cim: l.title,
    partnerId: partner.id,
    partnerNev: partner.nev,
    projektId: l.project_id ? ids.projektek?.get(l.project_id) : undefined,
    intervallumHonap: l.frequency_months,
    // The legacy `next_due_date` is the NEXT due date, i.e. cycle 0 of the new anchored schedule.
    elsoEsedekes: new Date(
      Date.UTC(
        kovetkezo.getUTCFullYear(),
        kovetkezo.getUTCMonth(),
        kovetkezo.getUTCDate(),
      ),
    ),
    utolsoCiklus: -1,
    elorejelzesNap: l.advance_days ?? 14,
    aktiv: l.is_active !== false,
    sablonLeiras: szoveg(l.template_description),
    kategoria: szoveg(l.template_category) ?? "Preventív karbantartás",
    prioritas,
    felelosId: felelos?.id,
    felelosNev: felelos?.nev,
    letrehozoId: ids.felhasznalok.get(l.created_by)?.id ?? l.created_by,
  };
}

const szamTag = (azonosito: string) => {
  const m = /(\d+)\s*$/.exec(azonosito);
  return m ? Number.parseInt(m[1]!, 10) : 0;
};

export type SzervizMigraciosTerv = {
  hibajegyek: Array<ReturnType<typeof mapHibajegy>>;
  munkalapok: Array<ReturnType<typeof mapMunkalap>>;
  karbantartasiTervek: Array<NonNullable<ReturnType<typeof mapKarbantartasiTerv>>>;
  /** Highest migrated number per counter — the runner seeds `nextSequence` above it. */
  szamlaloMax: { hibajegy: number; munkalap: number };
  figyelmeztetesek: string[];
};

export function tervezSzervizMigraciot(
  legacy: {
    hibajegyek: LegacyTicket[];
    munkalapok: LegacyWorklog[];
    karbantartasiTervek: LegacyMaintenancePlan[];
  },
  ids: SzervizIdMapok,
): SzervizMigraciosTerv {
  const w: string[] = [];
  const hibajegyek = legacy.hibajegyek.map((h) => mapHibajegy(h, ids, w));
  const munkalapok = legacy.munkalapok.map((m) => mapMunkalap(m, ids, w));
  const karbantartasiTervek = legacy.karbantartasiTervek
    .map((t) => mapKarbantartasiTerv(t, ids, w))
    .filter((t): t is NonNullable<typeof t> => t !== null);
  return {
    hibajegyek,
    munkalapok,
    karbantartasiTervek,
    szamlaloMax: {
      hibajegy: Math.max(0, ...hibajegyek.map((h) => szamTag(h.azonosito))),
      munkalap: Math.max(0, ...munkalapok.map((m) => szamTag(m.azonosito))),
    },
    figyelmeztetesek: w,
  };
}
