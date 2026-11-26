"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@erp/auth";
import { feladatUzenetApi } from "@erp/feladat";
import {
  feladatSzovegSchema,
  feladatUzenetModositasSchema,
  feladatUzenetSchema,
} from "@erp/feladat/validation";
import { filterCsatolhatoVedettMedia, syncMediaUsage } from "@erp/media";
import { toFeladatViewer } from "@/lib/feladat-viewer";
import { ertesitFeladatValtozas } from "@/lib/feladat-ertesites";
import { FELADAT_MEDIA_ENTITY, FELADAT_MEDIA_FIELD } from "@/lib/vedett-media";

type Eredmeny = { success: boolean; message?: string };

const nevOf = (user: { name?: string | null; email: string }) => user.name || user.email;
const rovid = (s: string, max = 160) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

/**
 * The task's shared chat (#68). Anyone on the task writes to everyone on it; who may is decided
 * in the facade. Attachments are registered on every copy of the thread, so every participant
 * may open them.
 */
export async function uzenetKuldesAction(
  feladatId: string,
  input: { szoveg: string; valaszId?: string; mediaIds?: string[] },
): Promise<Eredmeny> {
  const user = await requireAuth();
  const parsed = feladatUzenetSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, message: parsed.error.issues[0]?.message };
  const mediaIds = parsed.data.mediaIds?.length
    ? await filterCsatolhatoVedettMedia(parsed.data.mediaIds, user.id, {
        entityType: FELADAT_MEDIA_ENTITY,
        entityId: feladatId,
      })
    : [];
  const r = await feladatUzenetApi.kuldUzenet(toFeladatViewer(user), feladatId, {
    ...parsed.data,
    mediaIds,
  });
  if (!r.ok) return { success: false, message: r.message };
  if (mediaIds.length)
    for (const id of r.feladatIds ?? [])
      await syncMediaUsage({
        entityType: FELADAT_MEDIA_ENTITY,
        entityId: id,
        fieldName: FELADAT_MEDIA_FIELD,
        previousMediaIds: [],
        nextMediaIds: mediaIds,
      });
  revalidatePath(`/feladatok/${feladatId}`);
  const kuldo = { id: user.id, nev: nevOf(user) };
  const szoveg = rovid(parsed.data.szoveg);
  await Promise.all([
    ertesitFeladatValtozas(
      r.emlitettek ?? [],
      { title: `Megjelöltek: ${r.cim}`, body: `${kuldo.nev}: ${szoveg}` },
      kuldo,
    ),
    ertesitFeladatValtozas(
      r.cimzettek ?? [],
      { title: `Új üzenet: ${r.cim}`, body: `${kuldo.nev}: ${szoveg}` },
      kuldo,
    ),
  ]);
  return { success: true };
}

export async function uzenetModositasAction(
  uzenetId: string,
  szoveg: string,
): Promise<Eredmeny> {
  const user = await requireAuth();
  const parsed = feladatUzenetModositasSchema.safeParse(szoveg);
  if (!parsed.success)
    return { success: false, message: parsed.error.issues[0]?.message };
  const r = await feladatUzenetApi.modositUzenet(
    toFeladatViewer(user),
    uzenetId,
    parsed.data,
  );
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/feladatok/[id]", "page");
  if (r.ujEmlitettek?.length) {
    const kuldo = { id: user.id, nev: nevOf(user) };
    await ertesitFeladatValtozas(
      r.ujEmlitettek,
      { title: `Megjelöltek: ${r.cim}`, body: `${kuldo.nev}: ${rovid(parsed.data)}` },
      kuldo,
    );
  }
  return { success: true, message: "Üzenet módosítva." };
}

export async function uzenetTorlesAction(uzenetId: string): Promise<Eredmeny> {
  const user = await requireAuth();
  const r = await feladatUzenetApi.torolUzenet(toFeladatViewer(user), uzenetId);
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/feladatok/[id]", "page");
  return { success: true, message: "Üzenet törölve." };
}

/** The kiadó corrects / completes the title or description; the felelősök are told. */
export async function feladatSzovegAction(
  feladatId: string,
  input: { cim?: string; leiras?: string },
): Promise<Eredmeny> {
  const user = await requireAuth();
  const parsed = feladatSzovegSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, message: parsed.error.issues[0]?.message };
  const r = await feladatUzenetApi.modositFeladatSzoveget(
    toFeladatViewer(user),
    feladatId,
    parsed.data,
  );
  if (!r.ok) return { success: false, message: r.message };
  revalidatePath("/", "layout");
  const kuldo = { id: user.id, nev: nevOf(user) };
  await ertesitFeladatValtozas(
    r.celok ?? [],
    {
      title: `Módosult a feladat: ${r.cim}`,
      body: `${kuldo.nev} módosította: ${(r.mi ?? []).join(", ")}.`,
    },
    kuldo,
  );
  return { success: true, message: "Mentve." };
}
