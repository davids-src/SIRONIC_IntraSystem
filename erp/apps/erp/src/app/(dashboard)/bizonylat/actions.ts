"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@erp/auth";
import { sendMail, getAppUrl } from "@erp/mail";
import { bizonylatApi } from "@erp/bizonylat";
import {
  BIZONYLAT_PERMISSIONS as P,
  type SzallitolevelPreflight,
  type Szereplo,
} from "@erp/bizonylat/client";
import {
  archivalasSchema,
  igazolasSchema,
  jotallasAllapotSchema,
  jotallasSchema,
  jotallasiSzovegSchema,
  megjegyzesSchema,
  szallitolevelSchema,
  szamlaSchema,
} from "@erp/bizonylat/validation";
import {
  betoltImportAdat,
  billingoPort,
  bizonylatPartner,
  keszletKiadasPort,
  type ImportBetoltes,
} from "@/lib/bizonylat-loaders";

export type BizonylatFormState =
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

const NINCS_PARTNER: BizonylatFormState = {
  success: false,
  fieldErrors: { partnerId: ["A partner nem található"] },
};

// ── Szállítólevél ──────────────────────────────────────────────────────────────

function szallitolevelBemenet(fd: FormData) {
  return szallitolevelSchema.safeParse({
    partnerId: szoveg(fd, "partnerId"),
    projektId: szoveg(fd, "projektId"),
    kiadasNap: szoveg(fd, "kiadasNap"),
    megjegyzes: szoveg(fd, "megjegyzes"),
    sorok: jsonMezo(fd, "sorok") ?? [],
  });
}

export async function createSzallitolevelAction(
  _prev: BizonylatFormState,
  fd: FormData,
): Promise<BizonylatFormState> {
  const user = await requirePermission(P.szallitolevelWrite);
  const parsed = szallitolevelBemenet(fd);
  if (!parsed.success) return { success: false, fieldErrors: hibak(parsed.error.issues) };
  const partner = await bizonylatPartner(parsed.data.partnerId);
  if (!partner) return NINCS_PARTNER;
  const r = await bizonylatApi.createSzallitolevel(
    parsed.data,
    partner,
    szereploOf(user),
  );
  revalidatePath("/bizonylat/szallitolevelek");
  return { success: true, id: r.id, message: "Szállítólevél felvéve." };
}

export async function updateSzallitolevelAction(
  id: string,
  _prev: BizonylatFormState,
  fd: FormData,
): Promise<BizonylatFormState> {
  await requirePermission(P.szallitolevelWrite);
  const parsed = szallitolevelBemenet(fd);
  if (!parsed.success) return { success: false, fieldErrors: hibak(parsed.error.issues) };
  const partner = await bizonylatPartner(parsed.data.partnerId);
  if (!partner) return NINCS_PARTNER;
  const r = await bizonylatApi.updateSzallitolevel(id, parsed.data, partner);
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/bizonylat/szallitolevelek");
  revalidatePath(`/bizonylat/szallitolevelek/${id}`);
  return { success: true, id, message: "Szállítólevél mentve." };
}

/** Data of the PreflightDialog: availability per line + same-day duplicates. */
export async function preflightSzallitolevelAction(
  id: string,
): Promise<{ ok: true; adat: SzallitolevelPreflight } | { ok: false; message: string }> {
  const user = await requirePermission(P.szallitolevelRead);
  const adat = await bizonylatApi.preflightSzallitolevel(id, keszletKiadasPort(user.id));
  return adat
    ? { ok: true, adat }
    : { ok: false, message: "A szállítólevél nem található" };
}

export async function kiadSzallitolevelAction(
  id: string,
  _prev: BizonylatFormState,
): Promise<BizonylatFormState> {
  const user = await requirePermission(P.szallitolevelKiad);
  const r = await bizonylatApi.kiadSzallitolevel(
    id,
    szereploOf(user),
    keszletKiadasPort(user.id),
  );
  revalidatePath("/bizonylat/szallitolevelek");
  revalidatePath(`/bizonylat/szallitolevelek/${id}`);
  if (!r.ok) return { success: false, message: r.message };
  return { success: true, id, message: "Szállítólevél kiadva, a készlet levonva." };
}

export async function ujraKiadSzallitolevelAction(
  id: string,
  _prev: BizonylatFormState,
): Promise<BizonylatFormState> {
  const user = await requirePermission(P.szallitolevelKiad);
  const r = await bizonylatApi.ujraKiadSzallitolevel(id, keszletKiadasPort(user.id));
  revalidatePath(`/bizonylat/szallitolevelek/${id}`);
  if (!r.ok) return { success: false, message: r.message };
  return { success: true, id, message: "A készletlevonás rendben lezajlott." };
}

export async function sztornoSzallitolevelAction(
  id: string,
  _prev: BizonylatFormState,
  fd: FormData,
): Promise<BizonylatFormState> {
  const user = await requirePermission(P.szallitolevelDelete);
  const parsed = megjegyzesSchema.safeParse({ megjegyzes: szoveg(fd, "megjegyzes") });
  const r = await bizonylatApi.sztornoSzallitolevel(
    id,
    szereploOf(user),
    parsed.success ? parsed.data.megjegyzes : undefined,
  );
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/bizonylat/szallitolevelek");
  revalidatePath(`/bizonylat/szallitolevelek/${id}`);
  return { success: true, id, message: r.uzenet ?? "Szállítólevél sztornózva." };
}

export async function archivSzallitolevelAction(
  id: string,
  _prev: BizonylatFormState,
  fd: FormData,
): Promise<BizonylatFormState> {
  const user = await requirePermission(P.szallitolevelDelete);
  const parsed = archivalasSchema.safeParse({ ok: szoveg(fd, "ok") });
  if (!parsed.success) return { success: false, fieldErrors: hibak(parsed.error.issues) };
  const r = await bizonylatApi.archivSzallitolevel(id, parsed.data.ok, szereploOf(user));
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/bizonylat/szallitolevelek");
  revalidatePath(`/bizonylat/szallitolevelek/${id}`);
  return { success: true, id, message: "Szállítólevél archiválva." };
}

export async function visszaallitSzallitolevelAction(
  id: string,
  _prev: BizonylatFormState,
): Promise<BizonylatFormState> {
  await requirePermission(P.szallitolevelDelete);
  const r = await bizonylatApi.restoreSzallitolevel(id);
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/bizonylat/szallitolevelek");
  revalidatePath(`/bizonylat/szallitolevelek/${id}`);
  return { success: true, id, message: "Szállítólevél visszaállítva." };
}

// ── Teljesítésigazolás ─────────────────────────────────────────────────────────

function igazolasBemenet(fd: FormData) {
  return igazolasSchema.safeParse({
    cim: szoveg(fd, "cim"),
    partnerId: szoveg(fd, "partnerId"),
    partnerEmail: szoveg(fd, "partnerEmail"),
    projektId: szoveg(fd, "projektId"),
    ajanlatId: szoveg(fd, "ajanlatId"),
    munkalapIds: jsonMezo(fd, "munkalapIds") ?? [],
    forras: szoveg(fd, "forras") || undefined,
    munkaOsszegzes: szoveg(fd, "munkaOsszegzes"),
    idoszakKezdet: szoveg(fd, "idoszakKezdet"),
    idoszakVege: szoveg(fd, "idoszakVege"),
    osszOra: szoveg(fd, "osszOra") || undefined,
    penznem: szoveg(fd, "penznem") || undefined,
    belsoMegjegyzes: szoveg(fd, "belsoMegjegyzes"),
    sorok: jsonMezo(fd, "sorok") ?? [],
  });
}

/** Loads the plain import data of an offer / project for the form's source picker. */
export async function importForrasAction(
  kind: "ajanlat" | "projekt",
  id: string,
): Promise<{ ok: true; betoltes: ImportBetoltes } | { ok: false; message: string }> {
  const user = await requirePermission(P.igazolasWrite);
  const betoltes = await betoltImportAdat(
    { userId: user.id, permissions: user.permissions },
    kind,
    id,
  );
  return betoltes
    ? { ok: true, betoltes }
    : { ok: false, message: "A forrás nem található vagy nincs hozzá jogosultságod" };
}

export async function createIgazolasAction(
  _prev: BizonylatFormState,
  fd: FormData,
): Promise<BizonylatFormState> {
  const user = await requirePermission(P.igazolasWrite);
  const parsed = igazolasBemenet(fd);
  if (!parsed.success) return { success: false, fieldErrors: hibak(parsed.error.issues) };
  const partner = await bizonylatPartner(parsed.data.partnerId);
  if (!partner) return NINCS_PARTNER;
  const r = await bizonylatApi.createIgazolas(parsed.data, partner, szereploOf(user));
  revalidatePath("/bizonylat/igazolasok");
  return { success: true, id: r.id, message: "Teljesítésigazolás felvéve." };
}

export async function updateIgazolasAction(
  id: string,
  _prev: BizonylatFormState,
  fd: FormData,
): Promise<BizonylatFormState> {
  await requirePermission(P.igazolasWrite);
  const parsed = igazolasBemenet(fd);
  if (!parsed.success) return { success: false, fieldErrors: hibak(parsed.error.issues) };
  const partner = await bizonylatPartner(parsed.data.partnerId);
  if (!partner) return NINCS_PARTNER;
  const r = await bizonylatApi.updateIgazolas(id, parsed.data, partner);
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/bizonylat/igazolasok");
  revalidatePath(`/bizonylat/igazolasok/${id}`);
  return { success: true, id, message: "Teljesítésigazolás mentve." };
}

/** Generates the magic link and mails it to the customer. */
export async function kuldIgazolasAction(
  id: string,
  _prev: BizonylatFormState,
): Promise<BizonylatFormState> {
  const user = await requirePermission(P.igazolasKuld);
  const alapUrl = getAppUrl();
  const r = await bizonylatApi.kuldIgazolas(id, szereploOf(user), { alapUrl });
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/bizonylat/igazolasok");
  revalidatePath(`/bizonylat/igazolasok/${id}`);
  let kuldve = false;
  try {
    const m = await sendMail({
      to: r.level.to,
      subject: r.level.subject,
      html: r.level.html,
      actorUserId: user.id,
    });
    kuldve = m.sent;
  } catch (e) {
    console.error("[bizonylat] igazolás e-mail küldése sikertelen", e);
  }
  return {
    success: true,
    id,
    message: kuldve
      ? `Elküldve: ${r.level.to}`
      : `Az igazolás „Elküldve” állapotú, de az e-mailt nem sikerült kiküldeni. Az aláíró hivatkozás (egyszer használható, ${new Date(r.level.lejar).toLocaleDateString("hu-HU")}-ig érvényes): ${alapUrl.replace(/\/+$/, "")}${r.level.linkUt}`,
  };
}

export async function archivIgazolasAction(
  id: string,
  _prev: BizonylatFormState,
  fd: FormData,
): Promise<BizonylatFormState> {
  const user = await requirePermission(P.igazolasDelete);
  const parsed = archivalasSchema.safeParse({ ok: szoveg(fd, "ok") });
  if (!parsed.success) return { success: false, fieldErrors: hibak(parsed.error.issues) };
  const r = await bizonylatApi.archivIgazolas(id, parsed.data.ok, szereploOf(user));
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/bizonylat/igazolasok");
  revalidatePath(`/bizonylat/igazolasok/${id}`);
  return { success: true, id, message: "Teljesítésigazolás archiválva." };
}

export async function visszaallitIgazolasAction(
  id: string,
  _prev: BizonylatFormState,
): Promise<BizonylatFormState> {
  await requirePermission(P.igazolasDelete);
  const r = await bizonylatApi.restoreIgazolas(id);
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/bizonylat/igazolasok");
  revalidatePath(`/bizonylat/igazolasok/${id}`);
  return { success: true, id, message: "Teljesítésigazolás visszaállítva." };
}

// ── Számla ─────────────────────────────────────────────────────────────────────

/** Creates an invoice draft from an accepted certificate (the "invoice draft task"). */
export async function szamlaIgazolasbolAction(
  igazolasId: string,
  _prev: BizonylatFormState,
): Promise<BizonylatFormState> {
  const user = await requirePermission(P.szamlaWrite);
  const ig = await bizonylatApi.getIgazolas(igazolasId, {
    kind: "staff",
    userId: user.id,
    belsoLathato: false,
  });
  if (!ig) return { success: false, message: "Az igazolás nem található" };
  if (ig.allapot !== "elfogadva")
    return { success: false, message: "Csak elfogadott igazolásból készíthető számla" };
  const parsed = szamlaSchema.safeParse({
    partnerId: ig.partnerId,
    cim: ig.cim,
    igazolasId: ig.id,
    penznem: ig.penznem,
    sorok: ig.sorok.map((s) => ({
      leiras: s.leiras,
      mennyiseg: s.mennyiseg,
      egyseg: s.egyseg,
      nettoEgysegar: s.nettoEgysegar,
      afaKulcs: s.afaKulcs,
    })),
  });
  if (!parsed.success)
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Érvénytelen adat",
    };
  const partner = await bizonylatPartner(ig.partnerId);
  if (!partner) return NINCS_PARTNER;
  const r = await bizonylatApi.createSzamla(parsed.data, partner, szereploOf(user));
  revalidatePath("/bizonylat/szamlak");
  return { success: true, id: r.id, message: "Számla piszkozat létrehozva." };
}

export async function kiallitSzamlaAction(
  id: string,
  _prev: BizonylatFormState,
): Promise<BizonylatFormState> {
  const user = await requirePermission(P.szamlaKiallit);
  const r = await bizonylatApi.kiallitSzamla(id, szereploOf(user), billingoPort());
  revalidatePath("/bizonylat/szamlak");
  revalidatePath(`/bizonylat/szamlak/${id}`);
  if (!r.ok) return { success: false, message: r.message };
  return { success: true, id, message: "Számla kiállítva." };
}

export async function szamlaAllapotAction(
  id: string,
  _prev: BizonylatFormState,
  fd: FormData,
): Promise<BizonylatFormState> {
  const kulcs = szoveg(fd, "allapot");
  if (kulcs !== "elkuldve" && kulcs !== "kifizetve" && kulcs !== "sztorno")
    return { success: false, message: "Érvénytelen állapot" };
  const user = await requirePermission(
    kulcs === "sztorno" ? P.szamlaDelete : P.szamlaWrite,
  );
  const parsed = megjegyzesSchema.safeParse({ megjegyzes: szoveg(fd, "megjegyzes") });
  const r = await bizonylatApi.changeSzamlaAllapot(
    id,
    kulcs,
    szereploOf(user),
    parsed.success ? parsed.data.megjegyzes : undefined,
  );
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/bizonylat/szamlak");
  revalidatePath(`/bizonylat/szamlak/${id}`);
  return { success: true, id, message: "Állapot módosítva." };
}

export async function szinkronSzamlaAction(
  id: string,
  _prev: BizonylatFormState,
): Promise<BizonylatFormState> {
  await requirePermission(P.szamlaWrite);
  const r = await bizonylatApi.szinkronSzamla(id, billingoPort());
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath(`/bizonylat/szamlak/${id}`);
  return { success: true, id, message: r.uzenet ?? "Szinkronizálva." };
}

export async function archivSzamlaAction(
  id: string,
  _prev: BizonylatFormState,
  fd: FormData,
): Promise<BizonylatFormState> {
  const user = await requirePermission(P.szamlaDelete);
  const parsed = archivalasSchema.safeParse({ ok: szoveg(fd, "ok") });
  if (!parsed.success) return { success: false, fieldErrors: hibak(parsed.error.issues) };
  const r = await bizonylatApi.archivSzamla(id, parsed.data.ok, szereploOf(user));
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/bizonylat/szamlak");
  revalidatePath(`/bizonylat/szamlak/${id}`);
  return { success: true, id, message: "Számla archiválva." };
}

export async function visszaallitSzamlaAction(
  id: string,
  _prev: BizonylatFormState,
): Promise<BizonylatFormState> {
  await requirePermission(P.szamlaDelete);
  const r = await bizonylatApi.restoreSzamla(id);
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/bizonylat/szamlak");
  revalidatePath(`/bizonylat/szamlak/${id}`);
  return { success: true, id, message: "Számla visszaállítva." };
}

// ── Jótállási jegy ─────────────────────────────────────────────────────────────

export async function createJotallasAction(
  _prev: BizonylatFormState,
  fd: FormData,
): Promise<BizonylatFormState> {
  const user = await requirePermission(P.jotallasWrite);
  const parsed = jotallasSchema.safeParse({
    partnerId: szoveg(fd, "partnerId"),
    szamlaszam: szoveg(fd, "szamlaszam"),
    kiallitasNap: szoveg(fd, "kiallitasNap"),
    megjegyzes: szoveg(fd, "megjegyzes"),
    sorok: jsonMezo(fd, "sorok") ?? [],
  });
  if (!parsed.success) return { success: false, fieldErrors: hibak(parsed.error.issues) };
  const partner = await bizonylatPartner(parsed.data.partnerId);
  if (!partner) return NINCS_PARTNER;
  const r = await bizonylatApi.createJotallas(parsed.data, partner, szereploOf(user));
  revalidatePath("/bizonylat/jotallasok");
  return { success: true, id: r.id, message: "Jótállási jegy kiállítva." };
}

export async function jotallasAllapotAction(
  id: string,
  _prev: BizonylatFormState,
  fd: FormData,
): Promise<BizonylatFormState> {
  const user = await requirePermission(P.jotallasWrite);
  const parsed = jotallasAllapotSchema.safeParse({
    allapot: szoveg(fd, "allapot"),
    megjegyzes: szoveg(fd, "megjegyzes"),
  });
  if (!parsed.success) return { success: false, fieldErrors: hibak(parsed.error.issues) };
  const r = await bizonylatApi.changeJotallasAllapot(
    id,
    parsed.data.allapot,
    szereploOf(user),
    parsed.data.megjegyzes,
  );
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/bizonylat/jotallasok");
  revalidatePath(`/bizonylat/jotallasok/${id}`);
  return { success: true, id, message: "Állapot módosítva." };
}

export async function archivJotallasAction(
  id: string,
  _prev: BizonylatFormState,
  fd: FormData,
): Promise<BizonylatFormState> {
  const user = await requirePermission(P.jotallasDelete);
  const parsed = archivalasSchema.safeParse({ ok: szoveg(fd, "ok") });
  if (!parsed.success) return { success: false, fieldErrors: hibak(parsed.error.issues) };
  const r = await bizonylatApi.archivJotallas(id, parsed.data.ok, szereploOf(user));
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/bizonylat/jotallasok");
  revalidatePath(`/bizonylat/jotallasok/${id}`);
  return { success: true, id, message: "Jótállási jegy archiválva." };
}

export async function visszaallitJotallasAction(
  id: string,
  _prev: BizonylatFormState,
): Promise<BizonylatFormState> {
  await requirePermission(P.jotallasDelete);
  const r = await bizonylatApi.restoreJotallas(id);
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/bizonylat/jotallasok");
  revalidatePath(`/bizonylat/jotallasok/${id}`);
  return { success: true, id, message: "Jótállási jegy visszaállítva." };
}

export async function saveJotallasiSzovegAction(
  _prev: BizonylatFormState,
  fd: FormData,
): Promise<BizonylatFormState> {
  const user = await requirePermission(P.jotallasWrite);
  const parsed = jotallasiSzovegSchema.safeParse({ szoveg: szoveg(fd, "szoveg") });
  if (!parsed.success) return { success: false, fieldErrors: hibak(parsed.error.issues) };
  const r = await bizonylatApi.setJotallasiSzoveg(parsed.data.szoveg, szereploOf(user));
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/bizonylat/beallitasok");
  return {
    success: true,
    message: "A jogi szöveg mentve. Csak az újonnan kiállított jegyekre érvényes.",
  };
}
