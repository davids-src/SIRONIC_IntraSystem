/**
 * Composition root for linked tasks (#50). A module that gives tasks for its entity steps is
 * wired here — the Feladat package never imports a domain module and vice versa. The module's
 * facade takes `feladatApi` as a port (`FeladatPort`) and returns the notifications to send (Jelzés + push).
 *
 * Wired: Feladat — custom Feladat-folyamat step tasks (#67). Domain modules add a line to MODULOK.
 */
import {
  feladatFolyamatApi,
  registerKapcsoltFeladatHook,
  type KapcsoltFeladatHook,
} from "@erp/feladat";
import type { Ertesites } from "@erp/core";
import { jelzesKuld } from "@/lib/jelzes";
import { ertesitesEmailKategoria, type EmailKategoria } from "@/lib/ertesites-email";

/**
 * Sends a module's notifications as Jelzés + push (#60). `jelzesKuld` never throws — the
 * change is already saved.
 */
export async function kuldErtesitesek(ertesitesek: Ertesites[]): Promise<void> {
  await Promise.all(
    ertesitesek
      .filter((e) => e.userIds.length > 0)
      .map((e) =>
        jelzesKuld(e.userIds, {
          title: e.title,
          body: e.body,
          url: e.url,
          tag: e.tag,
          tipus: "rendszer",
          // A new or changed linked task is a Feladat event: push only, no Jelzés.
          jelzes: !e.url?.startsWith("/feladatok"),
          // E-mail copy (#71): a facade may name the category; otherwise inferred from the link
          // and title (task given to the recipient → új feladat, other task event → változás).
          emailKategoria:
            ertesitesEmailKategoria(
              e as Ertesites & { emailKategoria?: EmailKategoria | false },
            ) ?? false,
        }),
      ),
  );
}

const MODULOK: Record<string, KapcsoltFeladatHook> = {
  // Feladat-folyamat (#67): a custom flow's step tasks — same engine as the modules' flows.
  feladat: async (e) => {
    await kuldErtesitesek(await feladatFolyamatApi.onKapcsoltFeladat(e));
  },
  // Domain modules: `<modul>: async (e) => kuldErtesitesek(await <modul>Api.onKapcsoltFeladat(feladatApi, e))`
};

let kesz = false;

/** Idempotent — every task action that may close or hand on a task calls it first. */
export function regisztralFeladatKapcsolatok(): void {
  if (kesz) return;
  for (const [modul, hook] of Object.entries(MODULOK))
    registerKapcsoltFeladatHook(modul, hook);
  kesz = true;
}
