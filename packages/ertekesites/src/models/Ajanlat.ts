import mongoose, { Schema, type Document, type Types } from "mongoose";
import { withStatusTracking, type StatusTrackingFields } from "@erp/db-core";
import {
  ELVESZTES_OKOK,
  SOR_FORRASOK,
  SOR_TIPUSOK,
  type ElvesztesOk,
} from "../constants";
import type { AjanlatSor, OsszegAdat } from "../types";

export interface IAjanlat extends Document, StatusTrackingFields {
  _id: Types.ObjectId;
  /** `AJ-000042` from `nextSequence('ertekesites:ajanlat')`. */
  azonosito: string;
  cim: string;
  /** Opaque partner id — no cross-module reference. */
  partnerId: string;
  partnerNev: string;
  partnerCim?: string;
  partnerAdoszam?: string;
  penznem: string;
  ervenyesseg?: Date;
  megjegyzes?: string;
  uzletiEgyseg?: string;
  sorok: AjanlatSor[];
  osszegek: OsszegAdat;
  utankovetes?: Date;
  utankovetesMegjegyzes?: string;
  kuldveAt?: Date;
  elvesztesOka?: ElvesztesOk;
  elvesztesMegjegyzes?: string;
  kovetkezoLepes?: string;
  kovetkezoLepesIdopont?: Date;
  archivalt: boolean;
  archivalasOka?: string;
  archivalasIdopont?: Date;
  archivaltaId?: Types.ObjectId;
  regiId?: string;
  regiAzonosito?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SorSchema = new Schema(
  {
    forras: { type: String, enum: SOR_FORRASOK, required: true },
    sorTipus: { type: String, enum: SOR_TIPUSOK, required: true },
    leiras: { type: String, required: true },
    mennyiseg: { type: Number, required: true },
    egyseg: { type: String, required: true },
    nettoEgysegar: { type: Number, required: true },
    afaKulcs: { type: Number, required: true },
    kedvezmenySzazalek: Number,
    csomagId: String,
    csomagSzulo: Boolean,
    /** Frozen at write time — never re-read from the price list. */
    arSnapshot: { type: Schema.Types.Mixed },
    beszerzesiEgysegar: Number,
    belsoKoltseg: Number,
  },
  { _id: false },
);

const OsszegSchema = new Schema(
  {
    nettoOsszeg: Number,
    globalisKedvezmenySzazalek: Number,
    globalisKedvezmenyOsszeg: Number,
    kedvezmenyesNetto: Number,
    afaOsszeg: Number,
    bruttoOsszeg: Number,
    afaBontas: [
      { _id: false, afaKulcs: Number, netto: Number, afa: Number, brutto: Number },
    ],
  },
  { _id: false },
);

const AjanlatSchema = withStatusTracking(
  new Schema<IAjanlat>(
    {
      azonosito: { type: String, required: true, unique: true },
      cim: { type: String, required: true },
      partnerId: { type: String, required: true, index: true },
      partnerNev: { type: String, required: true },
      partnerCim: String,
      partnerAdoszam: String,
      penznem: { type: String, required: true, default: "HUF" },
      ervenyesseg: Date,
      megjegyzes: String,
      uzletiEgyseg: String,
      sorok: { type: [SorSchema], default: [] },
      osszegek: { type: OsszegSchema, required: true },
      utankovetes: { type: Date, index: true },
      utankovetesMegjegyzes: String,
      kuldveAt: Date,
      elvesztesOka: { type: String, enum: ELVESZTES_OKOK },
      elvesztesMegjegyzes: String,
      kovetkezoLepes: String,
      kovetkezoLepesIdopont: Date,
      archivalt: { type: Boolean, default: false },
      archivalasOka: String,
      archivalasIdopont: Date,
      archivaltaId: { type: Schema.Types.ObjectId, ref: "User" },
      regiId: { type: String, index: true },
      regiAzonosito: String,
    },
    { timestamps: true, collection: "ertekesites_ajanlatok" },
  ),
);
AjanlatSchema.index({ archivalt: 1, "status.key": 1, createdAt: -1 });

export const Ajanlat =
  (mongoose.models.Ajanlat as mongoose.Model<IAjanlat>) ||
  mongoose.model<IAjanlat>("Ajanlat", AjanlatSchema);
