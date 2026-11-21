/**
 * Composition-root helpers of the Szerviz pages: the only place that joins `szerviz` with
 * `partner`, `arlista` and `keszlet`. The domain package never imports its siblings — the app
 * resolves the partner snapshot and the árlista price snapshot here, and binds the stock port.
 */
import { keszletApi } from "@erp/keszlet";
import type {
  KeszletKiadasPort,
  KeszletKiadasTerv,
  KeszletPreflightEredmeny,
} from "@erp/szerviz/client";

// Partner and árlista lookups are shared with Értékesítés (same snapshots, same pickers).
export {
  arSnapshotPartnerhez,
  betoltArlistaValasztok,
  betoltPartnerOpciok,
  partnerPillanatkep,
  type ArlistaValasztoElem,
  type PartnerOpcio,
} from "./ertekesites-loaders";

/** Worklog material lines -> stock engine lines (one per worklog line, in plan order). */
export function keszletSorok(terv: KeszletKiadasTerv) {
  return terv.map((s) => ({
    arlistaTermekId: s.arlistaTermekId,
    mennyiseg: s.mennyiseg,
  }));
}

/**
 * Binds the szerviz stock port to `keszletApi`. `kiad` is idempotent on (munkalap, id): the
 * stock engine keys every movement by reference + line, so a retried finalize never issues twice.
 */
export function keszletKiadasPort(actorId: string): KeszletKiadasPort {
  return {
    async preflight(terv): Promise<KeszletPreflightEredmeny> {
      const r = await keszletApi.preflight(keszletSorok(terv));
      return {
        osszesElegendo: r.osszesElegendo,
        sorok: r.sorok.map((s) => ({
          // The engine indexes by position in the list we sent; map back to the worklog line.
          sorIndex: terv[s.lineIndex]?.sorIndex ?? s.lineIndex,
          arlistaTermekId: s.arlistaTermekId,
          nev: s.nev ?? terv[s.lineIndex]?.nev,
          kert: s.kert,
          szabad: s.szabad,
          elegendo: s.elegendo,
          uzenet: s.uzenet,
        })),
      };
    },
    async kiad(terv, ref) {
      const r = await keszletApi.kiad(
        keszletSorok(terv),
        { referenceType: "munkalap", referenceId: ref.id },
        actorId,
      );
      return r.ok ? { ok: true } : { ok: false, message: r.message };
    },
  };
}
