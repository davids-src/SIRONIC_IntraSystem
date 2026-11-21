/**
 * Legacy warehouse (`WarehouseLocation`, `StockItem`, `StockTransaction`, `InventoryTaking`,
 * `RmaCase`) → Készlet mapping (skeleton).
 *
 * Pure functions only: no DB connection, no env access. The caller (a future runner) loads the
 * legacy documents plus two id maps (legacy price-list item id → new árlista id, legacy user id →
 * new user id), passes them in and persists the returned plain objects. `tenantId` is dropped.
 *
 * Stock is rebuilt from the data, not from the movement history: each StockItem becomes one
 * `KeszletTetel` and gets a single opening `bevetel` movement (`referenceType: kezi`,
 * `referenceId: migracio:<legacyId>`) so that sum(movements) == keszlet from day one. Legacy
 * transactions are carried over as informational history only (`elozmenyek`), never replayed.
 * Rows that cannot be mapped faithfully are reported in `figyelmeztetesek`.
 */
import type {
  LeltarAllapot,
  MozgasTipus,
  RaktarhelyTipus,
  ReferenceTipus,
  RmaAllapot,
} from "../../packages/keszlet/src/constants";
import { szuloKod } from "../../packages/keszlet/src/constants";

export type LegacyLocation = {
  _id: string;
  code: string;
  name: string;
  type?: string;
  description?: string | null;
};
export type LegacyStockItem = {
  _id: string;
  price_list_item_id: string;
  quantity_in_stock: number;
  quantity_allocated?: number;
  low_stock_threshold?: number | null;
  warehouse_location?: string | null;
  notes?: string | null;
  created_at?: Date | string;
};
export type LegacyStockTransaction = {
  _id: string;
  price_list_item_id: string;
  type: string;
  quantity: number;
  to_warehouse_location?: string | null;
  reference_type?: string;
  reference_id?: string | null;
  notes?: string | null;
  created_by?: string;
  created_at?: Date | string;
};
export type LegacyInventoryTaking = {
  _id: string;
  warehouse_location: string;
  status?: string;
  created_by?: string;
  items?: Array<{
    price_list_item_id: string;
    expected_qty: number;
    physical_qty: number;
    notes?: string | null;
  }>;
  completed_at?: Date | string | null;
  created_at?: Date | string;
};
export type LegacyRmaCase = {
  _id: string;
  rma_number: string;
  price_list_item_id: string;
  serial_number?: string | null;
  quantity?: number;
  contact_id: string;
  supplier_name?: string | null;
  status?: string;
  notes?: string | null;
  created_at?: Date | string;
};

export type IdMap = ReadonlyMap<string, string> | Readonly<Record<string, string>>;

export type MigraltRaktarhely = {
  legacyId: string;
  kod: string;
  nev: string;
  tipus: RaktarhelyTipus;
  leiras?: string;
  szuloKod?: string;
};
export type MigraltTetel = {
  legacyId: string;
  arlistaTermekId: string;
  raktarhelyKod: string;
  keszlet: number;
  foglalt: number;
  minimum: number | null;
  megjegyzes?: string;
  createdAt?: Date;
  /** Opening movement that makes the log sum up to `keszlet`/`foglalt`. */
  nyitoMozgas: {
    tipus: MozgasTipus;
    valtozas: number;
    foglaltValtozas: number;
    referenceType: ReferenceTipus;
    referenceId: string;
  };
};
export type MigraltElozmeny = {
  legacyId: string;
  arlistaTermekId: string;
  tipus: string;
  mennyiseg: number;
  referenceType?: string;
  referenceId?: string;
  jegyzet?: string;
  createdAt?: Date;
};
export type MigraltLeltar = {
  legacyId: string;
  raktarhelyKod: string;
  allapot: LeltarAllapot;
  sorok: Array<{
    arlistaTermekId: string;
    elvart: number;
    tenyleges: number;
    indoklas?: string;
  }>;
  lezartAt?: Date;
  createdAt?: Date;
};
export type MigraltRma = {
  legacyId: string;
  sorszam: string;
  arlistaTermekId: string;
  gyariSzam?: string;
  mennyiseg: number;
  /** Legacy contact id — the partner migration owns the contact → partner mapping. */
  legacyPartnerId: string;
  beszallitoNev?: string;
  allapot: RmaAllapot;
  megjegyzes?: string;
  createdAt?: Date;
};

export type KeszletMigraciosEredmeny = {
  raktarhelyek: MigraltRaktarhely[];
  tetelek: MigraltTetel[];
  elozmenyek: MigraltElozmeny[];
  leltarak: MigraltLeltar[];
  rmaUgyek: MigraltRma[];
  figyelmeztetesek: string[];
};

const get = (m: IdMap, k: string | undefined): string | undefined =>
  k === undefined
    ? undefined
    : m instanceof Map
      ? m.get(k)
      : (m as Record<string, string>)[k];
const dat = (v: Date | string | null | undefined): Date | undefined => {
  if (!v) return undefined;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
};
const txt = (v: string | null | undefined): string | undefined => v?.trim() || undefined;

const TIPUS: Record<string, RaktarhelyTipus> = {
  main: "fo",
  car: "auto",
  scrap: "selejt",
  shelf: "polc",
};
const RMA: Record<string, RmaAllapot> = {
  received: "beerkezett",
  sent_to_supplier: "beszallitonak_kuldve",
  replaced: "kicserelve",
  repaired: "javitva",
  scrapped: "selejtezve",
  returned_to_client: "visszaadva_ugyfelnek",
};
const REF: Record<string, ReferenceTipus> = {
  worklog: "munkalap",
  offer: "ajanlat",
  invoice: "szamla",
  purchase_order: "beszerzesi_rendeles",
  manual: "kezi",
  delivery_note: "szallitolevel",
  inventory_taking: "leltar",
};

/** Legacy codes are flat ("A-12"); they are kept as-is (valid tree roots) so stock rows still match. */
export function mapRaktarhely(l: LegacyLocation): MigraltRaktarhely {
  const kod = l.code.trim();
  return {
    legacyId: l._id,
    kod,
    nev: l.name.trim(),
    tipus: TIPUS[l.type ?? "shelf"] ?? "polc",
    leiras: txt(l.description),
    szuloKod: szuloKod(kod),
  };
}

export function mapTetel(
  s: LegacyStockItem,
  arlista: IdMap,
  figyelmeztetesek: string[] = [],
): MigraltTetel | undefined {
  const termek = get(arlista, s.price_list_item_id);
  if (!termek) {
    figyelmeztetesek.push(
      `StockItem ${s._id}: ismeretlen árlista tétel (${s.price_list_item_id}), kihagyva.`,
    );
    return undefined;
  }
  const keszlet = Math.max(0, s.quantity_in_stock);
  let foglalt = Math.max(0, s.quantity_allocated ?? 0);
  if (foglalt > keszlet) {
    figyelmeztetesek.push(
      `StockItem ${s._id}: foglalt (${foglalt}) > készlet (${keszlet}), a foglalás ${keszlet}-ra vágva.`,
    );
    foglalt = keszlet;
  }
  return {
    legacyId: s._id,
    arlistaTermekId: termek,
    raktarhelyKod: txt(s.warehouse_location) ?? "",
    keszlet,
    foglalt,
    minimum: s.low_stock_threshold ?? null,
    megjegyzes: txt(s.notes),
    createdAt: dat(s.created_at),
    nyitoMozgas: {
      tipus: "bevetel",
      valtozas: keszlet,
      foglaltValtozas: foglalt,
      referenceType: "kezi",
      referenceId: `migracio:${s._id}`,
    },
  };
}

export function mapElozmeny(
  t: LegacyStockTransaction,
  arlista: IdMap,
): MigraltElozmeny | undefined {
  const termek = get(arlista, t.price_list_item_id);
  if (!termek) return undefined;
  return {
    legacyId: t._id,
    arlistaTermekId: termek,
    tipus: t.type,
    mennyiseg: t.quantity,
    referenceType: t.reference_type
      ? (REF[t.reference_type] ?? t.reference_type)
      : undefined,
    referenceId: txt(t.reference_id),
    jegyzet: txt(t.notes),
    createdAt: dat(t.created_at),
  };
}

export function mapLeltar(
  l: LegacyInventoryTaking,
  arlista: IdMap,
  figyelmeztetesek: string[] = [],
): MigraltLeltar {
  const sorok: MigraltLeltar["sorok"] = [];
  for (const i of l.items ?? []) {
    const termek = get(arlista, i.price_list_item_id);
    if (!termek) {
      figyelmeztetesek.push(
        `InventoryTaking ${l._id}: ismeretlen árlista tétel (${i.price_list_item_id}), sor kihagyva.`,
      );
      continue;
    }
    sorok.push({
      arlistaTermekId: termek,
      elvart: i.expected_qty,
      tenyleges: i.physical_qty,
      indoklas: txt(i.notes),
    });
  }
  return {
    legacyId: l._id,
    raktarhelyKod: l.warehouse_location,
    // Completed legacy takings already adjusted stock — they are history, never re-applied.
    allapot: l.status === "completed" ? "lezarva" : "tervezet",
    sorok,
    lezartAt: dat(l.completed_at),
    createdAt: dat(l.created_at),
  };
}

export function mapRma(
  r: LegacyRmaCase,
  arlista: IdMap,
  figyelmeztetesek: string[] = [],
): MigraltRma | undefined {
  const termek = get(arlista, r.price_list_item_id);
  if (!termek) {
    figyelmeztetesek.push(`RmaCase ${r.rma_number}: ismeretlen árlista tétel, kihagyva.`);
    return undefined;
  }
  const allapot = RMA[r.status ?? "received"];
  if (!allapot)
    figyelmeztetesek.push(
      `RmaCase ${r.rma_number}: ismeretlen állapot „${r.status}”, „beérkezett”-re állítva.`,
    );
  return {
    legacyId: r._id,
    sorszam: r.rma_number,
    arlistaTermekId: termek,
    gyariSzam: txt(r.serial_number),
    mennyiseg: Math.max(1, r.quantity ?? 1),
    legacyPartnerId: r.contact_id,
    beszallitoNev: txt(r.supplier_name),
    allapot: allapot ?? "beerkezett",
    megjegyzes: txt(r.notes),
    createdAt: dat(r.created_at),
  };
}

export function migraljKeszlet(input: {
  helyek: LegacyLocation[];
  tetelek: LegacyStockItem[];
  tranzakciok: LegacyStockTransaction[];
  leltarak: LegacyInventoryTaking[];
  rmaUgyek: LegacyRmaCase[];
  arlistaIdMap: IdMap;
}): KeszletMigraciosEredmeny {
  const figyelmeztetesek: string[] = [];
  const raktarhelyek = input.helyek.map(mapRaktarhely);
  const kodok = new Set(raktarhelyek.map((h) => h.kod));
  for (const h of raktarhelyek)
    if (h.szuloKod && !kodok.has(h.szuloKod))
      figyelmeztetesek.push(`Raktárhely ${h.kod}: a szülő (${h.szuloKod}) hiányzik.`);
  const tetelek = input.tetelek
    .map((s) => mapTetel(s, input.arlistaIdMap, figyelmeztetesek))
    .filter((t): t is MigraltTetel => t !== undefined);
  for (const t of tetelek)
    if (t.raktarhelyKod && !kodok.has(t.raktarhelyKod))
      figyelmeztetesek.push(
        `Készlettétel ${t.legacyId}: ismeretlen raktárhely „${t.raktarhelyKod}”.`,
      );
  return {
    raktarhelyek,
    tetelek,
    elozmenyek: input.tranzakciok
      .map((t) => mapElozmeny(t, input.arlistaIdMap))
      .filter((t): t is MigraltElozmeny => t !== undefined),
    leltarak: input.leltarak.map((l) =>
      mapLeltar(l, input.arlistaIdMap, figyelmeztetesek),
    ),
    rmaUgyek: input.rmaUgyek
      .map((r) => mapRma(r, input.arlistaIdMap, figyelmeztetesek))
      .filter((r): r is MigraltRma => r !== undefined),
    figyelmeztetesek,
  };
}
