/**
 * The admin-managed category list: the only categories a task can carry. Seeded with the module
 * names the first time it is read; the admins add, rename and retire entries in Adminisztráció.
 */
import { connectDB } from "@erp/db-core";
import { Feladat } from "./models/Feladat";
import { FeladatKategoria } from "./models/FeladatKategoria";
import {
  ALAP_KATEGORIAK,
  FELADAT_KATEGORIA_MAX,
  kategoriaKulcs,
  tisztaKategoria,
} from "./kategoria";

/** Seeds the defaults when the list has never been created (a retired list stays as it is). */
export async function alapKategoriakFelvetele(): Promise<void> {
  await connectDB();
  if ((await FeladatKategoria.estimatedDocumentCount().exec()) > 0) return;
  await FeladatKategoria.insertMany(
    ALAP_KATEGORIAK.map((nev, i) => ({
      nev,
      kulcs: kategoriaKulcs(nev),
      sorrend: i,
      aktiv: true,
    })),
    { ordered: false },
  ).catch((e: { code?: number }) => {
    if (e?.code !== 11000) throw e; // a parallel first read already seeded them
  });
}

export type KategoriaMezok = { kategoria?: string; kategoriaKulcs?: string };

/**
 * The category as stored: it has to be an active entry of the list (matched ignoring case and
 * accents, stored with the list's spelling). `''` / undefined = none. `rendszer` (tasks the
 * modules create themselves) also accepts a retired entry, so a module task never fails.
 */
export async function kategoriaFeloldas(
  s: string | undefined,
  rendszer = false,
): Promise<KategoriaMezok | { hiba: string }> {
  const tiszta = tisztaKategoria(s);
  if (!tiszta) return {};
  await alapKategoriakFelvetele();
  const kulcs = kategoriaKulcs(tiszta);
  const sor = await FeladatKategoria.findOne({
    kulcs,
    ...(rendszer ? {} : { aktiv: true }),
  })
    .lean()
    .exec();
  if (!sor) return rendszer ? {} : { hiba: "Válassz kategóriát a listából" };
  return { kategoria: sor.nev, kategoriaKulcs: sor.kulcs };
}

export const kategoriaHiba = (
  r: KategoriaMezok | { hiba: string },
): r is { hiba: string } => "hiba" in r;

export type KategoriaAdminSor = {
  id: string;
  nev: string;
  aktiv: boolean;
  /** Tasks carrying it. */
  db: number;
};

export type KategoriaAdminEredmeny = { ok: boolean; message?: string };

export const kategoriaAdminApi = {
  /** The active names in list order — the category pickers. */
  async listAktiv(): Promise<string[]> {
    await alapKategoriakFelvetele();
    const rows = await FeladatKategoria.find({ aktiv: true })
      .sort({ sorrend: 1, nev: 1 })
      .lean()
      .exec();
    return rows.map((r) => r.nev);
  },

  /** Every entry with its task count — the admin page. */
  async listAdmin(): Promise<KategoriaAdminSor[]> {
    await alapKategoriakFelvetele();
    const [rows, db] = await Promise.all([
      FeladatKategoria.find({}).sort({ sorrend: 1, nev: 1 }).lean().exec(),
      Feladat.aggregate<{ _id: string; db: number }>([
        { $match: { kategoriaKulcs: { $exists: true, $ne: null } } },
        { $group: { _id: "$kategoriaKulcs", db: { $sum: 1 } } },
      ]).exec(),
    ]);
    const darab = new Map(db.map((d) => [d._id, d.db]));
    return rows.map((r) => ({
      id: String(r._id),
      nev: r.nev,
      aktiv: r.aktiv,
      db: darab.get(r.kulcs) ?? 0,
    }));
  },

  async hozzaad(nevInput: string): Promise<KategoriaAdminEredmeny> {
    const nev = tisztaKategoria(nevInput);
    if (!nev) return { ok: false, message: "Adj meg egy nevet" };
    await alapKategoriakFelvetele();
    const kulcs = kategoriaKulcs(nev);
    if (await FeladatKategoria.exists({ kulcs }).exec())
      return { ok: false, message: "Ilyen kategória már van" };
    const utolso = await FeladatKategoria.findOne().sort({ sorrend: -1 }).lean().exec();
    await FeladatKategoria.create({
      nev,
      kulcs,
      sorrend: (utolso?.sorrend ?? -1) + 1,
      aktiv: true,
    });
    return { ok: true };
  },

  /** Renames the entry and the tasks that carry it. */
  async atnevez(id: string, nevInput: string): Promise<KategoriaAdminEredmeny> {
    const nev = tisztaKategoria(nevInput);
    if (!nev) return { ok: false, message: "Adj meg egy nevet" };
    if (nev.length > FELADAT_KATEGORIA_MAX)
      return { ok: false, message: "Túl hosszú név" };
    await connectDB();
    const sor = await FeladatKategoria.findById(id).exec();
    if (!sor) return { ok: false, message: "A kategória nem található" };
    const kulcs = kategoriaKulcs(nev);
    if (kulcs !== sor.kulcs && (await FeladatKategoria.exists({ kulcs }).exec()))
      return { ok: false, message: "Ilyen kategória már van" };
    const regiKulcs = sor.kulcs;
    sor.nev = nev;
    sor.kulcs = kulcs;
    await sor.save();
    await Feladat.updateMany(
      { kategoriaKulcs: regiKulcs },
      { $set: { kategoria: nev, kategoriaKulcs: kulcs } },
    ).exec();
    return { ok: true };
  },

  /** Retired entries stay on the tasks that have them but cannot be picked any more. */
  async beallitAktiv(id: string, aktiv: boolean): Promise<KategoriaAdminEredmeny> {
    await connectDB();
    const r = await FeladatKategoria.updateOne({ _id: id }, { $set: { aktiv } }).exec();
    return r.matchedCount
      ? { ok: true }
      : { ok: false, message: "A kategória nem található" };
  },

  /** Only an entry no task uses can be deleted; otherwise retire it. */
  async torol(id: string): Promise<KategoriaAdminEredmeny> {
    await connectDB();
    const sor = await FeladatKategoria.findById(id).lean().exec();
    if (!sor) return { ok: false, message: "A kategória nem található" };
    if (await Feladat.exists({ kategoriaKulcs: sor.kulcs }).exec())
      return { ok: false, message: "Feladatok használják — inkább inaktiváld" };
    await FeladatKategoria.deleteOne({ _id: id }).exec();
    return { ok: true };
  },
};
