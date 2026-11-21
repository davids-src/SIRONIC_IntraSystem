"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@erp/auth";
import { feladatFolyamatApi } from "@erp/feladat";
import { folyamatUrl, type FolyamatSablonSor } from "@erp/feladat/client";
import {
  folyamatLepesekSchema,
  ujFolyamatSchema,
  type FolyamatLepesSorInput,
  type UjFolyamatInput,
} from "@erp/feladat/validation";
import { toFeladatViewer } from "@/lib/feladat-viewer";
import { kuldErtesitesek, regisztralFeladatKapcsolatok } from "@/lib/feladat-kapcsolat";

type Eredmeny = { success: boolean; message?: string; id?: string; field?: string };

function frissit(id?: string) {
  revalidatePath("/", "layout");
  if (id) revalidatePath(folyamatUrl(id));
}

/** New Feladat-folyamat (#67): step 1's felelős gets the task now. */
export async function ujFolyamatAction(input: UjFolyamatInput): Promise<Eredmeny> {
  const user = await requireAuth();
  const p = ujFolyamatSchema.safeParse(input);
  if (!p.success) return { success: false, message: p.error.issues[0]?.message };
  regisztralFeladatKapcsolatok();
  const r = await feladatFolyamatApi.createFolyamat(toFeladatViewer(user), p.data);
  if (!r.ok) return { success: false, message: r.message, field: r.field };
  await kuldErtesitesek(r.ertesitesek);
  frissit(r.id);
  return { success: true, message: "A folyamat elindult", id: r.id };
}

export async function folyamatLepesekAction(
  id: string,
  lepesek: FolyamatLepesSorInput[],
): Promise<Eredmeny> {
  const user = await requireAuth();
  const p = folyamatLepesekSchema.safeParse(lepesek);
  if (!p.success) return { success: false, message: p.error.issues[0]?.message };
  regisztralFeladatKapcsolatok();
  const r = await feladatFolyamatApi.modositFolyamatLepesek(
    toFeladatViewer(user),
    id,
    p.data,
  );
  if (!r.ok) return { success: false, message: r.message };
  await kuldErtesitesek(r.ertesitesek);
  frissit(id);
  return { success: true, message: "A lépések mentve" };
}

export async function folyamatAtosztasAction(
  id: string,
  lepesId: string,
  ujFelelosId: string,
  indok?: string,
): Promise<Eredmeny> {
  const user = await requireAuth();
  regisztralFeladatKapcsolatok();
  const r = await feladatFolyamatApi.atosztFolyamatLepes(
    toFeladatViewer(user),
    id,
    lepesId,
    ujFelelosId,
    indok?.slice(0, 500),
  );
  if (!r.ok) return { success: false, message: r.message };
  await kuldErtesitesek(r.ertesitesek);
  frissit(id);
  return { success: true, message: "A lépés átosztva" };
}

export async function folyamatMegszakitasAction(
  id: string,
  indok?: string,
): Promise<Eredmeny> {
  const user = await requireAuth();
  regisztralFeladatKapcsolatok();
  const r = await feladatFolyamatApi.megszakitFolyamat(
    toFeladatViewer(user),
    id,
    indok?.slice(0, 500),
  );
  if (!r.ok) return { success: false, message: r.message };
  await kuldErtesitesek(r.ertesitesek);
  frissit(id);
  return { success: true, message: "A folyamat megszakítva" };
}

export async function folyamatSablonokAction(): Promise<FolyamatSablonSor[]> {
  const user = await requireAuth();
  return feladatFolyamatApi.listFolyamatSablonok(toFeladatViewer(user));
}

export async function folyamatSablonMentesAction(input: {
  nev: string;
  megosztott?: boolean;
  lepesek: Array<{ nev: string; felelosId?: string; napok?: number }>;
}): Promise<Eredmeny> {
  const user = await requireAuth();
  const r = await feladatFolyamatApi.saveFolyamatSablon(toFeladatViewer(user), input);
  return r.ok
    ? { success: true, message: "Sablon mentve", id: r.id }
    : { success: false, message: r.message };
}

export async function folyamatSablonTorlesAction(id: string): Promise<Eredmeny> {
  const user = await requireAuth();
  const r = await feladatFolyamatApi.deleteFolyamatSablon(toFeladatViewer(user), id);
  return r.ok
    ? { success: true, message: "Sablon törölve" }
    : { success: false, message: r.message };
}
