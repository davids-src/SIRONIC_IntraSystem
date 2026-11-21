"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@erp/auth";
import { szervizApi } from "@erp/szerviz";
import {
  SZERVIZ_PERMISSIONS as P,
  type KeszletKiadasTerv,
  type KeszletPreflightEredmeny,
  type Szereplo,
} from "@erp/szerviz/client";
import {
  archivalasSchema,
  hibajegyAllapotSchema,
  hibajegySchema,
  karbantartasSchema,
  megjegyzesSchema,
  munkalapSchema,
} from "@erp/szerviz/validation";
import type { ArSnapshot } from "@erp/arlista";
import {
  arSnapshotPartnerhez,
  keszletKiadasPort,
  partnerPillanatkep,
} from "@/lib/szerviz-loaders";

export type SzervizFormState =
  | { success: false; fieldErrors?: Record<string, string[]>; message?: string }
  | { success: true; message?: string; id?: string };

function hibak(issues: Array<{ path: PropertyKey[]; message: string }>) {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".") || "form";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fieldErrors;
}

const szereploOf = (u: { id: string; name: string }): Szereplo => ({
  id: u.id,
  nev: u.name,
});

const szoveg = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return v == null ? undefined : String(v);
};

function jsonMezo(fd: FormData, key: string): unknown {
  try {
    return JSON.parse(String(fd.get(key) ?? "null"));
  } catch {
    return null;
  }
}

async function partnerAdat(partnerId?: string) {
  if (!partnerId) return { ok: true as const, partner: undefined };
  const partner = await partnerPillanatkep(partnerId);
  return partner ? { ok: true as const, partner } : { ok: false as const };
}

// ── Hibajegy ───────────────────────────────────────────────────────────────────

function hibajegyBemenet(fd: FormData) {
  return hibajegySchema.safeParse({
    targy: szoveg(fd, "targy"),
    leiras: szoveg(fd, "leiras"),
    kategoria: szoveg(fd, "kategoria") || undefined,
    prioritas: szoveg(fd, "prioritas") || undefined,
    helyszin: szoveg(fd, "helyszin"),
    erintettTetelek: szoveg(fd, "erintettTetelek"),
    projektId: szoveg(fd, "projektId"),
    partnerId: szoveg(fd, "partnerId"),
    egyszeriNev: szoveg(fd, "egyszeriNev"),
    egyszeriTelefon: szoveg(fd, "egyszeriTelefon"),
    forras: szoveg(fd, "forras") || undefined,
    felelosId: szoveg(fd, "felelosId"),
    belsoJegyzet: szoveg(fd, "belsoJegyzet"),
  });
}

export async function createHibajegyAction(
  _prev: SzervizFormState,
  fd: FormData,
): Promise<SzervizFormState> {
  const user = await requirePermission(P.hibajegyWrite);
  const parsed = hibajegyBemenet(fd);
  if (!parsed.success) return { success: false, fieldErrors: hibak(parsed.error.issues) };
  const partner = await partnerAdat(parsed.data.partnerId);
  if (!partner.ok)
    return { success: false, fieldErrors: { partnerId: ["A partner nem található"] } };
  // The internal note needs its own permission: without it the field is dropped.
  const input = user.permissions.includes(P.hibajegyBelso)
    ? parsed.data
    : { ...parsed.data, belsoJegyzet: undefined };
  const r = await szervizApi.createHibajegy(input, partner.partner, szereploOf(user));
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/szerviz/hibajegyek");
  return { success: true, id: r.id, message: "Hibajegy felvéve." };
}

export async function updateHibajegyAction(
  id: string,
  _prev: SzervizFormState,
  fd: FormData,
): Promise<SzervizFormState> {
  const user = await requirePermission(P.hibajegyWrite);
  const parsed = hibajegyBemenet(fd);
  if (!parsed.success) return { success: false, fieldErrors: hibak(parsed.error.issues) };
  const partner = await partnerAdat(parsed.data.partnerId);
  if (!partner.ok)
    return { success: false, fieldErrors: { partnerId: ["A partner nem található"] } };
  let input = parsed.data;
  if (!user.permissions.includes(P.hibajegyBelso)) {
    // Keep the stored internal note untouched for users who cannot see it.
    const meglevo = await szervizApi.getHibajegy(id, {
      kind: "staff",
      userId: user.id,
      belsoLathato: true,
    });
    input = { ...input, belsoJegyzet: meglevo?.belsoJegyzet };
  }
  const r = await szervizApi.updateHibajegy(id, input, partner.partner);
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/szerviz/hibajegyek");
  revalidatePath(`/szerviz/hibajegyek/${id}`);
  return { success: true, id, message: "Hibajegy mentve." };
}

export async function hibajegyAllapotAction(
  id: string,
  _prev: SzervizFormState,
  fd: FormData,
): Promise<SzervizFormState> {
  const user = await requirePermission(P.hibajegyWrite);
  const parsed = hibajegyAllapotSchema.safeParse({
    allapot: szoveg(fd, "allapot"),
    megjegyzes: szoveg(fd, "megjegyzes"),
    megoldasJegyzet: szoveg(fd, "megoldasJegyzet"),
  });
  if (!parsed.success) return { success: false, fieldErrors: hibak(parsed.error.issues) };
  const r = await szervizApi.setHibajegyAllapot(id, parsed.data, szereploOf(user));
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/szerviz/hibajegyek");
  revalidatePath(`/szerviz/hibajegyek/${id}`);
  return { success: true, id, message: "Állapot módosítva." };
}

export async function hibajegyFelelosAction(
  id: string,
  _prev: SzervizFormState,
  fd: FormData,
): Promise<SzervizFormState> {
  const user = await requirePermission(P.hibajegyWrite);
  const felelos = szoveg(fd, "felelosId")?.trim() || undefined;
  const r = await szervizApi.setFelelos(id, felelos, szereploOf(user));
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/szerviz/hibajegyek");
  revalidatePath(`/szerviz/hibajegyek/${id}`);
  return { success: true, id, message: "Felelős módosítva." };
}

export async function hibajegyMegjegyzesAction(
  id: string,
  _prev: SzervizFormState,
  fd: FormData,
): Promise<SzervizFormState> {
  const user = await requirePermission(P.hibajegyWrite);
  const parsed = megjegyzesSchema.safeParse({
    uzenet: szoveg(fd, "uzenet"),
    belso: fd.get("belso") === "on",
  });
  if (!parsed.success) return { success: false, fieldErrors: hibak(parsed.error.issues) };
  const r = await szervizApi.addMegjegyzes(id, parsed.data, szereploOf(user), {
    kind: "staff",
    userId: user.id,
    belsoLathato: user.permissions.includes(P.hibajegyBelso),
  });
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath(`/szerviz/hibajegyek/${id}`);
  return { success: true, id, message: "Megjegyzés rögzítve." };
}

export async function archivHibajegyAction(
  id: string,
  _prev: SzervizFormState,
  fd: FormData,
): Promise<SzervizFormState> {
  const user = await requirePermission(P.hibajegyWrite);
  const parsed = archivalasSchema.safeParse({ ok: szoveg(fd, "ok") });
  if (!parsed.success) return { success: false, fieldErrors: hibak(parsed.error.issues) };
  const r = await szervizApi.archivHibajegy(id, parsed.data.ok, szereploOf(user));
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/szerviz/hibajegyek");
  revalidatePath(`/szerviz/hibajegyek/${id}`);
  return { success: true, id, message: "Hibajegy archiválva." };
}

export async function visszaallitHibajegyAction(
  id: string,
  _prev: SzervizFormState,
): Promise<SzervizFormState> {
  await requirePermission(P.hibajegyDelete);
  const r = await szervizApi.restoreHibajegy(id);
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/szerviz/hibajegyek");
  revalidatePath(`/szerviz/hibajegyek/${id}`);
  return { success: true, id, message: "Hibajegy visszaállítva." };
}

// ── Munkalap ───────────────────────────────────────────────────────────────────

/** Frozen árlista price for a worklog line (the browser keeps it in the line, the server validates). */
export async function munkalapArSnapshotAction(
  tetelId: string,
  partnerId: string,
  egysegDb?: number,
): Promise<{ ok: true; snapshot: ArSnapshot } | { ok: false; message: string }> {
  await requirePermission(P.munkalapWrite);
  if (!partnerId) return { ok: false, message: "Előbb válassz partnert" };
  return arSnapshotPartnerhez(tetelId, partnerId, { egysegDb });
}

function munkalapBemenet(fd: FormData) {
  return munkalapSchema.safeParse({
    partnerId: szoveg(fd, "partnerId"),
    egyszeriNev: szoveg(fd, "egyszeriNev"),
    egyszeriTelefon: szoveg(fd, "egyszeriTelefon"),
    projektId: szoveg(fd, "projektId"),
    hibajegyId: szoveg(fd, "hibajegyId"),
    munkaDatum: szoveg(fd, "munkaDatum"),
    munkaKezdet: szoveg(fd, "munkaKezdet"),
    munkaVege: szoveg(fd, "munkaVege"),
    szerelo: szoveg(fd, "szerelo"),
    szereloAlairas: szoveg(fd, "szereloAlairas"),
    ugyfelNev: szoveg(fd, "ugyfelNev"),
    ugyfelAlairas: szoveg(fd, "ugyfelAlairas"),
    helyszin: szoveg(fd, "helyszin"),
    kategoria: szoveg(fd, "kategoria") || undefined,
    leiras: szoveg(fd, "leiras"),
    sorok: jsonMezo(fd, "sorok") ?? [],
    utazasKm: szoveg(fd, "utazasKm") || undefined,
    megjegyzes: szoveg(fd, "megjegyzes"),
  });
}

export async function createMunkalapAction(
  _prev: SzervizFormState,
  fd: FormData,
): Promise<SzervizFormState> {
  const user = await requirePermission(P.munkalapWrite);
  const parsed = munkalapBemenet(fd);
  if (!parsed.success) return { success: false, fieldErrors: hibak(parsed.error.issues) };
  const partner = await partnerAdat(parsed.data.partnerId);
  if (!partner.ok)
    return { success: false, fieldErrors: { partnerId: ["A partner nem található"] } };
  const r = await szervizApi.createMunkalap(
    parsed.data,
    partner.partner,
    szereploOf(user),
  );
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/szerviz/munkalapok");
  return { success: true, id: r.id, message: "Munkalap felvéve." };
}

export async function updateMunkalapAction(
  id: string,
  _prev: SzervizFormState,
  fd: FormData,
): Promise<SzervizFormState> {
  await requirePermission(P.munkalapWrite);
  const parsed = munkalapBemenet(fd);
  if (!parsed.success) return { success: false, fieldErrors: hibak(parsed.error.issues) };
  const partner = await partnerAdat(parsed.data.partnerId);
  if (!partner.ok)
    return { success: false, fieldErrors: { partnerId: ["A partner nem található"] } };
  const r = await szervizApi.updateMunkalap(id, parsed.data, partner.partner);
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/szerviz/munkalapok");
  revalidatePath(`/szerviz/munkalapok/${id}`);
  return { success: true, id, message: "Munkalap mentve." };
}

export type MunkalapPreflightEredmeny =
  | { ok: true; terv: KeszletKiadasTerv; preflight: KeszletPreflightEredmeny | null }
  | { ok: false; message: string };

/** Read-only availability check shown in the finalize dialog. */
export async function munkalapPreflightAction(
  id: string,
): Promise<MunkalapPreflightEredmeny> {
  const user = await requirePermission(P.munkalapLezar);
  const terv = await szervizApi.tervezKeszlet(id);
  if (!terv) return { ok: false, message: "A munkalap nem található" };
  if (terv.length === 0) return { ok: true, terv, preflight: null };
  return { ok: true, terv, preflight: await keszletKiadasPort(user.id).preflight(terv) };
}

export async function lezarMunkalapAction(
  id: string,
  _prev: SzervizFormState,
): Promise<SzervizFormState> {
  const user = await requirePermission(P.munkalapLezar);
  const r = await szervizApi.lezarMunkalap(
    id,
    szereploOf(user),
    keszletKiadasPort(user.id),
  );
  revalidatePath("/szerviz/munkalapok");
  revalidatePath(`/szerviz/munkalapok/${id}`);
  if (!r.ok) return { success: false, message: r.message };
  return {
    success: true,
    id,
    message: r.idempotens ? "A munkalap már le volt zárva." : "Munkalap lezárva.",
  };
}

export async function ujraKiadKeszletAction(
  id: string,
  _prev: SzervizFormState,
): Promise<SzervizFormState> {
  const user = await requirePermission(P.munkalapLezar);
  const r = await szervizApi.ujraKiadKeszlet(id, keszletKiadasPort(user.id));
  revalidatePath(`/szerviz/munkalapok/${id}`);
  if (!r.ok) return { success: false, message: r.message };
  return { success: true, id, message: "Készletkiadás rögzítve." };
}

export async function archivMunkalapAction(
  id: string,
  _prev: SzervizFormState,
  fd: FormData,
): Promise<SzervizFormState> {
  const user = await requirePermission(P.munkalapWrite);
  const parsed = archivalasSchema.safeParse({ ok: szoveg(fd, "ok") });
  if (!parsed.success) return { success: false, fieldErrors: hibak(parsed.error.issues) };
  const r = await szervizApi.archivMunkalap(id, parsed.data.ok, szereploOf(user));
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/szerviz/munkalapok");
  revalidatePath(`/szerviz/munkalapok/${id}`);
  return { success: true, id, message: "Munkalap archiválva." };
}

export async function visszaallitMunkalapAction(
  id: string,
  _prev: SzervizFormState,
): Promise<SzervizFormState> {
  await requirePermission(P.munkalapDelete);
  const r = await szervizApi.restoreMunkalap(id);
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/szerviz/munkalapok");
  revalidatePath(`/szerviz/munkalapok/${id}`);
  return { success: true, id, message: "Munkalap visszaállítva." };
}

// ── Karbantartási terv ─────────────────────────────────────────────────────────

function karbantartasBemenet(fd: FormData) {
  return karbantartasSchema.safeParse({
    cim: szoveg(fd, "cim"),
    partnerId: szoveg(fd, "partnerId"),
    projektId: szoveg(fd, "projektId"),
    intervallumHonap: szoveg(fd, "intervallumHonap"),
    elsoEsedekes: szoveg(fd, "elsoEsedekes"),
    elorejelzesNap: szoveg(fd, "elorejelzesNap") || undefined,
    sablonLeiras: szoveg(fd, "sablonLeiras"),
    kategoria: szoveg(fd, "kategoria") || undefined,
    prioritas: szoveg(fd, "prioritas") || undefined,
    felelosId: szoveg(fd, "felelosId"),
    aktiv: fd.get("aktiv") === "on",
  });
}

export async function createKarbantartasAction(
  _prev: SzervizFormState,
  fd: FormData,
): Promise<SzervizFormState> {
  const user = await requirePermission(P.karbantartasWrite);
  const parsed = karbantartasBemenet(fd);
  if (!parsed.success) return { success: false, fieldErrors: hibak(parsed.error.issues) };
  const partner = await partnerAdat(parsed.data.partnerId);
  if (!partner.ok)
    return { success: false, fieldErrors: { partnerId: ["A partner nem található"] } };
  const r = await szervizApi.createKarbantartas(
    parsed.data,
    partner.partner,
    szereploOf(user),
  );
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/szerviz/karbantartas");
  return { success: true, id: r.id, message: "Karbantartási terv felvéve." };
}

export async function updateKarbantartasAction(
  id: string,
  _prev: SzervizFormState,
  fd: FormData,
): Promise<SzervizFormState> {
  await requirePermission(P.karbantartasWrite);
  const parsed = karbantartasBemenet(fd);
  if (!parsed.success) return { success: false, fieldErrors: hibak(parsed.error.issues) };
  const partner = await partnerAdat(parsed.data.partnerId);
  if (!partner.ok)
    return { success: false, fieldErrors: { partnerId: ["A partner nem található"] } };
  const r = await szervizApi.updateKarbantartas(id, parsed.data, partner.partner);
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/szerviz/karbantartas");
  revalidatePath(`/szerviz/karbantartas/${id}`);
  return { success: true, id, message: "Terv mentve." };
}

/** Generates the ticket of the next due cycle; `id` of the result is the ticket. */
export async function generalHibajegyAction(
  id: string,
  _prev: SzervizFormState,
): Promise<SzervizFormState> {
  const user = await requirePermission(P.karbantartasWrite);
  const r = await szervizApi.generalHibajegy(id, szereploOf(user));
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/szerviz/karbantartas");
  revalidatePath(`/szerviz/karbantartas/${id}`);
  revalidatePath("/szerviz/hibajegyek");
  return {
    success: true,
    id: r.id,
    message: r.ujLetrejott
      ? "Hibajegy generálva."
      : "Ehhez a ciklushoz már van hibajegy.",
  };
}

export async function archivKarbantartasAction(
  id: string,
  _prev: SzervizFormState,
  fd: FormData,
): Promise<SzervizFormState> {
  const user = await requirePermission(P.karbantartasWrite);
  const parsed = archivalasSchema.safeParse({ ok: szoveg(fd, "ok") });
  if (!parsed.success) return { success: false, fieldErrors: hibak(parsed.error.issues) };
  const r = await szervizApi.archivKarbantartas(id, parsed.data.ok, szereploOf(user));
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/szerviz/karbantartas");
  revalidatePath(`/szerviz/karbantartas/${id}`);
  return { success: true, id, message: "Terv archiválva." };
}

export async function visszaallitKarbantartasAction(
  id: string,
  _prev: SzervizFormState,
): Promise<SzervizFormState> {
  await requirePermission(P.karbantartasDelete);
  const r = await szervizApi.restoreKarbantartas(id);
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/szerviz/karbantartas");
  revalidatePath(`/szerviz/karbantartas/${id}`);
  return { success: true, id, message: "Terv visszaállítva." };
}
