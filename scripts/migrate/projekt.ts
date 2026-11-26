/**
 * Legacy `Project` / `ProjectExpense` / `WeeklyPlan` / `ChecklistTemplate` / `Floorplan` →
 * `Projekt` / `ProjektKoltseg` / `HetiTerv` / `ChecklistSablon` / `Alaprajz` mapping (skeleton).
 *
 * Pure functions only: no DB connection, no env access. The caller (a future runner) loads the
 * legacy documents plus id-maps (legacy user id → new user id, legacy contact id → new partner
 * id, uploaded file URL → new media id), passes them in and persists the returned plain objects.
 * `tenantId` is dropped (single-tenant). Rows that cannot be mapped faithfully are reported in
 * `figyelmeztetesek` instead of being guessed. Project numbers are kept as `azonosito` (the new
 * sequence continues after the highest imported number — the runner's job).
 */
import type {
  ChecklistKategoria,
  FazisAllapot,
  HetiAllapot,
  JeloloTipus,
  KoltsegTipus,
  Prioritas,
  ProjektAllapot,
  StagingJovahagyas,
} from "../../packages/projekt/src/constants";

export type IdMap = ReadonlyMap<string, string> | Readonly<Record<string, string>>;

export type LegacyProject = {
  _id: string;
  project_number: string;
  contact_id?: string | null;
  assigned_to?: string | null;
  name: string;
  description?: string | null;
  category?: string | null;
  status?: string;
  start_date?: Date | string | null;
  deadline?: Date | string | null;
  closed_at?: Date | string | null;
  budget_hours?: number | null;
  portal_visible?: boolean;
  phases?: Array<{
    name: string;
    status?: string;
    order?: number;
    due_date?: Date | string | null;
    completed_at?: Date | string | null;
  }>;
  staging_links?: Array<{
    _id: string;
    label: string;
    url: string;
    added_by?: string;
    added_at?: Date | string;
    approval_status?: string;
    approved_by?: string | null;
    approved_at?: Date | string | null;
    approval_note?: string | null;
  }>;
  checklist?: Array<{
    _id: string;
    label: string;
    category?: string;
    required?: boolean;
    completed?: boolean;
    completed_at?: Date | string | null;
    uploaded_file_url?: string | null;
    note?: string | null;
  }>;
  notes?: string | null;
  offer_id?: string | null;
  is_archived?: boolean;
  archived_at?: Date | string | null;
  archive_reason?: string | null;
  createdAt?: Date | string;
};

export type LegacyProjectExpense = {
  _id: string;
  project_id: string;
  worklog_id?: string | null;
  expense_type?: string;
  description?: string;
  amount: number;
  currency?: string;
  receipt_image_url?: string | null;
  recorded_by?: string;
  date: Date | string;
};

export type LegacyWeeklyPlan = {
  _id: string;
  assignee_id: string;
  week_number: number;
  year: number;
  title: string;
  description?: string | null;
  status?: string;
  priority?: string;
  ticket_id?: string | null;
  project_id?: string | null;
  worklog_id?: string | null;
  due_date?: Date | string | null;
  is_archived?: boolean;
  archived_at?: Date | string | null;
  archive_reason?: string | null;
  created_by: string;
};

export type LegacyChecklistTemplate = {
  _id: string;
  name: string;
  description?: string;
  category?: string;
  items?: Array<{ text: string; is_required?: boolean; order?: number }>;
  is_active?: boolean;
  created_by?: string;
};

export type LegacyFloorplan = {
  _id: string;
  contact_id: string;
  project_id?: string | null;
  name: string;
  image_url: string;
  markers?: Array<{
    x_percent: number;
    y_percent: number;
    label?: string;
    ticket_id?: string | null;
    asset_id?: string | null;
    marker_type?: string;
    description?: string;
  }>;
  created_by?: string;
};

export type MigraltProjekt = {
  legacyId: string;
  azonosito: string;
  partnerId?: string;
  nev: string;
  leiras?: string;
  kategoria?: string;
  allapot: ProjektAllapot;
  kezdet?: Date;
  hatarido?: Date;
  lezarasIdopont?: Date;
  tervezettOrak?: number;
  portalLathato: boolean;
  felelosUserId?: string;
  belsoJegyzet?: string;
  ajanlatLegacyId?: string;
  fazisok: Array<{
    nev: string;
    allapot: FazisAllapot;
    hatarido?: Date;
    szazalek: number;
  }>;
  stagingLinkek: Array<{
    cimke: string;
    url: string;
    hozzaadtaUserId?: string;
    hozzaadva?: Date;
    jovahagyas: StagingJovahagyas;
    jovahagyoNev?: string;
    jovahagyasMegjegyzes?: string;
  }>;
  checklist: Array<{
    cimke: string;
    kategoria: ChecklistKategoria;
    kotelezo: boolean;
    kesz: boolean;
    keszIdopont?: Date;
    /** New media id when the URL was mapped, else empty (see `legacyMellekletUrlok`). */
    mellekletMediaIds: string[];
    legacyMellekletUrlok: string[];
    megjegyzes?: string;
  }>;
  archivalt: boolean;
  archivalasOka?: string;
  archivalasIdopont?: Date;
  createdAt?: Date;
};

export type MigraltKoltseg = {
  legacyId: string;
  legacyProjektId: string;
  munkalapLegacyId?: string;
  tipus: KoltsegTipus;
  leiras?: string;
  osszeg: number;
  penznem: string;
  datum: Date;
  rogzitoUserId: string;
  bizonylatMediaId?: string;
  legacyBizonylatUrl?: string;
};

export type MigraltHetiTerv = {
  legacyId: string;
  felelosUserId: string;
  letrehozoUserId: string;
  ev: number;
  het: number;
  cim: string;
  leiras?: string;
  allapot: HetiAllapot;
  prioritas: Prioritas;
  hatarido?: Date;
  /** Opaque legacy ids — re-pointed by the runner once the target modules are migrated. */
  hibajegyLegacyId?: string;
  projektLegacyId?: string;
  munkalapLegacyId?: string;
  archivalt: boolean;
  archivalasOka?: string;
  archivalasIdopont?: Date;
};

export type MigraltSablon = {
  legacyId: string;
  nev: string;
  leiras?: string;
  kategoria?: string;
  tetelek: Array<{ szoveg: string; kotelezo: boolean; mellekletKotelezo: boolean }>;
  /** Legacy `is_active: false` → archived. */
  archivalt: boolean;
  letrehozoUserId?: string;
};

export type MigraltAlaprajz = {
  legacyId: string;
  partnerId?: string;
  projektLegacyId?: string;
  nev: string;
  fajlMediaId?: string;
  legacyFajlUrl: string;
  jelolok: Array<{
    x: number;
    y: number;
    cimke?: string;
    tipus: JeloloTipus;
    leiras?: string;
    hibajegyLegacyId?: string;
    eszkozLegacyId?: string;
  }>;
};

const PROJEKT_ALLAPOT: Record<string, ProjektAllapot> = {
  open: "nyitott",
  on_hold: "felfuggesztett",
  closed: "lezart",
};
const FAZIS_ALLAPOT: Record<string, FazisAllapot> = {
  pending: "fuggoben",
  in_progress: "folyamatban",
  completed: "kesz",
};
const KATEGORIA: Record<string, ChecklistKategoria> = {
  content: "tartalom",
  assets: "anyagok",
  documents: "dokumentumok",
  technical: "technikai",
  other: "egyeb",
};
const JOVAHAGYAS: Record<string, StagingJovahagyas> = {
  pending: "fuggoben",
  approved: "jovahagyva",
  changes_requested: "modositas_kerve",
};
const KOLTSEG: Record<string, KoltsegTipus> = {
  fuel: "uzemanyag",
  parking: "parkolas",
  toll: "autopalya",
  accommodation: "szallas",
  material: "anyag",
  other: "egyeb",
};
const HETI: Record<string, HetiAllapot> = {
  todo: "todo",
  in_progress: "folyamatban",
  done: "kesz",
  blocked: "blokkolt",
};
const PRIORITAS: Record<string, Prioritas> = {
  low: "alacsony",
  medium: "kozepes",
  high: "magas",
  urgent: "surgos",
};
const JELOLO: Record<string, JeloloTipus> = {
  camera: "kamera",
  ap: "ap",
  switch: "switch",
  rack: "rack",
  socket: "aljzat",
  sensor: "szenzor",
  router: "router",
  server: "szerver",
  other: "egyeb",
};

function lookup(map: IdMap, id: string | null | undefined): string | undefined {
  if (!id) return undefined;
  return map instanceof Map ? map.get(id) : (map as Record<string, string>)[id];
}

function datum(v: Date | string | null | undefined): Date | undefined {
  if (!v) return undefined;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

const tiszta = (v: string | null | undefined) => v?.trim() || undefined;

/** Phase percentage is not stored in the legacy model: completed = 100, else 0 / 50. */
function fazisSzazalek(a: FazisAllapot) {
  return a === "kesz" ? 100 : a === "folyamatban" ? 50 : 0;
}

export type ProjektMapIds = {
  userIds: IdMap;
  /** legacy contact id → new partner id */
  partnerIds: IdMap;
  /** legacy file URL → new media id (optional; unmapped URLs are kept as `legacy…Url`) */
  mediaByUrl?: IdMap;
};

export function mapProjekt(
  p: LegacyProject,
  ids: ProjektMapIds,
  figyelmeztetesek: string[] = [],
): MigraltProjekt {
  let allapot = PROJEKT_ALLAPOT[p.status ?? "open"];
  if (!allapot) {
    figyelmeztetesek.push(
      `Projekt ${p._id}: ismeretlen státusz „${p.status}”, nyitott lett.`,
    );
    allapot = "nyitott";
  }
  let partnerId: string | undefined;
  if (p.contact_id) {
    partnerId = lookup(ids.partnerIds, p.contact_id);
    if (!partnerId)
      figyelmeztetesek.push(
        `Projekt ${p._id}: a partner (${p.contact_id}) nem képezhető le, partner nélkül importálva.`,
      );
  }
  const felelosUserId = lookup(ids.userIds, p.assigned_to);
  if (p.assigned_to && !felelosUserId)
    figyelmeztetesek.push(
      `Projekt ${p._id}: a felelős (${p.assigned_to}) nem képezhető le.`,
    );

  const fazisok = [...(p.phases ?? [])]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((f) => {
      const a = FAZIS_ALLAPOT[f.status ?? "pending"] ?? "fuggoben";
      return {
        nev: f.name.trim(),
        allapot: a,
        hatarido: datum(f.due_date),
        szazalek: fazisSzazalek(a),
      };
    });

  const checklist = (p.checklist ?? []).map((c) => {
    const url = tiszta(c.uploaded_file_url);
    const mediaId = url ? lookup(ids.mediaByUrl ?? new Map(), url) : undefined;
    if (url && !mediaId)
      figyelmeztetesek.push(
        `Projekt ${p._id}: a „${c.label}” csatolmánya (${url}) nincs a médiatárban, az URL megőrizve.`,
      );
    return {
      cimke: c.label.trim(),
      kategoria: KATEGORIA[c.category ?? "other"] ?? "egyeb",
      kotelezo: c.required ?? false,
      kesz: c.completed ?? false,
      keszIdopont: datum(c.completed_at),
      mellekletMediaIds: mediaId ? [mediaId] : [],
      legacyMellekletUrlok: url && !mediaId ? [url] : [],
      megjegyzes: tiszta(c.note),
    };
  });

  return {
    legacyId: p._id,
    azonosito: p.project_number,
    partnerId,
    nev: p.name.trim(),
    leiras: tiszta(p.description),
    kategoria: tiszta(p.category),
    allapot,
    kezdet: datum(p.start_date),
    hatarido: datum(p.deadline),
    lezarasIdopont: allapot === "lezart" ? datum(p.closed_at) : undefined,
    tervezettOrak: p.budget_hours ?? undefined,
    portalLathato: p.portal_visible ?? false,
    felelosUserId,
    belsoJegyzet: tiszta(p.notes),
    ajanlatLegacyId: p.offer_id ?? undefined,
    fazisok,
    stagingLinkek: (p.staging_links ?? []).map((s) => ({
      cimke: s.label.trim(),
      url: s.url.trim(),
      hozzaadtaUserId: lookup(ids.userIds, s.added_by),
      hozzaadva: datum(s.added_at),
      jovahagyas: JOVAHAGYAS[s.approval_status ?? "pending"] ?? "fuggoben",
      jovahagyasMegjegyzes: tiszta(s.approval_note),
    })),
    checklist,
    archivalt: p.is_archived ?? false,
    archivalasOka: p.is_archived ? tiszta(p.archive_reason) : undefined,
    archivalasIdopont: p.is_archived ? datum(p.archived_at) : undefined,
    createdAt: datum(p.createdAt),
  };
}

export function mapKoltseg(
  e: LegacyProjectExpense,
  ids: Pick<ProjektMapIds, "userIds" | "mediaByUrl">,
  ismertProjektek: ReadonlySet<string>,
  figyelmeztetesek: string[] = [],
): MigraltKoltseg | null {
  if (!ismertProjektek.has(e.project_id)) {
    figyelmeztetesek.push(
      `Költség ${e._id}: ismeretlen projekt (${e.project_id}), kihagyva.`,
    );
    return null;
  }
  const d = datum(e.date);
  if (!d) {
    figyelmeztetesek.push(`Költség ${e._id}: érvénytelen dátum, kihagyva.`);
    return null;
  }
  const rogzito = lookup(ids.userIds, e.recorded_by);
  if (!rogzito) {
    figyelmeztetesek.push(
      `Költség ${e._id}: a rögzítő (${e.recorded_by ?? "nincs"}) nem képezhető le, kihagyva.`,
    );
    return null;
  }
  const tipus = KOLTSEG[e.expense_type ?? "other"];
  if (!tipus)
    figyelmeztetesek.push(
      `Költség ${e._id}: ismeretlen típus „${e.expense_type}”, egyéb lett.`,
    );
  const url = tiszta(e.receipt_image_url);
  const mediaId = url ? lookup(ids.mediaByUrl ?? new Map(), url) : undefined;
  return {
    legacyId: e._id,
    legacyProjektId: e.project_id,
    munkalapLegacyId: e.worklog_id ?? undefined,
    tipus: tipus ?? "egyeb",
    leiras: tiszta(e.description),
    osszeg: e.amount,
    penznem: e.currency?.trim() || "HUF",
    datum: d,
    rogzitoUserId: rogzito,
    bizonylatMediaId: mediaId,
    legacyBizonylatUrl: url && !mediaId ? url : undefined,
  };
}

export function mapHetiTerv(
  w: LegacyWeeklyPlan,
  userIds: IdMap,
  figyelmeztetesek: string[] = [],
): MigraltHetiTerv | null {
  const felelos = lookup(userIds, w.assignee_id);
  if (!felelos) {
    figyelmeztetesek.push(
      `Heti terv ${w._id}: a felelős (${w.assignee_id}) nem képezhető le, kihagyva.`,
    );
    return null;
  }
  if (!Number.isInteger(w.week_number) || w.week_number < 1 || w.week_number > 53) {
    figyelmeztetesek.push(
      `Heti terv ${w._id}: érvénytelen hét (${w.week_number}), kihagyva.`,
    );
    return null;
  }
  let allapot = HETI[w.status ?? "todo"];
  if (!allapot) {
    figyelmeztetesek.push(
      `Heti terv ${w._id}: ismeretlen státusz „${w.status}”, teendő lett.`,
    );
    allapot = "todo";
  }
  return {
    legacyId: w._id,
    felelosUserId: felelos,
    letrehozoUserId: lookup(userIds, w.created_by) ?? felelos,
    ev: w.year,
    het: w.week_number,
    cim: w.title.trim(),
    leiras: tiszta(w.description),
    allapot,
    prioritas: PRIORITAS[w.priority ?? "medium"] ?? "kozepes",
    hatarido: datum(w.due_date),
    hibajegyLegacyId: w.ticket_id ?? undefined,
    projektLegacyId: w.project_id ?? undefined,
    munkalapLegacyId: w.worklog_id ?? undefined,
    archivalt: w.is_archived ?? false,
    archivalasOka: w.is_archived ? tiszta(w.archive_reason) : undefined,
    archivalasIdopont: w.is_archived ? datum(w.archived_at) : undefined,
  };
}

export function mapSablon(t: LegacyChecklistTemplate, userIds: IdMap): MigraltSablon {
  return {
    legacyId: t._id,
    nev: t.name.trim(),
    leiras: tiszta(t.description),
    kategoria: tiszta(t.category),
    tetelek: [...(t.items ?? [])]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((i) => ({
        szoveg: i.text.trim(),
        kotelezo: i.is_required ?? false,
        mellekletKotelezo: false,
      })),
    archivalt: t.is_active === false,
    letrehozoUserId: lookup(userIds, t.created_by),
  };
}

export function mapAlaprajz(
  f: LegacyFloorplan,
  ids: Pick<ProjektMapIds, "partnerIds" | "mediaByUrl">,
  figyelmeztetesek: string[] = [],
): MigraltAlaprajz {
  const partnerId = lookup(ids.partnerIds, f.contact_id);
  if (!partnerId)
    figyelmeztetesek.push(
      `Alaprajz ${f._id}: a partner (${f.contact_id}) nem képezhető le, partner nélkül importálva.`,
    );
  const mediaId = lookup(ids.mediaByUrl ?? new Map(), f.image_url);
  if (!mediaId)
    figyelmeztetesek.push(
      `Alaprajz ${f._id}: a fájl (${f.image_url}) nincs a médiatárban, az URL megőrizve.`,
    );
  return {
    legacyId: f._id,
    partnerId,
    projektLegacyId: f.project_id ?? undefined,
    nev: f.name.trim(),
    fajlMediaId: mediaId,
    legacyFajlUrl: f.image_url,
    jelolok: (f.markers ?? []).map((m) => ({
      x: Math.min(100, Math.max(0, m.x_percent)),
      y: Math.min(100, Math.max(0, m.y_percent)),
      cimke: tiszta(m.label),
      tipus: JELOLO[m.marker_type ?? "other"] ?? "egyeb",
      leiras: tiszta(m.description),
      hibajegyLegacyId: m.ticket_id ?? undefined,
      eszkozLegacyId: m.asset_id ?? undefined,
    })),
  };
}

export type ProjektMigraciosEredmeny = {
  projektek: MigraltProjekt[];
  koltsegek: MigraltKoltseg[];
  hetiTervek: MigraltHetiTerv[];
  sablonok: MigraltSablon[];
  alaprajzok: MigraltAlaprajz[];
  figyelmeztetesek: string[];
};

export function migraljProjekt(
  legacy: {
    projects: LegacyProject[];
    expenses: LegacyProjectExpense[];
    weeklyPlans: LegacyWeeklyPlan[];
    templates: LegacyChecklistTemplate[];
    floorplans: LegacyFloorplan[];
  },
  ids: ProjektMapIds,
): ProjektMigraciosEredmeny {
  const figyelmeztetesek: string[] = [];
  const projektek = legacy.projects.map((p) => mapProjekt(p, ids, figyelmeztetesek));
  const ismert = new Set(legacy.projects.map((p) => p._id));
  const koltsegek = legacy.expenses
    .map((e) => mapKoltseg(e, ids, ismert, figyelmeztetesek))
    .filter((k): k is MigraltKoltseg => k !== null);
  const hetiTervek = legacy.weeklyPlans
    .map((w) => mapHetiTerv(w, ids.userIds, figyelmeztetesek))
    .filter((w): w is MigraltHetiTerv => w !== null);
  return {
    projektek,
    koltsegek,
    hetiTervek,
    sablonok: legacy.templates.map((t) => mapSablon(t, ids.userIds)),
    alaprajzok: legacy.floorplans.map((f) => mapAlaprajz(f, ids, figyelmeztetesek)),
    figyelmeztetesek,
  };
}
