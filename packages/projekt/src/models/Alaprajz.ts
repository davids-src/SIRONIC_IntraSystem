import mongoose, { Schema, type Document, type Types } from "mongoose";
import { JELOLO_TIPUSOK, type JeloloTipus } from "../constants";

export interface IJelolo {
  _id: Types.ObjectId;
  /** 0–100, relative position on the plan. */
  x: number;
  y: number;
  cimke?: string;
  tipus: JeloloTipus;
  leiras?: string;
  /** Opaque ids of linked records. */
  hibajegyId?: string;
  eszkozId?: string;
}

/** Floorplan — a file reference (media id supplied by the app) with markers. */
export interface IAlaprajz extends Document {
  _id: Types.ObjectId;
  partnerId?: string;
  projektId?: string;
  nev: string;
  fajlMediaId: string;
  jelolok: IJelolo[];
  letrehozoId: string;
  archivalt: boolean;
  archivalasOka?: string;
  archivalasIdopont?: Date;
  archivaltaId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const JeloloSchema = new Schema<IJelolo>({
  x: { type: Number, required: true, min: 0, max: 100 },
  y: { type: Number, required: true, min: 0, max: 100 },
  cimke: { type: String },
  tipus: { type: String, enum: JELOLO_TIPUSOK, default: "egyeb" },
  leiras: { type: String },
  hibajegyId: { type: String },
  eszkozId: { type: String },
});

const AlaprajzSchema = new Schema<IAlaprajz>(
  {
    partnerId: { type: String, index: true },
    projektId: { type: String, index: true },
    nev: { type: String, required: true, trim: true },
    fajlMediaId: { type: String, required: true },
    jelolok: { type: [JeloloSchema], default: [] },
    letrehozoId: { type: String, required: true },
    archivalt: { type: Boolean, default: false },
    archivalasOka: { type: String },
    archivalasIdopont: { type: Date },
    archivaltaId: { type: String },
  },
  { timestamps: true, collection: "projekt_alaprajzok" },
);

export const Alaprajz =
  (mongoose.models.Alaprajz as mongoose.Model<IAlaprajz>) ||
  mongoose.model<IAlaprajz>("Alaprajz", AlaprajzSchema);
