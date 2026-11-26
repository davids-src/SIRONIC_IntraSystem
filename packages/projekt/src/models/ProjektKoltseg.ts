import mongoose, { Schema, type Document, type Types } from "mongoose";
import { KOLTSEG_TIPUSOK, type KoltsegTipus } from "../constants";

/** Project expense. Internal data: never exposed to a portal viewer. */
export interface IProjektKoltseg extends Document {
  _id: Types.ObjectId;
  projektId: string;
  /** Opaque worklog (Munkalap) id. */
  munkalapId?: string;
  tipus: KoltsegTipus;
  leiras?: string;
  /** Net amount. */
  osszeg: number;
  penznem: string;
  datum: Date;
  /** Media id of the receipt (supplied by the app). */
  bizonylatMediaId?: string;
  rogzitoId: string;
  rogzitoNev: string;
  archivalt: boolean;
  archivalasOka?: string;
  archivalasIdopont?: Date;
  archivaltaId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProjektKoltsegSchema = new Schema<IProjektKoltseg>(
  {
    projektId: { type: String, required: true, index: true },
    munkalapId: { type: String },
    tipus: { type: String, enum: KOLTSEG_TIPUSOK, required: true },
    leiras: { type: String },
    osszeg: { type: Number, required: true },
    penznem: { type: String, required: true, default: "HUF" },
    datum: { type: Date, required: true },
    bizonylatMediaId: { type: String },
    rogzitoId: { type: String, required: true },
    rogzitoNev: { type: String, required: true },
    archivalt: { type: Boolean, default: false },
    archivalasOka: { type: String },
    archivalasIdopont: { type: Date },
    archivaltaId: { type: String },
  },
  { timestamps: true, collection: "projekt_koltsegek" },
);
ProjektKoltsegSchema.index({ projektId: 1, datum: -1 });

export const ProjektKoltseg =
  (mongoose.models.ProjektKoltseg as mongoose.Model<IProjektKoltseg>) ||
  mongoose.model<IProjektKoltseg>("ProjektKoltseg", ProjektKoltsegSchema);
