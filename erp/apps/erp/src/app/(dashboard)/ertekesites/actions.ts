"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@erp/auth";
import { ertekesitesApi } from "@erp/ertekesites";
import { ERTEKESITES_PERMISSIONS as P, type Szereplo } from "@erp/ertekesites/client";
import {
  ajanlatAllapotSchema,
  ajanlatSchema,
  archivalasSchema,
  megrendeloAllapotSchema,
  megrendeloSchema,
  szerzodesAllapotSchema,
  szerzodesSablonSchema,
  szerzodesSchema,
  utankovetesSchema,
} from "@erp/ertekesites/validation";
import type { ArSnapshot } from "@erp/arlista";
import { arSnapshotPartnerhez, partnerPillanatkep } from "@/lib/ertekesites-loaders";

export type ErtekesitesFormState =
  | { success: false; fieldErrors?: Record<string, string[]>; message?: string }
  | { success: true; message?: string; id?: string };

export type EgyszeruEredmeny = { success: boolean; message?: string };

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

function jsonMezo(fd: FormData, key: string): unknown {
  try {
    return JSON.parse(String(fd.get(key) ?? "null"));
  } catch {
    return null;
  }
}

const szoveg = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return v == null ? undefined : String(v);
};

// ── Ajánlat ──────────────────────────────────────────────────────────────────

/** Frozen árlista price for a wizard line (the browser stores it in the line, the server re-validates). */
export async function arSnapshotAction(
  tetelId: string,
  partnerId: string,
  egysegDb?: number,
): Promise<{ ok: true; snapshot: ArSnapshot } | { ok: false; message: string }> {
  await requirePermission(P.ajanlatWrite);
  return arSnapshotPartnerhez(tetelId, partnerId, { egysegDb });
}

function ajanlatBemenet(fd: FormData) {
  return ajanlatSchema.safeParse({
    cim: szoveg(fd, "cim"),
    partnerId: szoveg(fd, "partnerId"),
    penznem: szoveg(fd, "penznem") || undefined,
    ervenyesseg: szoveg(fd, "ervenyesseg"),
    megjegyzes: szoveg(fd, "megjegyzes"),
    uzletiEgyseg: szoveg(fd, "uzletiEgyseg"),
    globalisKedvezmenySzazalek: szoveg(fd, "globalisKedvezmenySzazalek") || 0,
    sorok: jsonMezo(fd, "sorok") ?? [],
  });
}

export async function createAjanlatAction(
  _prev: ErtekesitesFormState,
  fd: FormData,
): Promise<ErtekesitesFormState> {
  const user = await requirePermission(P.ajanlatWrite);
  const parsed = ajanlatBemenet(fd);
  if (!parsed.success) return { success: false, fieldErrors: hibak(parsed.error.issues) };
  const partner = await partnerPillanatkep(parsed.data.partnerId);
  if (!partner)
    return { success: false, fieldErrors: { partnerId: ["A partner nem található"] } };
  const r = await ertekesitesApi.createAjanlat(parsed.data, partner, szereploOf(user));
  revalidatePath("/ertekesites/ajanlatok");
  return { success: true, id: r.id, message: "Ajánlat felvéve." };
}

export async function updateAjanlatAction(
  id: string,
  _prev: ErtekesitesFormState,
  fd: FormData,
): Promise<ErtekesitesFormState> {
  await requirePermission(P.ajanlatWrite);
  const parsed = ajanlatBemenet(fd);
  if (!parsed.success) return { success: false, fieldErrors: hibak(parsed.error.issues) };
  const partner = await partnerPillanatkep(parsed.data.partnerId);
  if (!partner)
    return { success: false, fieldErrors: { partnerId: ["A partner nem található"] } };
  const r = await ertekesitesApi.updateAjanlat(id, parsed.data, partner);
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/ertekesites/ajanlatok");
  revalidatePath(`/ertekesites/ajanlatok/${id}`);
  return { success: true, id, message: "Ajánlat mentve." };
}

export async function ajanlatAllapotAction(
  id: string,
  _prev: ErtekesitesFormState,
  fd: FormData,
): Promise<ErtekesitesFormState> {
  const parsed = ajanlatAllapotSchema.safeParse({
    allapot: szoveg(fd, "allapot"),
    megjegyzes: szoveg(fd, "megjegyzes"),
    elvesztesOka: szoveg(fd, "elvesztesOka") || undefined,
    elvesztesMegjegyzes: szoveg(fd, "elvesztesMegjegyzes"),
  });
  // Sending is its own permission; every other transition needs the write permission.
  const user = await requirePermission(
    parsed.success && parsed.data.allapot === "elkuldve" ? P.ajanlatKuld : P.ajanlatWrite,
  );
  if (!parsed.success) return { success: false, fieldErrors: hibak(parsed.error.issues) };
  const r = await ertekesitesApi.changeAjanlatAllapot(id, parsed.data, szereploOf(user));
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/ertekesites/ajanlatok");
  revalidatePath(`/ertekesites/ajanlatok/${id}`);
  return { success: true, id, message: "Állapot módosítva." };
}

export async function utankovetesAction(
  id: string,
  _prev: ErtekesitesFormState,
  fd: FormData,
): Promise<ErtekesitesFormState> {
  await requirePermission(P.ajanlatWrite);
  const parsed = utankovetesSchema.safeParse({
    utankovetes: szoveg(fd, "utankovetes"),
    utankovetesMegjegyzes: szoveg(fd, "utankovetesMegjegyzes"),
    kovetkezoLepes: szoveg(fd, "kovetkezoLepes"),
    kovetkezoLepesIdopont: szoveg(fd, "kovetkezoLepesIdopont"),
  });
  if (!parsed.success) return { success: false, fieldErrors: hibak(parsed.error.issues) };
  const r = await ertekesitesApi.setUtankovetes(id, parsed.data);
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath(`/ertekesites/ajanlatok/${id}`);
  return { success: true, id, message: "Utánkövetés mentve." };
}

export async function archivAjanlatAction(
  id: string,
  _prev: ErtekesitesFormState,
  fd: FormData,
): Promise<ErtekesitesFormState> {
  const user = await requirePermission(P.ajanlatWrite);
  const parsed = archivalasSchema.safeParse({ ok: szoveg(fd, "ok") });
  if (!parsed.success) return { success: false, fieldErrors: hibak(parsed.error.issues) };
  const r = await ertekesitesApi.archivAjanlat(id, parsed.data.ok, szereploOf(user));
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/ertekesites/ajanlatok");
  revalidatePath(`/ertekesites/ajanlatok/${id}`);
  return { success: true, id, message: "Ajánlat archiválva." };
}

export async function visszaallitAjanlatAction(
  id: string,
  _prev: ErtekesitesFormState,
): Promise<ErtekesitesFormState> {
  await requirePermission(P.ajanlatDelete);
  const r = await ertekesitesApi.restoreAjanlat(id);
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/ertekesites/ajanlatok");
  revalidatePath(`/ertekesites/ajanlatok/${id}`);
  return { success: true, id, message: "Ajánlat visszaállítva." };
}

// ── Szerződés és sablon ──────────────────────────────────────────────────────

export async function saveSablonAction(
  id: string | null,
  _prev: ErtekesitesFormState,
  fd: FormData,
): Promise<ErtekesitesFormState> {
  await requirePermission(P.szerzodesWrite);
  const parsed = szerzodesSablonSchema.safeParse({
    nev: szoveg(fd, "nev"),
    kategoria: szoveg(fd, "kategoria"),
    leiras: szoveg(fd, "leiras"),
    szoveg: szoveg(fd, "szoveg"),
    digitalisAlairasKell: fd.get("digitalisAlairasKell") === "on",
    aktiv: fd.get("aktiv") === "on",
  });
  if (!parsed.success) return { success: false, fieldErrors: hibak(parsed.error.issues) };
  if (id) {
    const r = await ertekesitesApi.updateSablon(id, parsed.data);
    if (!r.ok) return { success: false, message: r.message };
    revalidatePath("/ertekesites/szerzodesek/sablonok");
    return { success: true, id, message: "Sablon mentve." };
  }
  const r = await ertekesitesApi.createSablon(parsed.data);
  revalidatePath("/ertekesites/szerzodesek/sablonok");
  return { success: true, id: r.id, message: "Sablon felvéve." };
}

function szerzodesBemenet(fd: FormData) {
  return szerzodesSchema.safeParse({
    tipus: szoveg(fd, "tipus"),
    nev: szoveg(fd, "nev"),
    kategoria: szoveg(fd, "kategoria"),
    partnerId: szoveg(fd, "partnerId"),
    sablonId: szoveg(fd, "sablonId") || undefined,
    valtozok: jsonMezo(fd, "valtozok") ?? {},
    fajlHivatkozas: szoveg(fd, "fajlHivatkozas"),
    fajlNev: szoveg(fd, "fajlNev"),
    alairasTipus: szoveg(fd, "alairasTipus") || undefined,
    ervenyessegKezdete: szoveg(fd, "ervenyessegKezdete"),
    ervenyessegVege: szoveg(fd, "ervenyessegVege"),
    projektId: szoveg(fd, "projektId"),
    portalLathato: fd.get("portalLathato") === "on",
    megjegyzes: szoveg(fd, "megjegyzes"),
  });
}

export async function createSzerzodesAction(
  _prev: ErtekesitesFormState,
  fd: FormData,
): Promise<ErtekesitesFormState> {
  const user = await requirePermission(P.szerzodesWrite);
  const parsed = szerzodesBemenet(fd);
  if (!parsed.success) return { success: false, fieldErrors: hibak(parsed.error.issues) };
  const partner = await partnerPillanatkep(parsed.data.partnerId);
  if (!partner)
    return { success: false, fieldErrors: { partnerId: ["A partner nem található"] } };
  const r = await ertekesitesApi.createSzerzodes(parsed.data, partner, szereploOf(user));
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/ertekesites/szerzodesek");
  return { success: true, id: r.id, message: "Szerződés felvéve." };
}

export async function updateSzerzodesAction(
  id: string,
  _prev: ErtekesitesFormState,
  fd: FormData,
): Promise<ErtekesitesFormState> {
  await requirePermission(P.szerzodesWrite);
  const parsed = szerzodesBemenet(fd);
  if (!parsed.success) return { success: false, fieldErrors: hibak(parsed.error.issues) };
  const partner = await partnerPillanatkep(parsed.data.partnerId);
  if (!partner)
    return { success: false, fieldErrors: { partnerId: ["A partner nem található"] } };
  const r = await ertekesitesApi.updateSzerzodes(id, parsed.data, partner);
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/ertekesites/szerzodesek");
  revalidatePath(`/ertekesites/szerzodesek/${id}`);
  return { success: true, id, message: "Szerződés mentve." };
}

export async function szerzodesAllapotAction(
  id: string,
  _prev: ErtekesitesFormState,
  fd: FormData,
): Promise<ErtekesitesFormState> {
  const parsed = szerzodesAllapotSchema.safeParse({
    allapot: szoveg(fd, "allapot"),
    megjegyzes: szoveg(fd, "megjegyzes"),
    ugyfelNev: szoveg(fd, "ugyfelNev"),
    alairasAdat: szoveg(fd, "alairasAdat"),
  });
  const user = await requirePermission(
    parsed.success && parsed.data.allapot === "torolt"
      ? P.szerzodesDelete
      : P.szerzodesWrite,
  );
  if (!parsed.success) return { success: false, fieldErrors: hibak(parsed.error.issues) };
  const r = await ertekesitesApi.changeSzerzodesAllapot(
    id,
    parsed.data,
    szereploOf(user),
  );
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/ertekesites/szerzodesek");
  revalidatePath(`/ertekesites/szerzodesek/${id}`);
  return { success: true, id, message: "Állapot módosítva." };
}

// ── Megrendelőlap ────────────────────────────────────────────────────────────

function megrendeloBemenet(fd: FormData) {
  return megrendeloSchema.safeParse({
    beszallitoId: szoveg(fd, "beszallitoId"),
    projektId: szoveg(fd, "projektId"),
    ajanlatId: szoveg(fd, "ajanlatId"),
    penznem: szoveg(fd, "penznem") || undefined,
    varhatoSzallitas: szoveg(fd, "varhatoSzallitas"),
    megjegyzes: szoveg(fd, "megjegyzes"),
    sorok: jsonMezo(fd, "sorok") ?? [],
  });
}

export async function createMegrendeloAction(
  _prev: ErtekesitesFormState,
  fd: FormData,
): Promise<ErtekesitesFormState> {
  const user = await requirePermission(P.megrendeloWrite);
  const parsed = megrendeloBemenet(fd);
  if (!parsed.success) return { success: false, fieldErrors: hibak(parsed.error.issues) };
  const besz = await partnerPillanatkep(parsed.data.beszallitoId);
  if (!besz)
    return {
      success: false,
      fieldErrors: { beszallitoId: ["A beszállító nem található"] },
    };
  const r = await ertekesitesApi.createMegrendelo(
    parsed.data,
    { beszallitoNev: besz.partnerNev },
    szereploOf(user),
  );
  revalidatePath("/ertekesites/megrendelok");
  return { success: true, id: r.id, message: "Megrendelőlap felvéve." };
}

export async function updateMegrendeloAction(
  id: string,
  _prev: ErtekesitesFormState,
  fd: FormData,
): Promise<ErtekesitesFormState> {
  await requirePermission(P.megrendeloWrite);
  const parsed = megrendeloBemenet(fd);
  if (!parsed.success) return { success: false, fieldErrors: hibak(parsed.error.issues) };
  const besz = await partnerPillanatkep(parsed.data.beszallitoId);
  if (!besz)
    return {
      success: false,
      fieldErrors: { beszallitoId: ["A beszállító nem található"] },
    };
  const r = await ertekesitesApi.updateMegrendelo(id, parsed.data, {
    beszallitoNev: besz.partnerNev,
  });
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/ertekesites/megrendelok");
  revalidatePath(`/ertekesites/megrendelok/${id}`);
  return { success: true, id, message: "Megrendelőlap mentve." };
}

export async function megrendeloAllapotAction(
  id: string,
  _prev: ErtekesitesFormState,
  fd: FormData,
): Promise<ErtekesitesFormState> {
  const kulcs = szoveg(fd, "allapot");
  if (kulcs === "teljesitve") {
    const user = await requirePermission(P.megrendeloWrite);
    // The keszlet module is not bound yet: no receipt port is passed, the order is only fulfilled.
    const r = await ertekesitesApi.teljesitMegrendelo(id, szereploOf(user));
    if (!r.ok) return { success: false, message: r.message };
    revalidatePath(`/ertekesites/megrendelok/${id}`);
    revalidatePath("/ertekesites/megrendelok");
    return { success: true, id, message: "Megrendelőlap teljesítve." };
  }
  const parsed = megrendeloAllapotSchema.safeParse({
    allapot: kulcs,
    megjegyzes: szoveg(fd, "megjegyzes"),
  });
  const user = await requirePermission(
    parsed.success && parsed.data.allapot === "torolt"
      ? P.megrendeloDelete
      : P.megrendeloWrite,
  );
  if (!parsed.success) return { success: false, fieldErrors: hibak(parsed.error.issues) };
  const r = await ertekesitesApi.changeMegrendeloAllapot(
    id,
    parsed.data.allapot,
    szereploOf(user),
    parsed.data.megjegyzes,
  );
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/ertekesites/megrendelok");
  revalidatePath(`/ertekesites/megrendelok/${id}`);
  return { success: true, id, message: "Állapot módosítva." };
}

export async function archivMegrendeloAction(
  id: string,
  _prev: ErtekesitesFormState,
  fd: FormData,
): Promise<ErtekesitesFormState> {
  const user = await requirePermission(P.megrendeloDelete);
  const parsed = archivalasSchema.safeParse({ ok: szoveg(fd, "ok") });
  if (!parsed.success) return { success: false, fieldErrors: hibak(parsed.error.issues) };
  const r = await ertekesitesApi.archivMegrendelo(id, parsed.data.ok, szereploOf(user));
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/ertekesites/megrendelok");
  revalidatePath(`/ertekesites/megrendelok/${id}`);
  return { success: true, id, message: "Megrendelőlap archiválva." };
}

export async function visszaallitMegrendeloAction(
  id: string,
  _prev: ErtekesitesFormState,
): Promise<ErtekesitesFormState> {
  await requirePermission(P.megrendeloDelete);
  const r = await ertekesitesApi.restoreMegrendelo(id);
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/ertekesites/megrendelok");
  revalidatePath(`/ertekesites/megrendelok/${id}`);
  return { success: true, id, message: "Megrendelőlap visszaállítva." };
}
