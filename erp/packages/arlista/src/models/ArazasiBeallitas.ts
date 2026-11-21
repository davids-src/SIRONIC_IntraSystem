import mongoose, { Schema, type Document } from "mongoose";
import { ALAP_ARAZASI_BEALLITASOK, type ArazasiBeallitasok } from "../constants";

export interface IArazasiBeallitas extends Document, ArazasiBeallitasok {
  /** Singleton key. */
  kulcs: string;
  modositotta?: string;
  updatedAt: Date;
}

const D = ALAP_ARAZASI_BEALLITASOK;
const szamTabla = (alap: Record<string, number>) =>
  Object.fromEntries(
    Object.entries(alap).map(([k, v]) => [k, { type: Number, required: true, default: v, min: 0 }]),
  );

const ArazasiBeallitasSchema = new Schema<IArazasiBeallitas>(
  {
    kulcs: { type: String, required: true, unique: true, default: "alap" },
    rezsiSzorzo: { type: Number, required: true, default: D.rezsiSzorzo, min: 0 },
    haviFixKoltseg: { type: Number, required: true, default: D.haviFixKoltseg, min: 0 },
    haviTermelekenyOrak: { type: Number, required: true, default: D.haviTermelekenyOrak, min: 1 },
    oradijak: new Schema(szamTabla(D.oradijak), { _id: false }),
    ugyfelSzorzok: new Schema(szamTabla(D.ugyfelSzorzok), { _id: false }),
    anyagPotlekok: new Schema(szamTabla(D.anyagPotlekok), { _id: false }),
    surgossegiSzorzok: new Schema(szamTabla(D.surgossegiSzorzok), { _id: false }),
    afaKulcs: { type: Number, required: true, default: D.afaKulcs, min: 0 },
    minKiszallasiDij: { type: Number, required: true, default: D.minKiszallasiDij, min: 0 },
    minProjektDij: { type: Number, required: true, default: D.minProjektDij, min: 0 },
    modositotta: { type: String },
  },
  { timestamps: true, collection: "arlista_arazasi_beallitasok" },
);

export const ArazasiBeallitas =
  (mongoose.models.ArazasiBeallitas as mongoose.Model<IArazasiBeallitas>) ||
  mongoose.model<IArazasiBeallitas>("ArazasiBeallitas", ArazasiBeallitasSchema);
