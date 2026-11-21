import { Types } from "mongoose";
import { appendStatusChange, connectDB, nextSequence } from "@erp/db-core";
import { buildDataTableMongoQuery } from "@erp/ui";
import type { DataTableQuery } from "@erp/ui";
import type { TaskRef } from "@erp/core";
import { Partner, type IPartner } from "./models/Partner";
import { Erdeklodo, type IErdeklodo, type ITevekenyseg } from "./models/Erdeklodo";
import {
  ERDEKLODO_ALLAPOTOK,
  ERDEKLODO_ALLAPOT_LABELS,
  ERDEKLODO_KEZDO_ALLAPOT,
  ERDEKLODO_LEZART_ALLAPOTOK,
  type ErdeklodoAllapot,
  type ErdeklodoTevekenysegTipus,
} from "./constants";
import {
  ERDEKLODO_LIST_COLUMNS,
  PARTNER_LIST_COLUMNS,
  type ErdeklodoListItem,
  type PartnerListItem,
} from "./columns";
import { partnerNevKulcs } from "./text";
import { partnerSchema, type ErdeklodoAdatok, type PartnerAdatok } from "./validation";

/** The user performing a write — names are snapshotted into activity entries. */
export type Szereplo = { id: string; nev: string };

export type Eredmeny = { ok: true } | { ok: false; message: string };

const oid = (id: string) => new Types.ObjectId(id);
const validId = (id: string) => Types.ObjectId.isValid(id);

function iso(d?: Date | null): string | undefined {
  return d ? d.toISOString() : undefined;
}

// ─── Partner ─────────────────────────────────────────────────────────────────────────────────

export type KapcsolattartoDetail = {
  id: string;
  nev: string;
  beosztas?: string;
  telefon?: string;
  email?: string;
  elsodleges: boolean;
};

export type PartnerDetail = Omit<
  PartnerAdatok,
  "kapcsolattartok" | "szerzodesKezdete" | "szerzodesVege"
> & {
  id: string;
  azonosito: string;
  kapcsolattartok: KapcsolattartoDetail[];
  szerzodesKezdete?: string;
  szerzodesVege?: string;
  archivalt: boolean;
  archivalasOka?: string;
  archivalasIdopont?: string;
  createdAt: string;
  updatedAt: string;
};

/** Primary contact first; guarantees exactly one `elsodleges` when there is at least one. */
function normalizeKapcsolattartok(list: PartnerAdatok["kapcsolattartok"]) {
  const rows = list.map((k) => ({ ...k }));
  if (rows.length === 0) return rows;
  const first = rows.findIndex((k) => k.elsodleges);
  const idx = first === -1 ? 0 : first;
  return rows.map((k, i) => ({ ...k, elsodleges: i === idx }));
}

function toPartnerFields(input: PartnerAdatok) {
  return {
    tipus: input.tipus,
    nev: input.nev,
    nevKulcs: partnerNevKulcs(input.nev),
    rovidNev: input.rovidNev,
    adoszam: input.adoszam,
    cegjegyzekszam: input.cegjegyzekszam,
    szekhely: input.szekhely,
    szamlazasiCim: input.szamlazasiCim,
    telefon: input.telefon,
    email: input.email,
    bankszamlaszam: input.bankszamlaszam,
    kapcsolattartok: normalizeKapcsolattartok(input.kapcsolattartok),
    cimkek: input.cimkek,
    megjegyzes: input.megjegyzes,
    partnerSzerep: input.partnerSzerep,
    ugyfelKategoria: input.ugyfelKategoria,
    arazasiSzerzodesTipus: input.arazasiSzerzodesTipus,
    szerzodesKezdete: input.szerzodesKezdete,
    szerzodesVege: input.szerzodesVege,
    megujitasEmlekeztetoNap: input.megujitasEmlekeztetoNap,
    alvallalkozoMunkateruletek: input.alvallalkozoMunkateruletek,
    alvallalkozoJelenletTipus: input.alvallalkozoJelenletTipus,
    alvallalkozoSzamlazasiCiklus: input.alvallalkozoSzamlazasiCiklus,
  };
}

function cim(
  c?: { iranyitoszam?: string; varos?: string; utca?: string; orszag?: string } | null,
) {
  if (!c) return undefined;
  const out = {
    iranyitoszam: c.iranyitoszam,
    varos: c.varos,
    utca: c.utca,
    orszag: c.orszag,
  };
  return out.iranyitoszam || out.varos || out.utca || out.orszag ? out : undefined;
}

function toPartnerDetail(doc: IPartner): PartnerDetail {
  return {
    id: String(doc._id),
    azonosito: doc.azonosito,
    tipus: doc.tipus,
    nev: doc.nev,
    rovidNev: doc.rovidNev,
    adoszam: doc.adoszam,
    cegjegyzekszam: doc.cegjegyzekszam,
    szekhely: cim(doc.szekhely),
    szamlazasiCim: cim(doc.szamlazasiCim),
    telefon: doc.telefon,
    email: doc.email,
    bankszamlaszam: doc.bankszamlaszam,
    kapcsolattartok: (doc.kapcsolattartok ?? []).map((k) => ({
      id: String(k._id),
      nev: k.nev,
      beosztas: k.beosztas,
      telefon: k.telefon,
      email: k.email,
      elsodleges: k.elsodleges,
    })),
    cimkek: doc.cimkek ?? [],
    megjegyzes: doc.megjegyzes,
    partnerSzerep: doc.partnerSzerep,
    ugyfelKategoria: doc.ugyfelKategoria,
    arazasiSzerzodesTipus: doc.arazasiSzerzodesTipus,
    szerzodesKezdete: iso(doc.szerzodesKezdete),
    szerzodesVege: iso(doc.szerzodesVege),
    megujitasEmlekeztetoNap: doc.megujitasEmlekeztetoNap,
    alvallalkozoMunkateruletek: doc.alvallalkozoMunkateruletek ?? [],
    alvallalkozoJelenletTipus: doc.alvallalkozoJelenletTipus,
    alvallalkozoSzamlazasiCiklus: doc.alvallalkozoSzamlazasiCiklus,
    archivalt: doc.archivalt,
    archivalasOka: doc.archivalasOka,
    archivalasIdopont: iso(doc.archivalasIdopont),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

/** Archived rows are hidden unless asked for (`include_archived` default off). */
function archivSzuro(filter: Record<string, unknown>, archivaltakkal?: boolean) {
  if (archivaltakkal) return filter;
  const and = Array.isArray(filter.$and) ? (filter.$and as unknown[]) : [];
  return { ...filter, $and: [...and, { archivalt: { $ne: true } }] };
}

export type ListaOpciok = { archivaltakkal?: boolean };

// ─── Érdeklődő ───────────────────────────────────────────────────────────────────────────────

export type TevekenysegDetail = {
  id: string;
  tipus: ErdeklodoTevekenysegTipus;
  idopont: string;
  felhasznaloNev: string;
  szoveg: string;
};

export type ErdeklodoDetail = Omit<ErdeklodoAdatok, "kovetkezoLepesIdopont"> & {
  id: string;
  azonosito: string;
  allapot: ErdeklodoAllapot;
  felelosId?: string;
  felelosNev?: string;
  kovetkezoLepesIdopont?: string;
  partnerId?: string;
  ajanlatId?: string;
  elvesztesOka?: string;
  tevekenysegek: TevekenysegDetail[];
  archivalt: boolean;
  archivalasOka?: string;
  archivalasIdopont?: string;
  createdAt: string;
  updatedAt: string;
};

function toErdeklodoDetail(doc: IErdeklodo): ErdeklodoDetail {
  return {
    id: String(doc._id),
    azonosito: doc.azonosito,
    cegNev: doc.cegNev,
    kapcsolattartoNev: doc.kapcsolattartoNev,
    email: doc.email,
    telefon: doc.telefon,
    weboldal: doc.weboldal,
    forras: doc.forras,
    kategoria: doc.kategoria,
    iparag: doc.iparag,
    becsultErtek: doc.becsultErtek,
    kovetkezoLepes: doc.kovetkezoLepes,
    kovetkezoLepesIdopont: iso(doc.kovetkezoLepesIdopont),
    megjegyzes: doc.megjegyzes,
    uzletiEgyseg: doc.uzletiEgyseg,
    allapot: doc.status.key as ErdeklodoAllapot,
    felelosId: doc.assignee?.userId ? String(doc.assignee.userId) : undefined,
    felelosNev: doc.felelosNev,
    partnerId: doc.partnerId ? String(doc.partnerId) : undefined,
    ajanlatId: doc.ajanlatId,
    elvesztesOka: doc.elvesztesOka,
    tevekenysegek: [...(doc.tevekenysegek ?? [])]
      .sort((a, b) => b.idopont.getTime() - a.idopont.getTime())
      .map((t) => ({
        id: String(t._id),
        tipus: t.tipus,
        idopont: t.idopont.toISOString(),
        felhasznaloNev: t.felhasznaloNev,
        szoveg: t.szoveg,
      })),
    archivalt: doc.archivalt,
    archivalasOka: doc.archivalasOka,
    archivalasIdopont: iso(doc.archivalasIdopont),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function tevekenyseg(
  tipus: ErdeklodoTevekenysegTipus,
  szoveg: string,
  szereplo: Szereplo,
  entitas?: { tipus: string; id: string },
): ITevekenyseg {
  return {
    tipus,
    idopont: new Date(),
    felhasznaloId: oid(szereplo.id),
    felhasznaloNev: szereplo.nev,
    szoveg,
    entitasTipus: entitas?.tipus,
    entitasId: entitas?.id,
  } as ITevekenyseg;
}

function erdeklodoMezok(input: ErdeklodoAdatok) {
  return {
    cegNev: input.cegNev,
    kapcsolattartoNev: input.kapcsolattartoNev,
    email: input.email,
    telefon: input.telefon,
    weboldal: input.weboldal,
    forras: input.forras,
    kategoria: input.kategoria,
    iparag: input.iparag,
    becsultErtek: input.becsultErtek,
    kovetkezoLepes: input.kovetkezoLepes,
    kovetkezoLepesIdopont: input.kovetkezoLepesIdopont,
    megjegyzes: input.megjegyzes,
    uzletiEgyseg: input.uzletiEgyseg,
  };
}

/** Partner fields a lead can seed when it is converted. */
function partnerFromErdeklodo(e: IErdeklodo): PartnerAdatok {
  return partnerSchema.parse({
    tipus: "ceg",
    nev: e.cegNev,
    email: e.email,
    telefon: e.telefon,
    kapcsolattartok: e.kapcsolattartoNev
      ? [
          {
            nev: e.kapcsolattartoNev,
            telefon: e.telefon,
            email: e.email,
            elsodleges: true,
          },
        ]
      : [],
    megjegyzes: e.megjegyzes,
  });
}

export const partnerApi = {
  // ── Partner ────────────────────────────────────────────────────────────────────────────────

  async createPartner(
    input: PartnerAdatok,
  ): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
    await connectDB();
    const fields = toPartnerFields(input);
    const dup = await Partner.findOne({
      nevKulcs: fields.nevKulcs,
      archivalt: { $ne: true },
    })
      .select("nev")
      .lean()
      .exec();
    if (dup) return { ok: false, message: `Már van ilyen nevű partner: ${dup.nev}` };
    const azonosito = `P-${await nextSequence("partner:partner", 6)}`;
    const doc = await Partner.create({ ...fields, azonosito });
    return { ok: true, id: String(doc._id) };
  },

  async updatePartner(id: string, input: PartnerAdatok): Promise<Eredmeny> {
    if (!validId(id)) return { ok: false, message: "A partner nem található" };
    await connectDB();
    const doc = await Partner.findById(id).exec();
    if (!doc) return { ok: false, message: "A partner nem található" };
    const fields = toPartnerFields(input);
    const dup = await Partner.findOne({
      nevKulcs: fields.nevKulcs,
      archivalt: { $ne: true },
      _id: { $ne: doc._id },
    })
      .select("nev")
      .lean()
      .exec();
    if (dup) return { ok: false, message: `Már van ilyen nevű partner: ${dup.nev}` };
    // Undefined optional fields must clear the stored value, not be skipped.
    doc.set(fields);
    await doc.save();
    return { ok: true };
  },

  async getPartner(id: string): Promise<PartnerDetail | null> {
    if (!validId(id)) return null;
    await connectDB();
    const doc = await Partner.findById(id).exec();
    return doc ? toPartnerDetail(doc) : null;
  },

  async listPartnerek(
    query: DataTableQuery,
    opciok: ListaOpciok = {},
  ): Promise<{ data: PartnerListItem[]; total: number }> {
    await connectDB();
    const built = buildDataTableMongoQuery(query, PARTNER_LIST_COLUMNS);
    const filter = archivSzuro(built.filter, opciok.archivaltakkal);
    const sort = Object.keys(built.sort).length > 0 ? built.sort : { nev: 1 as const };
    const [items, total] = await Promise.all([
      Partner.find(filter).sort(sort).skip(built.skip).limit(built.limit).lean().exec(),
      Partner.countDocuments(filter).exec(),
    ]);
    const data: PartnerListItem[] = items.map((p) => {
      const elso = p.kapcsolattartok?.find((k) => k.elsodleges) ?? p.kapcsolattartok?.[0];
      return {
        _id: String(p._id),
        azonosito: p.azonosito,
        nev: p.nev,
        tipus: p.tipus,
        partnerSzerep: p.partnerSzerep,
        adoszam: p.adoszam,
        varos: p.szekhely?.varos,
        kapcsolattarto: elso?.nev,
        telefon: p.telefon ?? elso?.telefon,
        email: p.email ?? elso?.email,
        archivalt: Boolean(p.archivalt),
        createdAt: p.createdAt,
      };
    });
    return { data, total };
  },

  /** Active partners as `{id, nev}`, alphabetical — feeds partner pickers of other modules. */
  async listPartnerOptions(): Promise<Array<{ id: string; nev: string }>> {
    await connectDB();
    const items = await Partner.find({ archivalt: { $ne: true } })
      .select("nev")
      .lean()
      .exec();
    return items
      .map((p) => ({ id: String(p._id), nev: p.nev }))
      .sort((a, b) => a.nev.localeCompare(b.nev, "hu"));
  },

  async archivePartner(id: string, ok: string, szereplo: Szereplo): Promise<Eredmeny> {
    if (!validId(id)) return { ok: false, message: "A partner nem található" };
    await connectDB();
    const res = await Partner.updateOne(
      { _id: oid(id), archivalt: { $ne: true } },
      {
        $set: {
          archivalt: true,
          archivalasOka: ok,
          archivalasIdopont: new Date(),
          archivaltaId: oid(szereplo.id),
        },
      },
    ).exec();
    if (res.matchedCount === 0)
      return { ok: false, message: "A partner nem található vagy már archivált" };
    return { ok: true };
  },

  async restorePartner(id: string): Promise<Eredmeny> {
    if (!validId(id)) return { ok: false, message: "A partner nem található" };
    await connectDB();
    const res = await Partner.updateOne(
      { _id: oid(id), archivalt: true },
      {
        $set: { archivalt: false },
        $unset: { archivalasOka: "", archivalasIdopont: "", archivaltaId: "" },
      },
    ).exec();
    if (res.matchedCount === 0)
      return { ok: false, message: "A partner nem található vagy nem archivált" };
    return { ok: true };
  },

  // ── Érdeklődő ──────────────────────────────────────────────────────────────────────────────

  async createErdeklodo(
    input: ErdeklodoAdatok,
    szereplo: Szereplo,
  ): Promise<{ ok: true; id: string }> {
    await connectDB();
    const azonosito = `E-${await nextSequence("partner:erdeklodo", 6)}`;
    const now = new Date();
    const doc = await Erdeklodo.create({
      ...erdeklodoMezok(input),
      azonosito,
      status: {
        key: ERDEKLODO_KEZDO_ALLAPOT,
        changedAt: now,
        changedBy: oid(szereplo.id),
      },
      statusHistory: [
        { key: ERDEKLODO_KEZDO_ALLAPOT, changedAt: now, changedBy: oid(szereplo.id) },
      ],
    });
    return { ok: true, id: String(doc._id) };
  },

  async updateErdeklodo(id: string, input: ErdeklodoAdatok): Promise<Eredmeny> {
    if (!validId(id)) return { ok: false, message: "Az érdeklődő nem található" };
    await connectDB();
    const doc = await Erdeklodo.findById(id).exec();
    if (!doc) return { ok: false, message: "Az érdeklődő nem található" };
    doc.set(erdeklodoMezok(input));
    await doc.save();
    return { ok: true };
  },

  async getErdeklodo(id: string): Promise<ErdeklodoDetail | null> {
    if (!validId(id)) return null;
    await connectDB();
    const doc = await Erdeklodo.findById(id).exec();
    return doc ? toErdeklodoDetail(doc) : null;
  },

  async listErdeklodok(
    query: DataTableQuery,
    opciok: ListaOpciok = {},
  ): Promise<{ data: ErdeklodoListItem[]; total: number }> {
    await connectDB();
    const built = buildDataTableMongoQuery(query, ERDEKLODO_LIST_COLUMNS);
    const filter = archivSzuro(built.filter, opciok.archivaltakkal);
    const sort =
      Object.keys(built.sort).length > 0 ? built.sort : { createdAt: -1 as const };
    const [items, total] = await Promise.all([
      Erdeklodo.find(filter).sort(sort).skip(built.skip).limit(built.limit).lean().exec(),
      Erdeklodo.countDocuments(filter).exec(),
    ]);
    const data: ErdeklodoListItem[] = items.map((e) => ({
      _id: String(e._id),
      azonosito: e.azonosito,
      cegNev: e.cegNev,
      kapcsolattartoNev: e.kapcsolattartoNev,
      allapot: e.status?.key ?? ERDEKLODO_KEZDO_ALLAPOT,
      felelosNev: e.felelosNev,
      becsultErtek: e.becsultErtek,
      kovetkezoLepes: e.kovetkezoLepes,
      kovetkezoLepesIdopont: e.kovetkezoLepesIdopont,
      archivalt: Boolean(e.archivalt),
      createdAt: e.createdAt,
    }));
    return { data, total };
  },

  /** Status change — appended to `statusHistory` and mirrored as an `allapotvaltas` activity. */
  async changeErdeklodoStatus(
    id: string,
    allapot: ErdeklodoAllapot,
    szereplo: Szereplo,
    opciok: { megjegyzes?: string; elvesztesOka?: string } = {},
  ): Promise<Eredmeny> {
    if (!validId(id)) return { ok: false, message: "Az érdeklődő nem található" };
    if (!ERDEKLODO_ALLAPOTOK.includes(allapot))
      return { ok: false, message: "Érvénytelen állapot" };
    await connectDB();
    const doc = await Erdeklodo.findById(id).exec();
    if (!doc) return { ok: false, message: "Az érdeklődő nem található" };
    if (doc.archivalt)
      return { ok: false, message: "Archivált érdeklődő nem módosítható" };
    if (doc.status.key === allapot)
      return { ok: false, message: "Az érdeklődő már ebben az állapotban van" };
    if (allapot === "elveszett" && !opciok.elvesztesOka?.trim())
      return {
        ok: false,
        message: "Elveszett érdeklődőnél az elvesztés okát meg kell adni",
      };

    const regi = doc.status.key as ErdeklodoAllapot;
    appendStatusChange(doc, allapot, oid(szereplo.id), opciok.megjegyzes);
    if (allapot === "elveszett") doc.elvesztesOka = opciok.elvesztesOka?.trim();
    doc.tevekenysegek.push(
      tevekenyseg(
        "allapotvaltas",
        `${ERDEKLODO_ALLAPOT_LABELS[regi] ?? regi} → ${ERDEKLODO_ALLAPOT_LABELS[allapot]}${
          opciok.megjegyzes ? `: ${opciok.megjegyzes}` : ""
        }`,
        szereplo,
      ),
    );
    await doc.save();
    return { ok: true };
  },

  async addErdeklodoTevekenyseg(
    id: string,
    tipus: ErdeklodoTevekenysegTipus,
    szoveg: string,
    szereplo: Szereplo,
  ): Promise<Eredmeny> {
    if (!validId(id)) return { ok: false, message: "Az érdeklődő nem található" };
    await connectDB();
    const res = await Erdeklodo.updateOne(
      { _id: oid(id), archivalt: { $ne: true } },
      { $push: { tevekenysegek: tevekenyseg(tipus, szoveg, szereplo) } },
    ).exec();
    if (res.matchedCount === 0)
      return { ok: false, message: "Az érdeklődő nem található vagy archivált" };
    return { ok: true };
  },

  /** Sets (or clears, with `null`) the felelős; the name is snapshotted for the list. */
  async assignErdeklodo(
    id: string,
    felelos: { id: string; nev: string } | null,
    szereplo: Szereplo,
  ): Promise<Eredmeny> {
    if (!validId(id)) return { ok: false, message: "Az érdeklődő nem található" };
    await connectDB();
    const update = felelos
      ? {
          $set: {
            assignee: {
              userId: oid(felelos.id),
              assignedAt: new Date(),
              assignedBy: oid(szereplo.id),
            },
            felelosNev: felelos.nev,
          },
        }
      : { $set: { assignee: null }, $unset: { felelosNev: "" } };
    const res = await Erdeklodo.updateOne(
      { _id: oid(id), archivalt: { $ne: true } },
      update,
    ).exec();
    if (res.matchedCount === 0)
      return { ok: false, message: "Az érdeklődő nem található vagy archivált" };
    return { ok: true };
  },

  /**
   * Creates a Partner from the lead, links it (`partnerId`) and marks the lead `megnyert`.
   * Check-all → mutate-all (no transactions): the duplicate check runs before the first write.
   */
  async convertErdeklodoToPartner(
    id: string,
    szereplo: Szereplo,
  ): Promise<{ ok: true; partnerId: string } | { ok: false; message: string }> {
    if (!validId(id)) return { ok: false, message: "Az érdeklődő nem található" };
    await connectDB();
    const doc = await Erdeklodo.findById(id).exec();
    if (!doc) return { ok: false, message: "Az érdeklődő nem található" };
    if (doc.archivalt)
      return { ok: false, message: "Archivált érdeklődő nem alakítható át" };
    if (doc.partnerId) return { ok: true, partnerId: String(doc.partnerId) };
    const created = await partnerApi.createPartner(partnerFromErdeklodo(doc));
    if (!created.ok) return created;
    doc.partnerId = oid(created.id);
    if (doc.status.key !== "megnyert") {
      appendStatusChange(doc, "megnyert", oid(szereplo.id), "Partnerré alakítva");
    }
    doc.tevekenysegek.push(
      tevekenyseg("allapotvaltas", "Partnerré alakítva", szereplo, {
        tipus: "partner",
        id: created.id,
      }),
    );
    await doc.save();
    return { ok: true, partnerId: created.id };
  },

  async archiveErdeklodo(id: string, ok: string, szereplo: Szereplo): Promise<Eredmeny> {
    if (!validId(id)) return { ok: false, message: "Az érdeklődő nem található" };
    await connectDB();
    const res = await Erdeklodo.updateOne(
      { _id: oid(id), archivalt: { $ne: true } },
      {
        $set: {
          archivalt: true,
          archivalasOka: ok,
          archivalasIdopont: new Date(),
          archivaltaId: oid(szereplo.id),
        },
      },
    ).exec();
    if (res.matchedCount === 0)
      return { ok: false, message: "Az érdeklődő nem található vagy már archivált" };
    return { ok: true };
  },

  async restoreErdeklodo(id: string): Promise<Eredmeny> {
    if (!validId(id)) return { ok: false, message: "Az érdeklődő nem található" };
    await connectDB();
    const res = await Erdeklodo.updateOne(
      { _id: oid(id), archivalt: true },
      {
        $set: { archivalt: false },
        $unset: { archivalasOka: "", archivalasIdopont: "", archivaltaId: "" },
      },
    ).exec();
    if (res.matchedCount === 0)
      return { ok: false, message: "Az érdeklődő nem található vagy nem archivált" };
    return { ok: true };
  },

  /** Open leads the user is responsible for — feeds Teendőim. */
  async listMyAssignments(userId: string): Promise<TaskRef[]> {
    if (!validId(userId)) return [];
    await connectDB();
    const items = await Erdeklodo.find({
      "assignee.userId": oid(userId),
      archivalt: { $ne: true },
      "status.key": { $nin: ERDEKLODO_LEZART_ALLAPOTOK },
    })
      .select("azonosito cegNev status kovetkezoLepesIdopont")
      .lean()
      .exec();
    return items.map((e) => ({
      module: "partner",
      entityType: "erdeklodo",
      entityId: String(e._id),
      title: `${e.azonosito} · ${e.cegNev}`,
      status: e.status?.key ?? ERDEKLODO_KEZDO_ALLAPOT,
      url: `/partner/erdeklodok/${e._id}`,
      dueDate: e.kovetkezoLepesIdopont?.toISOString(),
    }));
  },
} as const;
