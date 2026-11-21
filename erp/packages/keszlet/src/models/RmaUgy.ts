import mongoose, { Schema, type Document, type Types } from "mongoose";
import { withStatusTracking, type StatusTrackingFields } from "@erp/db-core";

/** RMA case. Lifecycle = `status.key` (an `RmaAllapot`) via withStatusTracking. */
export interface IRmaUgy extends Document, StatusTrackingFields {
  _id: Types.ObjectId;
  /** `RMA-2026-000001` */
  sorszam: string;
  arlistaTermekId: string;
  termekNev: string;
  termekKod: string;
  gyariSzam?: string;
  mennyiseg: number;
  /** Opaque partner id (the app resolves it) + denormalized name. */
  partnerId: string;
  partnerNev: string;
  beszallitoNev?: string;
  megjegyzes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RmaUgySchema = withStatusTracking(
  new Schema<IRmaUgy>(
    {
      sorszam: { type: String, required: true, unique: true },
      arlistaTermekId: { type: String, required: true },
      termekNev: { type: String, required: true },
      termekKod: { type: String, required: true },
      gyariSzam: { type: String, trim: true },
      mennyiseg: { type: Number, required: true, default: 1, min: 1 },
      partnerId: { type: String, required: true, index: true },
      partnerNev: { type: String, required: true },
      beszallitoNev: { type: String, trim: true },
      megjegyzes: { type: String },
    },
    { timestamps: true, collection: "keszlet_rma_ugyek" },
  ),
);
RmaUgySchema.index({ "status.key": 1, createdAt: -1 });
RmaUgySchema.index({ "assignee.userId": 1, "status.key": 1 });

export const RmaUgy =
  (mongoose.models.RmaUgy as mongoose.Model<IRmaUgy>) ||
  mongoose.model<IRmaUgy>("RmaUgy", RmaUgySchema);
