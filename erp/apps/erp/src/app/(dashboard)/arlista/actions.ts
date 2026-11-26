"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@erp/auth";
import { arlistaApi, ARLISTA_PERMISSIONS as P } from "@erp/arlista";
import {
  ORADIJ_KATEGORIAK,
  UGYFEL_SZORZO_KULCSOK,
  ANYAG_POTLEK_KULCSOK,
  SURGOSSEG_KULCSOK,
} from "@erp/arlista/client";
import {
  alkategoriaSchema,
  arazasiBeallitasSchema,
  archivalasSchema,
  beszerzesiAdatSchema,
  createTermekSchema,
  kategoriaSchema,
  szolgaltatasSchema,
  updateTermekSchema,
} from "@erp/arlista/validation";

export type ArlistaFormState =
  | { success: false; fieldErrors?: Record<string, string[]>; message?: string }
  | { success: true; message?: string; id?: string };

export type ArlistaSimpleResult = { success: boolean; message?: string };

function zodToFieldErrors(issues: Array<{ path: PropertyKey[]; message: string }>) {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".") || "form";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fieldErrors;
}

const text = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return v == null ? undefined : String(v);
};
const checkbox = (fd: FormData, key: string) => fd.get(key) === "on";

function termekMezok(fd: FormData) {
  return {
    nev: text(fd, "nev"),
    leiras: text(fd, "leiras"),
    kategoria: text(fd, "kategoria"),
    egyseg: text(fd, "egyseg"),
    nettoAr: text(fd, "nettoAr"),
    penznem: text(fd, "penznem") || undefined,
    afaKulcs: text(fd, "afaKulcs") || undefined,
    aktiv: checkbox(fd, "aktiv"),
    megjegyzes: text(fd, "megjegyzes"),
  };
}

// ── Termék ───────────────────────────────────────────────────────────────────

export async function createTermekAction(
  _prev: ArlistaFormState,
  fd: FormData,
): Promise<ArlistaFormState> {
  await requirePermission(P.termekWrite);
  const parsed = createTermekSchema.safeParse({
    ...termekMezok(fd),
    tipus: text(fd, "tipus") || undefined,
    kodElotag: text(fd, "kodElotag") ?? "",
  });
  if (!parsed.success)
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  const r = await arlistaApi.createTermek(parsed.data);
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/arlista/termekek");
  return { success: true, id: r.id, message: "Tétel felvéve." };
}

export async function updateTermekAction(
  id: string,
  _prev: ArlistaFormState,
  fd: FormData,
): Promise<ArlistaFormState> {
  await requirePermission(P.termekWrite);
  const parsed = updateTermekSchema.safeParse(termekMezok(fd));
  if (!parsed.success)
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  const r = await arlistaApi.updateTermek(id, parsed.data);
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/arlista/termekek");
  revalidatePath(`/arlista/termekek/${id}`);
  return { success: true, id, message: "Tétel mentve." };
}

export async function archivalTermekAction(
  id: string,
  ok: string,
): Promise<ArlistaSimpleResult> {
  await requirePermission(P.termekWrite);
  const parsed = archivalasSchema.safeParse({ ok });
  if (!parsed.success)
    return { success: false, message: parsed.error.issues[0]?.message };
  const r = await arlistaApi.archivalTermek(id, parsed.data.ok);
  revalidatePath("/arlista/termekek");
  revalidatePath(`/arlista/termekek/${id}`);
  return r.ok
    ? { success: true, message: "Tétel archiválva." }
    : { success: false, message: r.message };
}

export async function visszaallitTermekAction(id: string): Promise<ArlistaSimpleResult> {
  await requirePermission(P.termekWrite);
  const r = await arlistaApi.visszaallitTermek(id);
  revalidatePath("/arlista/termekek");
  revalidatePath(`/arlista/termekek/${id}`);
  return r.ok
    ? { success: true, message: "Tétel visszaállítva." }
    : { success: false, message: r.message };
}

export async function addBeszerzesAction(
  termekId: string,
  _prev: ArlistaFormState,
  fd: FormData,
): Promise<ArlistaFormState> {
  const user = await requirePermission(P.beszerzesWrite);
  const parsed = beszerzesiAdatSchema.safeParse({
    beszallitoNev: text(fd, "beszallitoNev"),
    beszallitoCikkszam: text(fd, "beszallitoCikkszam"),
    nettoBeszerzesiAr: text(fd, "nettoBeszerzesiAr"),
    beszerzesDatuma: text(fd, "beszerzesDatuma"),
    megjegyzes: text(fd, "megjegyzes"),
  });
  if (!parsed.success)
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  const r = await arlistaApi.addBeszerzes(
    { userId: user.id, permissions: user.permissions },
    termekId,
    parsed.data,
  );
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath(`/arlista/termekek/${termekId}`);
  return { success: true, message: "Beszerzési rekord rögzítve." };
}

export async function removeBeszerzesAction(
  termekId: string,
  beszerzesId: string,
): Promise<ArlistaSimpleResult> {
  const user = await requirePermission(P.beszerzesWrite);
  const r = await arlistaApi.removeBeszerzes(
    { userId: user.id, permissions: user.permissions },
    termekId,
    beszerzesId,
  );
  revalidatePath(`/arlista/termekek/${termekId}`);
  return r.ok ? { success: true } : { success: false, message: r.message };
}

// ── Szolgáltatás ─────────────────────────────────────────────────────────────

function szolgaltatasMezok(fd: FormData) {
  let egysegSavok: unknown = [];
  try {
    egysegSavok = JSON.parse(text(fd, "egysegSavok") || "[]");
  } catch {
    egysegSavok = [];
  }
  return {
    kategoriaId: text(fd, "kategoriaId"),
    alkategoriaId: text(fd, "alkategoriaId"),
    nev: text(fd, "nev"),
    leiras: text(fd, "leiras"),
    egyseg: text(fd, "egyseg"),
    arazasiTipus: text(fd, "arazasiTipus"),
    belsoAlapar: text(fd, "belsoAlapar") || undefined,
    oradijKategoria: text(fd, "oradijKategoria") || undefined,
    egysegSavok,
    megjegyzes: text(fd, "megjegyzes"),
    ugyfelMegjegyzes: text(fd, "ugyfelMegjegyzes"),
    aktiv: checkbox(fd, "aktiv"),
  };
}

export async function createSzolgaltatasAction(
  _prev: ArlistaFormState,
  fd: FormData,
): Promise<ArlistaFormState> {
  await requirePermission(P.szolgaltatasWrite);
  const parsed = szolgaltatasSchema.safeParse(szolgaltatasMezok(fd));
  if (!parsed.success)
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  const r = await arlistaApi.createSzolgaltatas(parsed.data);
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/arlista/szolgaltatasok");
  return { success: true, id: r.id, message: "Szolgáltatás felvéve." };
}

export async function updateSzolgaltatasAction(
  id: string,
  _prev: ArlistaFormState,
  fd: FormData,
): Promise<ArlistaFormState> {
  await requirePermission(P.szolgaltatasWrite);
  const parsed = szolgaltatasSchema.safeParse(szolgaltatasMezok(fd));
  if (!parsed.success)
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  const r = await arlistaApi.updateSzolgaltatas(id, parsed.data);
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/arlista/szolgaltatasok");
  revalidatePath(`/arlista/szolgaltatasok/${id}`);
  return { success: true, id, message: "Szolgáltatás mentve." };
}

export async function archivalSzolgaltatasAction(
  id: string,
  ok: string,
): Promise<ArlistaSimpleResult> {
  await requirePermission(P.szolgaltatasWrite);
  const parsed = archivalasSchema.safeParse({ ok });
  if (!parsed.success)
    return { success: false, message: parsed.error.issues[0]?.message };
  const r = await arlistaApi.archivalSzolgaltatas(id, parsed.data.ok);
  revalidatePath("/arlista/szolgaltatasok");
  revalidatePath(`/arlista/szolgaltatasok/${id}`);
  return r.ok
    ? { success: true, message: "Szolgáltatás archiválva." }
    : { success: false, message: r.message };
}

export async function visszaallitSzolgaltatasAction(
  id: string,
): Promise<ArlistaSimpleResult> {
  await requirePermission(P.szolgaltatasWrite);
  const r = await arlistaApi.visszaallitSzolgaltatas(id);
  revalidatePath("/arlista/szolgaltatasok");
  revalidatePath(`/arlista/szolgaltatasok/${id}`);
  return r.ok
    ? { success: true, message: "Szolgáltatás visszaállítva." }
    : { success: false, message: r.message };
}

// ── Kategóriák ───────────────────────────────────────────────────────────────

export async function seedKategoriakAction(): Promise<ArlistaSimpleResult> {
  await requirePermission(P.szolgaltatasWrite);
  const r = await arlistaApi.seedAlapKategoriak();
  revalidatePath("/arlista/szolgaltatasok");
  revalidatePath("/arlista/szolgaltatasok/kategoriak");
  return {
    success: true,
    message: r.letrehozva > 0 ? "Alap kategóriák létrehozva." : "Már vannak kategóriák.",
  };
}

export async function createKategoriaAction(
  _prev: ArlistaFormState,
  fd: FormData,
): Promise<ArlistaFormState> {
  await requirePermission(P.szolgaltatasWrite);
  const parsed = kategoriaSchema.safeParse({
    nev: text(fd, "nev"),
    kodElotag: text(fd, "kodElotag"),
    szin: text(fd, "szin") || undefined,
    sorrend: text(fd, "sorrend") || undefined,
    aktiv: true,
  });
  if (!parsed.success)
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  const r = await arlistaApi.createKategoria(parsed.data);
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/arlista/szolgaltatasok");
  revalidatePath("/arlista/szolgaltatasok/kategoriak");
  return { success: true, id: r.id, message: "Kategória felvéve." };
}

export async function updateKategoriaAction(
  id: string,
  _prev: ArlistaFormState,
  fd: FormData,
): Promise<ArlistaFormState> {
  await requirePermission(P.szolgaltatasWrite);
  const parsed = kategoriaSchema.omit({ kodElotag: true }).safeParse({
    nev: text(fd, "nev"),
    szin: text(fd, "szin") || undefined,
    sorrend: text(fd, "sorrend") || undefined,
    aktiv: checkbox(fd, "aktiv"),
  });
  if (!parsed.success)
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  const r = await arlistaApi.updateKategoria(id, parsed.data);
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/arlista/szolgaltatasok");
  revalidatePath("/arlista/szolgaltatasok/kategoriak");
  return { success: true, id, message: "Kategória mentve." };
}

export async function createAlkategoriaAction(
  kategoriaId: string,
  _prev: ArlistaFormState,
  fd: FormData,
): Promise<ArlistaFormState> {
  await requirePermission(P.szolgaltatasWrite);
  const parsed = alkategoriaSchema.safeParse({
    kategoriaId,
    nev: text(fd, "nev"),
    sorrend: text(fd, "sorrend") || undefined,
    aktiv: true,
  });
  if (!parsed.success)
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  const r = await arlistaApi.createAlkategoria(parsed.data);
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/arlista/szolgaltatasok");
  revalidatePath("/arlista/szolgaltatasok/kategoriak");
  return { success: true, id: r.id, message: "Alkategória felvéve." };
}

export async function deleteAlkategoriaAction(id: string): Promise<ArlistaSimpleResult> {
  await requirePermission(P.szolgaltatasWrite);
  const r = await arlistaApi.deleteAlkategoria(id);
  revalidatePath("/arlista/szolgaltatasok/kategoriak");
  return r.ok ? { success: true } : { success: false, message: r.message };
}

// ── Beállítások ──────────────────────────────────────────────────────────────

function tablaMezok(fd: FormData, elotag: string, kulcsok: readonly string[]) {
  return Object.fromEntries(kulcsok.map((k) => [k, text(fd, `${elotag}.${k}`)]));
}

export async function saveBeallitasokAction(
  _prev: ArlistaFormState,
  fd: FormData,
): Promise<ArlistaFormState> {
  const user = await requirePermission(P.beallitasWrite);
  const parsed = arazasiBeallitasSchema.safeParse({
    rezsiSzorzo: text(fd, "rezsiSzorzo"),
    haviFixKoltseg: text(fd, "haviFixKoltseg"),
    haviTermelekenyOrak: text(fd, "haviTermelekenyOrak"),
    oradijak: tablaMezok(fd, "oradijak", ORADIJ_KATEGORIAK),
    ugyfelSzorzok: tablaMezok(fd, "ugyfelSzorzok", UGYFEL_SZORZO_KULCSOK),
    anyagPotlekok: tablaMezok(fd, "anyagPotlekok", ANYAG_POTLEK_KULCSOK),
    surgossegiSzorzok: tablaMezok(fd, "surgossegiSzorzok", SURGOSSEG_KULCSOK),
    afaKulcs: text(fd, "afaKulcs"),
    minKiszallasiDij: text(fd, "minKiszallasiDij"),
    minProjektDij: text(fd, "minProjektDij"),
  });
  if (!parsed.success)
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  const r = await arlistaApi.saveBeallitasok(parsed.data, user.id);
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/arlista/beallitasok");
  revalidatePath("/arlista/szolgaltatasok");
  return { success: true, message: "Árképzési beállítások mentve." };
}
