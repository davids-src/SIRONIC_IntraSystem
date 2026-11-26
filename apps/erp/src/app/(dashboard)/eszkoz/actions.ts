"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@erp/auth";
import { eszkozApi, type EszkozResult } from "@erp/eszkoz";
import {
  eszkozSchema,
  jegyzetSchema,
  kiadasSchema,
  visszavetelSchema,
} from "@erp/eszkoz/validation";
import { kuldErtesitesek } from "@/lib/feladat-kapcsolat";

export type EszkozFormState =
  | { success: false; fieldErrors?: Record<string, string[]>; message?: string }
  | { success: true; message?: string; id?: string };

export type MuveletState = { success: boolean; message?: string };

function zodToFieldErrors(issues: Array<{ path: PropertyKey[]; message: string }>) {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".") || "form";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fieldErrors;
}

function formInput(fd: FormData) {
  return {
    megnevezes: fd.get("megnevezes") ?? "",
    marka: fd.get("marka") || undefined,
    tipusszam: fd.get("tipusszam") || undefined,
    gyariSzam: fd.get("gyariSzam") || undefined,
    fizikaiAllapot: fd.get("fizikaiAllapot") ?? "",
    jegyzet: fd.get("jegyzet") || undefined,
  };
}

function invalidate(id?: string) {
  revalidatePath("/eszkoz");
  if (id) revalidatePath(`/eszkoz/${id}`);
  revalidatePath("/feladatok");
}

/** Sends the facade's notifications and maps the result to the dialog state. */
async function lezar(
  r: EszkozResult,
  id: string,
  message: string,
): Promise<MuveletState> {
  if (!r.ok) return { success: false, message: r.message };
  await kuldErtesitesek(r.ertesitesek);
  invalidate(id);
  return { success: true, message };
}

export async function createEszkozAction(
  _prev: EszkozFormState,
  formData: FormData,
): Promise<EszkozFormState> {
  const user = await requirePermission("eszkoz:eszkoz:write");
  const parsed = eszkozSchema.safeParse(formInput(formData));
  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }
  const r = await eszkozApi.createEszkoz(parsed.data, user.id);
  if (!r.ok) return { success: false, message: r.message };
  invalidate();
  return { success: true, id: r.id, message: "Eszköz felvéve." };
}

export async function updateEszkozAction(
  id: string,
  _prev: EszkozFormState,
  formData: FormData,
): Promise<EszkozFormState> {
  await requirePermission("eszkoz:eszkoz:write");
  const parsed = eszkozSchema.safeParse(formInput(formData));
  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }
  const r = await eszkozApi.updateEszkoz(id, parsed.data);
  if (!r.ok) return { success: false, message: r.message };
  invalidate(id);
  return { success: true, id, message: "Eszköz adatai frissítve." };
}

export async function kiadasAction(
  id: string,
  input: { celUserId: string; jegyzet?: string },
): Promise<MuveletState> {
  const user = await requirePermission("eszkoz:eszkoz:kiad");
  const parsed = kiadasSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, message: parsed.error.issues[0]?.message };
  return lezar(
    await eszkozApi.checkOut(id, parsed.data.celUserId, parsed.data.jegyzet, user.id),
    id,
    "Az eszköz kiadva.",
  );
}

export async function visszavetelAction(
  id: string,
  input: { fizikaiAllapot: string; jegyzet?: string },
): Promise<MuveletState> {
  const user = await requirePermission("eszkoz:eszkoz:kiad");
  const parsed = visszavetelSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, message: parsed.error.issues[0]?.message };
  return lezar(
    await eszkozApi.checkIn(id, parsed.data.fizikaiAllapot, parsed.data.jegyzet, user.id),
    id,
    "Az eszköz visszavéve.",
  );
}

export async function szervizKezdeteAction(
  id: string,
  jegyzet?: string,
): Promise<MuveletState> {
  const user = await requirePermission("eszkoz:eszkoz:write");
  const p = jegyzetSchema.safeParse({ jegyzet });
  if (!p.success) return { success: false, message: p.error.issues[0]?.message };
  return lezar(
    await eszkozApi.startMaintenance(id, p.data.jegyzet, user.id),
    id,
    "Szerviz elindítva.",
  );
}

export async function szervizVegeAction(
  id: string,
  jegyzet?: string,
): Promise<MuveletState> {
  const user = await requirePermission("eszkoz:eszkoz:write");
  const p = jegyzetSchema.safeParse({ jegyzet });
  if (!p.success) return { success: false, message: p.error.issues[0]?.message };
  return lezar(
    await eszkozApi.endMaintenance(id, p.data.jegyzet, user.id),
    id,
    "Szerviz lezárva.",
  );
}

export async function elveszettAction(
  id: string,
  jegyzet?: string,
): Promise<MuveletState> {
  const user = await requirePermission("eszkoz:eszkoz:write");
  const p = jegyzetSchema.safeParse({ jegyzet });
  if (!p.success) return { success: false, message: p.error.issues[0]?.message };
  return lezar(
    await eszkozApi.markLost(id, p.data.jegyzet, user.id),
    id,
    "Elveszettnek jelölve.",
  );
}

export async function kivonasAction(id: string, jegyzet?: string): Promise<MuveletState> {
  const user = await requirePermission("eszkoz:eszkoz:write");
  const p = jegyzetSchema.safeParse({ jegyzet });
  if (!p.success) return { success: false, message: p.error.issues[0]?.message };
  return lezar(
    await eszkozApi.retire(id, p.data.jegyzet, user.id),
    id,
    "Az eszköz kivonva.",
  );
}

export async function deleteEszkozAction(id: string): Promise<MuveletState> {
  await requirePermission("eszkoz:eszkoz:delete");
  const r = await eszkozApi.deleteEszkoz(id);
  if (!r.ok) return { success: false, message: r.message };
  invalidate();
  return { success: true, message: "Eszköz törölve." };
}

export async function getFelhasznalokAction(): Promise<
  Array<{ id: string; name: string }>
> {
  await requirePermission("eszkoz:eszkoz:kiad");
  return eszkozApi.listFelhasznalok();
}
