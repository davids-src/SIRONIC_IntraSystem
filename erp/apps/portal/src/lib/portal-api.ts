/**
 * Portal action layer: every function takes the viewer (`nezo`) as its FIRST argument and passes
 * it to the domain facade. The server actions in `actions.ts` obtain it from `getPortalNezo()`;
 * the integration test calls these functions directly with two partners' viewers.
 *
 * `scripts/verify-portal-isolation.mjs` fails CI if a facade call here lacks a `nezo` argument.
 */
import { bizonylatApi } from "@erp/bizonylat";
import { deploymentsApi } from "@erp/deployments";
import { projektApi } from "@erp/projekt";
import { szervizApi } from "@erp/szerviz";
import type { HibajegyPortalInput } from "@erp/szerviz/validation";
import {
  PORTAL_PERMISSIONS,
  getPortalColleague,
  invitePortalUser,
  listPortalColleagues,
  setPortalColleagueActive,
  setPortalColleagueRoles,
  type PortalColleague,
} from "@erp/portal-auth";
import { can, type PortalNezo } from "./nezo";

const PAGE = { page: 1, pageSize: 100 };
export type PortalFail = { ok: false; message: string };
const NINCS_JOG: PortalFail = { ok: false, message: "Ehhez nincs jogosultsága." };

// ── Dashboard ───────────────────────────────────────────────────────────────────

export async function portalMuszerfal(nezo: PortalNezo) {
  const [hibajegyek, munkalapok, igazolasok, szamlak, telepitesek, projektek] =
    await Promise.all([
      szervizApi.listHibajegyek(PAGE, nezo),
      szervizApi.listMunkalapok(PAGE, nezo),
      bizonylatApi.osszesitesIgazolas(nezo),
      bizonylatApi.listSzamlakPortal(PAGE, nezo),
      deploymentsApi.listPortalTelepitesek(nezo),
      projektApi.listProjektek(PAGE, nezo),
    ]);
  return {
    nyitottHibajegy: hibajegyek.data.filter((h) => h.allapot !== "lezart").length,
    munkalapDb: munkalapok.total,
    fuggoIgazolas: igazolasok.fuggoDb,
    lejartSzamla: szamlak.data.filter((s) => s.allapot === "lejart").length,
    telepitesDb: telepitesek.length,
    nyitottProjekt: projektek.data.filter((p) => p.allapot === "nyitott").length,
  };
}

// ── Hibajegyek ──────────────────────────────────────────────────────────────────

/** Lists are re-projected to the few columns the portal shows (defence in depth). */
export async function portalHibajegyek(nezo: PortalNezo) {
  const { data, total } = await szervizApi.listHibajegyek(PAGE, nezo);
  return {
    total,
    data: data.map((h) => ({
      _id: h._id,
      azonosito: h.azonosito,
      targy: h.targy,
      allapot: h.allapot,
      prioritas: h.prioritas,
      createdAt: h.createdAt,
    })),
  };
}

export const portalHibajegy = (nezo: PortalNezo, id: string) =>
  szervizApi.getHibajegy(id, nezo);

export async function portalHibajegyLetrehoz(
  nezo: PortalNezo,
  input: { targy: string; leiras: string; prioritas?: string; helyszin?: string },
) {
  if (!can(nezo, PORTAL_PERMISSIONS.ticketCreate)) return NINCS_JOG;
  return szervizApi.createHibajegyPortal(
    input as HibajegyPortalInput,
    nezo,
    { partnerNev: nezo.partnerNev },
    { id: nezo.portalUserId, nev: nezo.nev },
  );
}

/** Portal comments are never internal: `belso` is forced to false here and again in the facade. */
export async function portalHibajegyHozzaszol(
  nezo: PortalNezo,
  id: string,
  uzenet: string,
) {
  if (!can(nezo, PORTAL_PERMISSIONS.ticketComment)) return NINCS_JOG;
  return szervizApi.addMegjegyzes(
    id,
    { uzenet, belso: false },
    { id: nezo.portalUserId, nev: nezo.nev },
    nezo,
  );
}

// ── Munkalapok, projektek ───────────────────────────────────────────────────────

export async function portalMunkalapok(nezo: PortalNezo) {
  const { data, total } = await szervizApi.listMunkalapok(PAGE, nezo);
  return {
    total,
    data: data.map((m) => ({
      _id: m._id,
      azonosito: m.azonosito,
      munkaDatum: m.munkaDatum,
      kategoria: m.kategoria,
      munkaOra: m.munkaOra,
    })),
  };
}
export const portalMunkalap = (nezo: PortalNezo, id: string) =>
  szervizApi.getMunkalap(id, nezo);
export async function portalProjektek(nezo: PortalNezo) {
  const { data, total } = await projektApi.listProjektek(PAGE, nezo);
  return {
    total,
    data: data.map((p) => ({
      _id: p._id,
      azonosito: p.azonosito,
      nev: p.nev,
      allapot: p.allapot,
      hatarido: p.hatarido,
      szazalek: p.szazalek,
    })),
  };
}
export const portalProjekt = (nezo: PortalNezo, id: string) =>
  projektApi.getProjekt(id, nezo);

// ── Teljesítésigazolások ────────────────────────────────────────────────────────

export const portalIgazolasok = (nezo: PortalNezo) =>
  bizonylatApi.listIgazolasok(PAGE, nezo);
export const portalIgazolas = (nezo: PortalNezo, id: string) =>
  bizonylatApi.getIgazolas(id, nezo);

export async function portalIgazolasElfogad(
  nezo: PortalNezo,
  id: string,
  adat: { nev: string; beosztas: string; kep: string },
) {
  if (!can(nezo, PORTAL_PERMISSIONS.certificateDecide)) return NINCS_JOG;
  return bizonylatApi.elfogadIgazolas(id, nezo, adat);
}

export async function portalIgazolasElutasit(
  nezo: PortalNezo,
  id: string,
  adat: { ok: string },
) {
  if (!can(nezo, PORTAL_PERMISSIONS.certificateDecide)) return NINCS_JOG;
  return bizonylatApi.elutasitIgazolas(id, nezo, adat);
}

// ── Telepítések ─────────────────────────────────────────────────────────────────

export const portalTelepitesek = (nezo: PortalNezo) =>
  deploymentsApi.listPortalTelepitesek(nezo);
export const portalFizetesek = (nezo: PortalNezo) =>
  deploymentsApi.listPortalFizetesek(nezo);

// ── Számlák, jótállások (csak olvasás) ──────────────────────────────────────────

export const portalSzamlak = (nezo: PortalNezo) =>
  bizonylatApi.listSzamlakPortal(PAGE, nezo);
export const portalSzamla = (nezo: PortalNezo, id: string) =>
  bizonylatApi.getSzamlaPortal(id, nezo);
export const portalJotallasok = (nezo: PortalNezo) =>
  bizonylatApi.listJotallasokPortal(PAGE, nezo);
export const portalJotallas = (nezo: PortalNezo, id: string) =>
  bizonylatApi.getJotallasPortal(id, nezo);

// ── Csapat (partner-admin) ──────────────────────────────────────────────────────

export async function portalCsapat(nezo: PortalNezo): Promise<PortalColleague[]> {
  if (!can(nezo, PORTAL_PERMISSIONS.usersManage)) return [];
  return listPortalColleagues(nezo.partnerId);
}

export async function portalMeghiv(
  nezo: PortalNezo,
  input: { email: string; name: string; rolak: string[] },
) {
  if (!can(nezo, PORTAL_PERMISSIONS.usersManage)) return NINCS_JOG;
  // partnerId comes from the viewer: an admin can only ever invite into its own partner.
  return invitePortalUser({
    ...input,
    partnerId: nezo.partnerId,
    partnerNev: nezo.partnerNev,
    invitedBy: nezo.portalUserId,
    inviterName: nezo.nev,
  });
}

export async function portalCsapattagAktiv(
  nezo: PortalNezo,
  userId: string,
  active: boolean,
) {
  if (!can(nezo, PORTAL_PERMISSIONS.usersManage)) return NINCS_JOG;
  return setPortalColleagueActive(nezo.partnerId, nezo.portalUserId, userId, active);
}

export async function portalCsapattagSzerepkor(
  nezo: PortalNezo,
  userId: string,
  rolak: string[],
) {
  if (!can(nezo, PORTAL_PERMISSIONS.usersManage)) return NINCS_JOG;
  return setPortalColleagueRoles(nezo.partnerId, nezo.portalUserId, userId, rolak);
}

export async function portalCsapattag(nezo: PortalNezo, userId: string) {
  if (!can(nezo, PORTAL_PERMISSIONS.usersManage)) return null;
  return getPortalColleague(nezo.partnerId, userId);
}

// ── Telepítés-hozzáférés (partner-admin) ────────────────────────────────────────

export async function portalHozzaferesek(nezo: PortalNezo, telepitesId: string) {
  if (!can(nezo, PORTAL_PERMISSIONS.accessManage)) return [];
  return deploymentsApi.listHozzaferesekPortal(telepitesId, nezo);
}

/** Grants a colleague of the SAME partner access to one of the partner's own deployments. */
export async function portalHozzaferesBeallit(
  nezo: PortalNezo,
  input: { portalFelhasznaloId: string; telepitesId: string; engedelyezve: boolean },
) {
  if (!can(nezo, PORTAL_PERMISSIONS.accessManage)) return NINCS_JOG;
  const kollega = await getPortalColleague(nezo.partnerId, input.portalFelhasznaloId);
  if (!kollega) return { ok: false as const, message: "A felhasználó nem található." };
  if (!input.engedelyezve)
    return deploymentsApi.removeHozzaferesPortal(
      input.portalFelhasznaloId,
      input.telepitesId,
      nezo,
    );
  return deploymentsApi.setHozzaferesPortal(
    { portalFelhasznaloId: input.portalFelhasznaloId, telepitesId: input.telepitesId },
    nezo,
  );
}
