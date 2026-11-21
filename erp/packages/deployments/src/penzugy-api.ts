/**
 * Billing packages and payments (docs/deployments/08). One conditional atomic update per change
 * (no transactions on the standalone Mongo); period generation is idempotent through the unique
 * `(telepitesId, idoszakKezdet)` index. "Késedelmes" is computed on read, never stored.
 */
import { connectDB } from "@erp/db-core";
import { buildDataTableMongoQuery, type DataTableQuery } from "@erp/ui";
import {
  CSOMAG_LIST_COLUMNS,
  FIZETES_LIST_COLUMNS,
  type CsomagListItem,
  type FizetesListItem,
} from "./columns";
import type { FizetesAllapot, Nezo, SzamlazasiCiklus } from "./constants";
import {
  esedekesIdoszakok,
  fizetesAllapot,
  hatekonyAr,
  hatekonyCiklus,
  idoszakVege,
  napKezdet,
} from "./fizetes-szabalyok";
import { Csomag, Fizetes, type ICsomag, type IFizetes } from "./models/egyeb";
import { Telepites, type ITelepites } from "./models/Telepites";
import { esemenyNaploz } from "./orchestrator";
import { PORTAL_FIZETES_MEZOK, szukit, telepitesNezoSzuro } from "./nezo";
import { hozzaferesApi } from "./integracio-api";
import {
  duplikalt,
  elsoHiba,
  es,
  hiba,
  iso,
  ok,
  oid,
  validId,
  type DeploymentsResult,
} from "./shared";
import {
  csomagSchema,
  fizetesFizetveSchema,
  type CsomagInput,
} from "./validation";

// ----------------------------------------------------------------- Csomag

export type CsomagDetail = CsomagListItem & {
  id: string;
  leiras?: string;
  savszelessegGb?: number;
  sorrend: number;
};

const toCsomag = (r: ICsomag): CsomagDetail => ({
  _id: String(r._id),
  id: String(r._id),
  kod: r.kod,
  nev: r.nev,
  leiras: r.leiras,
  arHuf: r.arHuf,
  alapCiklus: r.alapCiklus,
  vcpu: r.eroforrasok?.vcpu,
  ramMb: r.eroforrasok?.ramMb,
  diskGb: r.eroforrasok?.diskGb,
  savszelessegGb: r.eroforrasok?.savszelessegGb,
  aktiv: r.aktiv,
  sorrend: r.sorrend,
});

const csomagMezok = (d: CsomagInput) => ({
  kod: d.kod,
  nev: d.nev,
  leiras: d.leiras,
  arHuf: d.arHuf,
  alapCiklus: d.alapCiklus,
  eroforrasok: {
    vcpu: d.vcpu,
    ramMb: d.ramMb,
    diskGb: d.diskGb,
    savszelessegGb: d.savszelessegGb,
  },
  aktiv: d.aktiv ?? true,
  sorrend: d.sorrend ?? 0,
});

export const csomagApi = {
  async listCsomagok(
    query: DataTableQuery,
  ): Promise<{ data: CsomagListItem[]; total: number }> {
    await connectDB();
    const { filter, sort, skip, limit } = buildDataTableMongoQuery(query, CSOMAG_LIST_COLUMNS);
    const [rows, total] = await Promise.all([
      Csomag.find(filter).sort({ sorrend: 1, ...sort }).skip(skip).limit(limit).exec(),
      Csomag.countDocuments(filter).exec(),
    ]);
    return { data: rows.map(toCsomag), total };
  },

  async listCsomagValaszto(): Promise<
    Array<{ id: string; nev: string; arHuf: number; alapCiklus: SzamlazasiCiklus }>
  > {
    await connectDB();
    const rows = await Csomag.find({ aktiv: true }).sort({ sorrend: 1, nev: 1 }).lean().exec();
    return rows.map((r) => ({
      id: String(r._id),
      nev: r.nev,
      arHuf: r.arHuf,
      alapCiklus: r.alapCiklus,
    }));
  },

  async getCsomag(id: string): Promise<CsomagDetail | null> {
    if (!validId(id)) return null;
    await connectDB();
    const r = await Csomag.findById(id).exec();
    return r ? toCsomag(r) : null;
  },

  async createCsomag(input: CsomagInput): Promise<DeploymentsResult> {
    const p = csomagSchema.safeParse(input);
    if (!p.success) return hiba(elsoHiba(p.error.issues));
    await connectDB();
    try {
      const doc = await Csomag.create(csomagMezok(p.data));
      return ok(String(doc._id));
    } catch (err) {
      if (duplikalt(err)) return hiba("Ilyen kódú csomag már létezik.");
      throw err;
    }
  },

  async updateCsomag(id: string, input: CsomagInput): Promise<DeploymentsResult> {
    if (!validId(id)) return hiba("A csomag nem található.");
    const p = csomagSchema.safeParse(input);
    if (!p.success) return hiba(elsoHiba(p.error.issues));
    await connectDB();
    try {
      const r = await Csomag.updateOne({ _id: oid(id) }, { $set: csomagMezok(p.data) }).exec();
      return r.matchedCount === 0 ? hiba("A csomag nem található.") : ok(id);
    } catch (err) {
      if (duplikalt(err)) return hiba("Ilyen kódú csomag már létezik.");
      throw err;
    }
  },

  async deleteCsomag(id: string): Promise<DeploymentsResult> {
    if (!validId(id)) return hiba("A csomag nem található.");
    await connectDB();
    if (await Telepites.exists({ csomagId: id })) {
      return hiba("A csomagot telepítés használja — inaktiváld törlés helyett.");
    }
    const r = await Csomag.deleteOne({ _id: oid(id) }).exec();
    return r.deletedCount === 0 ? hiba("A csomag nem található.") : ok(id);
  },
};

// ----------------------------------------------------------------- Fizetés

function sorrol(
  r: IFizetes,
  t: { nev: string; domain?: string } | undefined,
  most: Date,
): FizetesListItem {
  return {
    _id: String(r._id),
    telepitesId: r.telepitesId,
    telepitesNev: t?.nev ?? "—",
    domain: t?.domain,
    idoszakKezdet: r.idoszakKezdet.toISOString(),
    idoszakVeg: r.idoszakVeg.toISOString(),
    osszegHuf: r.osszegHuf,
    allapot: fizetesAllapot(r.allapot, r.idoszakVeg, most),
    fizetve: iso(r.fizetve),
  };
}

/** The effective-state filter of the payment board, translated to stored fields + the date. */
function allapotSzuro(allapot: string, most: Date): Record<string, unknown> {
  const ma = napKezdet(most);
  if (allapot === "keso") return { allapot: "esedekes", idoszakVeg: { $lt: ma } };
  if (allapot === "esedekes") return { allapot: "esedekes", idoszakVeg: { $gte: ma } };
  return { allapot };
}

export type FizetesOsszegzes = {
  esedekes: number;
  keso: number;
  kesoOsszegHuf: number;
  fizetveEzenAHonapon: number;
};

export const fizetesApi = {
  /**
   * Rolls the billing periods: for every live/degraded deployment with a price and a
   * `kovetkezoSzamlazas` in the past, creates the due payment(s) and advances the date.
   * Idempotent and safe to run concurrently (unique period index + conditional date advance).
   */
  async idoszakokGeneral(most = new Date()): Promise<{ letrehozva: number }> {
    await connectDB();
    const tk = await Telepites.find({
      allapot: { $in: ["elo", "serult"] },
      kovetkezoSzamlazas: { $lte: most },
    })
      .lean<ITelepites[]>()
      .exec();
    let letrehozva = 0;
    for (const t of tk) {
      const csomag = t.csomagId && validId(t.csomagId)
        ? await Csomag.findById(t.csomagId).lean<ICsomag>().exec()
        : null;
      const ar = hatekonyAr(t, csomag);
      const ciklus = hatekonyCiklus(t, csomag);
      if (ar == null || !ciklus || !t.kovetkezoSzamlazas) continue;
      const { kezdetek, ujKovetkezo } = esedekesIdoszakok(t.kovetkezoSzamlazas, ciklus, most);
      for (const kezdet of kezdetek) {
        try {
          await Fizetes.create({
            telepitesId: String(t._id),
            partnerId: t.partnerId,
            csomagId: t.csomagId,
            idoszakKezdet: kezdet,
            idoszakVeg: idoszakVege(kezdet, ciklus),
            osszegHuf: ar,
            ciklus,
            allapot: "esedekes",
          });
          letrehozva += 1;
        } catch (err) {
          if (!duplikalt(err)) throw err; // already generated by a parallel run
        }
      }
      // Advance only if nobody else did (conditional on the date we read).
      const lepett = await Telepites.updateOne(
        { _id: t._id, kovetkezoSzamlazas: t.kovetkezoSzamlazas },
        { $set: { kovetkezoSzamlazas: ujKovetkezo } },
      );
      if (lepett.modifiedCount > 0 && kezdetek.length > 0) {
        await esemenyNaploz({
          telepitesId: String(t._id),
          tipus: "szamlazas",
          szereplo: { id: "rendszer", tipus: "rendszer" },
          uzenet: `${kezdetek.length} számlázási időszak létrehozva.`,
        });
      }
    }
    return { letrehozva };
  },

  /** Assigns package/cycle/price override; the first assignment sets the billing anchor. */
  async beallitSzamlazas(
    telepitesId: string,
    input: {
      csomagId?: string | null;
      szamlazasiCiklus?: SzamlazasiCiklus | null;
      arFelulirasHuf?: number | null;
      kezdet?: "azonnal" | "kovetkezo_honap";
    },
    most = new Date(),
  ): Promise<DeploymentsResult> {
    if (!validId(telepitesId)) return hiba("A telepítés nem található.");
    await connectDB();
    const t = await Telepites.findById(telepitesId).lean<ITelepites>().exec();
    if (!t) return hiba("A telepítés nem található.");
    if (input.csomagId && (!validId(input.csomagId) || !(await Csomag.exists({ _id: input.csomagId })))) {
      return hiba("A csomag nem található.");
    }
    const set: Record<string, unknown> = {};
    const unset: Record<string, ""> = {};
    const mezo = <K extends string>(k: K, v: unknown) => {
      if (v === undefined) return;
      if (v === null) unset[k] = "";
      else set[k] = v;
    };
    mezo("csomagId", input.csomagId);
    mezo("szamlazasiCiklus", input.szamlazasiCiklus);
    mezo("arFelulirasHuf", input.arFelulirasHuf);
    if (!t.kovetkezoSzamlazas && input.csomagId) {
      set.kovetkezoSzamlazas =
        input.kezdet === "kovetkezo_honap"
          ? new Date(Date.UTC(most.getUTCFullYear(), most.getUTCMonth() + 1, 1))
          : napKezdet(most);
    }
    await Telepites.updateOne(
      { _id: t._id },
      { ...(Object.keys(set).length ? { $set: set } : {}), ...(Object.keys(unset).length ? { $unset: unset } : {}) },
    );
    return ok(telepitesId);
  },

  async listFizetesek(
    query: DataTableQuery,
    opciok: { telepitesId?: string; most?: Date } = {},
  ): Promise<{ data: FizetesListItem[]; total: number }> {
    await connectDB();
    const most = opciok.most ?? new Date();
    const filters = { ...(query.filters ?? {}) };
    const allapot = filters.allapot;
    delete filters.allapot;
    const { filter, sort, skip, limit } = buildDataTableMongoQuery(
      { ...query, filters },
      FIZETES_LIST_COLUMNS,
    );
    let f: Record<string, unknown> = filter;
    if (typeof allapot === "string" && allapot) f = es(f, allapotSzuro(allapot, most));
    if (opciok.telepitesId) f = es(f, { telepitesId: opciok.telepitesId });
    // Overdue first by default: oldest period end on top.
    const rendezes = query.sort ? sort : { idoszakVeg: 1 as const };
    const [rows, total] = await Promise.all([
      Fizetes.find(f).sort(rendezes).skip(skip).limit(limit).lean<IFizetes[]>().exec(),
      Fizetes.countDocuments(f).exec(),
    ]);
    const ids = [...new Set(rows.map((r) => r.telepitesId))].filter(validId);
    const tk = await Telepites.find({ _id: { $in: ids } })
      .select("nev domain")
      .lean()
      .exec();
    const tMap = new Map(tk.map((t) => [String(t._id), { nev: t.nev, domain: t.domain }]));
    return { data: rows.map((r) => sorrol(r, tMap.get(r.telepitesId), most)), total };
  },

  async osszegzes(most = new Date()): Promise<FizetesOsszegzes> {
    await connectDB();
    const ma = napKezdet(most);
    const honapEleje = new Date(Date.UTC(most.getUTCFullYear(), most.getUTCMonth(), 1));
    const [esedekes, kesoSorok, fizetve] = await Promise.all([
      Fizetes.countDocuments({ allapot: "esedekes", idoszakVeg: { $gte: ma } }).exec(),
      Fizetes.find({ allapot: "esedekes", idoszakVeg: { $lt: ma } })
        .select("osszegHuf")
        .lean()
        .exec(),
      Fizetes.countDocuments({ allapot: "fizetve", fizetve: { $gte: honapEleje } }).exec(),
    ]);
    return {
      esedekes,
      keso: kesoSorok.length,
      kesoOsszegHuf: kesoSorok.reduce((s, r) => s + r.osszegHuf, 0),
      fizetveEzenAHonapon: fizetve,
    };
  },

  /** Marks a period paid (open → paid, one conditional update) and sets the deployment's last-paid date. */
  async fizetveJelol(
    id: string,
    input: { megjegyzes?: string; szamlaId?: string },
    actorId: string,
    most = new Date(),
  ): Promise<DeploymentsResult> {
    if (!validId(id)) return hiba("A fizetés nem található.");
    const p = fizetesFizetveSchema.safeParse(input);
    if (!p.success) return hiba(elsoHiba(p.error.issues));
    await connectDB();
    const sor = await Fizetes.findOneAndUpdate(
      { _id: oid(id), allapot: "esedekes" },
      {
        $set: {
          allapot: "fizetve",
          fizetve: most,
          ...(p.data.szamlaId ? { szamlaId: p.data.szamlaId } : {}),
          ...(p.data.megjegyzes ? { megjegyzes: p.data.megjegyzes } : {}),
          letrehozoId: actorId,
        },
      },
      { returnDocument: "after" },
    ).exec();
    if (!sor) return hiba("A fizetés nem található, vagy már lezárt.");
    // Never move the last-paid date backwards (an old period paid late).
    await Telepites.updateOne(
      {
        _id: oid(sor.telepitesId),
        $or: [{ utolsoFizetes: { $exists: false } }, { utolsoFizetes: { $lt: most } }],
      },
      { $set: { utolsoFizetes: most } },
    );
    await esemenyNaploz({
      telepitesId: sor.telepitesId,
      tipus: "szamlazas",
      szereplo: { id: actorId },
      uzenet: `Fizetve jelölve: ${sor.idoszakKezdet.toISOString().slice(0, 10)} időszak.`,
    });
    return ok(id);
  },

  async elenged(id: string, megjegyzes: string, actorId: string): Promise<DeploymentsResult> {
    if (!validId(id)) return hiba("A fizetés nem található.");
    if (!megjegyzes.trim()) return hiba("Az elengedés okát meg kell adni.");
    await connectDB();
    const sor = await Fizetes.findOneAndUpdate(
      { _id: oid(id), allapot: "esedekes" },
      { $set: { allapot: "elengedve", megjegyzes: megjegyzes.trim(), letrehozoId: actorId } },
    ).exec();
    if (!sor) return hiba("A fizetés nem található, vagy már lezárt.");
    await esemenyNaploz({
      telepitesId: sor.telepitesId,
      tipus: "szamlazas",
      szereplo: { id: actorId },
      uzenet: `Elengedve: ${megjegyzes.trim()}`,
    });
    return ok(id);
  },

  /** Portal read: only payments of deployments the viewer may see, allow-listed fields only. */
  async listPortalFizetesek(
    nezo: Nezo,
    most = new Date(),
  ): Promise<Array<Pick<PortalFizetes, (typeof PORTAL_FIZETES_MEZOK)[number]>>> {
    await connectDB();
    const hozz = await hozzaferesApi.hozzaferesIdk(nezo);
    const lathato = await Telepites.find(telepitesNezoSzuro(nezo, hozz)).select("_id").lean().exec();
    const ids = lathato.map((t) => String(t._id));
    if (ids.length === 0) return [];
    const rows = await Fizetes.find({ telepitesId: { $in: ids }, allapot: { $ne: "torolve" } })
      .sort({ idoszakKezdet: -1 })
      .lean<IFizetes[]>()
      .exec();
    return rows.map((r) =>
      szukit(
        {
          id: String(r._id),
          idoszakKezdet: r.idoszakKezdet.toISOString(),
          idoszakVeg: r.idoszakVeg.toISOString(),
          osszegHuf: r.osszegHuf,
          allapot: fizetesAllapot(r.allapot, r.idoszakVeg, most) as FizetesAllapot,
          fizetve: iso(r.fizetve),
        } satisfies PortalFizetes,
        PORTAL_FIZETES_MEZOK,
      ),
    );
  },
};

export type PortalFizetes = {
  id: string;
  idoszakKezdet: string;
  idoszakVeg: string;
  osszegHuf: number;
  allapot: FizetesAllapot;
  fizetve?: string;
};
