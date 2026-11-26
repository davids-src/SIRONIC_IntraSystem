/** Pure business rules of the module — unit-tested without a database. */
import type { FazisAllapot, HetiAllapot, ProjektAllapot } from "./constants";

/** Keeps a phase's state and percentage consistent: kész = 100 %, 100 % = kész. */
export function normalizalFazis(
  allapot: FazisAllapot,
  szazalek: number,
): { allapot: FazisAllapot; szazalek: number } {
  const sz = Math.min(100, Math.max(0, Math.round(szazalek)));
  if (allapot === "kesz" || sz === 100) return { allapot: "kesz", szazalek: 100 };
  if (allapot === "fuggoben" && sz > 0) return { allapot: "folyamatban", szazalek: sz };
  return { allapot, szazalek: sz };
}

/** Overall progress: average of the phases (0 without phases). */
export function projektSzazalek(fazisok: Array<{ szazalek: number }>): number {
  if (fazisok.length === 0) return 0;
  return Math.round(fazisok.reduce((s, f) => s + f.szazalek, 0) / fazisok.length);
}

type TetelAllapot = {
  kesz: boolean;
  mellekletKotelezo: boolean;
  mellekletMediaIds: string[];
};

/** An item that needs an attachment cannot be ticked without one. */
export function checklistKeszHiba(
  tetel: Pick<TetelAllapot, "mellekletKotelezo" | "mellekletMediaIds">,
): string | null {
  if (tetel.mellekletKotelezo && tetel.mellekletMediaIds.length === 0)
    return "Ehhez a tételhez csatolmány szükséges — előbb tölts fel egy fájlt.";
  return null;
}

/** Labels of the required items that still block closing the project. */
export function lezarasAkadalyok(
  checklist: Array<{ cimke: string; kotelezo: boolean; kesz: boolean }>,
): string[] {
  return checklist.filter((t) => t.kotelezo && !t.kesz).map((t) => t.cimke);
}

const PROJEKT_ATMENETEK: Record<ProjektAllapot, readonly ProjektAllapot[]> = {
  nyitott: ["felfuggesztett", "lezart"],
  felfuggesztett: ["nyitott", "lezart"],
  lezart: ["nyitott"],
};

export function projektAtmenetMegengedett(from: ProjektAllapot, to: ProjektAllapot) {
  return PROJEKT_ATMENETEK[from].includes(to);
}

/**
 * Weekly-plan ownership rule: the owner may always act on their own plan; acting on anybody
 * else's (or assigning to somebody else) needs the delegation permission.
 */
export function hetiTervJogosult(
  szereplo: { id: string; delegalhat: boolean },
  tulajdonosId: string,
): boolean {
  return szereplo.delegalhat || szereplo.id === tulajdonosId;
}

export const HETI_LEZART: readonly HetiAllapot[] = ["kesz"];
