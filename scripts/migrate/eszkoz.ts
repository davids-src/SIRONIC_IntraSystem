/**
 * Legacy `Tool` / `ToolTransaction` → `Eszkoz` / `EszkozMozgas` mapping (skeleton).
 *
 * Pure functions only: no DB connection, no env access. The caller (a future runner) loads the
 * legacy documents and an id-map (legacy CRM user id → new ERP user id), passes them in and
 * persists the returned plain objects. `tenantId` is dropped (single-tenant). Rows that cannot be
 * mapped faithfully are reported in `figyelmeztetesek` instead of being guessed.
 */
import type {
  EszkozAllapot,
  FizikaiAllapot,
  MozgasTipus,
} from "../../packages/eszkoz/src/constants";

export type LegacyTool = {
  _id: string;
  name: string;
  brand?: string;
  model_number?: string;
  serial_number?: string;
  status?: string;
  assigned_to?: string;
  condition?: string;
  notes?: string;
  createdAt?: Date | string;
};

export type LegacyToolTransaction = {
  _id: string;
  tool_id: string;
  actor_id: string;
  type: string;
  target_user_id?: string;
  notes?: string;
  created_at?: Date | string;
};

/** legacy user id → new user id */
export type UserIdMap = ReadonlyMap<string, string> | Readonly<Record<string, string>>;

export type MigraltEszkoz = {
  legacyId: string;
  megnevezes: string;
  marka?: string;
  tipusszam?: string;
  gyariSzam?: string;
  allapot: EszkozAllapot;
  fizikaiAllapot: FizikaiAllapot;
  jegyzet?: string;
  /** New user id of the holder; set only when `allapot === "kiadva"`. */
  birtokosUserId?: string;
  createdAt?: Date;
};

export type MigraltMozgas = {
  legacyId: string;
  legacyEszkozId: string;
  tipus: MozgasTipus;
  vegrehajtoId: string;
  celUserId?: string;
  jegyzet?: string;
  createdAt?: Date;
};

export type MigraciosEredmeny = {
  eszkozok: MigraltEszkoz[];
  mozgasok: MigraltMozgas[];
  figyelmeztetesek: string[];
};

const ALLAPOT: Record<string, EszkozAllapot> = {
  in_warehouse: "raktaron",
  checked_out: "kiadva",
  maintenance: "szervizben",
  lost: "elveszett",
  retired: "kivonva",
};

const FIZIKAI: Record<string, FizikaiAllapot> = {
  new: "uj",
  good: "jo",
  fair: "megfelelo",
  poor: "rossz",
};

const MOZGAS: Record<string, MozgasTipus> = {
  check_out: "kiadas",
  check_in: "visszavetel",
  maintenance_start: "szerviz_kezdete",
  maintenance_end: "szerviz_vege",
  mark_lost: "elveszett",
  retire: "kivonas",
};

function lookup(map: UserIdMap, id: string | undefined): string | undefined {
  if (!id) return undefined;
  return map instanceof Map ? map.get(id) : (map as Record<string, string>)[id];
}

function datum(v: Date | string | undefined): Date | undefined {
  if (!v) return undefined;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

const tiszta = (v: string | undefined) => v?.trim() || undefined;

export function mapEszkoz(
  tool: LegacyTool,
  userIds: UserIdMap,
  figyelmeztetesek: string[] = [],
): MigraltEszkoz {
  let allapot = ALLAPOT[tool.status ?? "in_warehouse"];
  if (!allapot) {
    figyelmeztetesek.push(
      `Eszköz ${tool._id}: ismeretlen státusz „${tool.status}”, raktáron lett.`,
    );
    allapot = "raktaron";
  }
  const fizikai = FIZIKAI[tool.condition ?? "good"] ?? "jo";

  let birtokosUserId: string | undefined;
  if (allapot === "kiadva") {
    birtokosUserId = lookup(userIds, tool.assigned_to);
    if (!birtokosUserId) {
      figyelmeztetesek.push(
        `Eszköz ${tool._id}: a birtokos (${tool.assigned_to ?? "nincs"}) nem képezhető le, raktáron lett.`,
      );
      allapot = "raktaron";
    }
  }

  return {
    legacyId: tool._id,
    megnevezes: tool.name.trim(),
    marka: tiszta(tool.brand),
    tipusszam: tiszta(tool.model_number),
    gyariSzam: tiszta(tool.serial_number),
    allapot,
    fizikaiAllapot: fizikai,
    jegyzet: tiszta(tool.notes),
    birtokosUserId,
    createdAt: datum(tool.createdAt),
  };
}

export function mapMozgas(
  tx: LegacyToolTransaction,
  userIds: UserIdMap,
  figyelmeztetesek: string[] = [],
): MigraltMozgas | null {
  const tipus = MOZGAS[tx.type];
  if (!tipus) {
    figyelmeztetesek.push(`Mozgás ${tx._id}: ismeretlen típus „${tx.type}”, kihagyva.`);
    return null;
  }
  const vegrehajtoId = lookup(userIds, tx.actor_id);
  if (!vegrehajtoId) {
    figyelmeztetesek.push(
      `Mozgás ${tx._id}: a végrehajtó (${tx.actor_id}) nem képezhető le, kihagyva.`,
    );
    return null;
  }
  let celUserId: string | undefined;
  if (tipus === "kiadas") {
    celUserId = lookup(userIds, tx.target_user_id);
    if (!celUserId) {
      figyelmeztetesek.push(
        `Mozgás ${tx._id}: a címzett (${tx.target_user_id ?? "nincs"}) nem képezhető le, kihagyva.`,
      );
      return null;
    }
  }
  return {
    legacyId: tx._id,
    legacyEszkozId: tx.tool_id,
    tipus,
    vegrehajtoId,
    celUserId,
    jegyzet: tiszta(tx.notes),
    createdAt: datum(tx.created_at),
  };
}

/** Whole-collection mapping; movements are sorted oldest first and orphaned ones dropped. */
export function migraljEszkozok(
  tools: LegacyTool[],
  transactions: LegacyToolTransaction[],
  userIds: UserIdMap,
): MigraciosEredmeny {
  const figyelmeztetesek: string[] = [];
  const eszkozok = tools.map((t) => mapEszkoz(t, userIds, figyelmeztetesek));
  const ismert = new Set(tools.map((t) => t._id));
  const mozgasok: MigraltMozgas[] = [];
  for (const tx of transactions) {
    if (!ismert.has(tx.tool_id)) {
      figyelmeztetesek.push(
        `Mozgás ${tx._id}: ismeretlen eszköz (${tx.tool_id}), kihagyva.`,
      );
      continue;
    }
    const m = mapMozgas(tx, userIds, figyelmeztetesek);
    if (m) mozgasok.push(m);
  }
  mozgasok.sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0));
  return { eszkozok, mozgasok, figyelmeztetesek };
}
