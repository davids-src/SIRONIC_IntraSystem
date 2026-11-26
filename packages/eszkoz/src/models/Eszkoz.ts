import mongoose, { Schema, type Document, type Types } from "mongoose";
import { withStatusTracking, type StatusTrackingFields } from "@erp/db-core";
import { FIZIKAI_ALLAPOTOK, type FizikaiAllapot } from "../constants";

/**
 * A tracked tool. The lifecycle state is `status.key` (an `EszkozAllapot`, written by
 * `withStatusTracking`); the current holder is `assignee.userId`, set only while `kiadva`.
 */
export interface IEszkoz extends Document, StatusTrackingFields {
  _id: Types.ObjectId;
  megnevezes: string;
  marka?: string;
  tipusszam?: string;
  gyariSzam?: string;
  fizikaiAllapot: FizikaiAllapot;
  jegyzet?: string;
  /** Denormalized display name of the holder — avoids a User join on the list. */
  birtokosNev?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EszkozSchema = withStatusTracking(
  new Schema<IEszkoz>(
    {
      megnevezes: { type: String, required: true, trim: true },
      marka: { type: String, trim: true },
      tipusszam: { type: String, trim: true },
      gyariSzam: { type: String, trim: true },
      fizikaiAllapot: { type: String, enum: FIZIKAI_ALLAPOTOK, required: true },
      jegyzet: { type: String },
      birtokosNev: { type: String },
    },
    { timestamps: true, collection: "eszkoz_eszkozok" },
  ),
);
EszkozSchema.index({ "status.key": 1, createdAt: -1 });
EszkozSchema.index({ "assignee.userId": 1, "status.key": 1 });

export const Eszkoz =
  (mongoose.models.Eszkoz as mongoose.Model<IEszkoz>) ||
  mongoose.model<IEszkoz>("Eszkoz", EszkozSchema);
