import mongoose, { Schema, type Document, type Types } from "mongoose";

/**
 * A user's notification preferences (Értesítési központ, #71). One row per user, created on the
 * first change — a missing row means every e-mail category is off.
 */
export interface IErtesitesBeallitas extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  email: { feladat_uj: boolean; feladat_valtozas: boolean; jelzes: boolean };
  createdAt: Date;
  updatedAt: Date;
}

const ErtesitesBeallitasSchema = new Schema<IErtesitesBeallitas>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    email: {
      feladat_uj: { type: Boolean, default: false },
      feladat_valtozas: { type: Boolean, default: false },
      jelzes: { type: Boolean, default: false },
    },
  },
  { timestamps: true, collection: "ertesites_beallitasok" },
);

export const ErtesitesBeallitas =
  (mongoose.models.ErtesitesBeallitas as mongoose.Model<IErtesitesBeallitas>) ||
  mongoose.model<IErtesitesBeallitas>("ErtesitesBeallitas", ErtesitesBeallitasSchema);
