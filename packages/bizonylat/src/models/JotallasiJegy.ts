import mongoose, { Schema, type Document, type Types } from "mongoose";
import { withStatusTracking, type StatusTrackingFields } from "@erp/db-core";

export interface IJotallasSor {
  termekNev: string;
  arlistaTermekId?: string;
  gyariSzam?: string;
  evek: number;
  kezdet: Date;
  vege: Date;
}

export interface IJotallasiJegy extends Document, StatusTrackingFields {
  _id: Types.ObjectId;
  /** `JJY-000042` from `nextSequence('bizonylat:jotallas')`. */
  azonosito: string;
  partnerId: string;
  partnerNev: string;
  szamlaszam?: string;
  kiallitasNap: string;
  sorok: IJotallasSor[];
  megjegyzes?: string;
  /** Legal text frozen when the card was issued. */
  jogiSzoveg: string;
  /** Latest line end — drives the lazily computed `lejart`. */
  lejarat?: Date;
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
    termekNev: { type: String, required: true },
    arlistaTermekId: String,
    gyariSzam: String,
    evek: { type: Number, required: true, min: 1 },
    kezdet: { type: Date, required: true },
    vege: { type: Date, required: true },
  },
  { _id: false },
);

const JotallasiJegySchema = withStatusTracking(
  new Schema<IJotallasiJegy>(
    {
      azonosito: { type: String, required: true, unique: true },
      partnerId: { type: String, required: true, index: true },
      partnerNev: { type: String, required: true },
      szamlaszam: String,
      kiallitasNap: { type: String, required: true },
      sorok: { type: [SorSchema], default: [] },
      megjegyzes: String,
      jogiSzoveg: { type: String, required: true },
      lejarat: { type: Date, index: true },
      archivalt: { type: Boolean, default: false },
      archivalasOka: String,
      archivalasIdopont: Date,
      archivaltaId: { type: Schema.Types.ObjectId, ref: "User" },
      regiId: { type: String, index: true },
    },
    { timestamps: true, collection: "bizonylat_jotallasi_jegyek" },
  ),
);

export const JotallasiJegy =
  (mongoose.models.JotallasiJegy as mongoose.Model<IJotallasiJegy>) ||
  mongoose.model<IJotallasiJegy>("JotallasiJegy", JotallasiJegySchema);
