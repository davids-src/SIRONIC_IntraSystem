import mongoose, { Schema, type Document, type Types } from "mongoose";
import { withStatusTracking, type StatusTrackingFields } from "@erp/db-core";
import type { SzamlaSor } from "../types";

export interface ISzamla extends Document, StatusTrackingFields {
  _id: Types.ObjectId;
  /** `SZA-000042` internal record id; the legal number comes from Billingo (`szamlaszam`). */
  azonosito: string;
  szamlaszam?: string;
  billingoRef?: string;
  partnerId: string;
  partnerNev: string;
  partnerCim?: string;
  partnerAdoszam?: string;
  cim?: string;
  igazolasId?: string;
  sorok: SzamlaSor[];
  osszeg: number;
  penznem: string;
  kiallitva?: Date;
  esedekes?: Date;
  kifizetve?: Date;
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
    nettoEgysegar: { type: Number, required: true },
    afaKulcs: { type: Number, required: true },
  },
  { _id: false },
);

const SzamlaSchema = withStatusTracking(
  new Schema<ISzamla>(
    {
      azonosito: { type: String, required: true, unique: true },
      szamlaszam: { type: String, index: true, sparse: true },
      billingoRef: { type: String, index: true, sparse: true },
      partnerId: { type: String, required: true, index: true },
      partnerNev: { type: String, required: true },
      partnerCim: String,
      partnerAdoszam: String,
      cim: String,
      igazolasId: { type: String, index: true, sparse: true },
      sorok: { type: [SorSchema], default: [] },
      osszeg: { type: Number, default: 0 },
      penznem: { type: String, default: "HUF" },
      kiallitva: Date,
      esedekes: Date,
      kifizetve: Date,
      archivalt: { type: Boolean, default: false },
      archivalasOka: String,
      archivalasIdopont: Date,
      archivaltaId: { type: Schema.Types.ObjectId, ref: "User" },
      regiId: { type: String, index: true },
    },
    { timestamps: true, collection: "bizonylat_szamlak" },
  ),
);

export const Szamla =
  (mongoose.models.Szamla as mongoose.Model<ISzamla>) ||
  mongoose.model<ISzamla>("Szamla", SzamlaSchema);
