"use server";

import { revalidatePath } from "next/cache";
import { hasPermission, requirePermission } from "@erp/auth";
import { deploymentsApi } from "@erp/deployments";
import { partnerApi } from "@erp/partner";
import type {
  CsomagInput,
  IntegracioInput,
  SablonInput,
  TelepitesInput,
} from "@erp/deployments/client";

export type UrlapAllapot =
  | { success: false; fieldErrors?: Record<string, string[]>; message?: string }
  | { success: true; message?: string; id?: string };

export type MuveletAllapot = { success: boolean; message?: string };

const TAB = "/telepitesek";

function mezoHibak(message: string): UrlapAllapot {
  return { success: false, message };
}

const szoveg = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim() || undefined;
const szam = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? "").trim();
  return v === "" ? undefined : Number(v);
};
const jelolo = (fd: FormData, k: string) => fd.get(k) === "on";

/** `NEV=ertek` per line → env rows. `titkos` rows may omit the value (keeps the stored one). */
function envSorok(szovegesen: string | undefined, titkos: boolean) {
  return (szovegesen ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith("#"))
    .map((s) => {
      const i = s.indexOf("=");
      const nev = (i < 0 ? s : s.slice(0, i)).trim();
      const ertek = i < 0 ? "" : s.slice(i + 1);
      return { nev, ertek: ertek === "" && titkos ? undefined : ertek, titkos };
    });
}

function telepitesInput(fd: FormData): TelepitesInput {
  const dnsCel = szoveg(fd, "dnsCel");
  const celHost = szoveg(fd, "celHost");
  const imageRepo = szoveg(fd, "imageRepo");
  const stackNev = szoveg(fd, "stackNev");
  return {
    nev: String(fd.get("nev") ?? ""),
    domain: String(fd.get("domain") ?? ""),
    wwwAtiranyitas: jelolo(fd, "wwwAtiranyitas"),
    partnerId: szoveg(fd, "partnerId"),
    csoportId: szoveg(fd, "csoportId"),
    megjegyzes: szoveg(fd, "megjegyzes"),
    ...(dnsCel
      ? {
          dns: {
            rekordTipus: (szoveg(fd, "dnsTipus") ?? "A") as "A" | "CNAME",
            nev: undefined,
            cel: dnsCel,
            proxied: jelolo(fd, "dnsProxied"),
          },
        }
      : {}),
    ...(celHost
      ? {
          proxy: {
            celHost,
            celPort: szam(fd, "celPort") as number,
            celSema: (szoveg(fd, "celSema") ?? "http") as "http" | "https",
            websocket: true,
          },
        }
      : {}),
    ...(imageRepo
      ? {
          image: {
            repo: imageRepo,
            tag: szoveg(fd, "imageTag") ?? "latest",
            workflowId: szoveg(fd, "workflowId"),
            workflowRef: szoveg(fd, "workflowRef"),
          },
        }
      : {}),
    ...(stackNev
      ? {
          stack: {
            nev: stackNev,
            sablonId: szoveg(fd, "sablonId"),
            composeYaml: szoveg(fd, "composeYaml"),
            env: [
              ...envSorok(szoveg(fd, "env"), false),
              ...envSorok(szoveg(fd, "titkosEnv"), true),
            ],
          },
        }
      : {}),
    csomagId: szoveg(fd, "csomagId"),
    szamlazasiCiklus: szoveg(
      fd,
      "szamlazasiCiklus",
    ) as TelepitesInput["szamlazasiCiklus"],
    arFelulirasHuf: szam(fd, "arFelulirasHuf"),
  };
}

function eredmeny(
  r: { ok: true; id?: string } | { ok: false; message: string },
  message: string,
  utak: string[],
): UrlapAllapot {
  if (!r.ok) return mezoHibak(r.message);
  for (const u of utak) revalidatePath(u);
  return { success: true, id: r.id, message };
}

function muvelet(
  r: { ok: true } | { ok: false; message: string },
  message: string,
  utak: string[] = [TAB],
): MuveletAllapot {
  if (!r.ok) return { success: false, message: r.message };
  for (const u of utak) revalidatePath(u);
  return { success: true, message };
}

// ── Telepítés ────────────────────────────────────────────────────────────────────────────────

export async function createTelepitesAction(
  _prev: UrlapAllapot,
  fd: FormData,
): Promise<UrlapAllapot> {
  const user = await requirePermission("deployments:telepites:write");
  const r = await deploymentsApi.createTelepites(telepitesInput(fd), user.id);
  return eredmeny(r, "Telepítés létrehozva.", [TAB]);
}

export async function updateTelepitesAction(
  id: string,
  _prev: UrlapAllapot,
  fd: FormData,
): Promise<UrlapAllapot> {
  await requirePermission("deployments:telepites:write");
  const r = await deploymentsApi.updateTelepites(id, telepitesInput(fd));
  return eredmeny(r, "Telepítés mentve.", [TAB, `${TAB}/${id}`]);
}

export async function archivalTelepitesAction(
  id: string,
  ok: string,
): Promise<MuveletAllapot> {
  const user = await requirePermission("deployments:telepites:write");
  return muvelet(
    await deploymentsApi.archival(id, ok, user.id),
    "Telepítés archiválva.",
    [TAB, `${TAB}/${id}`],
  );
}

export async function visszaallitTelepitesAction(id: string): Promise<MuveletAllapot> {
  await requirePermission("deployments:telepites:write");
  return muvelet(await deploymentsApi.visszaallit(id), "Telepítés visszaállítva.", [
    TAB,
    `${TAB}/${id}`,
  ]);
}

export async function felfuggesztTelepitesAction(
  id: string,
  felfuggeszt: boolean,
): Promise<MuveletAllapot> {
  await requirePermission("deployments:telepites:write");
  return muvelet(
    await deploymentsApi.felfuggeszt(id, felfuggeszt),
    felfuggeszt ? "Telepítés felfüggesztve." : "Felfüggesztés feloldva.",
    [TAB, `${TAB}/${id}`],
  );
}

export async function deleteTelepitesAction(id: string): Promise<MuveletAllapot> {
  await requirePermission("deployments:telepites:delete");
  return muvelet(await deploymentsApi.deleteTelepites(id), "Telepítés törölve.");
}

export async function addLejaratAction(
  id: string,
  input: {
    tipus: "domain" | "hosting" | "ssl";
    cimke: string;
    lejarat?: string;
    szolgaltato?: string;
  },
): Promise<MuveletAllapot> {
  await requirePermission("deployments:telepites:write");
  return muvelet(
    await deploymentsApi.addLejarat(id, {
      ...input,
      szolgaltato: input.szolgaltato,
      reszletek: undefined,
    }),
    "Lejárat felvéve.",
    [`${TAB}/${id}`],
  );
}

export async function removeLejaratAction(
  id: string,
  lejaratId: string,
): Promise<MuveletAllapot> {
  await requirePermission("deployments:telepites:write");
  return muvelet(await deploymentsApi.removeLejarat(id, lejaratId), "Lejárat törölve.", [
    `${TAB}/${id}`,
  ]);
}

export async function beallitSzamlazasAction(
  id: string,
  input: {
    csomagId?: string | null;
    szamlazasiCiklus?: "havi" | "negyedeves" | "eves" | null;
    arFelulirasHuf?: number | null;
    kezdet?: "azonnal" | "kovetkezo_honap";
  },
): Promise<MuveletAllapot> {
  await requirePermission("deployments:fizetes:write");
  return muvelet(
    await deploymentsApi.beallitSzamlazas(id, input),
    "Számlázás beállítva.",
    [`${TAB}/${id}`],
  );
}

// ── Pipeline lépések ─────────────────────────────────────────────────────────────────────────

export type LepesMuvelet =
  "futtat" | "dry-run" | "adoptal" | "ellenoriz" | "kihagy" | "visszavon" | "force";

export async function lepesAction(
  id: string,
  kulcs: string,
  mod: LepesMuvelet,
  opciok: { kulsoId?: string; ok?: string; input?: Record<string, string> } = {},
): Promise<MuveletAllapot & { elteresek?: string[] }> {
  // Skip / un-skip only change the plan; everything that talks to a provider needs `futtat`.
  const user =
    mod === "kihagy" || mod === "visszavon"
      ? await requirePermission("deployments:telepites:write")
      : await requirePermission("deployments:telepites:futtat");
  const szereplo = {
    id: user.id,
    felulirhat: await hasPermission("deployments:telepites:delete"),
  };
  const input = opciok.input ?? {};
  let r;
  let uzenet = "Kész.";
  switch (mod) {
    case "dry-run":
      r = await deploymentsApi.terv(id, kulcs, szereplo, { input });
      if (r.ok) uzenet = `Terv: ${r.eredmeny.osszegzes}`;
      break;
    case "futtat":
    case "force":
      r = await deploymentsApi.vegrehajt(id, kulcs, szereplo, {
        input,
        force: mod === "force",
      });
      if (r.ok) {
        const e = r.eredmeny as { uzenet?: string; noop?: boolean };
        uzenet = e.noop
          ? `Változatlan, csak ellenőrizve: ${e.uzenet ?? ""}`
          : (e.uzenet ?? "Lépés lefutott.");
      }
      break;
    case "adoptal":
      r = await deploymentsApi.adoptal(id, kulcs, opciok.kulsoId ?? "", szereplo, {
        input,
      });
      if (r.ok) uzenet = r.eredmeny.uzenet ?? "Adoptálva.";
      break;
    case "ellenoriz":
      r = await deploymentsApi.ellenoriz(id, kulcs, szereplo);
      if (r.ok) {
        revalidatePath(`${TAB}/${id}`);
        return {
          success: r.eredmeny.ok,
          message: r.eredmeny.uzenet,
          elteresek: r.eredmeny.elteresek,
        };
      }
      break;
    case "kihagy":
      r = await deploymentsApi.kihagy(id, kulcs, opciok.ok, szereplo);
      uzenet = "Lépés kihagyva.";
      break;
    case "visszavon":
      r = await deploymentsApi.kihagyasVisszavon(id, kulcs, szereplo);
      uzenet = "Kihagyás visszavonva.";
      break;
  }
  revalidatePath(`${TAB}/${id}`);
  revalidatePath(TAB);
  revalidatePath("/feladatok");
  if (!r.ok) return { success: false, message: r.message };
  return { success: true, message: uzenet };
}

export async function kovetkezoLepesekAction(id: string): Promise<MuveletAllapot> {
  const user = await requirePermission("deployments:telepites:futtat");
  const r = await deploymentsApi.kovetkezok(id, { id: user.id });
  revalidatePath(`${TAB}/${id}`);
  revalidatePath(TAB);
  if (!r.ok) return { success: false, message: r.message };
  const { lefutott, akadaly } = r.eredmeny;
  return {
    success: !akadaly,
    message: akadaly
      ? `${lefutott.length} lépés lefutott, megállt: ${akadaly}.`
      : `${lefutott.length} lépés lefutott.`,
  };
}

// ── Csomag ───────────────────────────────────────────────────────────────────────────────────

function csomagInput(fd: FormData): CsomagInput {
  return {
    kod: String(fd.get("kod") ?? ""),
    nev: String(fd.get("nev") ?? ""),
    leiras: szoveg(fd, "leiras"),
    arHuf: Number(fd.get("arHuf") ?? NaN),
    alapCiklus: (szoveg(fd, "alapCiklus") ?? "havi") as CsomagInput["alapCiklus"],
    vcpu: szam(fd, "vcpu"),
    ramMb: szam(fd, "ramMb"),
    diskGb: szam(fd, "diskGb"),
    savszelessegGb: szam(fd, "savszelessegGb"),
    aktiv: jelolo(fd, "aktiv"),
    sorrend: szam(fd, "sorrend"),
  };
}

export async function createCsomagAction(
  _p: UrlapAllapot,
  fd: FormData,
): Promise<UrlapAllapot> {
  await requirePermission("deployments:csomag:write");
  return eredmeny(
    await deploymentsApi.createCsomag(csomagInput(fd)),
    "Csomag létrehozva.",
    [`${TAB}/csomagok`],
  );
}

export async function updateCsomagAction(
  id: string,
  _p: UrlapAllapot,
  fd: FormData,
): Promise<UrlapAllapot> {
  await requirePermission("deployments:csomag:write");
  return eredmeny(
    await deploymentsApi.updateCsomag(id, csomagInput(fd)),
    "Csomag mentve.",
    [`${TAB}/csomagok`],
  );
}

export async function deleteCsomagAction(id: string): Promise<MuveletAllapot> {
  await requirePermission("deployments:csomag:delete");
  return muvelet(await deploymentsApi.deleteCsomag(id), "Csomag törölve.", [
    `${TAB}/csomagok`,
  ]);
}

// ── Fizetés ──────────────────────────────────────────────────────────────────────────────────

export async function fizetveJelolAction(id: string): Promise<MuveletAllapot> {
  const user = await requirePermission("deployments:fizetes:write");
  return muvelet(
    await deploymentsApi.fizetveJelol(id, {}, user.id),
    "Fizetettnek jelölve.",
    [`${TAB}/fizetesek`, TAB],
  );
}

export async function elengedAction(id: string, ok: string): Promise<MuveletAllapot> {
  const user = await requirePermission("deployments:fizetes:delete");
  return muvelet(await deploymentsApi.elenged(id, ok, user.id), "Díj elengedve.", [
    `${TAB}/fizetesek`,
  ]);
}

export async function idoszakokGeneralAction(): Promise<MuveletAllapot> {
  await requirePermission("deployments:fizetes:write");
  const r = await deploymentsApi.idoszakokGeneral();
  revalidatePath(`${TAB}/fizetesek`);
  return { success: true, message: `${r.letrehozva} új számlázási időszak jött létre.` };
}

// ── Integráció ───────────────────────────────────────────────────────────────────────────────

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

export async function createIntegracioAction(
  _p: UrlapAllapot,
  fd: FormData,
): Promise<UrlapAllapot> {
  const user = await requirePermission("deployments:integracio:write");
  return eredmeny(
    await deploymentsApi.createIntegracio(integracioInput(fd), user.id),
    "Kapcsolat létrehozva.",
    [`${TAB}/integraciok`],
  );
}

export async function updateIntegracioAction(
  id: string,
  _p: UrlapAllapot,
  fd: FormData,
): Promise<UrlapAllapot> {
  await requirePermission("deployments:integracio:write");
  return eredmeny(
    await deploymentsApi.updateIntegracio(id, integracioInput(fd)),
    "Kapcsolat mentve.",
    [`${TAB}/integraciok`],
  );
}

export async function deleteIntegracioAction(id: string): Promise<MuveletAllapot> {
  await requirePermission("deployments:integracio:delete");
  return muvelet(await deploymentsApi.deleteIntegracio(id), "Kapcsolat törölve.", [
    `${TAB}/integraciok`,
  ]);
}

/** The "Teszt" button — returns only the outcome message, never anything about the credentials. */
export async function tesztIntegracioAction(id: string): Promise<MuveletAllapot> {
  await requirePermission("deployments:integracio:write");
  const r = await deploymentsApi.tesztIntegracio(id);
  revalidatePath(`${TAB}/integraciok`);
  if (!r.ok) return { success: false, message: r.message };
  return { success: r.sikeres, message: r.uzenet };
}

// ── Stack sablon ─────────────────────────────────────────────────────────────────────────────

/** `KULCS|Címke|kötelező|titkos|alapérték` per line. */
function helyorzoSorok(s: string | undefined): NonNullable<SablonInput["helyorzok"]> {
  return (s ?? "")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => {
      const [kulcs = "", cimke = "", kotelezo = "", titkos = "", ...alap] = x.split("|");
      const igen = (v: string) => /^(1|i|igen|y|true|x)$/i.test(v.trim());
      return {
        kulcs: kulcs.trim(),
        cimke: cimke.trim() || kulcs.trim(),
        kotelezo: igen(kotelezo),
        titkos: igen(titkos),
        alapertek: alap.join("|") || undefined,
      };
    });
}

function sablonInput(fd: FormData): SablonInput {
  return {
    nev: String(fd.get("nev") ?? ""),
    leiras: szoveg(fd, "leiras"),
    alapertelmezett: jelolo(fd, "alapertelmezett"),
    composeYaml: String(fd.get("composeYaml") ?? ""),
    helyorzok: helyorzoSorok(szoveg(fd, "helyorzok")),
    szuksegesHalozatok: (szoveg(fd, "halozatok") ?? "nginxproxy_default")
      .split(/[\s,]+/)
      .filter(Boolean),
  };
}

export async function createSablonAction(
  _p: UrlapAllapot,
  fd: FormData,
): Promise<UrlapAllapot> {
  const user = await requirePermission("deployments:sablon:write");
  return eredmeny(
    await deploymentsApi.createSablon(sablonInput(fd), user.id),
    "Sablon létrehozva.",
    [`${TAB}/sablonok`],
  );
}

export async function updateSablonAction(
  id: string,
  _p: UrlapAllapot,
  fd: FormData,
): Promise<UrlapAllapot> {
  await requirePermission("deployments:sablon:write");
  return eredmeny(
    await deploymentsApi.updateSablon(id, sablonInput(fd)),
    "Sablon mentve.",
    [`${TAB}/sablonok`],
  );
}

export async function deleteSablonAction(id: string): Promise<MuveletAllapot> {
  await requirePermission("deployments:sablon:delete");
  return muvelet(await deploymentsApi.deleteSablon(id), "Sablon törölve.", [
    `${TAB}/sablonok`,
  ]);
}

/** Partner options for the deployment form (the app joins `partner`; the domain package never does). */
export async function partnerOpciokAction(): Promise<Array<{ id: string; nev: string }>> {
  await requirePermission("deployments:telepites:read");
  return partnerApi.listPartnerOptions();
}
