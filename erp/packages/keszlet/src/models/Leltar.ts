import mongoose, { Schema, type Document, type Types } from "mongoose";

export type LeltarSor = {
  arlistaTermekId: string;
  nev: string;
  kod: string;
  egyseg: string;
  /** Stock when the count started. */
  elvart: number;
  /** Counted quantity; null until entered. */
  tenyleges: number | null;
  indoklas?: string;
};

/** An inventory taking of one location. Closed once, by a conditional status update. */
export interface ILeltar extends Document {
  _id: Types.ObjectId;
  sorszam: string;
  raktarhelyKod: string;
  allapot: "tervezet" | "lezaras" | "lezarva";
  sorok: LeltarSor[];
  letrehozoId: Types.ObjectId;
  lezarId?: Types.ObjectId;
  lezartAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LeltarSorSchema = new Schema<LeltarSor>(
  {
    arlistaTermekId: { type: String, required: true },
    nev: { type: String, required: true },
    kod: { type: String, required: true },
    egyseg: { type: String, required: true },
    elvart: { type: Number, required: true },
    tenyleges: { type: Number, default: null },
    indoklas: { type: String },
  },
  { _id: false },
);

const LeltarSchema = new Schema<ILeltar>(
  {
    sorszam: { type: String, required: true, unique: true },
    raktarhelyKod: { type: String, default: "" },
    allapot: {
      type: String,
      enum: ["tervezet", "lezaras", "lezarva"],
      default: "tervezet",
    },
    sorok: { type: [LeltarSorSchema], default: [] },
    letrehozoId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    lezarId: { type: Schema.Types.ObjectId, ref: "User" },
    lezartAt: { type: Date },
  },
  { timestamps: true, collection: "keszlet_leltarak" },
);
LeltarSchema.index({ createdAt: -1 });

export const Leltar =
  (mongoose.models.Leltar as mongoose.Model<ILeltar>) ||
  mongoose.model<ILeltar>("Leltar", LeltarSchema);
