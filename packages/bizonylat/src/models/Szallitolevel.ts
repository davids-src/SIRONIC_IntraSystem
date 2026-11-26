import mongoose, { Schema, type Document, type Types } from "mongoose";
import { withStatusTracking, type StatusTrackingFields } from "@erp/db-core";
import type { KeszletKiadasAllapot } from "../constants";
import type { SzallitolevelSor } from "../types";

export interface ISzallitolevel extends Document, StatusTrackingFields {
  _id: Types.ObjectId;
  /** `SZL-000042` from `nextSequence('bizonylat:szallitolevel')`. */
  azonosito: string;
  partnerId: string;
  partnerNev: string;
  projektId?: string;
  /** Budapest calendar day `YYYY-MM-DD`. */
  kiadasNap: string;
  sorok: SzallitolevelSor[];
  megjegyzes?: string;
  keszletKiadas?: { allapot: KeszletKiadasAllapot; idopont: Date; uzenet?: string };
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
    arlistaTermekId: { type: String, required: true },
    nev: { type: String, required: true },
    mennyiseg: { type: Number, required: true },
    egyseg: { type: String, required: true },
    raktarhelyKod: String,
  },
  { _id: false },
);

const SzallitolevelSchema = withStatusTracking(
  new Schema<ISzallitolevel>(
    {
      azonosito: { type: String, required: true, unique: true },
      partnerId: { type: String, required: true, index: true },
      partnerNev: { type: String, required: true },
      projektId: { type: String, index: true },
      kiadasNap: { type: String, required: true, index: true },
      sorok: { type: [SorSchema], default: [] },
      megjegyzes: String,
      keszletKiadas: {
        type: new Schema(
          {
            allapot: { type: String, enum: ["fuggoben", "kesz", "hiba"], required: true },
            idopont: Date,
            uzenet: String,
          },
          { _id: false },
        ),
      },
      archivalt: { type: Boolean, default: false },
      archivalasOka: String,
      archivalasIdopont: Date,
      archivaltaId: { type: Schema.Types.ObjectId, ref: "User" },
      regiId: { type: String, index: true },
    },
    { timestamps: true, collection: "bizonylat_szallitolevelek" },
  ),
);

export const Szallitolevel =
  (mongoose.models.Szallitolevel as mongoose.Model<ISzallitolevel>) ||
  mongoose.model<ISzallitolevel>("Szallitolevel", SzallitolevelSchema);
