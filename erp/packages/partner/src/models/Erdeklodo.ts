import mongoose, { Schema, type Document, type Types } from "mongoose";
import { withStatusTracking, type StatusTrackingFields } from "@erp/db-core";
import {
  ERDEKLODO_TEVEKENYSEG_TIPUSOK,
  type ErdeklodoTevekenysegTipus,
} from "../constants";

export interface ITevekenyseg {
  _id: Types.ObjectId;
  tipus: ErdeklodoTevekenysegTipus;
  idopont: Date;
  felhasznaloId: Types.ObjectId;
  felhasznaloNev: string;
  szoveg: string;
  /** Linked entity (e.g. the offer created from this lead). */
  entitasTipus?: string;
  entitasId?: string;
}

/**
 * Érdeklődő (lead). `status.key` is an `ErdeklodoAllapot`; `statusHistory` is the audit log,
 * `assignee.userId` the felelős, `notes` the free comments (withStatusTracking).
 */
export interface IErdeklodo extends Document, StatusTrackingFields {
  _id: Types.ObjectId;
  /** `E-000042` from `nextSequence('partner:erdeklodo')`. */
  azonosito: string;
  cegNev: string;
  kapcsolattartoNev?: string;
  email?: string;
  telefon?: string;
  weboldal?: string;
  forras?: string;
  kategoria?: string;
  iparag?: string;
  /** Snapshot of the felelős's name, taken at assignment. */
  felelosNev?: string;
  becsultErtek?: number;
  kovetkezoLepes?: string;
  kovetkezoLepesIdopont?: Date;
  megjegyzes?: string;
  /** Partner this lead was converted to / belongs to. */
  partnerId?: Types.ObjectId;
  /** Offer id of a later module (plain string — no cross-module reference). */
  ajanlatId?: string;
  uzletiEgyseg?: string;
  elvesztesOka?: string;
  tevekenysegek: ITevekenyseg[];

  archivalt: boolean;
  archivalasOka?: string;
  archivalasIdopont?: Date;
  archivaltaId?: Types.ObjectId;

  regiId?: string;
  regiAzonosito?: string;

  createdAt: Date;
  updatedAt: Date;
}

const TevekenysegSchema = new Schema<ITevekenyseg>({
  tipus: { type: String, enum: ERDEKLODO_TEVEKENYSEG_TIPUSOK, required: true },
  idopont: { type: Date, default: Date.now },
  felhasznaloId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  felhasznaloNev: { type: String, required: true },
  szoveg: { type: String, required: true },
  entitasTipus: String,
  entitasId: String,
});

const ErdeklodoSchema = withStatusTracking(
  new Schema<IErdeklodo>(
    {
      azonosito: { type: String, required: true, unique: true },
      cegNev: { type: String, required: true, index: true },
      kapcsolattartoNev: String,
      email: String,
      telefon: String,
      weboldal: String,
      forras: String,
      kategoria: String,
      iparag: String,
      felelosNev: String,
      becsultErtek: Number,
      kovetkezoLepes: String,
      kovetkezoLepesIdopont: { type: Date, index: true },
      megjegyzes: String,
      partnerId: { type: Schema.Types.ObjectId, ref: "Partner", index: true },
      ajanlatId: String,
      uzletiEgyseg: String,
      elvesztesOka: String,
      tevekenysegek: { type: [TevekenysegSchema], default: [] },
      archivalt: { type: Boolean, default: false, index: true },
      archivalasOka: String,
      archivalasIdopont: Date,
      archivaltaId: { type: Schema.Types.ObjectId, ref: "User" },
      regiId: { type: String, unique: true, sparse: true },
      regiAzonosito: String,
    },
    { timestamps: true, collection: "erdeklodok" },
  ),
);

ErdeklodoSchema.index({ "status.key": 1 });
ErdeklodoSchema.index({ "assignee.userId": 1 });

export const Erdeklodo =
  (mongoose.models.Erdeklodo as mongoose.Model<IErdeklodo>) ||
  mongoose.model<IErdeklodo>("Erdeklodo", ErdeklodoSchema);
