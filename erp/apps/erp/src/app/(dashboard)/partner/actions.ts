"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@erp/auth";
import { partnerApi } from "@erp/partner";
import { PARTNER_PERMISSIONS } from "@erp/partner/client";
import { archivalasSchema, partnerSchema } from "@erp/partner/validation";
import { zodToFieldErrors, type FormState } from "./_components/form-errors";

export type PartnerFormState = FormState;

const TEXT_FIELDS = [
  "tipus",
  "nev",
  "rovidNev",
  "adoszam",
  "cegjegyzekszam",
  "telefon",
  "email",
  "bankszamlaszam",
  "megjegyzes",
  "partnerSzerep",
  "ugyfelKategoria",
  "arazasiSzerzodesTipus",
  "szerzodesKezdete",
  "szerzodesVege",
  "megujitasEmlekeztetoNap",
  "alvallalkozoJelenletTipus",
  "alvallalkozoSzamlazasiCiklus",
] as const;

const CIM_FIELDS = ["iranyitoszam", "varos", "utca", "orszag"] as const;

function parseForm(formData: FormData) {
  const raw: Record<string, unknown> = {};
  for (const key of TEXT_FIELDS) {
    const v = formData.get(key);
    if (v !== null) raw[key] = String(v);
  }
  for (const prefix of ["szekhely", "szamlazasiCim"] as const) {
    raw[prefix] = Object.fromEntries(
      CIM_FIELDS.map((f) => [f, String(formData.get(`${prefix}.${f}`) ?? "")]),
    );
  }
  raw.cimkek = String(formData.get("cimkek") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  raw.alvallalkozoMunkateruletek = formData
    .getAll("alvallalkozoMunkateruletek")
    .map(String);
  try {
    raw.kapcsolattartok = JSON.parse(String(formData.get("kapcsolattartok") ?? "[]"));
  } catch {
    raw.kapcsolattartok = [];
  }
  return partnerSchema.safeParse(raw);
}

export async function createPartnerAction(
  _prev: PartnerFormState,
  formData: FormData,
): Promise<PartnerFormState> {
  await requirePermission(PARTNER_PERMISSIONS.partnerWrite);
  const parsed = parseForm(formData);
  if (!parsed.success)
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  const result = await partnerApi.createPartner(parsed.data);
  if (!result.ok) return { success: false, message: result.message };
  revalidatePath("/partner");
  return { success: true, message: "Partner felvéve.", id: result.id };
}

export async function updatePartnerAction(
  partnerId: string,
  _prev: PartnerFormState,
  formData: FormData,
): Promise<PartnerFormState> {
  await requirePermission(PARTNER_PERMISSIONS.partnerWrite);
  const parsed = parseForm(formData);
  if (!parsed.success)
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  const result = await partnerApi.updatePartner(partnerId, parsed.data);
  if (!result.ok) return { success: false, message: result.message };
  revalidatePath("/partner");
  revalidatePath(`/partner/${partnerId}`);
  return { success: true, message: "Partner mentve.", id: partnerId };
}

export async function archivePartnerAction(
  partnerId: string,
  _prev: PartnerFormState,
  formData: FormData,
): Promise<PartnerFormState> {
  const user = await requirePermission(PARTNER_PERMISSIONS.partnerDelete);
  const parsed = archivalasSchema.safeParse({ ok: formData.get("ok") });
  if (!parsed.success)
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  const result = await partnerApi.archivePartner(partnerId, parsed.data.ok, {
    id: user.id,
    nev: user.name,
  });
  if (!result.ok) return { success: false, message: result.message };
  revalidatePath("/partner");
  revalidatePath(`/partner/${partnerId}`);
  return { success: true, message: "Partner archiválva.", id: partnerId };
}

export async function restorePartnerAction(
  partnerId: string,
  _prev: PartnerFormState,
): Promise<PartnerFormState> {
  await requirePermission(PARTNER_PERMISSIONS.partnerDelete);
  const result = await partnerApi.restorePartner(partnerId);
  if (!result.ok) return { success: false, message: result.message };
  revalidatePath("/partner");
  revalidatePath(`/partner/${partnerId}`);
  return { success: true, message: "Partner visszaállítva.", id: partnerId };
}
