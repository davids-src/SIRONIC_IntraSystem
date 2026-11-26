import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface ISzolgaltatasKategoria extends Document {
  _id: Types.ObjectId;
  nev: string;
  ikon: string;
  /** Prefix of the item codes in this category (`IT` → `IT-0001`). */
  kodElotag: string;
  szin: string;
  sorrend: number;
  aktiv: boolean;
  leiras?: string;
}

const SzolgaltatasKategoriaSchema = new Schema<ISzolgaltatasKategoria>(
  {
    nev: { type: String, required: true, trim: true },
    ikon: { type: String, required: true, default: "Tag" },
    kodElotag: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    szin: { type: String, required: true, default: "#6366f1" },
    sorrend: { type: Number, required: true, default: 0 },
    aktiv: { type: Boolean, required: true, default: true },
    leiras: { type: String },
  },
  { timestamps: true, collection: "arlista_szolgaltatas_kategoriak" },
);

export const SzolgaltatasKategoria =
  (mongoose.models.SzolgaltatasKategoria as mongoose.Model<ISzolgaltatasKategoria>) ||
  mongoose.model<ISzolgaltatasKategoria>(
    "SzolgaltatasKategoria",
    SzolgaltatasKategoriaSchema,
  );

export interface ISzolgaltatasAlkategoria extends Document {
  _id: Types.ObjectId;
  kategoriaId: Types.ObjectId;
  nev: string;
  sorrend: number;
  aktiv: boolean;
}

const SzolgaltatasAlkategoriaSchema = new Schema<ISzolgaltatasAlkategoria>(
  {
    kategoriaId: { type: Schema.Types.ObjectId, required: true, index: true },
    nev: { type: String, required: true, trim: true },
    sorrend: { type: Number, required: true, default: 0 },
    aktiv: { type: Boolean, required: true, default: true },
  },
  { timestamps: true, collection: "arlista_szolgaltatas_alkategoriak" },
);

export const SzolgaltatasAlkategoria =
  (mongoose.models.SzolgaltatasAlkategoria as mongoose.Model<ISzolgaltatasAlkategoria>) ||
  mongoose.model<ISzolgaltatasAlkategoria>(
    "SzolgaltatasAlkategoria",
    SzolgaltatasAlkategoriaSchema,
  );
