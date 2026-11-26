/** Stack templates: reusable compose + default env for "Új stack". No permission checks here. */
import { connectDB } from "@erp/db-core";
import { InfraSablon, type IInfraSablon } from "./models";
import { naplo } from "./esemeny";
import {
  InfraHiba,
  duplikalt,
  elsoHiba,
  hiba,
  hibaSzoveg,
  iso,
  ok,
  validId,
  type InfraResult,
  type Szereplo,
} from "./shared";
import { composeElemez } from "./szabalyok";
import { sablonSchema, type SablonInput } from "./validation";
import type { SablonDetail, SablonSor } from "./tipusok";

const sor = (d: IInfraSablon): SablonSor => {
  const e = composeElemez(d.compose);
  return {
    id: String(d._id),
    nev: d.nev,
    leiras: d.leiras ?? undefined,
    tipus: d.tipus,
    szolgaltatasok: e.ok ? e.szolgaltatasok.length : 0,
    frissitve: iso(d.updatedAt),
  };
};

const detail = (d: IInfraSablon): SablonDetail => ({
  id: String(d._id),
  nev: d.nev,
  leiras: d.leiras ?? undefined,
  tipus: d.tipus,
  compose: d.compose,
  env: (d.env ?? []).map((e) => ({ name: e.name, value: e.value })),
});

function ellenoriz(input: SablonInput) {
  const p = sablonSchema.safeParse(input);
  if (!p.success) throw new InfraHiba(elsoHiba(p.error.issues));
  const e = composeElemez(p.data.compose);
  if (!e.ok) throw new InfraHiba(e.hiba);
  return p.data;
}

export const sablonApi = {
  async listSablonok(): Promise<SablonSor[]> {
    await connectDB();
    const rows = await InfraSablon.find({}).sort({ nev: 1 }).exec();
    return rows.map(sor);
  },

  async getSablon(id: string): Promise<SablonDetail | null> {
    if (!validId(id)) return null;
    await connectDB();
    const d = await InfraSablon.findById(id).exec();
    return d ? detail(d) : null;
  },

  async sablonAzonosit(ref: string): Promise<string> {
    await connectDB();
    if (validId(ref) && (await InfraSablon.exists({ _id: ref }))) return ref;
    const d = await InfraSablon.findOne({ nev: ref.trim() }).select("_id").exec();
    if (!d) throw new InfraHiba(`Nincs ilyen sablon: ${ref}`);
    return String(d._id);
  },

  async ujSablon(input: SablonInput, szereplo: Szereplo): Promise<InfraResult> {
    try {
      const p = ellenoriz(input);
      await connectDB();
      const d = await InfraSablon.create({ ...p, env: p.env ?? [] });
      await naplo({
        muvelet: "sablon.letrehoz",
        celTipus: "sablon",
        celId: String(d._id),
        celNev: d.nev,
        ok: true,
        szereplo,
      });
      return ok(String(d._id));
    } catch (err) {
      if (duplikalt(err)) return hiba("Már van ilyen nevű sablon.");
      return hiba(hibaSzoveg(err));
    }
  },

  async modositSablon(
    id: string,
    input: SablonInput,
    szereplo: Szereplo,
  ): Promise<InfraResult> {
    try {
      if (!validId(id)) throw new InfraHiba("A sablon nem található.");
      const p = ellenoriz(input);
      await connectDB();
      const d = await InfraSablon.findByIdAndUpdate(
        id,
        { ...p, env: p.env ?? [] },
        { new: true },
      ).exec();
      if (!d) throw new InfraHiba("A sablon nem található.");
      await naplo({
        muvelet: "sablon.modosit",
        celTipus: "sablon",
        celId: id,
        celNev: d.nev,
        ok: true,
        szereplo,
      });
      return ok(id);
    } catch (err) {
      if (duplikalt(err)) return hiba("Már van ilyen nevű sablon.");
      return hiba(hibaSzoveg(err));
    }
  },

  async torolSablon(id: string, szereplo: Szereplo): Promise<InfraResult> {
    try {
      if (!validId(id)) throw new InfraHiba("A sablon nem található.");
      await connectDB();
      const d = await InfraSablon.findByIdAndDelete(id).exec();
      if (!d) throw new InfraHiba("A sablon nem található.");
      await naplo({
        muvelet: "sablon.torles",
        celTipus: "sablon",
        celId: id,
        celNev: d.nev,
        ok: true,
        szereplo,
      });
      return ok(id);
    } catch (err) {
      return hiba(hibaSzoveg(err));
    }
  },
};
