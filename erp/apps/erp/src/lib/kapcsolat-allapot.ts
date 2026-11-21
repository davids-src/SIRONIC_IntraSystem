/**
 * Flow tracking for linked tasks (PROJECT_PLAN #65) — the composition root that asks the
 * owning module where an entity's flow stands, so Feladatok can show it (the task page's
 * "Folyamat" panel, the status line of linked rows, the "Követett folyamatok" tab). The Feladat
 * package never imports a domain module; each module answers for its own entities.
 *
 * Wired: Vállalkozás — szerződés and ajánlatkérés flows; Feladat — custom Feladat-folyamat
 * (#67). Felelős profile pictures are filled in here, once for every module.
 */
import { Types } from "mongoose";
import { connectDB, User } from "@erp/db-core";
import type { FolyamatNezet } from "@erp/core/folyamat";
import { feladatFolyamatApi } from "@erp/feladat";

/** Module-neutral flow state — the shared `FolyamatNezet` of the folyamat-motor (#67). */
export type KapcsolatAllapot = FolyamatNezet;

type Ref = { modul: string; tipus: string; id: string };

type Feloldo = (
  refs: Array<{ tipus: string; id: string }>,
) => Promise<Map<string, KapcsolatAllapot>>;

/** Per module: batch lookup, keyed `tipus:id`. */
const MODULOK: Record<string, Feloldo> = {
  feladat: (refs) => feladatFolyamatApi.folyamatAllapotok(refs),
};

/** User id → profile picture URL (only users that have one). */
export async function userKepek(
  ids: Array<string | undefined>,
): Promise<Map<string, string>> {
  const valid = [...new Set(ids.filter((id): id is string => Boolean(id)))].filter((id) =>
    Types.ObjectId.isValid(id),
  );
  if (valid.length === 0) return new Map();
  await connectDB();
  const rows = await User.find({ _id: { $in: valid }, image: { $nin: [null, ""] } })
    .select("image")
    .lean()
    .exec();
  return new Map(rows.map((u) => [String(u._id), u.image!]));
}

/** Adds each step's felelős picture (in place). */
async function kepekkel(allapotok: KapcsolatAllapot[]): Promise<void> {
  const kepek = await userKepek(
    allapotok.flatMap((a) => a.lepesek.map((l) => l.felelosId)),
  );
  if (kepek.size === 0) return;
  for (const a of allapotok)
    for (const l of a.lepesek)
      if (l.felelosId && kepek.has(l.felelosId)) l.felelosKep = kepek.get(l.felelosId);
}

export const kapcsolatKulcs = (k: Ref) => `${k.modul}:${k.tipus}:${k.id}`;

/** Many flows at once — one query per module and entity type. Keyed `modul:tipus:id`. */
export async function kapcsolatAllapotok(
  refs: Ref[],
): Promise<Map<string, KapcsolatAllapot>> {
  const ki = new Map<string, KapcsolatAllapot>();
  const modulonkent = new Map<string, Ref[]>();
  for (const r of refs) {
    if (!MODULOK[r.modul]) continue;
    modulonkent.set(r.modul, [...(modulonkent.get(r.modul) ?? []), r]);
  }
  await Promise.all(
    [...modulonkent.entries()].map(async ([modul, lista]) => {
      try {
        const m = await MODULOK[modul]!(lista.map((r) => ({ tipus: r.tipus, id: r.id })));
        for (const [k, v] of m) ki.set(`${modul}:${k}`, v);
      } catch (e) {
        // A module failing to answer must not break the task pages — the link still works.
        console.error("[kapcsolat-allapot]", modul, e);
      }
    }),
  );
  await kepekkel([...ki.values()]).catch((e) =>
    console.error("[kapcsolat-allapot] kép", e),
  );
  return ki;
}

export async function kapcsolatAllapot(ref: Ref): Promise<KapcsolatAllapot | undefined> {
  return (await kapcsolatAllapotok([ref])).get(kapcsolatKulcs(ref));
}

/** "Követett folyamatok": every flow the user requested, started or works a phase of. */
export async function kovetettFolyamatok(userId: string): Promise<KapcsolatAllapot[]> {
  const f = await feladatFolyamatApi.listKovetettFolyamatok(userId);
  return [...f].sort((a, b) => b.frissitve.localeCompare(a.frissitve));
}

/** "Szerződés RSZ-012-1-2026 — V-Híd Zrt. · Véleményezés alatt · Kovács Diána" */
export function folyamatSzoveg(a: KapcsolatAllapot): string {
  return [
    `${a.tipusCimke} ${a.cim}`,
    a.allapotCimke,
    a.aktualis && a.aktualis.nev !== a.allapotCimke ? a.aktualis.nev : undefined,
    a.aktualis?.felelosNev,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Fills the profile pictures of list rows' participants (Feladatok progress cell, #67). */
export async function resztvevoKepekkel<
  T extends { resztvevok?: Array<{ id?: string; kep?: string }> },
>(sorok: T[]): Promise<T[]> {
  const kepek = await userKepek(
    sorok.flatMap((s) => (s.resztvevok ?? []).filter((r) => !r.kep).map((r) => r.id)),
  ).catch(() => new Map<string, string>());
  if (kepek.size === 0) return sorok;
  return sorok.map((s) =>
    s.resztvevok?.some((r) => r.id && !r.kep && kepek.has(r.id))
      ? {
          ...s,
          resztvevok: s.resztvevok.map((r) =>
            r.id && !r.kep && kepek.has(r.id) ? { ...r, kep: kepek.get(r.id) } : r,
          ),
        }
      : s,
  );
}
