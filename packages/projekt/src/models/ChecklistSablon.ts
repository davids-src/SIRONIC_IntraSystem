import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface ISablonTetel {
  _id: Types.ObjectId;
  szoveg: string;
  kotelezo: boolean;
  mellekletKotelezo: boolean;
  sorrend: number;
}

/** Reusable checklist template; applying it copies the items onto a project. */
export interface IChecklistSablon extends Document {
  _id: Types.ObjectId;
  nev: string;
  leiras?: string;
  /** e.g. "Kamera telepítés". */
  kategoria?: string;
  tetelek: ISablonTetel[];
  letrehozoId: string;
  archivalt: boolean;
  archivalasOka?: string;
  archivalasIdopont?: Date;
  archivaltaId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SablonTetelSchema = new Schema<ISablonTetel>({
  szoveg: { type: String, required: true },
  kotelezo: { type: Boolean, default: false },
  mellekletKotelezo: { type: Boolean, default: false },
  sorrend: { type: Number, default: 0 },
});

const ChecklistSablonSchema = new Schema<IChecklistSablon>(
  {
    nev: { type: String, required: true, trim: true },
    leiras: { type: String },
    kategoria: { type: String, trim: true },
    tetelek: { type: [SablonTetelSchema], default: [] },
    letrehozoId: { type: String, required: true },
    archivalt: { type: Boolean, default: false },
    archivalasOka: { type: String },
    archivalasIdopont: { type: Date },
    archivaltaId: { type: String },
  },
  { timestamps: true, collection: "projekt_sablonok" },
);

export const ChecklistSablon =
  (mongoose.models.ChecklistSablon as mongoose.Model<IChecklistSablon>) ||
  mongoose.model<IChecklistSablon>("ChecklistSablon", ChecklistSablonSchema);
