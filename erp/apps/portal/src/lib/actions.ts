"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { bizonylatApi } from "@erp/bizonylat";
import {
  acceptPortalInvitation,
  portalLogin,
  requestPortalPasswordReset,
  resetPortalPassword,
} from "@erp/portal-auth";
import { getPortalNezo, endPortalSession, startPortalSession } from "./portal-nezo";
import {
  portalCsapattagAktiv,
  portalCsapattagSzerepkor,
  portalHibajegyHozzaszol,
  portalHibajegyLetrehoz,
  portalIgazolasElfogad,
  portalIgazolasElutasit,
  portalMeghiv,
} from "./portal-api";
import { belepesLimiter, clientKey, igazolasDontesLimiter } from "./rate-limit";

export type ActionResult =
  { ok: true; message?: string; id?: string } | { ok: false; message: string };

const str = (f: FormData, k: string) => String(f.get(k) ?? "");
const TOO_MANY = "Túl sok próbálkozás. Kérjük, várjon egy kicsit, majd próbálja újra.";

async function limited(limiter: typeof belepesLimiter): Promise<boolean> {
  return !limiter.hit(clientKey(await headers())).ok;
}

// ── Authentication ──────────────────────────────────────────────────────────────

export async function loginAction(formData: FormData): Promise<ActionResult> {
  if (await limited(belepesLimiter)) return { ok: false, message: TOO_MANY };
  const r = await portalLogin(str(formData, "email"), str(formData, "password"));
  if (!r.ok) return { ok: false, message: r.message };
  await startPortalSession(r.identity);
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await endPortalSession();
  redirect("/login");
}

export async function acceptInviteAction(formData: FormData): Promise<ActionResult> {
  if (await limited(belepesLimiter)) return { ok: false, message: TOO_MANY };
  if (str(formData, "password") !== str(formData, "password2"))
    return { ok: false, message: "A két jelszó nem egyezik." };
  const r = await acceptPortalInvitation(
    str(formData, "token"),
    str(formData, "password"),
  );
  if (!r.ok) return { ok: false, message: r.message };
  await startPortalSession(r.identity);
  redirect("/");
}

export async function requestResetAction(formData: FormData): Promise<ActionResult> {
  if (await limited(belepesLimiter)) return { ok: false, message: TOO_MANY };
  await requestPortalPasswordReset(str(formData, "email"));
  return {
    ok: true,
    message:
      "Ha az e-mail cím szerepel a rendszerben, elküldtük a visszaállító hivatkozást.",
  };
}

export async function resetPasswordAction(formData: FormData): Promise<ActionResult> {
  if (await limited(belepesLimiter)) return { ok: false, message: TOO_MANY };
  if (str(formData, "password") !== str(formData, "password2"))
    return { ok: false, message: "A két jelszó nem egyezik." };
  const r = await resetPortalPassword(str(formData, "token"), str(formData, "password"));
  if (!r.ok) return { ok: false, message: r.message };
  return { ok: true, message: "A jelszó módosítva. Most már beléphet." };
}

// ── Hibajegyek ──────────────────────────────────────────────────────────────────

export async function createTicketAction(formData: FormData): Promise<ActionResult> {
  const nezo = await getPortalNezo();
  const r = await portalHibajegyLetrehoz(nezo, {
    targy: str(formData, "targy"),
    leiras: str(formData, "leiras"),
    prioritas: str(formData, "prioritas") || "kozepes",
    helyszin: str(formData, "helyszin") || undefined,
  });
  if (!r.ok) return { ok: false, message: r.message };
  revalidatePath("/hibajegyek");
  return { ok: true, id: r.id, message: "A hibajegy rögzítve." };
}

export async function commentTicketAction(formData: FormData): Promise<ActionResult> {
  const nezo = await getPortalNezo();
  const r = await portalHibajegyHozzaszol(
    nezo,
    str(formData, "id"),
    str(formData, "uzenet"),
  );
  if (!r.ok) return { ok: false, message: r.message };
  revalidatePath(`/hibajegyek/${str(formData, "id")}`);
  return { ok: true, message: "Megjegyzés rögzítve." };
}

// ── Teljesítésigazolás (bejelentkezve) ──────────────────────────────────────────

export async function acceptCertificateAction(
  id: string,
  adat: { nev: string; beosztas: string; kep: string },
): Promise<ActionResult> {
  const nezo = await getPortalNezo();
  const r = await portalIgazolasElfogad(nezo, id, adat);
  if (!r.ok) return { ok: false, message: r.message };
  revalidatePath(`/teljesitesigazolasok/${id}`);
  return { ok: true, message: "Az igazolást elfogadta, köszönjük." };
}

export async function rejectCertificateAction(
  id: string,
  adat: { ok: string },
): Promise<ActionResult> {
  const nezo = await getPortalNezo();
  const r = await portalIgazolasElutasit(nezo, id, adat);
  if (!r.ok) return { ok: false, message: r.message };
  revalidatePath(`/teljesitesigazolasok/${id}`);
  return { ok: true, message: "Az igazolást elutasította." };
}

// ── Csapat ──────────────────────────────────────────────────────────────────────

export async function inviteColleagueAction(formData: FormData): Promise<ActionResult> {
  const nezo = await getPortalNezo();
  const r = await portalMeghiv(nezo, {
    email: str(formData, "email"),
    name: str(formData, "name"),
    rolak: [str(formData, "szerepkor") || "partner-viewer"],
  });
  if (!r.ok) return { ok: false, message: r.message };
  revalidatePath("/csapat");
  return {
    ok: true,
    message: r.emailSent
      ? "A meghívót elküldtük e-mailben."
      : r.devLink
        ? `Az e-mail nem ment ki (SMTP). Fejlesztői hivatkozás: ${r.devLink}`
        : "A meghívó létrejött, de az e-mail küldése nem sikerült.",
  };
}

export async function toggleColleagueAction(formData: FormData): Promise<ActionResult> {
  const nezo = await getPortalNezo();
  const r = await portalCsapattagAktiv(
    nezo,
    str(formData, "id"),
    str(formData, "aktiv") === "1",
  );
  if (!r.ok) return { ok: false, message: r.message };
  revalidatePath("/csapat");
  return { ok: true };
}

export async function setColleagueRoleAction(formData: FormData): Promise<ActionResult> {
  const nezo = await getPortalNezo();
  const r = await portalCsapattagSzerepkor(nezo, str(formData, "id"), [
    str(formData, "szerepkor"),
  ]);
  if (!r.ok) return { ok: false, message: r.message };
  revalidatePath("/csapat");
  return { ok: true, message: "Szerepkör módosítva." };
}

// ── Public magic link (no login): the one-time token is the credential ──────────

/** The token is only ever passed to the facade — never logged, never echoed back. */
export async function acceptCertificateByTokenAction(
  token: string,
  adat: { nev: string; beosztas: string; kep: string },
): Promise<ActionResult> {
  if (await limited(igazolasDontesLimiter)) return { ok: false, message: TOO_MANY };
  const r = await bizonylatApi.elfogadIgazolasTokennel(token, adat);
  return r.ok
    ? { ok: true, message: "Köszönjük, az igazolást elfogadta és aláírta." }
    : { ok: false, message: r.message };
}

export async function rejectCertificateByTokenAction(
  token: string,
  adat: { ok: string },
): Promise<ActionResult> {
  if (await limited(igazolasDontesLimiter)) return { ok: false, message: TOO_MANY };
  const r = await bizonylatApi.elutasitIgazolasTokennel(token, adat);
  return r.ok
    ? {
        ok: true,
        message: "Az igazolást elutasította. Munkatársunk felveszi Önnel a kapcsolatot.",
      }
    : { ok: false, message: r.message };
}
