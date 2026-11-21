import mongoose, { Schema, type Document, type Types } from "mongoose";
import { withStatusTracking, type StatusTrackingFields } from "@erp/db-core";
import { PRIORITASOK, type Prioritas } from "../constants";

/**
 * Weekly plan item. State = `status.key` (todo / folyamatban / kesz / blokkolt); the plan's
 * owner is `assignee.userId`. Links to hibajegy / projekt / munkalap are opaque ids.
 */
export interface IHetiTerv extends Document, StatusTrackingFields {
  _id: Types.ObjectId;
  cim: string;
  leiras?: string;
  ev: number;
  het: number;
  prioritas: Prioritas;
  hatarido?: Date;
  hibajegyId?: string;
  projektId?: string;
  munkalapId?: string;
  /** Denormalized owner name for lists. */
  felelosNev: string;
  letrehozoId: string;
  archivalt: boolean;
  archivalasOka?: string;
  archivalasIdopont?: Date;
  archivaltaId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const HetiTervSchema = withStatusTracking(
  new Schema<IHetiTerv>(
    {
      cim: { type: String, required: true, trim: true },
      leiras: { type: String },
      ev: { type: Number, required: true },
      het: { type: Number, required: true },
      prioritas: { type: String, enum: PRIORITASOK, required: true, default: "kozepes" },
      hatarido: { type: Date },
      hibajegyId: { type: String },
      projektId: { type: String },
      munkalapId: { type: String },
      felelosNev: { type: String, required: true },
      letrehozoId: { type: String, required: true },
      archivalt: { type: Boolean, default: false },
      archivalasOka: { type: String },
      archivalasIdopont: { type: Date },
      archivaltaId: { type: String },
    },
    { timestamps: true, collection: "projekt_hetiervek" },
  ),
);
HetiTervSchema.index({ "assignee.userId": 1, ev: 1, het: 1 });
HetiTervSchema.index({ ev: 1, het: 1, archivalt: 1 });

export const HetiTerv =
  (mongoose.models.HetiTerv as mongoose.Model<IHetiTerv>) ||
  mongoose.model<IHetiTerv>("HetiTerv", HetiTervSchema);
