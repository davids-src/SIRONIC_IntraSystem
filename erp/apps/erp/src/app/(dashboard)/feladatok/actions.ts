"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@erp/auth";
import { feladatApi, feladatUzenetApi, type FeladatErtesitesCel } from "@erp/feladat";
import { FELADAT_PRIORITAS_LABELS } from "@erp/feladat/client";
import {
  csoporttagokSchema,
  feladatModositasSchema,
  feladatDontesSchema,
  feladatLepesekSchema,
  lepesSablonSchema,
  feladatTovabbadasSchema,
  feladatUjrakiadasSchema,
  ujFeladatSchema,
} from "@erp/feladat/validation";
import { filterCsatolhatoVedettMedia, syncMediaUsage } from "@erp/media";
import { toFeladatViewer } from "@/lib/feladat-viewer";
import { FELADAT_MEDIA_ENTITY, FELADAT_MEDIA_FIELD } from "@/lib/vedett-media";
import { regisztralFeladatKapcsolatok } from "@/lib/feladat-kapcsolat";
import {
  ertesitFeladatValtozas,
  ertesitFelelosValtozas,
  ertesitUjFeladat,
} from "@/lib/feladat-ertesites";

type Eredmeny = { success: boolean; message?: string };

function frissit() {
  // The layout carries the sidebar's task badge.
  revalidatePath("/", "layout");
}

const nevOf = (user: { name?: string | null; email: string }) => user.name || user.email;

/**
 * Tells the other side of a task about a state change (#51): the kiadó hears about acceptance,
 * refusal and closing, the felelős about withdrawal. Bell + push + the "Feladat változásai"
 * e-mail for who opted in (#68, #71). Never to oneself, never for an own task; never throws.
 */
async function ertesit(
  cel: FeladatErtesitesCel | undefined,
  kinek: "kiado" | "felelos",
  kuldoId: string,
  uzenet: { title: string; body?: string },
): Promise<void> {
  if (!cel || cel.sajat) return;
  const userId = kinek === "kiado" ? cel.kiadoId : cel.felelosId;
  if (!userId || userId === kuldoId) return;
  await ertesitFeladatValtozas([{ userId, feladatId: cel.id }], uzenet, { id: kuldoId });
}

const rovid = (s: string, max = 120) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

/**
 * Attachments (#47): only protected files this user uploaded (or already on that task) get
 * through — a leaked id of someone else's file can never be attached to gain access to it.
 */
async function csatolhato(userId: string, ids: string[] | undefined, feladatId?: string) {
  if (!ids?.length) return [];
  return filterCsatolhatoVedettMedia(
    ids,
    userId,
    feladatId ? { entityType: FELADAT_MEDIA_ENTITY, entityId: feladatId } : undefined,
  );
}

/** Registers the task as a usage of its files, so the media resolver can authorise downloads. */
async function mediaHasznalat(feladatId: string, elotte: string[], utana: string[]) {
  if (elotte.length === 0 && utana.length === 0) return;
  await syncMediaUsage({
    entityType: FELADAT_MEDIA_ENTITY,
    entityId: feladatId,
    fieldName: FELADAT_MEDIA_FIELD,
    previousMediaIds: elotte,
    nextMediaIds: utana,
  });
}

/**
 * Feladatok (7e). No permission key: anyone logged in may give a task to anyone. Who may act on
 * a given task (felelős / kiadó) is decided in the facade, from the session user.
 */
export async function ujFeladatAction(input: Record<string, unknown>): Promise<Eredmeny> {
  const user = await requireAuth();
  const parsed = ujFeladatSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, message: parsed.error.issues[0]?.message };
  const mediaIds = await csatolhato(user.id, parsed.data.mediaIds);
  const r = await feladatApi.createFeladat(toFeladatViewer(user), {
    ...parsed.data,
    mediaIds,
  });
  if (!r.id) return { success: false, message: r.message };
  const peldanyok = r.peldanyok ?? [];
  for (const p of peldanyok) await mediaHasznalat(p.id, [], mediaIds);
  frissit();
  // Everyone gets a link to their own copy (push + "Új feladat" e-mail, #68 / #71).
  const surgos = parsed.data.prioritas === "surgos" ? "Sürgős — " : "";
  await ertesitUjFeladat(
    peldanyok.map((p) => ({ userId: p.felelosId, feladatId: p.id })),
    {
      title: `${surgos}Új feladat: ${parsed.data.cim}`,
      body: `${nevOf(user)} adta · határidő ${parsed.data.hatarido.replaceAll("-", ". ")}.`,
    },
    user.id,
  );
  const csakSajat =
    parsed.data.felelosIds.length === 1 && parsed.data.felelosIds[0] === user.id;
  return {
    success: true,
    message: csakSajat
      ? "Felvetted a teendőid közé."
      : r.db > 1
        ? `Feladat kiadva ${r.db} embernek.`
        : "Feladat kiadva.",
  };
}

/** Quick own task from the Teendőim list: title + deadline. */
export async function sajatFeladatAction(input: {
  cim: string;
  hatarido: string;
  kategoria?: string;
}): Promise<Eredmeny> {
  const user = await requireAuth();
  const parsed = ujFeladatSchema.safeParse({ ...input, felelosIds: [user.id] });
  if (!parsed.success)
    return { success: false, message: parsed.error.issues[0]?.message };
  const r = await feladatApi.createFeladat(toFeladatViewer(user), parsed.data);
  if (!r.id) return { success: false, message: r.message };
  frissit();
  return { success: true, message: "Felvetted a teendőid közé." };
}

export async function feladatDontesAction(
  id: string,
  input: { elfogad: boolean; indok?: string },
): Promise<Eredmeny> {
  const user = await requireAuth();
  // A linked task's owning module is called back from the facade (#50).
  regisztralFeladatKapcsolatok();
  const parsed = feladatDontesSchema.safeParse({
    elfogad: input.elfogad,
    indok: input.indok || undefined,
  });
  if (!parsed.success)
    return { success: false, message: parsed.error.issues[0]?.message };
  const r = await feladatApi.dontFeladatrol(toFeladatViewer(user), id, parsed.data);
  if (!r.ok) return { success: false, message: r.message };
  frissit();
  await ertesit(r.feladat, "kiado", user.id, {
    title: `${parsed.data.elfogad ? "Elfogadta" : "Elutasította"}: ${r.feladat?.cim ?? "feladat"}`,
    body: parsed.data.elfogad
      ? `${nevOf(user)} elfogadta a feladatot.`
      : `${nevOf(user)}: ${rovid(parsed.data.indok ?? "")}`,
  });
  return {
    success: true,
    message: parsed.data.elfogad ? "Elfogadtad." : "Elutasítottad.",
  };
}

export async function feladatLezarasAction(
  id: string,
  megjegyzes?: string,
): Promise<Eredmeny> {
  const user = await requireAuth();
  // A linked task's owning module is called back from the facade (#50).
  regisztralFeladatKapcsolatok();
  const r = await feladatApi.lezarFeladatot(toFeladatViewer(user), id, megjegyzes);
  if (!r.ok) return { success: false, message: r.message };
  frissit();
  await ertesit(r.feladat, "kiado", user.id, {
    title: `Kész: ${r.feladat?.cim ?? "feladat"}`,
    body: `${nevOf(user)} késznek jelölte${megjegyzes?.trim() ? `: ${rovid(megjegyzes.trim())}` : "."}`,
  });
  return { success: true, message: "Késznek jelölted." };
}

export async function feladatVisszavonasAction(
  id: string,
  indok?: string,
): Promise<Eredmeny> {
  const user = await requireAuth();
  // A linked task's owning module is called back from the facade (#50).
  regisztralFeladatKapcsolatok();
  const r = await feladatApi.visszavonFeladatot(toFeladatViewer(user), id, indok);
  if (!r.ok) return { success: false, message: r.message };
  frissit();
  await ertesit(r.feladat, "felelos", user.id, {
    title: `Visszavonva: ${r.feladat?.cim ?? "feladat"}`,
    body: `${nevOf(user)} visszavonta a feladatot${indok?.trim() ? `: ${rovid(indok.trim())}` : "."}`,
  });
  return { success: true, message: "Feladat visszavonva." };
}

export async function feladatUjrakiadasAction(
  id: string,
  input: Record<string, unknown>,
): Promise<Eredmeny> {
  const user = await requireAuth();
  // A re-given linked task moves its owner's step to the new felelős (#50, 8i).
  regisztralFeladatKapcsolatok();
  const parsed = feladatUjrakiadasSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, message: parsed.error.issues[0]?.message };
  const r = await feladatApi.ujrakiadFeladatot(toFeladatViewer(user), id, parsed.data);
  if (!r.ok) return { success: false, message: r.message };
  frissit();
  await ertesitFelelosValtozas({
    userId: parsed.data.felelosId,
    feladatId: id,
    cim: r.feladat?.cim ?? "feladat",
    kuldo: { id: user.id, nev: nevOf(user) },
    ok: `${nevOf(user)} neked adta · határidő ${parsed.data.hatarido.replaceAll("-", ". ")}.`,
  });
  return { success: true, message: "Feladat újra kiadva." };
}

/**
 * Továbbadás (#49): the felelős hands the task back to the kiadó or on to someone else. The new
 * copy carries the attachments (registered as its usage too); the kiadó and the new felelős
 * are notified.
 */
export async function feladatTovabbadasAction(
  id: string,
  input: Record<string, unknown>,
): Promise<Eredmeny> {
  const user = await requireAuth();
  // A linked task's owning module is called back from the facade (#50).
  regisztralFeladatKapcsolatok();
  const parsed = feladatTovabbadasSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, message: parsed.error.issues[0]?.message };
  const r = await feladatApi.tovabbadFeladatot(toFeladatViewer(user), id, parsed.data);
  if (!r.ok || !r.feladat) return { success: false, message: r.message };
  const uj = r.feladat;
  // The new copy may open the chat's attachments too (#68).
  await mediaHasznalat(
    uj.id,
    [],
    [...(r.mediaIds ?? []), ...(await feladatUzenetApi.szalMediaIdk(uj.id))],
  );
  frissit();
  const visszaKiadonak = uj.felelosId === uj.kiadoId;
  const kuldo = { id: user.id, nev: nevOf(user) };
  if (uj.felelosId && uj.felelosId !== user.id) {
    await ertesitFelelosValtozas({
      userId: uj.felelosId,
      feladatId: uj.id,
      cim: uj.cim,
      kuldo,
      ok: `${visszaKiadonak ? "Visszaadta" : "Továbbadta neked"} ${kuldo.nev}: ${rovid(parsed.data.indok)}`,
    });
  }
  if (!visszaKiadonak && uj.kiadoId !== user.id) {
    await ertesitFeladatValtozas(
      [{ userId: uj.kiadoId, feladatId: uj.id }],
      {
        title: `Továbbadva: ${uj.cim}`,
        body: `${kuldo.nev} → ${uj.felelosNev}: ${rovid(parsed.data.indok)}`,
      },
      kuldo,
    );
  }
  return {
    success: true,
    message: visszaKiadonak
      ? "Visszaadtad a kiadónak."
      : `Továbbadtad: ${uj.felelosNev}.`,
  };
}

// ── Csoportos feladat kezelése (8m, #61) — the kiadó acts on the whole group at once ────────

/** Push every changed copy's felelős (never the sender, never an own copy). */
async function ertesitMindenkit(
  celok: FeladatErtesitesCel[],
  kuldoId: string,
  uzenet: (cel: FeladatErtesitesCel) => { title: string; body?: string },
): Promise<void> {
  await Promise.all(celok.map((cel) => ertesit(cel, "felelos", kuldoId, uzenet(cel))));
}

export async function feladatModositasAction(
  id: string,
  input: Record<string, unknown>,
): Promise<Eredmeny> {
  const user = await requireAuth();
  const parsed = feladatModositasSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, message: parsed.error.issues[0]?.message };
  const r = await feladatApi.modositFeladatot(toFeladatViewer(user), id, parsed.data);
  if (!r.ok) return { success: false, message: r.message };
  frissit();
  const mi = [
    parsed.data.hatarido ? `határidő ${parsed.data.hatarido.replaceAll("-", ". ")}.` : "",
    parsed.data.prioritas
      ? `prioritás: ${FELADAT_PRIORITAS_LABELS[parsed.data.prioritas]}`
      : "",
    parsed.data.kategoria !== undefined
      ? `kategória: ${parsed.data.kategoria || "—"}`
      : "",
  ]
    .filter(Boolean)
    .join(", ");
  await ertesitFeladatValtozas(
    r.celok.flatMap((cel) =>
      cel.felelosId && !cel.sajat ? [{ userId: cel.felelosId, feladatId: cel.id }] : [],
    ),
    {
      title: `Módosult a feladat: ${r.celok[0]?.cim ?? ""}`,
      body: `${nevOf(user)} módosította — ${mi}`,
    },
    { id: user.id, nev: nevOf(user) },
  );
  return {
    success: true,
    message: r.db > 1 ? `Módosítva ${r.db} példányon.` : "Módosítva.",
  };
}

export async function csoporttagHozzaadasAction(
  id: string,
  felelosIds: string[],
): Promise<Eredmeny> {
  const user = await requireAuth();
  const parsed = csoporttagokSchema.safeParse(felelosIds);
  if (!parsed.success)
    return { success: false, message: parsed.error.issues[0]?.message };
  const r = await feladatApi.addCsoporttagok(toFeladatViewer(user), id, parsed.data);
  if (!r.ok) return { success: false, message: r.message };
  // New members read the whole shared chat — its attachments included (#68).
  const szalMedia = await feladatUzenetApi.szalMediaIdk(id);
  for (const p of r.peldanyok)
    await mediaHasznalat(p.id, [], [...r.mediaIds, ...szalMedia]);
  frissit();
  const f = await feladatApi.getFeladat(toFeladatViewer(user), id);
  await ertesitUjFeladat(
    r.peldanyok.map((p) => ({ userId: p.felelosId, feladatId: p.id })),
    {
      title: `Új feladat: ${f?.cim ?? "csoportos feladat"}`,
      body: `${nevOf(user)} hozzáadott a csoportos feladathoz${f ? ` · határidő ${f.hatarido.replaceAll("-", ". ")}.` : ""}`,
    },
    user.id,
  );
  const db = r.peldanyok.length;
  return {
    success: true,
    message: `${db} résztvevő hozzáadva${r.kihagyott ? ` (${r.kihagyott} már benne volt)` : ""}.`,
  };
}

export async function csoportVisszavonasAction(
  id: string,
  indok?: string,
): Promise<Eredmeny> {
  const user = await requireAuth();
  // A linked task's owning module is called back from the facade (#50).
  regisztralFeladatKapcsolatok();
  const r = await feladatApi.visszavonCsoportot(toFeladatViewer(user), id, indok);
  if (!r.ok) return { success: false, message: r.message };
  frissit();
  await ertesitMindenkit(r.celok, user.id, (cel) => ({
    title: `Visszavonva: ${cel.cim}`,
    body: `${nevOf(user)} visszavonta a feladatot${indok?.trim() ? `: ${rovid(indok.trim())}` : "."}`,
  }));
  return { success: true, message: `Visszavonva ${r.db} résztvevőnél.` };
}

export async function elsodlegesFelelosAction(id: string): Promise<Eredmeny> {
  const user = await requireAuth();
  const r = await feladatApi.setElsodlegesFelelos(toFeladatViewer(user), id);
  if (!r.ok) return { success: false, message: r.message };
  frissit();
  if (r.feladat?.felelosId && !r.feladat.sajat)
    await ertesitFelelosValtozas({
      userId: r.feladat.felelosId,
      feladatId: r.feladat.id,
      cim: r.feladat.cim,
      kuldo: { id: user.id, nev: nevOf(user) },
      ok: `${nevOf(user)} téged jelölt ki elsődleges felelősnek.`,
    });
  return {
    success: true,
    message: `Elsődleges felelős: ${r.feladat?.felelosNev ?? ""}.`,
  };
}

// ── Lépések és lépéssablonok (#50) — who may change them is decided in the facade ───────────

export async function feladatLepesekAction(
  id: string,
  lepesek: Array<{ nev: string; kesz?: boolean; hatarido?: string }>,
): Promise<Eredmeny> {
  const user = await requireAuth();
  const parsed = feladatLepesekSchema.safeParse(lepesek);
  if (!parsed.success)
    return { success: false, message: parsed.error.issues[0]?.message };
  const r = await feladatApi.setFeladatLepesek(toFeladatViewer(user), id, parsed.data);
  if (!r.ok) return { success: false, message: r.message };
  frissit();
  return { success: true, message: "Lépések mentve." };
}

export async function feladatLepesJelolesAction(
  id: string,
  index: number,
  kesz: boolean,
): Promise<Eredmeny> {
  const user = await requireAuth();
  const r = await feladatApi.jelolFeladatLepes(toFeladatViewer(user), id, index, kesz);
  if (!r.ok) return { success: false, message: r.message };
  frissit();
  return { success: true };
}

export async function lepesSablonMentesAction(
  input: Record<string, unknown>,
): Promise<Eredmeny> {
  const user = await requireAuth();
  const parsed = lepesSablonSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, message: parsed.error.issues[0]?.message };
  const r = await feladatApi.saveLepesSablon(toFeladatViewer(user), parsed.data);
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/feladatok", "layout");
  return { success: true, message: `Sablon mentve: ${parsed.data.nev}.` };
}

export async function lepesSablonTorlesAction(sablonId: string): Promise<Eredmeny> {
  const user = await requireAuth();
  const r = await feladatApi.deleteLepesSablon(toFeladatViewer(user), sablonId);
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/feladatok", "layout");
  return { success: true, message: "Sablon törölve." };
}

export async function lepesSablonAlkalmazasAction(
  id: string,
  sablonId: string,
): Promise<Eredmeny> {
  const user = await requireAuth();
  const r = await feladatApi.alkalmazLepesSablon(toFeladatViewer(user), id, sablonId);
  if (!r.ok) return { success: false, message: r.message };
  frissit();
  return { success: true, message: "Sablon lépései hozzáadva." };
}
