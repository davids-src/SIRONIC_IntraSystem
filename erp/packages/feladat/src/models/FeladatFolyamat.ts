import mongoose, { Schema, type Document, type Types } from "mongoose";
import { FOLYAMAT_LEPES_ALLAPOTOK, type FolyamatLepesAllapot } from "@erp/core/folyamat";
import type { FeladatPrioritas } from "../constants";

/**
 * Feladat-folyamat (#67): a task done in steps by different people — step 1 for A, when A
 * closes it step 2 goes to B, … Every step is a linked Feladat (`kapcsolat: {modul: 'feladat',
 * tipus: 'folyamat', id, szakasz: <step id>}`), driven by the shared folyamat-motor exactly
 * like a szerződés's phases or an ajánlatkérés's stages.
 */
export interface IFolyamatLepes {
  _id: Types.ObjectId;
  nev: string;
  felelosId: Types.ObjectId;
  felelosNev: string;
  /** Deadline day of the step's task (UTC midnight); unset = the flow's deadline. */
  hatarido?: Date;
  allapot: FolyamatLepesAllapot;
  feladatId?: string;
  kezdve?: Date;
  befejezve?: Date;
  megjegyzes?: string;
}

export const FOLYAMAT_ALLAPOTOK = ["folyamatban", "kesz", "megszakitva"] as const;
export type FolyamatAllapotKulcs = (typeof FOLYAMAT_ALLAPOTOK)[number];

export interface IFeladatFolyamat extends Document {
  _id: Types.ObjectId;
  cim: string;
  leiras?: string;
  kiadoId: Types.ObjectId;
  kiadoNev: string;
  /** Overall deadline (UTC midnight of the day); a step without its own takes this. */
  hatarido: Date;
  prioritas?: Exclude<FeladatPrioritas, "normal">;
  kategoria?: string;
  kategoriaKulcs?: string;
  allapot: FolyamatAllapotKulcs;
  lepesek: IFolyamatLepes[];
  /** Everyone who ever had a step — the "Követett folyamatok" lookup. */
  resztvevoIds: Types.ObjectId[];
  lezarva?: Date;
  megjegyzes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LepesSchema = new Schema<IFolyamatLepes>({
  nev: { type: String, required: true },
  felelosId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  felelosNev: { type: String, required: true },
  hatarido: { type: Date },
  allapot: { type: String, enum: FOLYAMAT_LEPES_ALLAPOTOK, default: "tervezett" },
  feladatId: { type: String },
  kezdve: { type: Date },
  befejezve: { type: Date },
  megjegyzes: { type: String },
});

const FeladatFolyamatSchema = new Schema<IFeladatFolyamat>(
  {
    cim: { type: String, required: true },
    leiras: { type: String },
    kiadoId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    kiadoNev: { type: String, required: true },
    hatarido: { type: Date, required: true },
    prioritas: { type: String, enum: ["magas", "surgos"] },
    kategoria: { type: String },
    kategoriaKulcs: { type: String },
    allapot: { type: String, enum: FOLYAMAT_ALLAPOTOK, default: "folyamatban" },
    lepesek: { type: [LepesSchema], default: [] },
    resztvevoIds: { type: [Schema.Types.ObjectId], default: [], index: true },
    lezarva: { type: Date },
    megjegyzes: { type: String },
  },
  { timestamps: true, collection: "feladat_folyamatok" },
);

export const FeladatFolyamat =
  (mongoose.models.FeladatFolyamat as mongoose.Model<IFeladatFolyamat>) ||
  mongoose.model<IFeladatFolyamat>("FeladatFolyamat", FeladatFolyamatSchema);

/**
 * A saved flow (#67): step names, optional felelős and deadline offset (days from start).
 * Private to its owner unless `megosztott` — then everyone can start a flow from it.
 */
export interface IFolyamatSablon extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  nev: string;
  megosztott: boolean;
  lepesek: Array<{ nev: string; felelosId?: Types.ObjectId; napok?: number }>;
  createdAt: Date;
  updatedAt: Date;
}

const FolyamatSablonSchema = new Schema<IFolyamatSablon>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    nev: { type: String, required: true },
    megosztott: { type: Boolean, default: false },
    lepesek: {
      type: [
        new Schema(
          {
            nev: { type: String, required: true },
            felelosId: { type: Schema.Types.ObjectId, ref: "User" },
            napok: { type: Number },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
  },
  { timestamps: true, collection: "feladat_folyamat_sablonok" },
);

FolyamatSablonSchema.index({ userId: 1, nev: 1 }, { unique: true });

export const FolyamatSablon =
  (mongoose.models.FolyamatSablon as mongoose.Model<IFolyamatSablon>) ||
  mongoose.model<IFolyamatSablon>("FolyamatSablon", FolyamatSablonSchema);
