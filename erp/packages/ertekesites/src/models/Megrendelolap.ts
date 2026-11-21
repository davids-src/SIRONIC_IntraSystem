import mongoose, { Schema, type Document, type Types } from "mongoose";
import { withStatusTracking, type StatusTrackingFields } from "@erp/db-core";
import type { MegrendeloSor } from "../types";

export interface IMegrendelolap extends Document, StatusTrackingFields {
  _id: Types.ObjectId;
  /** `MR-000042` from `nextSequence('ertekesites:megrendelo')`. */
  azonosito: string;
  /** Opaque partner id of the supplier. */
  beszallitoId: string;
  beszallitoNev: string;
  projektId?: string;
  ajanlatId?: string;
  penznem: string;
  varhatoSzallitas?: Date;
  megjegyzes?: string;
  sorok: MegrendeloSor[];
  nettoOsszeg: number;
  afaOsszeg: number;
  bruttoOsszeg: number;
  /** Result of the stock-receipt port call made when the order was fulfilled. */
  bevetelezes?: { ok: boolean; idopont: Date; uzenet?: string };
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
    arlistaTetelId: String,
    leiras: { type: String, required: true },
    mennyiseg: { type: Number, required: true },
    egyseg: { type: String, required: true },
    nettoEgysegar: { type: Number, required: true },
    afaKulcs: { type: Number, required: true },
  },
  { _id: false },
);

const MegrendelolapSchema = withStatusTracking(
  new Schema<IMegrendelolap>(
    {
      azonosito: { type: String, required: true, unique: true },
      beszallitoId: { type: String, required: true, index: true },
      beszallitoNev: { type: String, required: true },
      projektId: { type: String, index: true },
      ajanlatId: String,
      penznem: { type: String, default: "HUF" },
      varhatoSzallitas: Date,
      megjegyzes: String,
      sorok: { type: [SorSchema], default: [] },
      nettoOsszeg: { type: Number, default: 0 },
      afaOsszeg: { type: Number, default: 0 },
      bruttoOsszeg: { type: Number, default: 0 },
      bevetelezes: {
        type: new Schema({ ok: Boolean, idopont: Date, uzenet: String }, { _id: false }),
      },
      archivalt: { type: Boolean, default: false },
      archivalasOka: String,
      archivalasIdopont: Date,
      archivaltaId: { type: Schema.Types.ObjectId, ref: "User" },
      regiId: { type: String, index: true },
    },
    { timestamps: true, collection: "ertekesites_megrendelolapok" },
  ),
);

export const Megrendelolap =
  (mongoose.models.Megrendelolap as mongoose.Model<IMegrendelolap>) ||
  mongoose.model<IMegrendelolap>("Megrendelolap", MegrendelolapSchema);
