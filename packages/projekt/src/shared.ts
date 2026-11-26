/** Shared types and helpers of the facade files. No permission checks anywhere in the facade. */
import { Types } from "mongoose";
import type { Ertesites } from "@erp/core";

export type Szereplo = { id: string; nev: string };
/** Weekly-plan actor: `delegalhat` = holds `projekt:hetiterv:delegal` (computed by the app). */
export type HetiSzereplo = Szereplo & { delegalhat: boolean };

export type ProjektResult =
  { ok: true; id?: string; ertesitesek: Ertesites[] } | { ok: false; message: string };

export const ok = (id?: string, ertesitesek: Ertesites[] = []): ProjektResult => ({
  ok: true,
  id,
  ertesitesek,
});
export const hiba = (message: string): ProjektResult => ({ ok: false, message });

export const validId = (id: string) => Types.ObjectId.isValid(id);
export const oid = (id: string) => new Types.ObjectId(id);

/** `YYYY-MM-DD` → UTC-midnight Date. */
export const nap = (s?: string): Date | undefined =>
  s ? new Date(`${s}T00:00:00.000Z`) : undefined;
export const napStr = (d?: Date | null): string | undefined =>
  d ? d.toISOString().slice(0, 10) : undefined;
export const iso = (d?: Date | null): string | undefined =>
  d ? d.toISOString() : undefined;

export const userNev = (u: { name?: string | null; email?: string } | undefined) =>
  u?.name || u?.email || "Ismeretlen";

export const elsoHiba = (issues: Array<{ message: string }>) =>
  issues[0]?.message ?? "Érvénytelen adatok.";

export type UpdateFn = (
  filter: Record<string, unknown>,
  update: Record<string, unknown>,
) => Promise<number>;

/** Archive with a mandatory reason — one conditional atomic update. */
export async function archivalas(
  id: string,
  okText: string,
  szereplo: Szereplo,
  update: UpdateFn,
  nemTalalhato: string,
): Promise<ProjektResult> {
  if (!validId(id)) return hiba(nemTalalhato);
  if (!okText.trim()) return hiba("Az archiválás okát meg kell adni.");
  const matched = await update(
    { _id: oid(id), archivalt: { $ne: true } },
    {
      $set: {
        archivalt: true,
        archivalasOka: okText.trim(),
        archivalasIdopont: new Date(),
        archivaltaId: szereplo.id,
      },
    },
  );
  return matched === 0 ? hiba(`${nemTalalhato} vagy már archivált.`) : ok(id);
}

export async function visszaallitas(
  id: string,
  update: UpdateFn,
  nemTalalhato: string,
): Promise<ProjektResult> {
  if (!validId(id)) return hiba(nemTalalhato);
  const matched = await update(
    { _id: oid(id), archivalt: true },
    {
      $set: { archivalt: false },
      $unset: { archivalasOka: "", archivalasIdopont: "", archivaltaId: "" },
    },
  );
  return matched === 0 ? hiba(`${nemTalalhato} vagy nem archivált.`) : ok(id);
}

/** `{ archivalt: { $ne: true } }` ANDed into a filter unless archived rows are requested. */
export function archivSzuro(filter: Record<string, unknown>, archivaltakkal?: boolean) {
  if (archivaltakkal) return filter;
  const and = Array.isArray(filter.$and) ? (filter.$and as unknown[]) : [];
  return { ...filter, $and: [...and, { archivalt: { $ne: true } }] };
}

export type ListaOpciok = { archivaltakkal?: boolean };
