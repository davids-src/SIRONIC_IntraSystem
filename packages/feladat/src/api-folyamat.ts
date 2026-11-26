/**
 * Feladat-folyamat facade (#67): a task done in steps by different people. Every step is a
 * linked Feladat; the step events come back through the same composition-root hook as a
 * szerződés's or an ajánlatkérés's (`apps/erp/src/lib/feladat-kapcsolat.ts`, modul
 * `feladat`) and are applied by the shared folyamat-motor (`@erp/core/folyamat`).
 *
 * Every mutating call returns the pushes to send (`ertesitesek`); the app sends them.
 */
import { Types } from "mongoose";
import { connectDB, User } from "@erp/db-core";
import { budapestNap } from "@erp/lib/utils";
import {
  folyamatAktualis,
  folyamatKovetkezo,
  folyamatLepesEsemeny,
  folyamatLepesFeladata,
  folyamatLepesFut,
  type FolyamatLepesNezet,
  type FolyamatNezet,
} from "@erp/core/folyamat";
import {
  FELADAT_CIM_MAX,
  FELADAT_LEPES_NEV_MAX,
  FELADAT_PERMISSIONS,
  FELADAT_SZOVEG_MAX,
  type FeladatPrioritas,
  type FeladatViewer,
} from "./constants";
import {
  FOLYAMAT_KAPCSOLAT,
  FOLYAMAT_LEPES_MAX,
  FOLYAMAT_SABLON_MAX,
  folyamatUrl,
  type FolyamatErtesites,
  type FolyamatInput,
  type FolyamatLepesInput,
  type FolyamatReszlet,
  type FolyamatSablonSor,
} from "./folyamat";
import { kategoriaFeloldas, kategoriaHiba } from "./kategoria-lista";
import type { KapcsoltFeladatEsemeny } from "./hooks";
import { Feladat } from "./models/Feladat";
import {
  FeladatFolyamat,
  FolyamatSablon,
  type IFeladatFolyamat,
  type IFolyamatLepes,
} from "./models/FeladatFolyamat";
import { feladatApi } from "./api";

export type FolyamatEredmeny = {
  ok: boolean;
  id?: string;
  message?: string;
  field?: string;
  ertesitesek: FolyamatErtesites[];
};

const hiba = (message: string, field?: string): FolyamatEredmeny => ({
  ok: false,
  message,
  field,
  ertesitesek: [],
});

const NAP_RE = /^\d{4}-\d{2}-\d{2}$/;
const napbol = (s?: string) =>
  s && NAP_RE.test(s) ? new Date(`${s}T00:00:00.000Z`) : undefined;
const napOf = (d?: Date) => (d ? d.toISOString().slice(0, 10) : undefined);

function rovid(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function userNev(u: { name?: string; email: string }): string {
  return u.name?.trim() || u.email;
}

async function aktivUserek(ids: string[]): Promise<Map<string, string>> {
  const valid = [...new Set(ids)].filter((id) => Types.ObjectId.isValid(id));
  if (valid.length === 0) return new Map();
  const rows = await User.find({ _id: { $in: valid }, isActive: { $ne: false } })
    .select("name email")
    .lean()
    .exec();
  return new Map(rows.map((u) => [String(u._id), userNev(u)]));
}

const isKiado = (doc: IFeladatFolyamat, v: FeladatViewer) =>
  String(doc.kiadoId) === v.userId;

function mayView(doc: IFeladatFolyamat, v: FeladatViewer): boolean {
  return (
    isKiado(doc, v) ||
    doc.resztvevoIds.some((id) => String(id) === v.userId) ||
    v.permissions.includes(FELADAT_PERMISSIONS.read)
  );
}

function kapcsolat(doc: IFeladatFolyamat, lepes?: IFolyamatLepes) {
  return {
    ...FOLYAMAT_KAPCSOLAT,
    id: String(doc._id),
    ...(lepes ? { szakasz: String(lepes._id) } : {}),
  };
}

/** Step input → validated stored steps (felelős names resolved). */
async function lepesekBol(
  input: FolyamatLepesInput[],
  meglevok: IFolyamatLepes[] = [],
): Promise<
  { ok: true; lepesek: Array<Partial<IFolyamatLepes>> } | { ok: false; message: string }
> {
  const sorok = input
    .map((l) => ({ ...l, nev: l.nev.trim().slice(0, FELADAT_LEPES_NEV_MAX) }))
    .filter((l) => l.nev || l.felelosId);
  if (sorok.some((l) => !l.nev))
    return { ok: false, message: "Minden lépésnek adj nevet" };
  if (sorok.some((l) => !l.felelosId))
    return { ok: false, message: "Minden lépésnek legyen felelőse" };
  if (sorok.some((l) => l.hatarido && !NAP_RE.test(l.hatarido)))
    return { ok: false, message: "Érvénytelen lépés-határidő" };
  const nevek = await aktivUserek(sorok.map((l) => l.felelosId));
  if (sorok.some((l) => !nevek.has(l.felelosId)))
    return { ok: false, message: "Egy lépés felelőse nem található (vagy inaktív)" };
  const byId = new Map(meglevok.map((m) => [String(m._id), m]));
  return {
    ok: true,
    lepesek: sorok.map((l) => {
      const regi = l.id ? byId.get(l.id) : undefined;
      return {
        ...(regi ? { _id: regi._id } : {}),
        nev: l.nev,
        felelosId: new Types.ObjectId(l.felelosId),
        felelosNev: nevek.get(l.felelosId)!,
        hatarido: napbol(l.hatarido),
        allapot: "tervezett" as const,
      };
    }),
  };
}

function resztvevok(doc: IFeladatFolyamat): void {
  const ids = new Set(doc.resztvevoIds.map(String));
  for (const l of doc.lepesek) ids.add(String(l.felelosId));
  doc.resztvevoIds = [...ids].map((id) => new Types.ObjectId(id));
}

/** Starts a step: its linked task goes to the felelős (kiadó = the flow's kiadó). Saves nothing. */
async function inditLepes(
  doc: IFeladatFolyamat,
  lepes: IFolyamatLepes,
  actorId: string,
  megjegyzes?: string,
): Promise<
  { ok: true; ertesitesek: FolyamatErtesites[] } | { ok: false; message: string }
> {
  const index = doc.lepesek.findIndex((l) => String(l._id) === String(lepes._id));
  const ma = budapestNap(new Date());
  const nap = napOf(lepes.hatarido ?? doc.hatarido)!;
  const r = await feladatApi.createKapcsoltFeladat({
    kiadoId: String(doc.kiadoId),
    felelosId: String(lepes.felelosId),
    cim: rovid(`${lepes.nev} — ${doc.cim}`, FELADAT_CIM_MAX),
    leiras: rovid(
      [
        doc.leiras,
        `Folyamat: ${doc.cim} — ${index + 1}/${doc.lepesek.length}. lépés: ${lepes.nev}`,
        index + 1 < doc.lepesek.length
          ? `Ha elkészültél, jelöld késznek — a következő lépés (${doc.lepesek[index + 1]!.nev}, ${doc.lepesek[index + 1]!.felelosNev}) automatikusan indul.`
          : "Ez az utolsó lépés: a lezárásával a folyamat kész.",
        megjegyzes ? `Megjegyzés: ${megjegyzes}` : undefined,
      ]
        .filter(Boolean)
        .join("\n\n"),
      FELADAT_SZOVEG_MAX,
    ),
    // A planned step whose day already passed starts with today's deadline.
    hatarido: nap < ma ? ma : nap,
    prioritas: doc.prioritas ?? "normal",
    kategoria: doc.kategoria,
    kapcsolat: {
      ...kapcsolat(doc, lepes),
      url: folyamatUrl(String(doc._id)),
      cimke: rovid(`${doc.cim} · ${index + 1}. ${lepes.nev}`, FELADAT_CIM_MAX),
    },
  });
  if (!r.id)
    return { ok: false, message: r.message ?? "Nem sikerült kiadni a lépés feladatát" };
  lepes.allapot = "aktiv";
  lepes.feladatId = r.id;
  lepes.kezdve = new Date();
  lepes.befejezve = undefined;
  if (megjegyzes) lepes.megjegyzes = megjegyzes;
  const felelos = String(lepes.felelosId);
  return {
    ok: true,
    ertesitesek:
      felelos === actorId
        ? []
        : [
            {
              userIds: [felelos],
              title: `Rád került a sor: ${lepes.nev}`,
              body: rovid(doc.cim, 120),
              url: `/feladatok/${r.id}`,
              tag: `folyamat-${doc._id}`,
            },
          ],
  };
}

/** After step `index`: start the next planned one, or finish the flow. Saves nothing. */
async function tovabb(
  doc: IFeladatFolyamat,
  index: number,
  actorId: string,
): Promise<{ ertesitesek: FolyamatErtesites[]; message?: string }> {
  const kov = folyamatKovetkezo(doc.lepesek, index);
  if (kov.tipus === "indit") {
    const r = await inditLepes(doc, doc.lepesek[kov.index]!, actorId);
    return r.ok
      ? { ertesitesek: r.ertesitesek }
      : { ertesitesek: [], message: r.message };
  }
  if (kov.tipus === "var") return { ertesitesek: [] };
  doc.allapot = "kesz";
  doc.lezarva = new Date();
  const kiado = String(doc.kiadoId);
  return {
    ertesitesek:
      kiado === actorId
        ? []
        : [
            {
              userIds: [kiado],
              title: `Kész a folyamat: ${rovid(doc.cim, 80)}`,
              body: `Mind a(z) ${doc.lepesek.length} lépés elkészült.`,
              url: folyamatUrl(String(doc._id)),
              tag: `folyamat-${doc._id}`,
            },
          ],
  };
}

function toNezet(doc: IFeladatFolyamat, ma: string, userId?: string): FolyamatNezet {
  const lepesek: FolyamatLepesNezet[] = doc.lepesek.map((l) => {
    const hatarido = napOf(l.hatarido ?? doc.hatarido);
    return {
      kulcs: String(l._id),
      nev: l.nev,
      allapot: l.allapot,
      felelosId: String(l.felelosId),
      felelosNev: l.felelosNev,
      hatarido,
      kesik: folyamatLepesFut(l.allapot) && Boolean(hatarido) && hatarido! < ma,
      aktualis: false,
      feladatId: l.feladatId,
      megjegyzes: l.megjegyzes,
    };
  });
  const elso = lepesek.find((l) => folyamatLepesFut(l.allapot));
  if (elso && doc.allapot === "folyamatban") elso.aktualis = true;
  const kesz = doc.lepesek.filter((l) => l.allapot === "kesz").length;
  const szerepek: NonNullable<FolyamatNezet["szerepek"]> = [];
  if (userId && String(doc.kiadoId) === userId) szerepek.push("indito");
  if (userId && doc.lepesek.some((l) => String(l.felelosId) === userId))
    szerepek.push("felelos");
  return {
    modul: FOLYAMAT_KAPCSOLAT.modul,
    tipus: FOLYAMAT_KAPCSOLAT.tipus,
    id: String(doc._id),
    tipusCimke: "Feladat-folyamat",
    cim: doc.cim,
    alcim: doc.kategoria,
    url: folyamatUrl(String(doc._id)),
    allapotKulcs: doc.allapot,
    allapotCimke:
      doc.allapot === "kesz"
        ? "Kész"
        : doc.allapot === "megszakitva"
          ? "Megszakítva"
          : `Folyamatban · ${kesz}/${doc.lepesek.length}`,
    allapotTon:
      doc.allapot === "kesz"
        ? "success"
        : doc.allapot === "megszakitva"
          ? "neutral"
          : "info",
    lezart: doc.allapot !== "folyamatban",
    aktualis: folyamatAktualis(lepesek),
    lepesek,
    inditoNev: doc.kiadoNev,
    kesik: lepesek.some((l) => l.kesik),
    ...(userId ? { szerepek } : {}),
    frissitve: doc.updatedAt?.toISOString() ?? new Date().toISOString(),
  };
}

async function findDoc(id: string): Promise<IFeladatFolyamat | null> {
  if (!Types.ObjectId.isValid(id)) return null;
  return FeladatFolyamat.findById(id).exec();
}

/** Planned tail starts after the last started step (steps run in order). */
function zaroltDb(doc: IFeladatFolyamat): number {
  let n = 0;
  doc.lepesek.forEach((l, i) => {
    if (l.allapot !== "tervezett") n = i + 1;
  });
  return n;
}

export const feladatFolyamatApi = {
  /**
   * Starts a flow: step 1's felelős gets the task now, the rest wait. With `feladatId` an
   * existing open task of the kiadó (not a group copy, not linked) becomes step 1 as it is.
   */
  async createFolyamat(
    viewer: FeladatViewer,
    input: FolyamatInput & { feladatId?: string },
  ): Promise<FolyamatEredmeny> {
    await connectDB();
    const kiado = (await aktivUserek([viewer.userId])).get(viewer.userId);
    if (!kiado) return hiba("A fiókod nem található");
    const cim = input.cim.trim();
    if (!cim || cim.length > FELADAT_CIM_MAX)
      return hiba("Add meg röviden a feladatot (legfeljebb 200 karakter)", "cim");
    const hatarido = napbol(input.hatarido);
    if (!hatarido) return hiba("Add meg a folyamat határidejét", "hatarido");
    if (input.lepesek.length > FOLYAMAT_LEPES_MAX)
      return hiba(`Legfeljebb ${FOLYAMAT_LEPES_MAX} lépés lehet`, "lepesek");

    let atvett: InstanceType<typeof Feladat> | null = null;
    if (input.feladatId) {
      atvett = Types.ObjectId.isValid(input.feladatId)
        ? await Feladat.findById(input.feladatId).exec()
        : null;
      if (!atvett || String(atvett.kiadoId) !== viewer.userId)
        return hiba("Csak a saját kiadott feladatodhoz adhatsz folyamatot");
      if (atvett.csoportId || atvett.kapcsolat)
        return hiba(
          "Csoportos vagy más tételhez kapcsolt feladathoz nem adható folyamat",
        );
      if (!["kiadva", "elfogadva"].includes(atvett.status.key))
        return hiba("Csak nyitott feladathoz adható folyamat");
    }
    const l = await lepesekBol(input.lepesek);
    if (!l.ok) return hiba(l.message, "lepesek");
    if (l.lepesek.length < 1) return hiba("Adj meg legalább egy lépést", "lepesek");

    const kat = await kategoriaFeloldas(input.kategoria);
    if (kategoriaHiba(kat)) return hiba(kat.hiba, "kategoria");
    const prioritas: FeladatPrioritas = input.prioritas ?? "normal";
    const doc = new FeladatFolyamat({
      cim,
      leiras: input.leiras?.trim().slice(0, FELADAT_SZOVEG_MAX) || undefined,
      kiadoId: new Types.ObjectId(viewer.userId),
      kiadoNev: kiado,
      hatarido,
      prioritas: prioritas === "normal" ? undefined : prioritas,
      ...kat,
      allapot: "folyamatban",
      lepesek: l.lepesek,
    });
    resztvevok(doc);

    if (atvett) {
      // The existing task is step 1, already running with its own felelős.
      const elso = doc.lepesek[0]!;
      const felelosId = atvett.assignee?.userId ? String(atvett.assignee.userId) : "";
      if (felelosId && String(elso.felelosId) !== felelosId)
        return hiba(
          "Az első lépés felelőse a meglévő feladat felelőse legyen",
          "lepesek",
        );
      elso.allapot = "aktiv";
      elso.feladatId = String(atvett._id);
      elso.kezdve = new Date();
      await doc.save();
      atvett.kapcsolat = {
        ...kapcsolat(doc, elso),
        url: folyamatUrl(String(doc._id)),
        cimke: rovid(`${doc.cim} · 1. ${elso.nev}`, FELADAT_CIM_MAX),
      };
      if (kat.kategoria && !atvett.kategoria) {
        atvett.kategoria = kat.kategoria;
        atvett.kategoriaKulcs = kat.kategoriaKulcs;
      }
      await atvett.save();
      return { ok: true, id: String(doc._id), ertesitesek: [] };
    }

    await doc.save();
    const r = await inditLepes(doc, doc.lepesek[0]!, viewer.userId);
    if (!r.ok) {
      await FeladatFolyamat.deleteOne({ _id: doc._id }).exec();
      return hiba(r.message);
    }
    await doc.save();
    return { ok: true, id: String(doc._id), ertesitesek: r.ertesitesek };
  },

  async getFolyamat(viewer: FeladatViewer, id: string): Promise<FolyamatReszlet | null> {
    await connectDB();
    const doc = await findDoc(id);
    if (!doc || !mayView(doc, viewer)) return null;
    const ma = budapestNap(new Date());
    const zarolt = zaroltDb(doc);
    const kiado = isKiado(doc, viewer);
    return {
      ...toNezet(doc, ma, viewer.userId),
      leiras: doc.leiras,
      kiadoId: String(doc.kiadoId),
      kiadoNev: doc.kiadoNev,
      hatarido: napOf(doc.hatarido)!,
      prioritas: doc.prioritas ?? "normal",
      kategoria: doc.kategoria,
      szerkesztheto: doc.lepesek.map((l, i) => ({
        id: String(l._id),
        nev: l.nev,
        felelosId: String(l.felelosId),
        hatarido: napOf(l.hatarido),
        allapot: l.allapot,
        zarolt: i < zarolt,
      })),
      muveletek: {
        szerkeszt: kiado && doc.allapot !== "megszakitva",
        megszakit: kiado && doc.allapot === "folyamatban",
      },
    };
  },

  /** The flow a step task belongs to (the task page's Folyamat panel). */
  async folyamatAllapotok(
    refs: Array<{ tipus: string; id: string }>,
  ): Promise<Map<string, FolyamatNezet>> {
    await connectDB();
    const ids = refs
      .filter((r) => r.tipus === FOLYAMAT_KAPCSOLAT.tipus && Types.ObjectId.isValid(r.id))
      .map((r) => r.id);
    const ki = new Map<string, FolyamatNezet>();
    if (ids.length === 0) return ki;
    const ma = budapestNap(new Date());
    const docs = await FeladatFolyamat.find({ _id: { $in: ids } }).exec();
    for (const d of docs) ki.set(`${FOLYAMAT_KAPCSOLAT.tipus}:${d._id}`, toNezet(d, ma));
    return ki;
  },

  /** "Követett folyamatok": flows the user started or has / had a step in. */
  async listKovetettFolyamatok(userId: string): Promise<FolyamatNezet[]> {
    await connectDB();
    if (!Types.ObjectId.isValid(userId)) return [];
    const oid = new Types.ObjectId(userId);
    const docs = await FeladatFolyamat.find({
      $or: [{ kiadoId: oid }, { resztvevoIds: oid }],
    })
      .sort({ updatedAt: -1 })
      .limit(500)
      .exec();
    const ma = budapestNap(new Date());
    return docs.map((d) => toNezet(d, ma, userId));
  },

  /**
   * The kiadó replaces the planned steps (those not started yet): add, remove, reorder,
   * reassign. Started steps stay as they are, in front. A finished flow that gets new steps
   * continues with the first of them.
   */
  async modositFolyamatLepesek(
    viewer: FeladatViewer,
    id: string,
    tervezett: FolyamatLepesInput[],
  ): Promise<FolyamatEredmeny> {
    await connectDB();
    const doc = await findDoc(id);
    if (!doc || !isKiado(doc, viewer))
      return hiba("Csak a folyamat indítója módosíthatja");
    if (doc.allapot === "megszakitva") return hiba("A folyamatot megszakították");
    const zarolt = zaroltDb(doc);
    const eleje = doc.lepesek.slice(0, zarolt);
    if (eleje.length + tervezett.length > FOLYAMAT_LEPES_MAX)
      return hiba(`Legfeljebb ${FOLYAMAT_LEPES_MAX} lépés lehet`, "lepesek");
    const zaroltIdk = new Set(eleje.map((l) => String(l._id)));
    if (tervezett.some((l) => l.id && zaroltIdk.has(l.id)))
      return hiba("Elindult lépést nem lehet áthelyezni", "lepesek");
    const l = await lepesekBol(tervezett, doc.lepesek.slice(zarolt));
    if (!l.ok) return hiba(l.message, "lepesek");
    if (eleje.length + l.lepesek.length === 0)
      return hiba("Adj meg legalább egy lépést", "lepesek");
    doc.set("lepesek", [
      ...eleje.map((x) => (x as unknown as { toObject(): object }).toObject()),
      ...l.lepesek,
    ]);
    resztvevok(doc);

    let ertesitesek: FolyamatErtesites[] = [];
    const fut = doc.lepesek.some(
      (x) => folyamatLepesFut(x.allapot) || x.allapot === "megszakitva",
    );
    if (!fut) {
      // Nothing running: the edit decides — start the next planned step, or finish.
      if (doc.allapot === "kesz") {
        doc.allapot = "folyamatban";
        doc.lezarva = undefined;
      }
      const t = await tovabb(doc, zarolt - 1, viewer.userId);
      if (t.message) return hiba(t.message);
      ertesitesek = t.ertesitesek;
    }
    await doc.save();
    return { ok: true, id: String(doc._id), ertesitesek };
  },

  /**
   * The kiadó gives the running / refused step to someone else (handover, the new felelős
   * accepts), or restarts a stopped (withdrawn) step — optionally with a new felelős.
   */
  async atosztFolyamatLepes(
    viewer: FeladatViewer,
    id: string,
    lepesId: string,
    ujFelelosId: string,
    indok?: string,
  ): Promise<FolyamatEredmeny> {
    await connectDB();
    const doc = await findDoc(id);
    if (!doc || !isKiado(doc, viewer))
      return hiba("Csak a folyamat indítója oszthatja át");
    if (doc.allapot !== "folyamatban") return hiba("A folyamat már nem fut");
    const lepes = doc.lepesek.find((l) => String(l._id) === lepesId);
    if (!lepes) return hiba("A lépés nem található");
    const nev = (await aktivUserek([ujFelelosId])).get(ujFelelosId);
    if (!nev) return hiba("Válaszd ki az új felelőst", "felelosId");

    if (lepes.allapot === "megszakitva") {
      lepes.felelosId = new Types.ObjectId(ujFelelosId);
      lepes.felelosNev = nev;
      resztvevok(doc);
      const r = await inditLepes(doc, lepes, viewer.userId, indok?.trim() || undefined);
      if (!r.ok) return hiba(r.message);
      await doc.save();
      return { ok: true, id: String(doc._id), ertesitesek: r.ertesitesek };
    }
    if (!folyamatLepesFut(lepes.allapot)) return hiba("Ez a lépés most nem fut");
    if (String(lepes.felelosId) === ujFelelosId) return hiba("Már nála van a lépés");
    const r = await feladatApi.atadKapcsoltFeladatot(kapcsolat(doc, lepes), {
      ujFelelosId,
      actorId: viewer.userId,
      indok: indok?.trim() || "Átosztva a folyamatban",
    });
    if (!r.ok) return hiba(r.message ?? "Nem sikerült átosztani");
    lepes.felelosId = new Types.ObjectId(ujFelelosId);
    lepes.felelosNev = nev;
    lepes.feladatId = r.id;
    lepes.allapot = "aktiv";
    resztvevok(doc);
    await doc.save();
    return {
      ok: true,
      id: String(doc._id),
      ertesitesek:
        ujFelelosId === viewer.userId
          ? []
          : [
              {
                userIds: [ujFelelosId],
                title: `Rád került a sor: ${lepes.nev}`,
                body: rovid(doc.cim, 120),
                url: `/feladatok/${r.id}`,
                tag: `folyamat-${doc._id}`,
              },
            ],
    };
  },

  /** The kiadó stops the whole flow; the running step's task is withdrawn. */
  async megszakitFolyamat(
    viewer: FeladatViewer,
    id: string,
    indok?: string,
  ): Promise<FolyamatEredmeny> {
    await connectDB();
    const doc = await findDoc(id);
    if (!doc || !isKiado(doc, viewer))
      return hiba("Csak a folyamat indítója szakíthatja meg");
    if (doc.allapot !== "folyamatban") return hiba("A folyamat már nem fut");
    doc.allapot = "megszakitva";
    doc.lezarva = new Date();
    doc.megjegyzes = indok?.trim() || undefined;
    await doc.save();
    const ertintett = new Set<string>();
    for (const l of doc.lepesek) {
      if (!folyamatLepesFut(l.allapot) || !l.feladatId) continue;
      await feladatApi.visszavonFeladatot(
        viewer,
        l.feladatId,
        indok?.trim() || "A folyamatot megszakították",
      );
      if (String(l.felelosId) !== viewer.userId) ertintett.add(String(l.felelosId));
    }
    // The withdrawal hook marked the running step `megszakitva`; reload to keep the doc fresh.
    return {
      ok: true,
      id: String(doc._id),
      ertesitesek: ertintett.size
        ? [
            {
              userIds: [...ertintett],
              title: `Megszakították a folyamatot: ${rovid(doc.cim, 80)}`,
              body: indok?.trim() || undefined,
              url: folyamatUrl(String(doc._id)),
              tag: `folyamat-${doc._id}`,
            },
          ]
        : [],
    };
  },

  /** Hook (composition root, modul `feladat`): a step task was closed / refused / … */
  async onKapcsoltFeladat(e: KapcsoltFeladatEsemeny): Promise<FolyamatErtesites[]> {
    if (e.kapcsolat.tipus !== FOLYAMAT_KAPCSOLAT.tipus) return [];
    await connectDB();
    const doc = await findDoc(e.kapcsolat.id);
    if (!doc || doc.allapot !== "folyamatban") return [];
    const index = doc.lepesek.findIndex((l) => String(l._id) === e.kapcsolat.szakasz);
    if (index < 0) return [];
    const lepes = doc.lepesek[index]!;
    if (!folyamatLepesFeladata(lepes, e.feladatId)) return [];
    const valtozas = folyamatLepesEsemeny(lepes, e);
    if (!valtozas) return [];
    let ertesitesek: FolyamatErtesites[] = [];
    if (valtozas === "kesz")
      ertesitesek = (await tovabb(doc, index, e.actorId)).ertesitesek;
    if (valtozas === "atadva" && e.ujFelelosId) {
      const nev = (await aktivUserek([e.ujFelelosId])).get(e.ujFelelosId);
      lepes.felelosId = new Types.ObjectId(e.ujFelelosId);
      if (nev) lepes.felelosNev = nev;
      resztvevok(doc);
    }
    await doc.save();
    return ertesitesek;
  },

  async listFolyamatSablonok(viewer: FeladatViewer): Promise<FolyamatSablonSor[]> {
    await connectDB();
    if (!Types.ObjectId.isValid(viewer.userId)) return [];
    const rows = await FolyamatSablon.find({
      $or: [{ userId: new Types.ObjectId(viewer.userId) }, { megosztott: true }],
    })
      .sort({ nev: 1 })
      .lean()
      .exec();
    return rows.map((s) => ({
      id: String(s._id),
      nev: s.nev,
      megosztott: Boolean(s.megosztott),
      sajat: String(s.userId) === viewer.userId,
      lepesek: s.lepesek.map((l) => ({
        nev: l.nev,
        felelosId: l.felelosId ? String(l.felelosId) : undefined,
        napok: l.napok,
      })),
    }));
  },

  /** Saves (or overwrites, same name) the user's flow template. */
  async saveFolyamatSablon(
    viewer: FeladatViewer,
    input: {
      nev: string;
      megosztott?: boolean;
      lepesek: Array<{ nev: string; felelosId?: string; napok?: number }>;
    },
  ): Promise<{ ok: boolean; id?: string; message?: string }> {
    await connectDB();
    const nev = input.nev.trim().slice(0, 100);
    if (!nev) return { ok: false, message: "Adj nevet a sablonnak" };
    const lepesek = input.lepesek
      .map((l) => ({
        nev: l.nev.trim().slice(0, FELADAT_LEPES_NEV_MAX),
        felelosId:
          l.felelosId && Types.ObjectId.isValid(l.felelosId)
            ? new Types.ObjectId(l.felelosId)
            : undefined,
        napok:
          typeof l.napok === "number" && Number.isFinite(l.napok) && l.napok >= 0
            ? Math.min(Math.round(l.napok), 365)
            : undefined,
      }))
      .filter((l) => l.nev)
      .slice(0, FOLYAMAT_LEPES_MAX);
    if (lepesek.length === 0)
      return { ok: false, message: "A sablonban legyen legalább egy lépés" };
    const uid = new Types.ObjectId(viewer.userId);
    const db = await FolyamatSablon.countDocuments({
      userId: uid,
      nev: { $ne: nev },
    }).exec();
    if (db >= FOLYAMAT_SABLON_MAX)
      return { ok: false, message: `Legfeljebb ${FOLYAMAT_SABLON_MAX} sablonod lehet` };
    const s = await FolyamatSablon.findOneAndUpdate(
      { userId: uid, nev },
      { $set: { lepesek, megosztott: Boolean(input.megosztott) } },
      { upsert: true, new: true },
    ).exec();
    return { ok: true, id: String(s._id) };
  },

  async deleteFolyamatSablon(
    viewer: FeladatViewer,
    id: string,
  ): Promise<{ ok: boolean; message?: string }> {
    await connectDB();
    if (!Types.ObjectId.isValid(id))
      return { ok: false, message: "A sablon nem található" };
    const r = await FolyamatSablon.deleteOne({
      _id: id,
      userId: new Types.ObjectId(viewer.userId),
    }).exec();
    return r.deletedCount
      ? { ok: true }
      : { ok: false, message: "Csak a saját sablonodat törölheted" };
  },

  /**
   * Whether this task may get a flow from the task page (kiadó, plain open task) — with its
   * felelős, who becomes step 1. `null` when it may not.
   */
  async folyamatHozzaadhato(
    viewer: FeladatViewer,
    feladatId: string,
  ): Promise<{ felelosId: string } | null> {
    await connectDB();
    if (!Types.ObjectId.isValid(feladatId)) return null;
    const f = await Feladat.findById(feladatId)
      .select("kiadoId csoportId kapcsolat status assignee")
      .lean()
      .exec();
    const ok =
      f &&
      String(f.kiadoId) === viewer.userId &&
      !f.csoportId &&
      !f.kapcsolat &&
      ["kiadva", "elfogadva"].includes(f.status.key) &&
      f.assignee?.userId;
    return ok ? { felelosId: String(f.assignee!.userId) } : null;
  },
};
