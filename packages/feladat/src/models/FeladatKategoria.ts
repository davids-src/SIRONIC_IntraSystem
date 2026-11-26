import mongoose, { Schema, type Document, type Types } from "mongoose";

/**
 * A selectable task category, managed by the admins. Tasks may only use a category from this
 * list (the defaults are the module names). `kulcs` is the accent/case-insensitive matching key.
 */
export interface IFeladatKategoria extends Document {
  _id: Types.ObjectId;
  nev: string;
  kulcs: string;
  sorrend: number;
  aktiv: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const FeladatKategoriaSchema = new Schema<IFeladatKategoria>(
  {
    nev: { type: String, required: true },
    kulcs: { type: String, required: true, unique: true },
    sorrend: { type: Number, default: 0 },
    aktiv: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "feladat_kategoriak" },
);

export const FeladatKategoria =
  (mongoose.models.FeladatKategoria as mongoose.Model<IFeladatKategoria>) ||
  mongoose.model<IFeladatKategoria>("FeladatKategoria", FeladatKategoriaSchema);
