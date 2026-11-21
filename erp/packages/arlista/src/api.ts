import mongoose from "mongoose";
import { connectDB, nextSequence } from "@erp/db-core";
import { buildDataTableMongoQuery, type DataTableQuery } from "@erp/ui";
import { TERMEK_LIST_COLUMNS, type TermekListItem } from "./columns";
import {
  ALAP_ARAZASI_BEALLITASOK,
  ALAP_SZOLGALTATAS_KATEGORIAK,
  ARLISTA_PERMISSIONS,
  KOD_SORSZAM_HOSSZ,
  TETEL_ALAP_ELOTAGOK,
  type ArazasiBeallitasok,
  type ArazasiTipus,
  type ArlistaViewer,
  type PartnerArazasiProfil,
  type SurgossegKulcs,
  type TetelTipus,
  type UgyfelSzorzoKulcs,
} from "./constants";
import { ArazasiBeallitas } from "./models/ArazasiBeallitas";
import { ArlistaTetel, type IArlistaTetel } from "./models/ArlistaTetel";
import {
  SzolgaltatasAlkategoria,
  SzolgaltatasKategoria,
  type ISzolgaltatasKategoria,
} from "./models/SzolgaltatasKategoria";
import { SzolgaltatasTetel, type ISzolgaltatasTetel } from "./models/SzolgaltatasTetel";
import {
  calculateServicePrice,
  mapPartnerProfilToSzorzoKulcs,
  type EgysegSav,
} from "./szamitas";
import type {
  AlkategoriaInput,
  BeszerzesiAdatInput,
  CreateTermekInput,
  KategoriaInput,
  SzolgaltatasInput,
  UpdateTermekInput,
  ArazasiBeallitasInput,
} from "./validation";

export type Result = { ok: true; id?: string } | { ok: false; message: string };
const fail = (message: string): { ok: false; message: string } => ({
  ok: false,
  message,
});

const isObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

const canReadBeszerzes = (v: ArlistaViewer) =>
  v.permissions.includes(ARLISTA_PERMISSIONS.beszerzesRead);
const canWriteBeszerzes = (v: ArlistaViewer) =>
  v.permissions.includes(ARLISTA_PERMISSIONS.beszerzesWrite);

// ── DTOs ───────────────────────────────────────────────────────────────────────

export type BeszerzesiAdatDto = {
  _id: string;
  beszallitoNev: string;
  beszallitoCikkszam?: string;
  nettoBeszerzesiAr: number;
  beszerzesDatuma: Date;
  megjegyzes?: string;
};

export type TermekDetail = Omit<TermekListItem, "createdAt"> & {
  leiras?: string;
  megjegyzes?: string;
  archivaltAt?: Date;
  archivalasOka?: string;
  createdAt: Date;
  /** Present only for viewers with `arlista:beszerzes:read` — the key is absent otherwise. */
  beszerzes?: {
    beszerzesiAdatok: BeszerzesiAdatDto[];
    utolsoBeszerzesiAr?: number;
    elonyosBeszallito?: string;
  };
};

export type KategoriaDto = {
  _id: string;
  nev: string;
  ikon: string;
  kodElotag: string;
  szin: string;
  sorrend: number;
  aktiv: boolean;
  leiras?: string;
  alkategoriak: Array<{ _id: string; nev: string; sorrend: number; aktiv: boolean }>;
};

export type SzolgaltatasDto = {
  _id: string;
  kategoriaId: string;
  alkategoriaId?: string;
  kod: string;
  nev: string;
  leiras?: string;
  egyseg: string;
  arazasiTipus: ArazasiTipus;
  belsoAlapar?: number;
  oradijKategoria?: string;
  egysegSavok: EgysegSav[];
  megjegyzes?: string;
  ugyfelMegjegyzes?: string;
  aktiv: boolean;
  archivalt: boolean;
  archivalasOka?: string;
  sorrend: number;
};

/** The fetch-and-freeze document a quote/worksheet line embeds. */
export type ArSnapshot = {
  forras: "szolgaltatas" | "termek";
  tetelId: string;
  kod: string;
  nev: string;
  egyseg: string;
  arazasiTipus: ArazasiTipus | "termek";
  belsoAlapar: number;
  szorzoKulcs: UgyfelSzorzoKulcs | null;
  ugyfelSzorzo: number;
  kalkulaltAr: number;
  surgosseg: SurgossegKulcs | null;
  surgossegiSzorzo: number;
  vegAr: number;
  egyedi: boolean;
  egysegDb: number | null;
  /** VAT in percent, for document totals. */
  afaKulcs: number;
  penznem: string;
  keszult: string;
};

export type PriceSnapshotInput = {
  partnerProfil: PartnerArazasiProfil;
  surgosseg?: SurgossegKulcs | null;
  egysegDb?: number;
};

// ── Mapping ────────────────────────────────────────────────────────────────────

function toTermekList(d: IArlistaTetel, viewer: ArlistaViewer): TermekListItem {
  return {
    _id: String(d._id),
    kod: d.kod,
    tipus: d.tipus,
    nev: d.nev,
    kategoria: d.kategoria,
    egyseg: d.egyseg,
    nettoAr: d.nettoAr,
    penznem: d.penznem,
    afaKulcs: d.afaKulcs,
    aktiv: d.aktiv,
    archivalt: d.archivalt,
    ...(canReadBeszerzes(viewer) && d.utolsoBeszerzesiAr != null
      ? { utolsoBeszerzesiAr: d.utolsoBeszerzesiAr }
      : {}),
    createdAt: d.createdAt,
  };
}

function toTermekDetail(d: IArlistaTetel, viewer: ArlistaViewer): TermekDetail {
  const base = toTermekList(d, viewer);
  return {
    ...base,
    leiras: d.leiras,
    megjegyzes: d.megjegyzes,
    archivaltAt: d.archivaltAt,
    archivalasOka: d.archivalasOka,
    ...(canReadBeszerzes(viewer)
      ? {
          beszerzes: {
            beszerzesiAdatok: (d.beszerzesiAdatok ?? []).map((b) => ({
              _id: String(b._id),
              beszallitoNev: b.beszallitoNev,
              beszallitoCikkszam: b.beszallitoCikkszam,
              nettoBeszerzesiAr: b.nettoBeszerzesiAr,
              beszerzesDatuma: b.beszerzesDatuma,
              megjegyzes: b.megjegyzes,
            })),
            utolsoBeszerzesiAr: d.utolsoBeszerzesiAr,
            elonyosBeszallito: d.elonyosBeszallito,
          },
        }
      : {}),
  };
}

function toSzolgaltatas(d: ISzolgaltatasTetel): SzolgaltatasDto {
  return {
    _id: String(d._id),
    kategoriaId: String(d.kategoriaId),
    alkategoriaId: d.alkategoriaId ? String(d.alkategoriaId) : undefined,
    kod: d.kod,
    nev: d.nev,
    leiras: d.leiras,
    egyseg: d.egyseg,
    arazasiTipus: d.arazasiTipus,
    belsoAlapar: d.belsoAlapar,
    oradijKategoria: d.oradijKategoria,
    egysegSavok: (d.egysegSavok ?? []).map((s) => ({
      cimke: s.cimke,
      minEgyseg: s.minEgyseg,
      maxEgyseg: s.maxEgyseg ?? null,
      alapar: s.alapar,
    })),
    megjegyzes: d.megjegyzes,
    ugyfelMegjegyzes: d.ugyfelMegjegyzes,
    aktiv: d.aktiv,
    archivalt: d.archivalt,
    archivalasOka: d.archivalasOka,
    sorrend: d.sorrend,
  };
}

/** Last purchase = the record with the newest `beszerzesDatuma`. */
function beszerzesOsszegzes(
  adatok: IArlistaTetel["beszerzesiAdatok"],
): Pick<IArlistaTetel, "utolsoBeszerzesiAr" | "elonyosBeszallito"> {
  if (adatok.length === 0)
    return { utolsoBeszerzesiAr: undefined, elonyosBeszallito: undefined };
  const legujabb = [...adatok].sort(
    (a, b) => b.beszerzesDatuma.getTime() - a.beszerzesDatuma.getTime(),
  )[0]!;
  return {
    utolsoBeszerzesiAr: legujabb.nettoBeszerzesiAr,
    elonyosBeszallito: legujabb.beszallitoNev,
  };
}

async function kovetkezoKod(namespace: string, elotag: string): Promise<string> {
  const sorszam = await nextSequence(`arlista:${namespace}:${elotag}`, KOD_SORSZAM_HOSSZ);
  return `${elotag}-${sorszam}`;
}

/** Stored settings merged over the defaults, so a partially filled document never yields NaN. */
function egyesit(doc: Partial<ArazasiBeallitasok> | null): ArazasiBeallitasok {
  const D = ALAP_ARAZASI_BEALLITASOK;
  const o = (doc ?? {}) as Partial<ArazasiBeallitasok>;
  return {
    rezsiSzorzo: o.rezsiSzorzo ?? D.rezsiSzorzo,
    haviFixKoltseg: o.haviFixKoltseg ?? D.haviFixKoltseg,
    haviTermelekenyOrak: o.haviTermelekenyOrak ?? D.haviTermelekenyOrak,
    oradijak: { ...D.oradijak, ...(o.oradijak ?? {}) },
    ugyfelSzorzok: { ...D.ugyfelSzorzok, ...(o.ugyfelSzorzok ?? {}) },
    anyagPotlekok: { ...D.anyagPotlekok, ...(o.anyagPotlekok ?? {}) },
    surgossegiSzorzok: { ...D.surgossegiSzorzok, ...(o.surgossegiSzorzok ?? {}) },
    afaKulcs: o.afaKulcs ?? D.afaKulcs,
    minKiszallasiDij: o.minKiszallasiDij ?? D.minKiszallasiDij,
    minProjektDij: o.minProjektDij ?? D.minProjektDij,
  };
}

// ── Facade ─────────────────────────────────────────────────────────────────────

export const arlistaApi = {
  // ── Termék / munkadíj / csomag katalógus ──

  async listTermekek(
    viewer: ArlistaViewer,
    query: DataTableQuery,
  ): Promise<{ data: TermekListItem[]; total: number }> {
    await connectDB();
    const { filter, sort, skip, limit } = buildDataTableMongoQuery(
      query,
      TERMEK_LIST_COLUMNS,
    );
    // Archived items stay hidden unless the user explicitly filters on `archivalt`.
    if (filter.archivalt === undefined) filter.archivalt = false;
    const [rows, total] = await Promise.all([
      ArlistaTetel.find(filter)
        .select("-beszerzesiAdatok")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean<IArlistaTetel[]>()
        .exec(),
      ArlistaTetel.countDocuments(filter).exec(),
    ]);
    return { data: rows.map((r) => toTermekList(r, viewer)), total };
  },

  async getTermekFilterOptions(): Promise<{
    kategoria: Array<{ value: string; label: string }>;
  }> {
    await connectDB();
    const kategoriak = (await ArlistaTetel.distinct("kategoria").exec()) as string[];
    return {
      kategoria: kategoriak
        .sort((a, b) => a.localeCompare(b, "hu"))
        .map((k) => ({ value: k, label: k })),
    };
  },

  async getTermek(viewer: ArlistaViewer, id: string): Promise<TermekDetail | null> {
    await connectDB();
    if (!isObjectId(id)) return null;
    const d = await ArlistaTetel.findById(id).lean<IArlistaTetel>().exec();
    return d ? toTermekDetail(d, viewer) : null;
  },

  async createTermek(input: CreateTermekInput): Promise<Result> {
    await connectDB();
    const elotag = input.kodElotag ?? TETEL_ALAP_ELOTAGOK[input.tipus as TetelTipus];
    const kod = await kovetkezoKod("termek", elotag);
    const doc = await ArlistaTetel.create({
      kod,
      tipus: input.tipus,
      nev: input.nev,
      leiras: input.leiras,
      kategoria: input.kategoria,
      egyseg: input.egyseg,
      nettoAr: input.nettoAr,
      penznem: input.penznem,
      afaKulcs: input.afaKulcs,
      aktiv: input.aktiv,
      megjegyzes: input.megjegyzes,
    });
    return { ok: true, id: String(doc._id) };
  },

  async updateTermek(id: string, input: UpdateTermekInput): Promise<Result> {
    await connectDB();
    if (!isObjectId(id)) return fail("A tétel nem található.");
    const doc = await ArlistaTetel.findById(id).exec();
    if (!doc) return fail("A tétel nem található.");
    if (doc.archivalt)
      return fail("Archivált tétel nem szerkeszthető — előbb állítsd vissza.");
    doc.set({ ...input });
    await doc.save();
    return { ok: true, id };
  },

  /** Soft delete with a mandatory reason; the code stays reserved. */
  async archivalTermek(id: string, ok: string): Promise<Result> {
    await connectDB();
    if (!isObjectId(id)) return fail("A tétel nem található.");
    const indok = ok.trim();
    if (!indok) return fail("Az archiválás okának megadása kötelező.");
    const doc = await ArlistaTetel.findById(id).exec();
    if (!doc) return fail("A tétel nem található.");
    if (doc.archivalt) return fail("A tétel már archivált.");
    doc.set({
      archivalt: true,
      aktiv: false,
      archivaltAt: new Date(),
      archivalasOka: indok,
    });
    await doc.save();
    return { ok: true, id };
  },

  async visszaallitTermek(id: string): Promise<Result> {
    await connectDB();
    if (!isObjectId(id)) return fail("A tétel nem található.");
    const doc = await ArlistaTetel.findById(id).exec();
    if (!doc) return fail("A tétel nem található.");
    if (!doc.archivalt) return fail("A tétel nem archivált.");
    doc.set({
      archivalt: false,
      aktiv: true,
      archivaltAt: undefined,
      archivalasOka: undefined,
    });
    await doc.save();
    return { ok: true, id };
  },

  /** Secret purchase records — the facade refuses without `arlista:beszerzes:write`. */
  async addBeszerzes(
    viewer: ArlistaViewer,
    termekId: string,
    input: BeszerzesiAdatInput,
  ): Promise<Result> {
    if (!canWriteBeszerzes(viewer))
      return fail("Nincs jogosultság a beszerzési adatok kezeléséhez.");
    await connectDB();
    if (!isObjectId(termekId)) return fail("A tétel nem található.");
    const doc = await ArlistaTetel.findById(termekId).exec();
    if (!doc) return fail("A tétel nem található.");
    doc.beszerzesiAdatok.push(input as never);
    doc.set(beszerzesOsszegzes(doc.beszerzesiAdatok));
    await doc.save();
    return { ok: true, id: termekId };
  },

  async removeBeszerzes(
    viewer: ArlistaViewer,
    termekId: string,
    beszerzesId: string,
  ): Promise<Result> {
    if (!canWriteBeszerzes(viewer))
      return fail("Nincs jogosultság a beszerzési adatok kezeléséhez.");
    await connectDB();
    if (!isObjectId(termekId)) return fail("A tétel nem található.");
    const doc = await ArlistaTetel.findById(termekId).exec();
    if (!doc) return fail("A tétel nem található.");
    const marad = doc.beszerzesiAdatok.filter((b) => String(b._id) !== beszerzesId);
    if (marad.length === doc.beszerzesiAdatok.length)
      return fail("A beszerzési rekord nem található.");
    doc.set("beszerzesiAdatok", marad);
    doc.set(beszerzesOsszegzes(doc.beszerzesiAdatok));
    await doc.save();
    return { ok: true, id: termekId };
  },

  // ── Szolgáltatás kategóriák ──

  /** Seeds the 10 default categories when there are none (idempotent). */
  async seedAlapKategoriak(): Promise<{ letrehozva: number }> {
    await connectDB();
    if ((await SzolgaltatasKategoria.countDocuments().exec()) > 0)
      return { letrehozva: 0 };
    await SzolgaltatasKategoria.insertMany(
      ALAP_SZOLGALTATAS_KATEGORIAK.map((k, i) => ({ ...k, sorrend: i + 1, aktiv: true })),
      { ordered: false },
    ).catch(() => undefined); // a concurrent seeder hit the unique prefix index — fine
    return { letrehozva: await SzolgaltatasKategoria.countDocuments().exec() };
  },

  async listKategoriak(): Promise<KategoriaDto[]> {
    await connectDB();
    const [kat, alk] = await Promise.all([
      SzolgaltatasKategoria.find()
        .sort({ sorrend: 1, nev: 1 })
        .lean<ISzolgaltatasKategoria[]>()
        .exec(),
      SzolgaltatasAlkategoria.find().sort({ sorrend: 1, nev: 1 }).lean().exec(),
    ]);
    return kat.map((k) => ({
      _id: String(k._id),
      nev: k.nev,
      ikon: k.ikon,
      kodElotag: k.kodElotag,
      szin: k.szin,
      sorrend: k.sorrend,
      aktiv: k.aktiv,
      leiras: k.leiras,
      alkategoriak: alk
        .filter((a) => String(a.kategoriaId) === String(k._id))
        .map((a) => ({
          _id: String(a._id),
          nev: a.nev,
          sorrend: a.sorrend,
          aktiv: a.aktiv,
        })),
    }));
  },

  async createKategoria(input: KategoriaInput): Promise<Result> {
    await connectDB();
    if (await SzolgaltatasKategoria.exists({ kodElotag: input.kodElotag })) {
      return fail("Ez a kódelőtag már foglalt.");
    }
    const doc = await SzolgaltatasKategoria.create(input);
    return { ok: true, id: String(doc._id) };
  },

  async updateKategoria(
    id: string,
    input: Omit<KategoriaInput, "kodElotag">,
  ): Promise<Result> {
    await connectDB();
    if (!isObjectId(id)) return fail("A kategória nem található.");
    const doc = await SzolgaltatasKategoria.findById(id).exec();
    if (!doc) return fail("A kategória nem található.");
    // The prefix is immutable: issued codes carry it.
    doc.set({ ...input });
    await doc.save();
    return { ok: true, id };
  },

  async createAlkategoria(input: AlkategoriaInput): Promise<Result> {
    await connectDB();
    if (
      !isObjectId(input.kategoriaId) ||
      !(await SzolgaltatasKategoria.exists({ _id: input.kategoriaId }))
    ) {
      return fail("A kategória nem található.");
    }
    const doc = await SzolgaltatasAlkategoria.create(input);
    return { ok: true, id: String(doc._id) };
  },

  async updateAlkategoria(
    id: string,
    input: Pick<AlkategoriaInput, "nev" | "sorrend" | "aktiv">,
  ): Promise<Result> {
    await connectDB();
    if (!isObjectId(id)) return fail("Az alkategória nem található.");
    const doc = await SzolgaltatasAlkategoria.findById(id).exec();
    if (!doc) return fail("Az alkategória nem található.");
    doc.set({ ...input });
    await doc.save();
    return { ok: true, id };
  },

  /** A category/subcategory with items is deactivated by the UI, never removed. */
  async deleteAlkategoria(id: string): Promise<Result> {
    await connectDB();
    if (!isObjectId(id)) return fail("Az alkategória nem található.");
    if (await SzolgaltatasTetel.exists({ alkategoriaId: id })) {
      return fail("Az alkategóriához szolgáltatások tartoznak — inkább tiltsd le.");
    }
    await SzolgaltatasAlkategoria.deleteOne({ _id: id }).exec();
    return { ok: true, id };
  },

  // ── Szolgáltatás tételek ──

  async listSzolgaltatasok(
    opciok: { archivaltIs?: boolean } = {},
  ): Promise<SzolgaltatasDto[]> {
    await connectDB();
    const rows = await SzolgaltatasTetel.find(
      opciok.archivaltIs ? {} : { archivalt: false },
    )
      .sort({ sorrend: 1, kod: 1 })
      .lean<ISzolgaltatasTetel[]>()
      .exec();
    return rows.map(toSzolgaltatas);
  },

  async getSzolgaltatas(id: string): Promise<SzolgaltatasDto | null> {
    await connectDB();
    if (!isObjectId(id)) return null;
    const d = await SzolgaltatasTetel.findById(id).lean<ISzolgaltatasTetel>().exec();
    return d ? toSzolgaltatas(d) : null;
  },

  async createSzolgaltatas(input: SzolgaltatasInput): Promise<Result> {
    await connectDB();
    if (!isObjectId(input.kategoriaId)) return fail("A kategória nem található.");
    const kat = await SzolgaltatasKategoria.findById(input.kategoriaId)
      .lean<ISzolgaltatasKategoria>()
      .exec();
    if (!kat) return fail("A kategória nem található.");
    const kod = await kovetkezoKod("szolgaltatas", kat.kodElotag);
    const doc = await SzolgaltatasTetel.create({ ...input, kod });
    return { ok: true, id: String(doc._id) };
  },

  async updateSzolgaltatas(id: string, input: SzolgaltatasInput): Promise<Result> {
    await connectDB();
    if (!isObjectId(id)) return fail("A szolgáltatás nem található.");
    const doc = await SzolgaltatasTetel.findById(id).exec();
    if (!doc) return fail("A szolgáltatás nem található.");
    if (doc.archivalt)
      return fail("Archivált szolgáltatás nem szerkeszthető — előbb állítsd vissza.");
    // The code never changes, even if the category does.
    doc.set({ ...input });
    await doc.save();
    return { ok: true, id };
  },

  async archivalSzolgaltatas(id: string, ok: string): Promise<Result> {
    await connectDB();
    if (!isObjectId(id)) return fail("A szolgáltatás nem található.");
    const indok = ok.trim();
    if (!indok) return fail("Az archiválás okának megadása kötelező.");
    const doc = await SzolgaltatasTetel.findById(id).exec();
    if (!doc) return fail("A szolgáltatás nem található.");
    if (doc.archivalt) return fail("A szolgáltatás már archivált.");
    doc.set({
      archivalt: true,
      aktiv: false,
      archivaltAt: new Date(),
      archivalasOka: indok,
    });
    await doc.save();
    return { ok: true, id };
  },

  async visszaallitSzolgaltatas(id: string): Promise<Result> {
    await connectDB();
    if (!isObjectId(id)) return fail("A szolgáltatás nem található.");
    const doc = await SzolgaltatasTetel.findById(id).exec();
    if (!doc) return fail("A szolgáltatás nem található.");
    if (!doc.archivalt) return fail("A szolgáltatás nem archivált.");
    doc.set({
      archivalt: false,
      aktiv: true,
      archivaltAt: undefined,
      archivalasOka: undefined,
    });
    await doc.save();
    return { ok: true, id };
  },

  // ── Árképzési beállítások ──

  async getBeallitasok(): Promise<ArazasiBeallitasok> {
    await connectDB();
    const doc = await ArazasiBeallitas.findOne({ kulcs: "alap" }).lean().exec();
    return egyesit(doc as Partial<ArazasiBeallitasok> | null);
  },

  async saveBeallitasok(input: ArazasiBeallitasInput, actorId: string): Promise<Result> {
    await connectDB();
    await ArazasiBeallitas.findOneAndUpdate(
      { kulcs: "alap" },
      { $set: { ...input, modositotta: actorId } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    ).exec();
    return { ok: true };
  },

  // ── Fetch-and-freeze ──

  /**
   * The snapshot a document line (offer, worksheet, certificate) embeds when the item is added.
   * Later changes to the settings or the partner's category never alter it. Works for a
   * service item (multiplier matrix) and for a catalogue product (its net price).
   */
  async priceSnapshot(
    itemId: string,
    input: PriceSnapshotInput,
  ): Promise<{ ok: true; snapshot: ArSnapshot } | { ok: false; message: string }> {
    await connectDB();
    if (!isObjectId(itemId)) return fail("A tétel nem található.");
    const keszult = new Date().toISOString();
    const beallitasok = await arlistaApi.getBeallitasok();

    const szolg = await SzolgaltatasTetel.findById(itemId)
      .lean<ISzolgaltatasTetel>()
      .exec();
    if (szolg) {
      if (szolg.archivalt || !szolg.aktiv)
        return fail("A szolgáltatás nem aktív, nem árazható.");
      const szorzoKulcs = mapPartnerProfilToSzorzoKulcs(input.partnerProfil);
      const surgosseg = input.surgosseg ?? null;
      const egysegDb = input.egysegDb ?? 0;
      const ar = calculateServicePrice(
        {
          arazasiTipus: szolg.arazasiTipus,
          belsoAlapar: szolg.belsoAlapar,
          oradijKategoria: szolg.oradijKategoria,
          egysegSavok: szolg.egysegSavok,
        },
        szorzoKulcs,
        beallitasok,
        { surgosseg, egysegDb },
      );
      return {
        ok: true,
        snapshot: {
          forras: "szolgaltatas",
          tetelId: String(szolg._id),
          kod: szolg.kod,
          nev: szolg.nev,
          egyseg: szolg.egyseg,
          arazasiTipus: szolg.arazasiTipus,
          belsoAlapar: ar.belsoAlapar,
          szorzoKulcs,
          ugyfelSzorzo: ar.ugyfelSzorzo,
          kalkulaltAr: ar.kalkulaltAr,
          surgosseg,
          surgossegiSzorzo: ar.surgossegiSzorzo,
          vegAr: ar.vegAr,
          egyedi: ar.egyedi,
          egysegDb: szolg.arazasiTipus === "egysegalapu" ? egysegDb : null,
          afaKulcs: Math.round(beallitasok.afaKulcs * 100),
          penznem: "HUF",
          keszult,
        },
      };
    }

    const termek = await ArlistaTetel.findById(itemId)
      .select("-beszerzesiAdatok")
      .lean<IArlistaTetel>()
      .exec();
    if (termek) {
      if (termek.archivalt || !termek.aktiv)
        return fail("A tétel nem aktív, nem árazható.");
      return {
        ok: true,
        snapshot: {
          forras: "termek",
          tetelId: String(termek._id),
          kod: termek.kod,
          nev: termek.nev,
          egyseg: termek.egyseg,
          arazasiTipus: "termek",
          belsoAlapar: termek.nettoAr,
          szorzoKulcs: null,
          ugyfelSzorzo: 1,
          kalkulaltAr: termek.nettoAr,
          surgosseg: null,
          surgossegiSzorzo: 1,
          vegAr: termek.nettoAr,
          egyedi: false,
          egysegDb: null,
          afaKulcs: termek.afaKulcs,
          penznem: termek.penznem,
          keszult,
        },
      };
    }
    return fail("A tétel nem található.");
  },
};
