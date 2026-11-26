"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@erp/auth";
import { kategoriaAdminApi, type KategoriaAdminEredmeny } from "@erp/feladat";

async function vegrehajt(
  muvelet: () => Promise<KategoriaAdminEredmeny>,
): Promise<KategoriaAdminEredmeny> {
  await requirePermission("admin:access");
  const r = await muvelet();
  if (r.ok) {
    revalidatePath("/admin/feladat-kategoriak");
    revalidatePath("/feladatok");
  }
  return r;
}

export async function hozzaadKategoriaAction(nev: string) {
  return vegrehajt(() => kategoriaAdminApi.hozzaad(nev));
}
export async function atnevezKategoriaAction(id: string, nev: string) {
  return vegrehajt(() => kategoriaAdminApi.atnevez(id, nev));
}
export async function aktivKategoriaAction(id: string, aktiv: boolean) {
  return vegrehajt(() => kategoriaAdminApi.beallitAktiv(id, aktiv));
}
export async function torolKategoriaAction(id: string) {
  return vegrehajt(() => kategoriaAdminApi.torol(id));
}
