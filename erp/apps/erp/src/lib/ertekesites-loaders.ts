/**
 * Composition-root helpers of the Értékesítés pages: the only place that joins `partner`,
 * `arlista` and `ertekesites`. The domain package never imports its siblings — the app resolves
 * the partner snapshot and the árlista price snapshot here and hands them to the facade.
 */
import { arlistaApi, type ArSnapshot } from "@erp/arlista";
import type { PartnerArazasiProfil as ArlistaProfil } from "@erp/arlista/client";
import { partnerApi, type PartnerDetail } from "@erp/partner";
import type { PartnerPillanatkep } from "@erp/ertekesites/client";

export type PartnerOpcio = { id: string; nev: string };

export async function betoltPartnerOpciok(): Promise<PartnerOpcio[]> {
  return partnerApi.listPartnerOptions();
}

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

/** Partner data denormalized into a document (name, address, tax number) at write time. */
export async function partnerPillanatkep(
  partnerId: string,
): Promise<PartnerPillanatkep | null> {
  const p = await partnerApi.getPartner(partnerId);
  if (!p || p.archivalt) return null;
  return {
    partnerNev: p.nev,
    partnerCim: cimSzoveg(p.szamlazasiCim) ?? cimSzoveg(p.szekhely),
    partnerAdoszam: p.adoszam,
  };
}

const SZERZODES_TIPUS_MAP: Record<string, ArlistaProfil["szerzodesTipus"]> = {
  eseti: "eseti",
  "6_honap": "6_honapos",
  "1_ev": "1_eves",
  "2_ev": "2_eves",
};
const UGYFEL_KATEGORIA_MAP: Record<string, ArlistaProfil["ugyfelKategoria"]> = {
  magansemely: "maganszemely",
  kkv: "kkv",
  nagyvallalat: "nagyvallalat",
};
const JELENLET_MAP: Record<string, ArlistaProfil["alvallalkozoiJelenlet"]> = {
  napi: "napi_jelenlet",
  projektalapu: "projekt",
  mindketto: "mindketto",
};

/** Maps the partner's pricing profile onto the vocabulary `arlista` prices against. */
export function arlistaProfil(p: PartnerDetail): ArlistaProfil {
  return {
    szerep: p.partnerSzerep ?? null,
    // Partner spells it "magansemely", árlista "maganszemely".
    ugyfelKategoria: p.ugyfelKategoria
      ? (UGYFEL_KATEGORIA_MAP[p.ugyfelKategoria] ?? null)
      : null,
    szerzodesTipus: p.arazasiSzerzodesTipus
      ? (SZERZODES_TIPUS_MAP[p.arazasiSzerzodesTipus] ?? null)
      : null,
    alvallalkozoiJelenlet: p.alvallalkozoJelenletTipus
      ? (JELENLET_MAP[p.alvallalkozoJelenletTipus] ?? null)
      : null,
  };
}

/** Frozen price of an árlista item for this partner — stored in the offer line, never re-read. */
export async function arSnapshotPartnerhez(
  tetelId: string,
  partnerId: string,
  opciok: { egysegDb?: number } = {},
): Promise<{ ok: true; snapshot: ArSnapshot } | { ok: false; message: string }> {
  const p = await partnerApi.getPartner(partnerId);
  if (!p) return { ok: false, message: "A partner nem található" };
  return arlistaApi.priceSnapshot(tetelId, {
    partnerProfil: arlistaProfil(p),
    egysegDb: opciok.egysegDb,
  });
}

export type ArlistaValasztoElem = {
  id: string;
  kod: string;
  nev: string;
  egyseg: string;
  forras: "termek" | "szolgaltatas";
  /** Indicative net price (products only; services are priced per partner by the snapshot). */
  nettoAr?: number;
};

/** Pickable árlista items (active products and services) for the wizard's search box. */
export async function betoltArlistaValasztok(
  viewer: { userId: string; permissions: readonly string[] },
  jogok: { termek: boolean; szolgaltatas: boolean },
): Promise<ArlistaValasztoElem[]> {
  const out: ArlistaValasztoElem[] = [];
  if (jogok.termek) {
    const { data } = await arlistaApi.listTermekek(viewer, {
      page: 1,
      pageSize: 500,
      filters: { archivalt: "false", aktiv: "true" },
    });
    for (const t of data) {
      out.push({
        id: t._id,
        kod: t.kod,
        nev: t.nev,
        egyseg: t.egyseg,
        forras: "termek",
        nettoAr: t.nettoAr,
      });
    }
  }
  if (jogok.szolgaltatas) {
    for (const s of await arlistaApi.listSzolgaltatasok()) {
      if (!s.aktiv) continue;
      out.push({
        id: s._id,
        kod: s.kod,
        nev: s.nev,
        egyseg: s.egyseg,
        forras: "szolgaltatas",
      });
    }
  }
  return out;
}
