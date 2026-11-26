import mongoose, { Schema, type Document, type Types } from "mongoose";

/**
 * A personal step template (#50): a user saves the steps of a task under a name and applies
 * them to another task later. Private to its owner.
 */
export interface ILepesSablon extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  nev: string;
  lepesek: string[];
  createdAt: Date;
  updatedAt: Date;
}

const LepesSablonSchema = new Schema<ILepesSablon>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    nev: { type: String, required: true },
    lepesek: { type: [String], default: [] },
  },
  { timestamps: true, collection: "feladat_lepes_sablonok" },
);

LepesSablonSchema.index({ userId: 1, nev: 1 }, { unique: true });

export const LepesSablon =
  (mongoose.models.LepesSablon as mongoose.Model<ILepesSablon>) ||
  mongoose.model<ILepesSablon>("LepesSablon", LepesSablonSchema);
