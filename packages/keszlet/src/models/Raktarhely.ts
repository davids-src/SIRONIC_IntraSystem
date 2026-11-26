import mongoose, { Schema, type Document, type Types } from "mongoose";
import { RAKTARHELY_TIPUSOK, type RaktarhelyTipus } from "../constants";

/** A physical storage location; the tree is encoded in the code (`FO/A/12`), see `szuloKod`. */
export interface IRaktarhely extends Document {
  _id: Types.ObjectId;
  kod: string;
  nev: string;
  tipus: RaktarhelyTipus;
  leiras?: string;
  szuloKod?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RaktarhelySchema = new Schema<IRaktarhely>(
  {
    kod: { type: String, required: true, unique: true, trim: true },
    nev: { type: String, required: true, trim: true },
    tipus: { type: String, enum: RAKTARHELY_TIPUSOK, default: "polc" },
    leiras: { type: String },
    szuloKod: { type: String },
  },
  { timestamps: true, collection: "keszlet_raktarhelyek" },
);
RaktarhelySchema.index({ szuloKod: 1 });

export const Raktarhely =
  (mongoose.models.Raktarhely as mongoose.Model<IRaktarhely>) ||
  mongoose.model<IRaktarhely>("Raktarhely", RaktarhelySchema);
