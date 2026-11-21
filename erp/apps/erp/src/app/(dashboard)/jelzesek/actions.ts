"use server";

import { revalidatePath } from "next/cache";
import { requireAuth, requirePermission } from "@erp/auth";
import { jelzesApi, JELZES_PERMISSIONS, type JelzesSor } from "@erp/jelzes";
import {
  EMAIL_KATEGORIAK,
  type EmailBeallitasok,
  type EmailKategoria,
} from "@erp/jelzes/constants";
import {
  jelzesCimzettekSchema,
  koruzenetSchema,
  type JelzesCimzettek,
} from "@erp/jelzes/validation";
import { jelzesKuld } from "@/lib/jelzes";

type Eredmeny = { success: boolean; message?: string };

/** The bell panel: the latest few and the unread count. Everyone may read their own. */
export async function legutobbiJelzesekAction(): Promise<{
  sorok: JelzesSor[];
  olvasatlan: number;
}> {
  const user = await requireAuth();
  const [{ sorok }, olvasatlan] = await Promise.all([
    jelzesApi.lista(user.id, { oldalMeret: 15 }),
    jelzesApi.olvasatlanDb(user.id),
  ]);
  return { sorok, olvasatlan };
}

export async function olvasatlanDbAction(): Promise<number> {
  const user = await requireAuth();
  return jelzesApi.olvasatlanDb(user.id);
}

/** Marks the user's own Jelzések read — `'mind'` for "Mind olvasott". */
export async function olvasottAction(ids: string[] | "mind"): Promise<Eredmeny> {
  const user = await requireAuth();
  const lista =
    ids === "mind" ? "mind" : Array.isArray(ids) ? ids.map(String).slice(0, 200) : [];
  await jelzesApi.olvasottnak(user.id, lista);
  revalidatePath("/", "layout");
  return { success: true };
}

function leiras(c: JelzesCimzettek): string {
  if (c.mindenki) return "Mindenki";
  return [
    c.userIds.length ? `${c.userIds.length} felhasználó` : "",
    c.roleIds.length ? `${c.roleIds.length} szerepkör` : "",
    c.permissionKeys.length ? `${c.permissionKeys.length} jogosultság` : "",
  ]
    .filter(Boolean)
    .join(", ");
}

/** "N aktív felhasználó kapja meg" — the preview before sending. */
export async function cimzettDbAction(input: unknown): Promise<number> {
  await requirePermission(JELZES_PERMISSIONS.kuld);
  const parsed = jelzesCimzettekSchema.safeParse(input);
  if (!parsed.success) return 0;
  return (await jelzesApi.cimzettekFeloldasa(parsed.data)).length;
}

export async function koruzenetAction(input: unknown): Promise<Eredmeny> {
  const user = await requirePermission(JELZES_PERMISSIONS.kuld);
  const parsed = koruzenetSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, message: parsed.error.issues[0]?.message };
  const d = parsed.data;
  const cimzettek = await jelzesApi.cimzettekFeloldasa(d.cimzettek);
  if (cimzettek.length === 0)
    return { success: false, message: "Nincs egyetlen címzett sem." };
  await jelzesKuld(cimzettek, {
    title: d.cim,
    body: d.szoveg || undefined,
    url: d.url || undefined,
    tipus: d.tipus,
    kuldo: { id: user.id, nev: user.name || user.email },
    cimzettLeiras: leiras(d.cimzettek),
    push: d.push,
    tag: `jelzes-${Date.now()}`,
  });
  revalidatePath("/", "layout");
  return { success: true, message: `Elküldve ${cimzettek.length} címzettnek.` };
}

/**
 * Értesítési központ (#71): switches one e-mail category of the signed-in user. Everyone edits
 * only their own settings — no permission key.
 */
export async function emailBeallitasAction(
  kategoria: EmailKategoria,
  bekapcsolva: boolean,
): Promise<{ success: boolean; beallitasok?: EmailBeallitasok; message?: string }> {
  const user = await requireAuth();
  if (!(EMAIL_KATEGORIAK as readonly string[]).includes(kategoria)) {
    return { success: false, message: "Ismeretlen értesítési kategória." };
  }
  const beallitasok = await jelzesApi.mentEmailBeallitasok(user.id, {
    [kategoria]: bekapcsolva === true,
  });
  revalidatePath("/jelzesek");
  return { success: true, beallitasok };
}
