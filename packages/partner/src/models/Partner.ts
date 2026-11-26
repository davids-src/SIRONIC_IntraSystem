import mongoose, { Schema, type Document, type Types } from "mongoose";
import {
  ALVALLALKOZOI_JELENLET_TIPUSOK,
  ALVALLALKOZOI_MUNKATERULETEK,
  ALVALLALKOZOI_SZAMLAZASI_CIKLUSOK,
  ALAPERTELMEZETT_MEGUJITAS_EMLEKEZTETO_NAP,
  ARAZASI_SZERZODES_TIPUSOK,
  PARTNER_SZEREPEK,
  PARTNER_TIPUSOK,
  UGYFEL_KATEGORIAK,
  type AlvallalkozoiJelenletTipus,
  type AlvallalkozoiMunkaterulet,
  type AlvallalkozoiSzamlazasiCiklus,
  type ArazasiSzerzodesTipus,
  type PartnerSzerep,
  type PartnerTipus,
  type UgyfelKategoria,
} from "../constants";

export interface ICim {
  iranyitoszam?: string;
  varos?: string;
  utca?: string;
  orszag?: string;
}

export interface IKapcsolattarto {
  _id: Types.ObjectId;
  nev: string;
  beosztas?: string;
  telefon?: string;
  email?: string;
  elsodleges: boolean;
}

/**
 * Partner — one entity for every party the company deals with (legacy Contact + Supplier).
 * Single-tenant: no tenantId. Catalog row, no status lifecycle. Soft-archived, never deleted:
 * `archivalt` + `archivalasOka` + `archivalasIdopont`.
 */
export interface IPartner extends Document {
  _id: Types.ObjectId;
  /** `P-000042`, from `nextSequence('partner:partner')`. */
  azonosito: string;
  tipus: PartnerTipus;
  nev: string;
  /** Lower-cased, accent-folded name — duplicate detection. */
  nevKulcs: string;
  rovidNev?: string;
  adoszam?: string;
  cegjegyzekszam?: string;
  szekhely?: ICim;
  szamlazasiCim?: ICim;
  telefon?: string;
  email?: string;
  bankszamlaszam?: string;
  kapcsolattartok: IKapcsolattarto[];
  cimkek: string[];
  megjegyzes?: string;

  // Árazási profil — read by the arlista module through the client barrel.
  partnerSzerep?: PartnerSzerep;
  ugyfelKategoria?: UgyfelKategoria;
  arazasiSzerzodesTipus?: ArazasiSzerzodesTipus;
  szerzodesKezdete?: Date;
  szerzodesVege?: Date;
  megujitasEmlekeztetoNap: number;
  alvallalkozoMunkateruletek: AlvallalkozoiMunkaterulet[];
  alvallalkozoJelenletTipus?: AlvallalkozoiJelenletTipus;
  alvallalkozoSzamlazasiCiklus?: AlvallalkozoiSzamlazasiCiklus;

  archivalt: boolean;
  archivalasOka?: string;
  archivalasIdopont?: Date;
  archivaltaId?: Types.ObjectId;

  /** Migration traceability: legacy collection + _id (idempotent upsert key). */
  regiForras?: "contact" | "supplier";
  regiId?: string;
  regiAzonosito?: string;

  createdAt: Date;
  updatedAt: Date;
}

const CimSchema = new Schema<ICim>(
  {
    iranyitoszam: String,
    varos: String,
    utca: String,
    orszag: String,
  },
  { _id: false },
);

const KapcsolattartoSchema = new Schema<IKapcsolattarto>({
  nev: { type: String, required: true },
  beosztas: String,
  telefon: String,
  email: String,
  elsodleges: { type: Boolean, default: false },
});

const PartnerSchema = new Schema<IPartner>(
  {
    azonosito: { type: String, required: true, unique: true },
    tipus: { type: String, enum: PARTNER_TIPUSOK, required: true },
    nev: { type: String, required: true, index: true },
    nevKulcs: { type: String, required: true, index: true },
    rovidNev: String,
    adoszam: { type: String, index: true },
    cegjegyzekszam: String,
    szekhely: { type: CimSchema },
    szamlazasiCim: { type: CimSchema },
    telefon: String,
    email: String,
    bankszamlaszam: String,
    kapcsolattartok: { type: [KapcsolattartoSchema], default: [] },
    cimkek: { type: [String], default: [] },
    megjegyzes: String,
    partnerSzerep: { type: String, enum: PARTNER_SZEREPEK },
    ugyfelKategoria: { type: String, enum: UGYFEL_KATEGORIAK },
    arazasiSzerzodesTipus: { type: String, enum: ARAZASI_SZERZODES_TIPUSOK },
    szerzodesKezdete: Date,
    szerzodesVege: Date,
    megujitasEmlekeztetoNap: {
      type: Number,
      default: ALAPERTELMEZETT_MEGUJITAS_EMLEKEZTETO_NAP,
    },
    alvallalkozoMunkateruletek: {
      type: [{ type: String, enum: ALVALLALKOZOI_MUNKATERULETEK }],
      default: [],
    },
    alvallalkozoJelenletTipus: { type: String, enum: ALVALLALKOZOI_JELENLET_TIPUSOK },
    alvallalkozoSzamlazasiCiklus: {
      type: String,
      enum: ALVALLALKOZOI_SZAMLAZASI_CIKLUSOK,
    },
    archivalt: { type: Boolean, default: false, index: true },
    archivalasOka: String,
    archivalasIdopont: Date,
    archivaltaId: { type: Schema.Types.ObjectId, ref: "User" },
    regiForras: { type: String, enum: ["contact", "supplier"] },
    regiId: String,
    regiAzonosito: String,
  },
  { timestamps: true, collection: "partnerek" },
);

PartnerSchema.index(
  { regiForras: 1, regiId: 1 },
  { unique: true, partialFilterExpression: { regiId: { $type: "string" } } },
);

export const Partner =
  (mongoose.models.Partner as mongoose.Model<IPartner>) ||
  mongoose.model<IPartner>("Partner", PartnerSchema);
