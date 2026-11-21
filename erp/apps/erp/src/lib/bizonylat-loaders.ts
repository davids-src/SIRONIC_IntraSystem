/**
 * Composition-root helpers of the Bizonylat pages: the only place that joins `partner`,
 * `ertekesites`, `projekt`, `keszlet` and `bizonylat`. The domain package never imports its
 * siblings — the app resolves snapshots, import data and binds the ports here.
 */
import { keszletApi } from "@erp/keszlet";
import { partnerApi } from "@erp/partner";
import { projektApi } from "@erp/projekt";
import { ertekesitesApi } from "@erp/ertekesites";
import type {
  BillingoPort,
  ImportAdat,
  KeszletKiadasPort,
  PartnerPillanatkep,
} from "@erp/bizonylat/client";
import { betoltPartnerOpciok } from "./ertekesites-loaders";

export { betoltPartnerOpciok };

function cimSzoveg(c?: {
  iranyitoszam?: string;
  varos?: string;
  utca?: string;
  orszag?: string;
}): string | undefined {
  if (!c) return undefined;
  const sor = [c.iranyitoszam, c.varos, c.utca].filter(Boolean).join(" ");
  return [sor, c.orszag].filter(Boolean).join(", ") || undefined;
}

/** Partner data denormalized into a document (name, address, tax number, e-mail). */
export async function bizonylatPartner(
  partnerId: string,
): Promise<PartnerPillanatkep | null> {
  const p = await partnerApi.getPartner(partnerId);
  if (!p || p.archivalt) return null;
  return {
    partnerNev: p.nev,
    partnerCim: cimSzoveg(p.szamlazasiCim) ?? cimSzoveg(p.szekhely),
    partnerAdoszam: p.adoszam,
    partnerEmail: p.email ?? p.kapcsolattartok.find((k) => k.email)?.email,
  };
}

/** Binds the stock-out port to the keszlet facade (idempotent on the note id). */
export function keszletKiadasPort(actorId: string): KeszletKiadasPort {
  return {
    async preflight(sorok) {
      const r = await keszletApi.preflight(
        sorok.map((s) => ({
          arlistaTermekId: s.arlistaTermekId,
          mennyiseg: s.mennyiseg,
          raktarhelyKod: s.raktarhelyKod,
        })),
      );
      return { osszesElegendo: r.osszesElegendo, sorok: r.sorok };
    },
    async kiad(sorok, ref) {
      const r = await keszletApi.kiad(
        sorok.map((s) => ({
          arlistaTermekId: s.arlistaTermekId,
          mennyiseg: s.mennyiseg,
          raktarhelyKod: s.raktarhelyKod,
        })),
        { referenceType: "szallitolevel", referenceId: ref.id },
        actorId,
      );
      return r.ok ? { ok: true } : { ok: false, message: r.message };
    },
  };
}

/**
 * Billingo adapter. The real API client lands with the integrations package; until then the
 * port reports "not configured" instead of calling anything (no live API is ever called here).
 */
export function billingoPort(): BillingoPort {
  const nincs = {
    ok: false as const,
    message: "A Billingo-integráció még nincs beállítva ebben a környezetben.",
  };
  return {
    async kiallit() {
      return nincs;
    },
    async allapot() {
      return nincs;
    },
  };
}

// ── Import-from-source picker ──────────────────────────────────────────────────

export type ImportForrasOpcio = {
  kind: "ajanlat" | "projekt";
  id: string;
  label: string;
};

export async function betoltImportForrasok(viewer: {
  userId: string;
  permissions: readonly string[];
}): Promise<ImportForrasOpcio[]> {
  const out: ImportForrasOpcio[] = [];
  if (viewer.permissions.includes("ertekesites:ajanlat:read")) {
    const { data } = await ertekesitesApi.listAjanlatok({
      page: 1,
      pageSize: 200,
      filters: { allapot: "elfogadva" },
    });
    for (const a of data)
      out.push({
        kind: "ajanlat",
        id: a._id,
        label: `${a.azonosito} · ${a.cim} (${a.partnerNev})`,
      });
  }
  if (viewer.permissions.includes("projekt:projekt:read")) {
    const { data } = await projektApi.listProjektek(
      { page: 1, pageSize: 200 },
      { kind: "staff", userId: viewer.userId },
    );
    for (const p of data)
      out.push({
        kind: "projekt",
        id: p._id,
        label: `${p.azonosito} · ${p.nev}${p.partnerNev ? ` (${p.partnerNev})` : ""}`,
      });
  }
  return out;
}

export type ImportBetoltes = {
  partnerId?: string;
  cim?: string;
  penznem?: string;
  adat: ImportAdat;
};

/** Reads one source and turns it into the plain `ImportAdat` the facade accepts. */
export async function betoltImportAdat(
  viewer: { userId: string; permissions: readonly string[] },
  kind: "ajanlat" | "projekt",
  id: string,
): Promise<ImportBetoltes | null> {
  if (kind === "ajanlat") {
    if (!viewer.permissions.includes("ertekesites:ajanlat:read")) return null;
    const a = await ertekesitesApi.getAjanlat(viewer, id);
    if (!a) return null;
    return {
      partnerId: a.partnerId,
      cim: a.cim,
      penznem: a.penznem,
      adat: {
        forras: "ajanlat",
        forrasId: a.id,
        cim: a.cim,
        // Bundle children are listed in the offer but billed through their parent line.
        sorok: a.sorok
          .filter((s) => !(s.csomagId && !s.csomagSzulo))
          .map((s) => {
            const kedv = Math.min(100, Math.max(0, s.kedvezmenySzazalek ?? 0));
            return {
              leiras: s.leiras,
              mennyiseg: s.mennyiseg,
              egyseg: s.egyseg,
              nettoEgysegar: Math.round(s.nettoEgysegar * (1 - kedv / 100) * 100) / 100,
              afaKulcs: s.afaKulcs,
              arSnapshot: s.arSnapshot,
              beszerzesiEgysegar: s.beszerzesiEgysegar,
            };
          }),
      },
    };
  }
  if (!viewer.permissions.includes("projekt:projekt:read")) return null;
  const p = await projektApi.getProjekt(id, { kind: "staff", userId: viewer.userId });
  if (!p) return null;
  return {
    partnerId: p.partnerId,
    cim: p.nev,
    adat: {
      forras: "projekt",
      forrasId: p.id,
      cim: p.nev,
      munkaOsszegzes: p.leiras,
      idoszakKezdet: p.kezdet,
      idoszakVege: p.hatarido,
      sorok: [],
    },
  };
}
