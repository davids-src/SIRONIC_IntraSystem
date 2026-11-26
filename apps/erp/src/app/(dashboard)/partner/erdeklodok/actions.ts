"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@erp/auth";
import { partnerApi } from "@erp/partner";
import { PARTNER_PERMISSIONS } from "@erp/partner/client";
import {
  archivalasSchema,
  erdeklodoAllapotSchema,
  erdeklodoSchema,
  tevekenysegSchema,
} from "@erp/partner/validation";
import { zodToFieldErrors, type FormState } from "../_components/form-errors";

export type ErdeklodoFormState = FormState;

const FIELDS = [
  "cegNev",
  "kapcsolattartoNev",
  "email",
  "telefon",
  "weboldal",
  "forras",
  "kategoria",
  "iparag",
  "becsultErtek",
  "kovetkezoLepes",
  "kovetkezoLepesIdopont",
  "megjegyzes",
  "uzletiEgyseg",
] as const;

function parseForm(formData: FormData) {
  const raw: Record<string, unknown> = {};
  for (const key of FIELDS) {
    const v = formData.get(key);
    if (v !== null) raw[key] = String(v);
  }
  return erdeklodoSchema.safeParse(raw);
}

function refresh(id?: string) {
  revalidatePath("/partner/erdeklodok");
  if (id) revalidatePath(`/partner/erdeklodok/${id}`);
}

export async function createErdeklodoAction(
  _prev: ErdeklodoFormState,
  formData: FormData,
): Promise<ErdeklodoFormState> {
  const user = await requirePermission(PARTNER_PERMISSIONS.erdeklodoWrite);
  const parsed = parseForm(formData);
  if (!parsed.success)
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  const result = await partnerApi.createErdeklodo(parsed.data, {
    id: user.id,
    nev: user.name,
  });
  refresh();
  return { success: true, message: "Érdeklődő felvéve.", id: result.id };
}

export async function updateErdeklodoAction(
  id: string,
  _prev: ErdeklodoFormState,
  formData: FormData,
): Promise<ErdeklodoFormState> {
  await requirePermission(PARTNER_PERMISSIONS.erdeklodoWrite);
  const parsed = parseForm(formData);
  if (!parsed.success)
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  const result = await partnerApi.updateErdeklodo(id, parsed.data);
  if (!result.ok) return { success: false, message: result.message };
  refresh(id);
  return { success: true, message: "Érdeklődő mentve.", id };
}

export async function changeAllapotAction(
  id: string,
  _prev: ErdeklodoFormState,
  formData: FormData,
): Promise<ErdeklodoFormState> {
  const user = await requirePermission(PARTNER_PERMISSIONS.erdeklodoWrite);
  const parsed = erdeklodoAllapotSchema.safeParse({
    allapot: formData.get("allapot"),
    megjegyzes: formData.get("megjegyzes") ?? undefined,
    elvesztesOka: formData.get("elvesztesOka") ?? undefined,
  });
  if (!parsed.success)
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  const result = await partnerApi.changeErdeklodoStatus(
    id,
    parsed.data.allapot,
    { id: user.id, nev: user.name },
    { megjegyzes: parsed.data.megjegyzes, elvesztesOka: parsed.data.elvesztesOka },
  );
  if (!result.ok) return { success: false, message: result.message };
  refresh(id);
  return { success: true, message: "Állapot módosítva.", id };
}

export async function addTevekenysegAction(
  id: string,
  _prev: ErdeklodoFormState,
  formData: FormData,
): Promise<ErdeklodoFormState> {
  const user = await requirePermission(PARTNER_PERMISSIONS.erdeklodoWrite);
  const parsed = tevekenysegSchema.safeParse({
    tipus: formData.get("tipus"),
    szoveg: formData.get("szoveg"),
  });
  if (!parsed.success)
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  const result = await partnerApi.addErdeklodoTevekenyseg(
    id,
    parsed.data.tipus,
    parsed.data.szoveg,
    {
      id: user.id,
      nev: user.name,
    },
  );
  if (!result.ok) return { success: false, message: result.message };
  refresh(id);
  return { success: true, message: "Tevékenység rögzítve.", id };
}

/** Assign to the current user ("Vállalom") or clear the felelős. */
export async function assignErdeklodoAction(
  id: string,
  mode: "me" | "none",
): Promise<ErdeklodoFormState> {
  const user = await requirePermission(PARTNER_PERMISSIONS.erdeklodoWrite);
  const me = { id: user.id, nev: user.name };
  const result = await partnerApi.assignErdeklodo(id, mode === "me" ? me : null, me);
  if (!result.ok) return { success: false, message: result.message };
  refresh(id);
  return {
    success: true,
    message: mode === "me" ? "Felelős: te." : "Felelős törölve.",
    id,
  };
}

export async function convertErdeklodoAction(
  id: string,
  _prev: ErdeklodoFormState,
): Promise<ErdeklodoFormState> {
  const user = await requirePermission(PARTNER_PERMISSIONS.erdeklodoWrite);
  await requirePermission(PARTNER_PERMISSIONS.partnerWrite);
  const result = await partnerApi.convertErdeklodoToPartner(id, {
    id: user.id,
    nev: user.name,
  });
  if (!result.ok) return { success: false, message: result.message };
  refresh(id);
  revalidatePath("/partner");
  return { success: true, message: "Partner létrehozva.", id: result.partnerId };
}

export async function archiveErdeklodoAction(
  id: string,
  _prev: ErdeklodoFormState,
  formData: FormData,
): Promise<ErdeklodoFormState> {
  const user = await requirePermission(PARTNER_PERMISSIONS.erdeklodoDelete);
  const parsed = archivalasSchema.safeParse({ ok: formData.get("ok") });
  if (!parsed.success)
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  const result = await partnerApi.archiveErdeklodo(id, parsed.data.ok, {
    id: user.id,
    nev: user.name,
  });
  if (!result.ok) return { success: false, message: result.message };
  refresh(id);
  return { success: true, message: "Érdeklődő archiválva.", id };
}

export async function restoreErdeklodoAction(
  id: string,
  _prev: ErdeklodoFormState,
): Promise<ErdeklodoFormState> {
  await requirePermission(PARTNER_PERMISSIONS.erdeklodoDelete);
  const result = await partnerApi.restoreErdeklodo(id);
  if (!result.ok) return { success: false, message: result.message };
  refresh(id);
  return { success: true, message: "Érdeklődő visszaállítva.", id };
}
