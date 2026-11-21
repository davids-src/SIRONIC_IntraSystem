import mongoose, { Schema, type Document, type Types } from "mongoose";
import { withStatusTracking, type StatusTrackingFields } from "@erp/db-core";
import type { IgazolasForras } from "../constants";
import type { IgazolasOsszeg, IgazolasSor } from "../types";

export interface ITeljesitesigazolas extends Document, StatusTrackingFields {
  _id: Types.ObjectId;
  /** `TI-000042` from `nextSequence('bizonylat:igazolas')`. */
  azonosito: string;
  cim: string;
  partnerId: string;
  partnerNev: string;
  partnerEmail?: string;
  projektId?: string;
  ajanlatId?: string;
  munkalapIds: string[];
  forras: IgazolasForras;
  munkaOsszegzes: string;
  idoszakKezdet?: Date;
  idoszakVege?: Date;
  osszOra?: number;
  penznem: string;
  sorok: IgazolasSor[];
  osszegek: IgazolasOsszeg;
  /** Magic link: only the SHA-256 hash is stored, the token itself leaves once in the mail. */
  tokenHash?: string;
  tokenLejar?: Date;
  kuldveAt?: Date;
  alairas?: { nev: string; beosztas: string; kep: string; alairtAt: Date };
  elutasitasOka?: string;
  /** Internal note (SECRET towards the portal). */
  belsoMegjegyzes?: string;
  archivalt: boolean;
  archivalasOka?: string;
  archivalasIdopont?: Date;
  archivaltaId?: Types.ObjectId;
  regiId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SorSchema = new Schema(
  {
    leiras: { type: String, required: true },
    mennyiseg: { type: Number, required: true },
    egyseg: { type: String, required: true },
    nettoEgysegar: { type: Number, default: 0 },
    afaKulcs: { type: Number, default: 27 },
    arSnapshot: { type: Schema.Types.Mixed },
    beszerzesiEgysegar: Number,
  },
  { _id: false },
);

const TeljesitesigazolasSchema = withStatusTracking(
  new Schema<ITeljesitesigazolas>(
    {
      azonosito: { type: String, required: true, unique: true },
      cim: { type: String, required: true },
      partnerId: { type: String, required: true, index: true },
      partnerNev: { type: String, required: true },
      partnerEmail: String,
      projektId: { type: String, index: true },
      ajanlatId: String,
      munkalapIds: { type: [String], default: [] },
      forras: { type: String, default: "kezi" },
      munkaOsszegzes: { type: String, required: true },
      idoszakKezdet: Date,
      idoszakVege: Date,
      osszOra: Number,
      penznem: { type: String, default: "HUF" },
      sorok: { type: [SorSchema], default: [] },
      osszegek: {
        nettoOsszeg: { type: Number, default: 0 },
        afaOsszeg: { type: Number, default: 0 },
        bruttoOsszeg: { type: Number, default: 0 },
      },
      tokenHash: { type: String, index: true, sparse: true },
      tokenLejar: Date,
      kuldveAt: Date,
      alairas: {
        type: new Schema(
          { nev: String, beosztas: String, kep: String, alairtAt: Date },
          { _id: false },
        ),
      },
      elutasitasOka: String,
      belsoMegjegyzes: String,
      archivalt: { type: Boolean, default: false },
      archivalasOka: String,
      archivalasIdopont: Date,
      archivaltaId: { type: Schema.Types.ObjectId, ref: "User" },
      regiId: { type: String, index: true },
    },
    { timestamps: true, collection: "bizonylat_teljesitesigazolasok" },
  ),
);

export const Teljesitesigazolas =
  (mongoose.models.Teljesitesigazolas as mongoose.Model<ITeljesitesigazolas>) ||
  mongoose.model<ITeljesitesigazolas>("Teljesitesigazolas", TeljesitesigazolasSchema);
