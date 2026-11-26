"use server";

import { revalidatePath } from "next/cache";
import { requireAnyPermission, requirePermission } from "@erp/auth";
import { partnerApi } from "@erp/partner";
import {
  projektApi,
  type HetiSzereplo,
  type ProjektResult,
  type Szereplo,
} from "@erp/projekt";
import {
  PROJEKT_PERMISSIONS as P,
  type HetiAllapot,
  type ProjektAllapot,
  type StagingJovahagyas,
} from "@erp/projekt/client";
import {
  alaprajzSchema,
  checklistTetelSchema,
  fazisSchema,
  hetiTervSchema,
  koltsegSchema,
  projektSchema,
  sablonSchema,
  stagingJovahagyasSchema,
  stagingLinkSchema,
  type AlaprajzInput,
  type ChecklistTetelInput,
  type FazisInput,
  type HetiTervInput,
  type SablonInput,
} from "@erp/projekt/validation";
import { kuldErtesitesek } from "@/lib/feladat-kapcsolat";

export type FormState =
  | { success: false; fieldErrors?: Record<string, string[]>; message?: string }
  | { success: true; message?: string; id?: string };

export type MuveletState = { success: boolean; message?: string };

function fieldErrors(issues: Array<{ path: PropertyKey[]; message: string }>) {
  const out: Record<string, string[]> = {};
  for (const i of issues)
    (out[i.path.map(String).join(".") || "form"] ??= []).push(i.message);
  return out;
}

const szereploOf = (u: { id: string; name: string }): Szereplo => ({
  id: u.id,
  nev: u.name || "Ismeretlen",
});
const hetiSzereploOf = (u: {
  id: string;
  name: string;
  permissions: string[];
}): HetiSzereplo => ({
  ...szereploOf(u),
  delegalhat: u.permissions.includes(P.hetitervDelegal),
});

/** Sends the facade's notifications, refreshes the pages and maps the result. */
async function lezar(
  r: ProjektResult,
  message: string,
  paths: string[] = ["/projekt"],
): Promise<MuveletState> {
  if (!r.ok) return { success: false, message: r.message };
  await kuldErtesitesek(r.ertesitesek);
  for (const p of paths) revalidatePath(p);
  revalidatePath("/feladatok");
  return { success: true, message };
}

const projektUtak = (id: string) => ["/projekt", `/projekt/${id}`];

// ── Projekt ──────────────────────────────────────────────────────────────────────────────────
async function projektInput(fd: FormData) {
  const partnerId = String(fd.get("partnerId") ?? "") || undefined;
  let partnerNev: string | undefined;
  if (partnerId) {
    // The partner name is snapshotted at write time (the facade never imports @erp/partner).
    const opciok = await partnerApi.listPartnerOptions();
    partnerNev = opciok.find((p) => p.id === partnerId)?.nev;
  }
  return {
    nev: fd.get("nev") ?? "",
    partnerId,
    partnerNev,
    leiras: fd.get("leiras") || undefined,
    kategoria: fd.get("kategoria") || undefined,
    kezdet: fd.get("kezdet") || undefined,
    hatarido: fd.get("hatarido") || undefined,
    tervezettOrak: fd.get("tervezettOrak") || undefined,
    felelosId: fd.get("felelosId") || undefined,
    portalLathato: fd.get("portalLathato") === "on",
    belsoJegyzet: fd.get("belsoJegyzet") || undefined,
  };
}

export async function createProjektAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requirePermission(P.projektWrite);
  const parsed = projektSchema.safeParse(await projektInput(formData));
  if (!parsed.success)
    return { success: false, fieldErrors: fieldErrors(parsed.error.issues) };
  const r = await projektApi.createProjekt(
    { ...parsed.data, kezdet: parsed.data.kezdet, hatarido: parsed.data.hatarido },
    szereploOf(user),
  );
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/projekt");
  return { success: true, id: r.id, message: "Projekt felvéve." };
}

export async function updateProjektAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requirePermission(P.projektWrite);
  const parsed = projektSchema.safeParse(await projektInput(formData));
  if (!parsed.success)
    return { success: false, fieldErrors: fieldErrors(parsed.error.issues) };
  const r = await projektApi.updateProjekt(id, parsed.data, szereploOf(user));
  if (!r.ok) return { success: false, message: r.message };
  for (const p of projektUtak(id)) revalidatePath(p);
  return { success: true, id, message: "Projekt frissítve." };
}

export async function setAllapotAction(
  id: string,
  to: ProjektAllapot,
  jegyzet?: string,
): Promise<MuveletState> {
  const user = await requirePermission(P.projektWrite);
  return lezar(
    await projektApi.setAllapot(id, to, jegyzet, szereploOf(user)),
    "A projekt állapota megváltozott.",
    projektUtak(id),
  );
}

export async function setPortalLathatoAction(
  id: string,
  lathato: boolean,
): Promise<MuveletState> {
  await requirePermission(P.projektWrite);
  return lezar(
    await projektApi.setPortalLathato(id, lathato),
    lathato ? "A projekt látható a partnernek." : "A projekt rejtett a partner elől.",
    projektUtak(id),
  );
}

export async function archiveProjektAction(
  id: string,
  ok: string,
): Promise<MuveletState> {
  const user = await requirePermission(P.projektWrite);
  return lezar(
    await projektApi.archiveProjekt(id, ok, szereploOf(user)),
    "Projekt archiválva.",
    projektUtak(id),
  );
}

export async function restoreProjektAction(id: string): Promise<MuveletState> {
  await requirePermission(P.projektWrite);
  return lezar(
    await projektApi.restoreProjekt(id),
    "Projekt visszaállítva.",
    projektUtak(id),
  );
}

export async function deleteProjektAction(id: string): Promise<MuveletState> {
  await requirePermission(P.projektDelete);
  return lezar(await projektApi.deleteProjekt(id), "Projekt törölve.");
}

// ── Fázis / staging / checklist / alaprajz ───────────────────────────────────────────────────
export async function addFazisAction(
  id: string,
  input: FazisInput,
): Promise<MuveletState> {
  await requirePermission(P.projektWrite);
  const p = fazisSchema.safeParse(input);
  if (!p.success) return { success: false, message: p.error.issues[0]?.message };
  return lezar(await projektApi.addFazis(id, input), "Fázis hozzáadva.", projektUtak(id));
}

export async function updateFazisAction(
  id: string,
  fazisId: string,
  input: FazisInput,
): Promise<MuveletState> {
  await requirePermission(P.projektWrite);
  return lezar(
    await projektApi.updateFazis(id, fazisId, input),
    "Fázis frissítve.",
    projektUtak(id),
  );
}

export async function removeFazisAction(
  id: string,
  fazisId: string,
): Promise<MuveletState> {
  await requirePermission(P.projektWrite);
  return lezar(
    await projektApi.removeFazis(id, fazisId),
    "Fázis törölve.",
    projektUtak(id),
  );
}

export async function addStagingAction(
  id: string,
  input: { cimke: string; url: string },
): Promise<MuveletState> {
  const user = await requirePermission(P.projektWrite);
  const p = stagingLinkSchema.safeParse(input);
  if (!p.success) return { success: false, message: p.error.issues[0]?.message };
  return lezar(
    await projektApi.addStagingLink(id, p.data, szereploOf(user)),
    "Staging link hozzáadva.",
    projektUtak(id),
  );
}

export async function setStagingJovahagyasAction(
  id: string,
  linkId: string,
  jovahagyas: StagingJovahagyas,
  megjegyzes?: string,
): Promise<MuveletState> {
  const user = await requirePermission(P.projektWrite);
  const p = stagingJovahagyasSchema.safeParse({ jovahagyas, megjegyzes });
  if (!p.success) return { success: false, message: p.error.issues[0]?.message };
  return lezar(
    await projektApi.setStagingJovahagyas(id, linkId, p.data, szereploOf(user)),
    "Jóváhagyási állapot frissítve.",
    projektUtak(id),
  );
}

export async function removeStagingAction(
  id: string,
  linkId: string,
): Promise<MuveletState> {
  await requirePermission(P.projektWrite);
  return lezar(
    await projektApi.removeStagingLink(id, linkId),
    "Link törölve.",
    projektUtak(id),
  );
}

export async function addChecklistTetelAction(
  id: string,
  input: ChecklistTetelInput,
): Promise<MuveletState> {
  await requirePermission(P.projektWrite);
  const p = checklistTetelSchema.safeParse(input);
  if (!p.success) return { success: false, message: p.error.issues[0]?.message };
  return lezar(
    await projektApi.addChecklistTetel(id, input),
    "Tétel hozzáadva.",
    projektUtak(id),
  );
}

export async function removeChecklistTetelAction(
  id: string,
  tetelId: string,
): Promise<MuveletState> {
  await requirePermission(P.projektWrite);
  return lezar(
    await projektApi.removeChecklistTetel(id, tetelId),
    "Tétel törölve.",
    projektUtak(id),
  );
}

export async function setChecklistKeszAction(
  id: string,
  tetelId: string,
  kesz: boolean,
  mediaIds: string[] = [],
): Promise<MuveletState> {
  await requirePermission(P.projektWrite);
  return lezar(
    await projektApi.setChecklistKesz(id, tetelId, kesz, mediaIds),
    kesz ? "Tétel teljesítve." : "Tétel újranyitva.",
    projektUtak(id),
  );
}

export async function addMellekletAction(
  id: string,
  tetelId: string,
  mediaId: string,
): Promise<MuveletState> {
  await requirePermission(P.projektWrite);
  return lezar(
    await projektApi.addMelleklet(id, tetelId, mediaId),
    "Csatolmány hozzáadva.",
    projektUtak(id),
  );
}

export async function removeMellekletAction(
  id: string,
  tetelId: string,
  mediaId: string,
): Promise<MuveletState> {
  await requirePermission(P.projektWrite);
  return lezar(
    await projektApi.removeMelleklet(id, tetelId, mediaId),
    "Csatolmány eltávolítva.",
    projektUtak(id),
  );
}

export async function sablonAlkalmazAction(
  id: string,
  sablonId: string,
): Promise<MuveletState> {
  await requirePermission(P.sablonRead);
  await requirePermission(P.projektWrite);
  return lezar(
    await projektApi.sablonAlkalmaz(id, sablonId),
    "A sablon tételei hozzáadva.",
    projektUtak(id),
  );
}

export async function createAlaprajzAction(input: AlaprajzInput): Promise<MuveletState> {
  const user = await requirePermission(P.projektWrite);
  const p = alaprajzSchema.safeParse(input);
  if (!p.success) return { success: false, message: p.error.issues[0]?.message };
  return lezar(
    await projektApi.createAlaprajz(p.data, szereploOf(user)),
    "Alaprajz hozzáadva.",
    ["/projekt", ...(p.data.projektId ? [`/projekt/${p.data.projektId}`] : [])],
  );
}

export async function archiveAlaprajzAction(
  id: string,
  projektId: string,
  ok: string,
): Promise<MuveletState> {
  const user = await requirePermission(P.projektWrite);
  return lezar(
    await projektApi.archiveAlaprajz(id, ok, szereploOf(user)),
    "Alaprajz archiválva.",
    projektUtak(projektId),
  );
}

export async function restoreAlaprajzAction(
  id: string,
  projektId: string,
): Promise<MuveletState> {
  await requirePermission(P.projektWrite);
  return lezar(
    await projektApi.restoreAlaprajz(id),
    "Alaprajz visszaállítva.",
    projektUtak(projektId),
  );
}

// ── Költség ──────────────────────────────────────────────────────────────────────────────────
function koltsegInput(fd: FormData) {
  return {
    projektId: fd.get("projektId") ?? "",
    tipus: fd.get("tipus") ?? "",
    leiras: fd.get("leiras") || undefined,
    osszeg: fd.get("osszeg") ?? "",
    penznem: fd.get("penznem") || "HUF",
    datum: fd.get("datum") ?? "",
    bizonylatMediaId: fd.get("bizonylatMediaId") || undefined,
    munkalapId: fd.get("munkalapId") || undefined,
  };
}

export async function createKoltsegAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requirePermission(P.koltsegWrite);
  const parsed = koltsegSchema.safeParse(koltsegInput(formData));
  if (!parsed.success)
    return { success: false, fieldErrors: fieldErrors(parsed.error.issues) };
  const r = await projektApi.createKoltseg(parsed.data, szereploOf(user));
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/projekt/koltsegek");
  revalidatePath(`/projekt/${parsed.data.projektId}`);
  return { success: true, id: parsed.data.projektId, message: "Költség rögzítve." };
}

export async function updateKoltsegAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requirePermission(P.koltsegWrite);
  const parsed = koltsegSchema.safeParse(koltsegInput(formData));
  if (!parsed.success)
    return { success: false, fieldErrors: fieldErrors(parsed.error.issues) };
  const r = await projektApi.updateKoltseg(id, parsed.data);
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/projekt/koltsegek");
  return { success: true, id: parsed.data.projektId, message: "Költség frissítve." };
}

export async function archiveKoltsegAction(
  id: string,
  ok: string,
): Promise<MuveletState> {
  const user = await requirePermission(P.koltsegWrite);
  return lezar(
    await projektApi.archiveKoltseg(id, ok, szereploOf(user)),
    "Költség archiválva.",
    ["/projekt/koltsegek"],
  );
}

export async function restoreKoltsegAction(id: string): Promise<MuveletState> {
  await requirePermission(P.koltsegWrite);
  return lezar(await projektApi.restoreKoltseg(id), "Költség visszaállítva.", [
    "/projekt/koltsegek",
  ]);
}

export async function deleteKoltsegAction(id: string): Promise<MuveletState> {
  await requirePermission(P.koltsegDelete);
  return lezar(await projektApi.deleteKoltseg(id), "Költség törölve.", [
    "/projekt/koltsegek",
  ]);
}

// ── Heti terv ────────────────────────────────────────────────────────────────────────────────
const HETI_UTAK = ["/projekt/heti-terv"];
const hetiJogok = [P.hetitervWrite, P.hetitervDelegal];

export async function createHetiTervAction(input: HetiTervInput): Promise<MuveletState> {
  const user = await requireAnyPermission(hetiJogok);
  const p = hetiTervSchema.safeParse(input);
  if (!p.success) return { success: false, message: p.error.issues[0]?.message };
  return lezar(
    await projektApi.createHetiTerv(input, hetiSzereploOf(user)),
    "Heti terv felvéve.",
    HETI_UTAK,
  );
}

export async function updateHetiTervAction(
  id: string,
  input: HetiTervInput,
): Promise<MuveletState> {
  const user = await requireAnyPermission(hetiJogok);
  return lezar(
    await projektApi.updateHetiTerv(id, input, hetiSzereploOf(user)),
    "Heti terv frissítve.",
    HETI_UTAK,
  );
}

export async function setHetiAllapotAction(
  id: string,
  to: HetiAllapot,
): Promise<MuveletState> {
  const user = await requireAnyPermission(hetiJogok);
  return lezar(
    await projektApi.setHetiAllapot(id, to, hetiSzereploOf(user)),
    "Állapot frissítve.",
    HETI_UTAK,
  );
}

export async function archiveHetiTervAction(
  id: string,
  ok: string,
): Promise<MuveletState> {
  const user = await requireAnyPermission(hetiJogok);
  return lezar(
    await projektApi.archiveHetiTerv(id, ok, hetiSzereploOf(user)),
    "Heti terv archiválva.",
    HETI_UTAK,
  );
}

export async function restoreHetiTervAction(id: string): Promise<MuveletState> {
  const user = await requireAnyPermission(hetiJogok);
  return lezar(
    await projektApi.restoreHetiTerv(id, hetiSzereploOf(user)),
    "Heti terv visszaállítva.",
    HETI_UTAK,
  );
}

// ── Sablon ───────────────────────────────────────────────────────────────────────────────────
function sablonInput(fd: FormData) {
  let tetelek: unknown = [];
  try {
    tetelek = JSON.parse(String(fd.get("tetelek") ?? "[]"));
  } catch {
    tetelek = [];
  }
  return {
    nev: fd.get("nev") ?? "",
    leiras: fd.get("leiras") || undefined,
    kategoria: fd.get("kategoria") || undefined,
    tetelek: tetelek as SablonInput["tetelek"],
  };
}

export async function createSablonAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requirePermission(P.sablonWrite);
  const parsed = sablonSchema.safeParse(sablonInput(formData));
  if (!parsed.success)
    return { success: false, fieldErrors: fieldErrors(parsed.error.issues) };
  const r = await projektApi.createSablon(parsed.data, szereploOf(user));
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/projekt/sablonok");
  return { success: true, id: r.id, message: "Sablon felvéve." };
}

export async function updateSablonAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requirePermission(P.sablonWrite);
  const parsed = sablonSchema.safeParse(sablonInput(formData));
  if (!parsed.success)
    return { success: false, fieldErrors: fieldErrors(parsed.error.issues) };
  const r = await projektApi.updateSablon(id, parsed.data);
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/projekt/sablonok");
  return { success: true, id, message: "Sablon frissítve." };
}

export async function archiveSablonAction(id: string, ok: string): Promise<MuveletState> {
  const user = await requirePermission(P.sablonWrite);
  return lezar(
    await projektApi.archiveSablon(id, ok, szereploOf(user)),
    "Sablon archiválva.",
    ["/projekt/sablonok"],
  );
}

export async function restoreSablonAction(id: string): Promise<MuveletState> {
  await requirePermission(P.sablonWrite);
  return lezar(await projektApi.restoreSablon(id), "Sablon visszaállítva.", [
    "/projekt/sablonok",
  ]);
}

export async function deleteSablonAction(id: string): Promise<MuveletState> {
  await requirePermission(P.sablonDelete);
  return lezar(await projektApi.deleteSablon(id), "Sablon törölve.", [
    "/projekt/sablonok",
  ]);
}
