import mongoose, { Schema, type Document, type Types } from "mongoose";
import { ARAZASI_TIPUSOK, type ArazasiTipus } from "../constants";
import type { EgysegSav } from "../szamitas";

export interface ISzolgaltatasTetel extends Document {
  _id: Types.ObjectId;
  kategoriaId: Types.ObjectId;
  alkategoriaId?: Types.ObjectId;
  kod: string;
  nev: string;
  leiras?: string;
  egyseg: string;
  arazasiTipus: ArazasiTipus;
  /** Internal floor price — never shown to customers. */
  belsoAlapar?: number;
  oradijKategoria?: string;
  egysegSavok: EgysegSav[];
  /** Internal note. */
  megjegyzes?: string;
  /** Note printed towards the customer. */
  ugyfelMegjegyzes?: string;
  aktiv: boolean;
  archivalt: boolean;
  archivaltAt?: Date;
  archivalasOka?: string;
  sorrend: number;
  createdAt: Date;
  updatedAt: Date;
}

const EgysegSavSchema = new Schema<EgysegSav>(
  {
    cimke: { type: String, required: true },
    minEgyseg: { type: Number, required: true },
    maxEgyseg: { type: Number, default: null },
    alapar: { type: Number, required: true },
  },
  { _id: false },
);

const SzolgaltatasTetelSchema = new Schema<ISzolgaltatasTetel>(
  {
    kategoriaId: { type: Schema.Types.ObjectId, required: true, index: true },
    alkategoriaId: { type: Schema.Types.ObjectId, index: true },
    kod: { type: String, required: true, unique: true, trim: true },
    nev: { type: String, required: true, trim: true },
    leiras: { type: String },
    egyseg: { type: String, required: true },
    arazasiTipus: { type: String, enum: ARAZASI_TIPUSOK, required: true },
    belsoAlapar: { type: Number, min: 0 },
    oradijKategoria: { type: String },
    egysegSavok: { type: [EgysegSavSchema], default: [] },
    megjegyzes: { type: String },
    ugyfelMegjegyzes: { type: String },
    aktiv: { type: Boolean, required: true, default: true },
    archivalt: { type: Boolean, required: true, default: false },
    archivaltAt: { type: Date },
    archivalasOka: { type: String },
    sorrend: { type: Number, required: true, default: 0 },
  },
  { timestamps: true, collection: "arlista_szolgaltatas_tetelek" },
);
SzolgaltatasTetelSchema.index({ kategoriaId: 1, archivalt: 1 });

export const SzolgaltatasTetel =
  (mongoose.models.SzolgaltatasTetel as mongoose.Model<ISzolgaltatasTetel>) ||
  mongoose.model<ISzolgaltatasTetel>("SzolgaltatasTetel", SzolgaltatasTetelSchema);
