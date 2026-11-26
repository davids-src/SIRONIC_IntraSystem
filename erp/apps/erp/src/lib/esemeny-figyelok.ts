/**
 * Cross-module domain-event listeners (docs/ARCHITECTURE.md §1). Domain packages only emit; this
 * composition-root file is the one place that reacts to an event by calling another module.
 * Every listener is best-effort: `emitDomainEvent` already swallows listener failures, and each
 * handler additionally catches its own so one failing side effect never blocks the others.
 *
 * Handlers are built by factories over small dependency ports so they are unit-testable without
 * a database; `regisztralEsemenyFigyelok` binds the real facades.
 */
import { onDomainEvent, type DomainEventPayloads } from "@erp/core";
import { feladatApi } from "@erp/feladat";
import { bizonylatApi } from "@erp/bizonylat";
import { szamlaSchema } from "@erp/bizonylat/validation";
import { connectDB, Permission, Role, User } from "@erp/db-core";
import { budapestNap } from "@erp/lib/utils";
import { kuldErtesitesek } from "./feladat-kapcsolat";
import { bizonylatPartner } from "./bizonylat-loaders";

type Szereplo = { id: string; nev: string };

export type FigyeloFuggosegek = {
  /** Active users holding a permission key (via a role or directly). */
  felhasznalokJoggal(kulcs: string): Promise<Szereplo[]>;
  ertesit(
    userIds: string[],
    uzenet: { title: string; body?: string; url: string },
  ): Promise<void>;
  feladatLetrehoz: typeof feladatApi.createKapcsoltFeladat;
  igazolas(id: string): Promise<{
    partnerId: string;
    cim: string;
    penznem: string;
    sorok: Array<{
      leiras: string;
      mennyiseg: number;
      egyseg: string;
      nettoEgysegar: number;
      afaKulcs: number;
    }>;
  } | null>;
  partner(
    partnerId: string,
  ): Promise<{ partnerNev: string; partnerCim?: string; partnerAdoszam?: string } | null>;
  szamlaLetrehoz: typeof bizonylatApi.createSzamla;
  most(): Date;
};

const SZERZODES_HATARIDO_NAP = 7;

/** `ajanlat.elfogadva` → a linked Feladat (+ push) for the owner to prepare the contract. */
export function ajanlatElfogadvaFigyelo(d: FigyeloFuggosegek) {
  return async (p: DomainEventPayloads["ajanlat.elfogadva"]): Promise<void> => {
    try {
      const hatarido = budapestNap(
        new Date(d.most().getTime() + SZERZODES_HATARIDO_NAP * 86_400_000),
      );
      const url = `/ertekesites/ajanlatok/${p.ajanlatId}`;
      const r = await d.feladatLetrehoz({
        kiadoId: p.elfogadtaUserId,
        felelosId: p.elfogadtaUserId,
        cim: `Szerződés előkészítése — ${p.azonosito} (${p.partnerNev})`,
        leiras: `Az ajánlatot elfogadták. Készítsd elő a szerződést (${p.partnerNev}).`,
        hatarido,
        prioritas: "normal",
        kategoria: "Szerződés",
        kapcsolat: {
          modul: "ertekesites",
          tipus: "ajanlat",
          id: p.ajanlatId,
          url,
          cimke: `Ajánlat ${p.azonosito}`,
        },
      });
      if (!r.id) console.error("[esemeny] szerződés-feladat", r.message);
      await d.ertesit([p.elfogadtaUserId], {
        title: `Elfogadott ajánlat: ${p.azonosito}`,
        body: `${p.partnerNev} elfogadta az ajánlatot — készíts szerződést.`,
        url,
      });
    } catch (e) {
      console.error("[esemeny] ajanlat.elfogadva", e);
    }
  };
}

/** `teljesitesigazolas.elfogadva` → draft invoice via the bizonylat facade + notify billing staff. */
export function igazolasElfogadvaFigyelo(d: FigyeloFuggosegek) {
  return async (
    p: DomainEventPayloads["teljesitesigazolas.elfogadva"],
  ): Promise<void> => {
    try {
      const penzugy = await d.felhasznalokJoggal("bizonylat:szamla:write");
      const szereplo = penzugy[0];
      if (!szereplo) {
        console.error(
          "[esemeny] igazolás: nincs számlát kezelő felhasználó a piszkozathoz",
        );
        return;
      }
      const ig = await d.igazolas(p.igazolasId);
      const partner = await d.partner(p.partnerId);
      if (!ig || !partner || ig.sorok.length === 0) {
        console.error(
          "[esemeny] igazolás: hiányos adat, nincs számlapiszkozat",
          p.igazolasId,
        );
        return;
      }
      const input = szamlaSchema.parse({
        partnerId: ig.partnerId,
        cim: `Számla — ${p.azonosito}`,
        igazolasId: p.igazolasId,
        penznem: ig.penznem,
        sorok: ig.sorok.map((s) => ({
          leiras: s.leiras,
          mennyiseg: s.mennyiseg,
          egyseg: s.egyseg,
          nettoEgysegar: s.nettoEgysegar,
          afaKulcs: s.afaKulcs,
        })),
      });
      const szamla = await d.szamlaLetrehoz(input, partner, szereplo);
      await d.ertesit(
        penzugy.map((u) => u.id),
        {
          title: `Számlapiszkozat: ${p.azonosito}`,
          body: `${p.partnerNev} aláírta a teljesítésigazolást (${p.alairoNev}) — a számla piszkozat kész.`,
          url: `/bizonylat/szamlak/${szamla.id}`,
        },
      );
    } catch (e) {
      console.error("[esemeny] teljesitesigazolas.elfogadva", e);
    }
  };
}

/** `keszlet.alacsony` → Jelzés to the stock managers. */
export function keszletAlacsonyFigyelo(d: FigyeloFuggosegek) {
  return async (p: DomainEventPayloads["keszlet.alacsony"]): Promise<void> => {
    try {
      const kezelok = await d.felhasznalokJoggal("keszlet:keszlet:write");
      if (kezelok.length === 0) return;
      await d.ertesit(
        kezelok.map((u) => u.id),
        {
          title: `Alacsony készlet: ${p.nev}`,
          body: `${p.kod} — ${p.keszlet} db maradt (minimum: ${p.minimum}).`,
          url: `/keszlet/lista/${p.tetelId}`,
        },
      );
    } catch (e) {
      console.error("[esemeny] keszlet.alacsony", e);
    }
  };
}

async function felhasznalokJoggal(kulcs: string): Promise<Szereplo[]> {
  await connectDB();
  const perm = await Permission.findOne({ key: kulcs }).select("_id").lean().exec();
  const roleIds = perm
    ? (await Role.find({ permissionIds: perm._id }).select("_id").lean().exec()).map(
        (r) => r._id,
      )
    : [];
  const users = await User.find({
    isActive: true,
    $or: [{ roleIds: { $in: roleIds } }, { directPermissionKeys: kulcs }],
  })
    .select("name email")
    .lean()
    .exec();
  return users.map((u) => ({
    id: String(u._id),
    nev: u.name || u.email || "Ismeretlen",
  }));
}

export const VALOS_FUGGOSEGEK: FigyeloFuggosegek = {
  felhasznalokJoggal,
  ertesit: (userIds, u) =>
    kuldErtesitesek([{ userIds, title: u.title, body: u.body, url: u.url }]),
  feladatLetrehoz: (i) => feladatApi.createKapcsoltFeladat(i),
  igazolas: (id) => bizonylatApi.getIgazolas(id, { kind: "staff", userId: "rendszer" }),
  partner: (id) => bizonylatPartner(id),
  szamlaLetrehoz: (i, p, s) => bizonylatApi.createSzamla(i, p, s),
  most: () => new Date(),
};

/** Registers the listeners (called once per process from `ensureCoreBootstrapped`). */
export function regisztralEsemenyFigyelok(d: FigyeloFuggosegek = VALOS_FUGGOSEGEK): void {
  onDomainEvent("ajanlat.elfogadva", ajanlatElfogadvaFigyelo(d));
  onDomainEvent("teljesitesigazolas.elfogadva", igazolasElfogadvaFigyelo(d));
  onDomainEvent("keszlet.alacsony", keszletAlacsonyFigyelo(d));
}
