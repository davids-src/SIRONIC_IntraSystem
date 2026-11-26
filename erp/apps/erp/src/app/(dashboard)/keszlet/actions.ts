"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@erp/auth";
import { arlistaApi } from "@erp/arlista";
import { partnerApi } from "@erp/partner";
import { keszletApi, KESZLET_PERMISSIONS as P, type KeszletResult } from "@erp/keszlet";
import {
  bevetelSchema,
  foglalasSchema,
  leltarSorSchema,
  minimumSchema,
  raktarhelySchema,
  rmaAtmenetSchema,
  rmaSchema,
} from "@erp/keszlet/validation";
import { RMA_ALLAPOTOK, type RmaAllapot } from "@erp/keszlet/client";
import { kuldErtesitesek } from "@/lib/feladat-kapcsolat";

export type MuveletState = { success: boolean; message?: string; id?: string };

const elso = (issues: Array<{ message: string }>) =>
  issues[0]?.message ?? "Érvénytelen adatok.";

async function lezar(
  r: KeszletResult,
  message: string,
  paths: string[],
): Promise<MuveletState> {
  if (!r.ok) return { success: false, message: r.message };
  await kuldErtesitesek(r.ertesitesek);
  for (const p of paths) revalidatePath(p);
  return { success: true, message, id: r.id };
}

// ── Lookups for the wizards (arlista / partner are read here, in the composition root) ──────

export type TermekOpcio = { id: string; kod: string; nev: string; egyseg: string };

/** Product search for the receipt wizard / RMA form. Never exposes purchase prices. */
export async function termekKeresAction(q: string): Promise<TermekOpcio[]> {
  const user = await requirePermission(P.keszletRead);
  const { data } = await arlistaApi.listTermekek(
    { userId: user.id, permissions: [] },
    { search: q.trim(), pageSize: 12, page: 1, filters: { tipus: "termek" } },
  );
  return data
    .filter((t) => t.tipus === "termek")
    .map((t) => ({ id: t._id, kod: t.kod, nev: t.nev, egyseg: t.egyseg }));
}

export async function partnerOpciokAction(): Promise<Array<{ id: string; nev: string }>> {
  await requirePermission(P.rmaWrite);
  return partnerApi.listPartnerOptions();
}

export async function getFelhasznalokAction() {
  await requirePermission(P.rmaWrite);
  return keszletApi.listFelhasznalok();
}

// ── Bevételezés ───────────────────────────────────────────────────────────────

export async function bevetelAction(
  kulcs: string,
  input: unknown,
): Promise<MuveletState> {
  const user = await requirePermission(P.bevetelWrite);
  const p = bevetelSchema.safeParse(input);
  if (!p.success || !kulcs)
    return { success: false, message: elso(p.error?.issues ?? []) };
  const r = await keszletApi.bevetelez(
    p.data.sorok.map((s) => ({
      ...s,
      raktarhelyKod: s.raktarhelyKod,
      jegyzet: s.jegyzet ?? p.data.megjegyzes,
    })),
    { referenceType: "kezi", referenceId: kulcs },
    user.id,
  );
  return lezar(r, "A bevételezés rögzítve.", ["/keszlet", "/keszlet/lista"]);
}

// ── Foglalás ──────────────────────────────────────────────────────────────────

async function foglalasKozos(
  tetelId: string,
  input: unknown,
  mod: "foglal" | "felold",
): Promise<MuveletState> {
  const user = await requirePermission(P.foglalasWrite);
  const p = foglalasSchema.safeParse(input);
  if (!p.success) return { success: false, message: elso(p.error.issues) };
  const t = await keszletApi.getKeszlet({ userId: user.id, permissions: [] }, tetelId);
  if (!t) return { success: false, message: "A készlettétel nem található." };
  const sorok = [
    {
      arlistaTermekId: t.arlistaTermekId,
      raktarhelyKod: t.raktarhelyKod,
      mennyiseg: p.data.mennyiseg,
      jegyzet: p.data.jegyzet,
    },
  ];
  const ref = { referenceType: "kezi" as const, referenceId: `${mod}-${p.data.kulcs}` };
  const r =
    mod === "foglal"
      ? await keszletApi.foglal(sorok, ref, user.id)
      : await keszletApi.foglalFeloldas(sorok, ref, user.id);
  return lezar(r, mod === "foglal" ? "A foglalás rögzítve." : "A foglalás feloldva.", [
    "/keszlet",
    `/keszlet/lista/${tetelId}`,
    "/keszlet/lista",
  ]);
}

export async function foglalAction(tetelId: string, input: unknown) {
  return foglalasKozos(tetelId, input, "foglal");
}
export async function foglalasFeloldasAction(tetelId: string, input: unknown) {
  return foglalasKozos(tetelId, input, "felold");
}

export async function setMinimumAction(
  id: string,
  input: { minimum: string },
): Promise<MuveletState> {
  await requirePermission(P.keszletWrite);
  const p = minimumSchema.safeParse(input);
  if (!p.success) return { success: false, message: elso(p.error.issues) };
  const r = await keszletApi.setMinimum(id, p.data.minimum);
  return lezar(r, "A minimum készletszint mentve.", [`/keszlet/lista/${id}`, "/keszlet"]);
}

// ── Raktárhelyek ──────────────────────────────────────────────────────────────

export async function createRaktarhelyAction(input: unknown): Promise<MuveletState> {
  await requirePermission(P.keszletWrite);
  const p = raktarhelySchema.safeParse(input);
  if (!p.success) return { success: false, message: elso(p.error.issues) };
  return lezar(await keszletApi.createRaktarhely(p.data), "Raktárhely felvéve.", [
    "/keszlet/raktarhelyek",
  ]);
}

export async function updateRaktarhelyAction(
  id: string,
  input: unknown,
): Promise<MuveletState> {
  await requirePermission(P.keszletWrite);
  const p = raktarhelySchema.omit({ kod: true }).safeParse(input);
  if (!p.success) return { success: false, message: elso(p.error.issues) };
  return lezar(await keszletApi.updateRaktarhely(id, p.data), "Raktárhely mentve.", [
    "/keszlet/raktarhelyek",
  ]);
}

export async function deleteRaktarhelyAction(id: string): Promise<MuveletState> {
  await requirePermission(P.keszletWrite);
  return lezar(await keszletApi.deleteRaktarhely(id), "Raktárhely törölve.", [
    "/keszlet/raktarhelyek",
  ]);
}

// ── Leltár ────────────────────────────────────────────────────────────────────

export async function leltarInditasAction(raktarhelyKod: string): Promise<MuveletState> {
  const user = await requirePermission(P.leltarWrite);
  return lezar(
    await keszletApi.leltarInditas(raktarhelyKod, user.id),
    "A leltár elindult.",
    ["/keszlet/leltar"],
  );
}

export async function leltarSorAction(
  id: string,
  lineIndex: number,
  input: unknown,
): Promise<MuveletState> {
  await requirePermission(P.leltarWrite);
  const p = leltarSorSchema.safeParse(input);
  if (!p.success) return { success: false, message: elso(p.error.issues) };
  const r = await keszletApi.leltarSorMent(
    id,
    lineIndex,
    p.data.tenyleges,
    p.data.indoklas,
  );
  return lezar(r, "Mentve.", [`/keszlet/leltar/${id}`]);
}

export async function leltarLezarAction(id: string): Promise<MuveletState> {
  const user = await requirePermission(P.leltarWrite);
  const r = await keszletApi.leltarLezar(id, user.id);
  return lezar(r, "A leltár lezárva, a korrekciók rögzítve.", [
    `/keszlet/leltar/${id}`,
    "/keszlet/leltar",
    "/keszlet",
    "/keszlet/lista",
  ]);
}

// ── RMA ───────────────────────────────────────────────────────────────────────

export async function createRmaAction(input: unknown): Promise<MuveletState> {
  const user = await requirePermission(P.rmaWrite);
  const p = rmaSchema.safeParse(input);
  if (!p.success) return { success: false, message: elso(p.error.issues) };
  return lezar(await keszletApi.createRma(p.data, user.id), "RMA ügy felvéve.", [
    "/keszlet/rma",
    "/keszlet",
  ]);
}

export async function rmaAtmenetAction(
  id: string,
  cel: string,
  input: unknown,
): Promise<MuveletState> {
  const user = await requirePermission(P.rmaWrite);
  if (!(RMA_ALLAPOTOK as readonly string[]).includes(cel))
    return { success: false, message: "Ismeretlen állapot." };
  const p = rmaAtmenetSchema.safeParse(input);
  if (!p.success) return { success: false, message: elso(p.error.issues) };
  const r = await keszletApi.rmaAtmenet(id, cel as RmaAllapot, user.id, p.data);
  return lezar(r, "Az állapot frissítve.", [
    `/keszlet/rma/${id}`,
    "/keszlet/rma",
    "/keszlet",
    "/feladatok",
  ]);
}

export async function rmaAtadAction(id: string, userId: string): Promise<MuveletState> {
  const user = await requirePermission(P.rmaWrite);
  const r = await keszletApi.rmaAtad(id, userId, user.id);
  return lezar(r, "A felelős kijelölve.", [`/keszlet/rma/${id}`, "/feladatok"]);
}
