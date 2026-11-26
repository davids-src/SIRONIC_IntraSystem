import mongoose, { Schema, type Document, type Types } from "mongoose";
import {
  ALAP_AFA_KULCS,
  TETEL_TIPUSOK,
  type Penznem,
  type TetelTipus,
} from "../constants";

export type BeszerzesiAdat = {
  _id: Types.ObjectId;
  beszallitoNev: string;
  beszallitoCikkszam?: string;
  nettoBeszerzesiAr: number;
  beszerzesDatuma: Date;
  megjegyzes?: string;
};

export interface IArlistaTetel extends Document {
  _id: Types.ObjectId;
  kod: string;
  tipus: TetelTipus;
  nev: string;
  leiras?: string;
  kategoria: string;
  egyseg: string;
  nettoAr: number;
  penznem: Penznem;
  /** Percent (27). */
  afaKulcs: number;
  aktiv: boolean;
  megjegyzes?: string;
  /** SECRET — cut by the facade unless the viewer holds `arlista:beszerzes:read`. */
  beszerzesiAdatok: BeszerzesiAdat[];
  /** SECRET. */
  utolsoBeszerzesiAr?: number;
  /** SECRET. */
  elonyosBeszallito?: string;
  archivalt: boolean;
  archivaltAt?: Date;
  archivalasOka?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BeszerzesiAdatSchema = new Schema<BeszerzesiAdat>(
  {
    beszallitoNev: { type: String, required: true, trim: true },
    beszallitoCikkszam: { type: String },
    nettoBeszerzesiAr: { type: Number, required: true, min: 0 },
    beszerzesDatuma: { type: Date, required: true },
    megjegyzes: { type: String },
  },
  {},
);

const ArlistaTetelSchema = new Schema<IArlistaTetel>(
  {
    kod: { type: String, required: true, unique: true, trim: true },
    tipus: { type: String, enum: TETEL_TIPUSOK, required: true },
    nev: { type: String, required: true, trim: true },
    leiras: { type: String },
    kategoria: { type: String, required: true, trim: true },
    egyseg: { type: String, required: true, trim: true },
    nettoAr: { type: Number, required: true, min: 0 },
    penznem: { type: String, required: true, default: "HUF" },
    afaKulcs: { type: Number, required: true, default: ALAP_AFA_KULCS },
    aktiv: { type: Boolean, required: true, default: true },
    megjegyzes: { type: String },
    beszerzesiAdatok: { type: [BeszerzesiAdatSchema], default: [] },
    utolsoBeszerzesiAr: { type: Number },
    elonyosBeszallito: { type: String },
    archivalt: { type: Boolean, required: true, default: false },
    archivaltAt: { type: Date },
    archivalasOka: { type: String },
  },
  { timestamps: true, collection: "arlista_tetelek" },
);
ArlistaTetelSchema.index({ archivalt: 1, tipus: 1, createdAt: -1 });

export const ArlistaTetel =
  (mongoose.models.ArlistaTetel as mongoose.Model<IArlistaTetel>) ||
  mongoose.model<IArlistaTetel>("ArlistaTetel", ArlistaTetelSchema);
