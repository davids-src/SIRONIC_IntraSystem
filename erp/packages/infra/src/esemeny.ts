import { connectDB } from "@erp/db-core";
import { InfraEsemeny } from "./models";
import type { EsemenyCelTipus, EsemenyMuvelet } from "./constants";
import { iso, type Szereplo } from "./shared";

export type EsemenySor = {
  id: string;
  muvelet: EsemenyMuvelet;
  celTipus: EsemenyCelTipus;
  celId?: string;
  celNev?: string;
  ok: boolean;
  uzenet?: string;
  reszletek?: Record<string, unknown>;
  szereplo: string;
  letrehozva: string;
};

/** Appends an audit event. Never throws: a logging failure must not fail the operation. */
export async function naplo(e: {
  muvelet: EsemenyMuvelet;
  celTipus: EsemenyCelTipus;
  celId?: string;
  celNev?: string;
  ok: boolean;
  uzenet?: string;
  reszletek?: Record<string, unknown>;
  szereplo: Szereplo;
}): Promise<void> {
  try {
    await connectDB();
    await InfraEsemeny.create(e);
  } catch {
    /* best effort */
  }
}

export const esemenyApi = {
  async listEsemenyek(
    szuro: { celTipus?: EsemenyCelTipus; celId?: string; limit?: number } = {},
  ): Promise<EsemenySor[]> {
    await connectDB();
    const filter: Record<string, unknown> = {};
    if (szuro.celTipus) filter.celTipus = szuro.celTipus;
    if (szuro.celId) filter.celId = szuro.celId;
    const rows = await InfraEsemeny.find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(szuro.limit ?? 50, 200))
      .lean()
      .exec();
    return rows.map((r) => ({
      id: String(r._id),
      muvelet: r.muvelet,
      celTipus: r.celTipus,
      celId: r.celId,
      celNev: r.celNev,
      ok: r.ok,
      uzenet: r.uzenet,
      reszletek: r.reszletek,
      szereplo: r.szereplo,
      letrehozva: iso(r.createdAt) ?? "",
    }));
  },
};
