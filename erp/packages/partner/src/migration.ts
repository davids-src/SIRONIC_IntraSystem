import { Types } from "mongoose";
import { connectDB, nextSequence } from "@erp/db-core";
import { Partner } from "./models/Partner";
import { Erdeklodo } from "./models/Erdeklodo";
import { partnerNevKulcs } from "./text";
import type { MigraltErdeklodo, MigraltPartner } from "./migration-map";

export * from "./migration-map";

export type MigracioEredmeny = { created: number; updated: number };

/**
 * Idempotent upsert of mapped partners, keyed by `(regiForras, regiId)`. Re-running updates the
 * migrated fields but never reassigns `azonosito` and never un-archives a row that was archived
 * after the first run. Connects through `@erp/db-core` (caller sets `MONGODB_URI`).
 */
export async function upsertPartnerek(rows: MigraltPartner[]): Promise<MigracioEredmeny> {
  await connectDB();
  const out = { created: 0, updated: 0 };
  for (const row of rows) {
    const { archivalt, archivalasOka, archivalasIdopont, ...fields } = row;
    const doc = { ...fields, nevKulcs: partnerNevKulcs(row.nev) };
    const existing = await Partner.findOne({
      regiForras: row.regiForras,
      regiId: row.regiId,
    })
      .select("_id")
      .lean()
      .exec();
    if (existing) {
      await Partner.updateOne({ _id: existing._id }, { $set: doc }).exec();
      out.updated++;
    } else {
      const azonosito = `P-${await nextSequence("partner:partner", 6)}`;
      await Partner.create({
        ...doc,
        azonosito,
        archivalt,
        archivalasOka,
        archivalasIdopont,
      });
      out.created++;
    }
  }
  return out;
}

/** Same for leads, keyed by `regiId`. `statusHistory` of a migrated lead starts at its current status. */
export async function upsertErdeklodok(
  rows: MigraltErdeklodo[],
  fallbackUserId: string,
): Promise<MigracioEredmeny> {
  await connectDB();
  const out = { created: 0, updated: 0 };
  for (const row of rows) {
    const {
      allapot,
      felelosId,
      partnerId,
      tevekenysegek,
      letrehozva,
      archivalt,
      archivalasOka,
      archivalasIdopont,
      ...rest
    } = row;
    const fields = {
      ...rest,
      partnerId: partnerId ? new Types.ObjectId(partnerId) : undefined,
      tevekenysegek: tevekenysegek.map((t) => ({
        ...t,
        felhasznaloId: new Types.ObjectId(t.felhasznaloId),
      })),
    };
    const existing = await Erdeklodo.findOne({ regiId: row.regiId })
      .select("_id")
      .lean()
      .exec();
    if (existing) {
      await Erdeklodo.updateOne({ _id: existing._id }, { $set: fields }).exec();
      out.updated++;
      continue;
    }
    const azonosito = `E-${await nextSequence("partner:erdeklodo", 6)}`;
    const entry = {
      key: allapot,
      changedAt: letrehozva ?? new Date(),
      changedBy: new Types.ObjectId(fallbackUserId),
      note: "Migrálva a régi rendszerből",
    };
    await Erdeklodo.create({
      ...fields,
      azonosito,
      status: entry,
      statusHistory: [entry],
      assignee: felelosId
        ? {
            userId: new Types.ObjectId(felelosId),
            assignedAt: entry.changedAt,
            assignedBy: entry.changedBy,
          }
        : null,
      archivalt,
      archivalasOka,
      archivalasIdopont,
    });
    out.created++;
  }
  return out;
}
