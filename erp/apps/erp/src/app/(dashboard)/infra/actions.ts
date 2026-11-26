"use server";

import { revalidatePath } from "next/cache";
import { hasPermission, requirePermission } from "@erp/auth";
import { infraApi } from "@erp/infra";
import {
  envSzovegbol,
  type HozzaferesInput,
  type IntegracioInput,
  type OldalInput,
} from "@erp/infra/client";
import type {
  EllenorzesTetel,
  EsemenySor,
  LepesEredmeny,
  SzinkronEredmeny,
} from "@erp/infra";

export type UrlapAllapot =
  | { success: false; fieldErrors?: Record<string, string[]>; message?: string }
  | { success: true; message?: string; id?: string };

export type MuveletAllapot = { success: boolean; message?: string };

const TAB = "/infra";

const szoveg = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim() || undefined;
const szam = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? "").trim();
  return v === "" ? undefined : Number(v);
};
const jelolo = (fd: FormData, k: string) => fd.get(k) === "on";

function frissit(...utak: string[]) {
  for (const u of utak) revalidatePath(u);
}

function muvelet(
  r: { ok: true; uzenet?: string } | { ok: false; message: string },
  uzenet: string,
  utak: string[] = [TAB],
): MuveletAllapot {
  if (!r.ok) return { success: false, message: r.message };
  frissit(...utak, TAB);
  return { success: true, message: ("uzenet" in r && r.uzenet) || uzenet };
}

// ── Áttekintés ──────────────────────────────────────────────────────────────────────────────

export async function szinkronAction(): Promise<
  MuveletAllapot & { eredmeny?: SzinkronEredmeny }
> {
  const user = await requirePermission("infra:stack:muvelet");
  const r = await infraApi.szinkron(user.id);
  if (!r.ok) return { success: false, message: r.message };
  frissit(TAB, `${TAB}/stackek`, `${TAB}/oldalak`);
  const e = r.eredmeny;
  return {
    success: true,
    eredmeny: e,
    message: `Szinkron kész: ${e.stackek.osszes} stack (${e.stackek.uj} új), ${e.oldalak.osszes} oldal (${e.oldalak.uj} új).`,
  };
}

// ── Stackek ─────────────────────────────────────────────────────────────────────────────────

export async function frissitStackAction(id: string): Promise<MuveletAllapot> {
  const user = await requirePermission("infra:stack:muvelet");
  return muvelet(await infraApi.frissitStack(id, user.id), "Az image-ek frissítve.", [
    `${TAB}/stackek/${id}`,
    `${TAB}/stackek`,
  ]);
}

export async function inditStackAction(id: string): Promise<MuveletAllapot> {
  const user = await requirePermission("infra:stack:muvelet");
  return muvelet(await infraApi.inditStack(id, user.id), "A stack elindítva.", [
    `${TAB}/stackek/${id}`,
  ]);
}

export async function leallitStackAction(id: string): Promise<MuveletAllapot> {
  const user = await requirePermission("infra:stack:muvelet");
  return muvelet(await infraApi.leallitStack(id, user.id), "A stack leállítva.", [
    `${TAB}/stackek/${id}`,
  ]);
}

export async function konteinerUjrainditAction(
  id: string,
  konteiner: string,
): Promise<MuveletAllapot> {
  const user = await requirePermission("infra:stack:muvelet");
  return muvelet(
    await infraApi.konteinerUjraindit(id, konteiner, user.id),
    "A konténer újraindítva.",
    [`${TAB}/stackek/${id}`],
  );
}

export async function konteinerInditasAction(
  id: string,
  konteiner: string,
): Promise<MuveletAllapot> {
  const user = await requirePermission("infra:stack:muvelet");
  return muvelet(
    await infraApi.konteinerInditas(id, konteiner, user.id),
    "A konténer elindítva.",
    [`${TAB}/stackek/${id}`],
  );
}

export async function konteinerLeallitasAction(
  id: string,
  konteiner: string,
): Promise<MuveletAllapot> {
  const user = await requirePermission("infra:stack:muvelet");
  return muvelet(
    await infraApi.konteinerLeallitas(id, konteiner, user.id),
    "A konténer leállítva.",
    [`${TAB}/stackek/${id}`],
  );
}

export async function konteinerFrissitAction(
  id: string,
  konteiner: string,
): Promise<MuveletAllapot> {
  const user = await requirePermission("infra:stack:muvelet");
  return muvelet(
    await infraApi.konteinerFrissit(id, konteiner, user.id),
    "Az image frissítése lefutott.",
    [`${TAB}/stackek/${id}`],
  );
}

/** Container log tail for the "Napló" viewer (read permission is enough). */
export async function stackNaploAction(
  id: string,
  konteiner: string,
  tail: number,
): Promise<{ success: boolean; log?: string; message?: string }> {
  await requirePermission("infra:stack:read");
  try {
    return { success: true, log: await infraApi.stackNaplo(id, konteiner, tail) };
  } catch {
    return { success: false, message: "A napló nem olvasható." };
  }
}

/** Saves compose + env and redeploys. Needs both the edit and the operate permission. */
export async function mentesStackAction(
  id: string,
  compose: string,
  envSzoveg: string,
  pull: boolean,
): Promise<MuveletAllapot> {
  const user = await requirePermission("infra:stack:write");
  if (!(await hasPermission("infra:stack:muvelet")))
    return { success: false, message: "A telepítéshez stack műveleti jog is kell." };
  return muvelet(
    await infraApi.mentesStack(
      id,
      { compose, env: envSzovegbol(envSzoveg), pull },
      user.id,
    ),
    "A stack mentve és újratelepítve.",
    [`${TAB}/stackek/${id}`],
  );
}

export async function stackModositAction(
  id: string,
  _prev: UrlapAllapot,
  fd: FormData,
): Promise<UrlapAllapot> {
  await requirePermission("infra:stack:write");
  const r = await infraApi.stackModosit(id, {
    tipus: szoveg(fd, "tipus") as "projekt" | "szolgaltatas" | "rendszer" | undefined,
    partnerId: szoveg(fd, "partnerId") ?? null,
    leiras: szoveg(fd, "leiras") ?? "",
  });
  if (!r.ok) return { success: false, message: r.message };
  frissit(`${TAB}/stackek/${id}`, `${TAB}/stackek`);
  return { success: true, id, message: "Mentve." };
}

export async function ujStackAction(
  _prev: UrlapAllapot,
  fd: FormData,
): Promise<UrlapAllapot> {
  const user = await requirePermission("infra:stack:write");
  if (!(await hasPermission("infra:stack:muvelet")))
    return { success: false, message: "A létrehozáshoz stack műveleti jog is kell." };
  const r = await infraApi.ujStack(
    {
      nev: String(fd.get("nev") ?? ""),
      compose: String(fd.get("compose") ?? ""),
      env: envSzovegbol(String(fd.get("env") ?? "")),
      tipus: szoveg(fd, "tipus") as "projekt" | "szolgaltatas" | "rendszer" | undefined,
      partnerId: szoveg(fd, "partnerId"),
      leiras: szoveg(fd, "leiras"),
    },
    user.id,
  );
  if (!r.ok) return { success: false, message: r.message };
  frissit(`${TAB}/stackek`, TAB);
  return { success: true, id: r.stackId, message: r.uzenet };
}

export async function torolStackAction(id: string, nev: string): Promise<MuveletAllapot> {
  const user = await requirePermission("infra:stack:delete");
  return muvelet(await infraApi.torolStack(id, nev, user.id), "A stack törölve.", [
    `${TAB}/stackek`,
  ]);
}

// ── Oldalak ─────────────────────────────────────────────────────────────────────────────────

export type OldalMuveletEredmeny = {
  success: boolean;
  message?: string;
  id?: string;
  lepesek: LepesEredmeny[];
};

export async function ujOldalAction(input: OldalInput): Promise<OldalMuveletEredmeny> {
  const user = await requirePermission("infra:oldal:write");
  const r = await infraApi.ujOldal(input, user.id);
  if (r.ok)
    frissit(
      `${TAB}/oldalak`,
      TAB,
      ...(input.stackId ? [`${TAB}/stackek/${input.stackId}`] : []),
    );
  return { success: r.ok, message: r.message, id: r.id, lepesek: r.lepesek };
}

export async function modositOldalAction(
  id: string,
  patch: Parameters<typeof infraApi.modositOldal>[1],
): Promise<OldalMuveletEredmeny> {
  const user = await requirePermission("infra:oldal:write");
  const r = await infraApi.modositOldal(id, patch, user.id);
  if (r.ok) frissit(`${TAB}/oldalak`, `${TAB}/oldalak/${id}`, `${TAB}/stackek`);
  return { success: r.ok, message: r.message, id: r.id, lepesek: r.lepesek };
}

export async function ellenorizOldalAction(
  id: string,
): Promise<{ success: boolean; tetelek?: EllenorzesTetel[]; message?: string }> {
  await requirePermission("infra:oldal:read");
  try {
    return { success: true, tetelek: await infraApi.ellenorizOldal(id) };
  } catch {
    return { success: false, message: "Az ellenőrzés nem sikerült." };
  }
}

export async function sslMegujitAction(id: string): Promise<MuveletAllapot> {
  const user = await requirePermission("infra:oldal:write");
  return muvelet(await infraApi.sslMegujit(id, user.id), "Az SSL tanúsítvány rendben.", [
    `${TAB}/oldalak/${id}`,
  ]);
}

export async function torolOldalAction(
  id: string,
  dns: boolean,
  megerosit: string,
): Promise<MuveletAllapot> {
  const user = await requirePermission("infra:oldal:delete");
  const o = await infraApi.getOldal(id);
  if (!o || o.hostnevek[0] !== megerosit.trim().toLowerCase())
    return {
      success: false,
      message: "A beírt hostnév nem egyezik az oldal fő hostnevével.",
    };
  return muvelet(await infraApi.torolOldal(id, { dns }, user.id), "Az oldal törölve.", [
    `${TAB}/oldalak`,
  ]);
}

export async function esemenyekAction(
  celTipus: "stack" | "oldal",
  celId: string,
): Promise<EsemenySor[]> {
  await requirePermission(celTipus === "stack" ? "infra:stack:read" : "infra:oldal:read");
  return infraApi.listEsemenyek({ celTipus, celId, limit: 30 });
}

// ── Integrációk ─────────────────────────────────────────────────────────────────────────────

const HITELESITO: Record<string, string[]> = {
  cloudflare: ["api_token"],
  npm: ["email", "password"],
  portainer: ["api_key"],
  github: ["token"],
};

function integracioInput(fd: FormData): IntegracioInput {
  const szolgaltato = String(
    fd.get("szolgaltato") ?? "cloudflare",
  ) as IntegracioInput["szolgaltato"];
  const hitelesito: Record<string, string> = {};
  for (const m of HITELESITO[szolgaltato] ?? [])
    hitelesito[m] = String(fd.get(`h_${m}`) ?? "");
  return {
    szolgaltato,
    cimke: String(fd.get("cimke") ?? ""),
    alapUrl: String(fd.get("alapUrl") ?? ""),
    hitelesito,
    allowInsecureTls: jelolo(fd, "allowInsecureTls"),
    accountId: szoveg(fd, "accountId"),
    endpointId: szam(fd, "endpointId"),
    aktiv: jelolo(fd, "aktiv"),
  };
}

function eredmeny(
  r: { ok: true; id?: string } | { ok: false; message: string },
  message: string,
  utak: string[],
): UrlapAllapot {
  if (!r.ok) return { success: false, message: r.message };
  frissit(...utak);
  return { success: true, id: r.id, message };
}

export async function createIntegracioAction(
  _p: UrlapAllapot,
  fd: FormData,
): Promise<UrlapAllapot> {
  const user = await requirePermission("infra:integracio:write");
  return eredmeny(
    await infraApi.createIntegracio(integracioInput(fd), user.id),
    "Kapcsolat létrehozva.",
    [`${TAB}/integraciok`],
  );
}

export async function updateIntegracioAction(
  id: string,
  _p: UrlapAllapot,
  fd: FormData,
): Promise<UrlapAllapot> {
  await requirePermission("infra:integracio:write");
  return eredmeny(
    await infraApi.updateIntegracio(id, integracioInput(fd)),
    "Kapcsolat mentve.",
    [`${TAB}/integraciok`],
  );
}

export async function deleteIntegracioAction(id: string): Promise<MuveletAllapot> {
  await requirePermission("infra:integracio:delete");
  return muvelet(await infraApi.deleteIntegracio(id), "Kapcsolat törölve.", [
    `${TAB}/integraciok`,
  ]);
}

/** The "Teszt" button — returns only the outcome message, never anything about the credentials. */
export async function tesztIntegracioAction(id: string): Promise<MuveletAllapot> {
  await requirePermission("infra:integracio:write");
  const r = await infraApi.tesztIntegracio(id);
  revalidatePath(`${TAB}/integraciok`);
  revalidatePath(TAB);
  if (!r.ok) return { success: false, message: r.message };
  return { success: r.sikeres, message: r.uzenet };
}

// ── Sablonok ────────────────────────────────────────────────────────────────────────────────

function sablonAdat(fd: FormData) {
  return {
    nev: String(fd.get("nev") ?? ""),
    leiras: szoveg(fd, "leiras"),
    tipus: szoveg(fd, "tipus") as "projekt" | "szolgaltatas" | "rendszer" | undefined,
    compose: String(fd.get("compose") ?? ""),
    env: envSzovegbol(String(fd.get("env") ?? "")),
  };
}

export async function ujSablonAction(
  _prev: UrlapAllapot,
  fd: FormData,
): Promise<UrlapAllapot> {
  const user = await requirePermission("infra:sablon:write");
  const r = await infraApi.ujSablon(sablonAdat(fd), user.id);
  if (!r.ok) return { success: false, message: r.message };
  frissit(`${TAB}/sablonok`);
  return { success: true, id: r.id, message: "A sablon létrejött." };
}

export async function modositSablonAction(
  id: string,
  _prev: UrlapAllapot,
  fd: FormData,
): Promise<UrlapAllapot> {
  const user = await requirePermission("infra:sablon:write");
  const r = await infraApi.modositSablon(id, sablonAdat(fd), user.id);
  if (!r.ok) return { success: false, message: r.message };
  frissit(`${TAB}/sablonok`, `${TAB}/sablonok/${id}`);
  return { success: true, id, message: "A sablon mentve." };
}

export async function torolSablonAction(id: string): Promise<MuveletAllapot> {
  const user = await requirePermission("infra:sablon:delete");
  return muvelet(await infraApi.torolSablon(id, user.id), "A sablon törölve.", [
    `${TAB}/sablonok`,
  ]);
}

// ── Webhelyek és hozzáférések ───────────────────────────────────────────────────────────────

function webhelyAdat(fd: FormData) {
  return {
    nev: String(fd.get("nev") ?? ""),
    tipus: szoveg(fd, "tipus") as "wordpress" | "ftp" | "egyeb" | undefined,
    hostnevek: String(fd.get("hostnevek") ?? "")
      .split(/[\s,;]+/)
      .map((h) => h.trim())
      .filter(Boolean),
    partnerId: szoveg(fd, "partnerId"),
    tarhely: szoveg(fd, "tarhely"),
    lejarat: szoveg(fd, "lejarat"),
    megjegyzes: szoveg(fd, "megjegyzes"),
  };
}

export async function ujWebhelyAction(
  _prev: UrlapAllapot,
  fd: FormData,
): Promise<UrlapAllapot> {
  const user = await requirePermission("infra:webhely:write");
  const r = await infraApi.ujWebhely(webhelyAdat(fd), user.id);
  if (!r.ok) return { success: false, message: r.message };
  frissit(`${TAB}/webhelyek`);
  return { success: true, id: r.id, message: "A webhely felvéve." };
}

export async function modositWebhelyAction(
  id: string,
  _prev: UrlapAllapot,
  fd: FormData,
): Promise<UrlapAllapot> {
  const user = await requirePermission("infra:webhely:write");
  const r = await infraApi.modositWebhely(id, webhelyAdat(fd), user.id);
  if (!r.ok) return { success: false, message: r.message };
  frissit(`${TAB}/webhelyek`, `${TAB}/webhelyek/${id}`);
  return { success: true, id, message: "A webhely mentve." };
}

export async function torolWebhelyAction(id: string): Promise<MuveletAllapot> {
  const user = await requirePermission("infra:webhely:delete");
  return muvelet(
    await infraApi.torolWebhely(id, user.id),
    "A webhely és a hozzáférései törölve.",
    [`${TAB}/webhelyek`],
  );
}

export async function ellenorizWebhelyAction(id: string): Promise<MuveletAllapot> {
  const user = await requirePermission("infra:webhely:write");
  return muvelet(
    await infraApi.ellenorizWebhely(id, user.id),
    "Az ellenőrzés lefutott.",
    [`${TAB}/webhelyek/${id}`],
  );
}

export async function mentHozzaferesAction(
  webhelyId: string,
  hozzaferesId: string | null,
  input: HozzaferesInput,
): Promise<MuveletAllapot> {
  const user = await requirePermission("infra:hozzaferes:write");
  const r = hozzaferesId
    ? await infraApi.modositHozzaferes(hozzaferesId, input, user.id)
    : await infraApi.ujHozzaferes(webhelyId, input, user.id);
  return muvelet(r, hozzaferesId ? "A hozzáférés mentve." : "A hozzáférés felvéve.", [
    `${TAB}/webhelyek/${webhelyId}`,
  ]);
}

export async function torolHozzaferesAction(
  webhelyId: string,
  id: string,
): Promise<MuveletAllapot> {
  const user = await requirePermission("infra:hozzaferes:write");
  return muvelet(await infraApi.torolHozzaferes(id, user.id), "A hozzáférés törölve.", [
    `${TAB}/webhelyek/${webhelyId}`,
  ]);
}

/** Returns the plaintext once, to the browser that asked (audited). Needs the dedicated key. */
export async function hozzaferesJelszoAction(
  id: string,
): Promise<{ success: boolean; jelszo?: string; message?: string }> {
  const user = await requirePermission("infra:hozzaferes:titkos");
  const r = await infraApi.hozzaferesJelszo(id, user.id);
  return r.ok
    ? { success: true, jelszo: r.jelszo }
    : { success: false, message: r.message };
}

export async function probaHozzaferesAction(id: string): Promise<MuveletAllapot> {
  await requirePermission("infra:hozzaferes:read");
  const r = await infraApi.hozzaferesProba(id);
  return { success: r.ok, message: r.uzenet };
}
