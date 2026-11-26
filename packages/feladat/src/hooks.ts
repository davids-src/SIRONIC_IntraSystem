/**
 * Callback hooks for linked tasks (#50). The owning module never imports this package's
 * consumers and this package never imports a domain module: the app's composition root
 * (`apps/erp/src/lib/feladat-kapcsolat.ts`) registers one hook per `kapcsolat.modul`, which
 * calls that module's facade. The facade fires it after a linked task's state was saved.
 */
import type { FeladatKapcsolat } from "./constants";

export type KapcsoltFeladatEsemeny = {
  /**
   * What happened to the task: closed by the felelős, refused, withdrawn, handed on, or — after a
   * refusal — given again by the kiadó to someone (`ujrakiadva`, same task id, `ujFelelosId`).
   */
  tipus: "lezarva" | "elutasitva" | "visszavonva" | "tovabbadva" | "ujrakiadva";
  feladatId: string;
  kapcsolat: FeladatKapcsolat;
  /** Who did it. */
  actorId: string;
  /** Handover: the new copy and its felelős. */
  ujFeladatId?: string;
  ujFelelosId?: string;
  megjegyzes?: string;
};

export type KapcsoltFeladatHook = (
  esemeny: KapcsoltFeladatEsemeny,
) => Promise<void> | void;

const hooks = new Map<string, KapcsoltFeladatHook>();

/** Registers (or replaces) the hook of one owning module. Idempotent. */
export function registerKapcsoltFeladatHook(
  modul: string,
  hook: KapcsoltFeladatHook,
): void {
  hooks.set(modul, hook);
}

/** Test helper. */
export function clearKapcsoltFeladatHooks(): void {
  hooks.clear();
}

/**
 * Fires the owning module's hook. Never throws: the task change is already saved, a failing
 * module reaction is logged, not turned into a failed task action.
 */
export async function fireKapcsoltFeladatHook(
  esemeny: KapcsoltFeladatEsemeny,
): Promise<void> {
  const hook = hooks.get(esemeny.kapcsolat.modul);
  if (!hook) return;
  try {
    await hook(esemeny);
  } catch (e) {
    console.error("Kapcsolt feladat visszahívás hiba", esemeny.kapcsolat.modul, e);
  }
}
