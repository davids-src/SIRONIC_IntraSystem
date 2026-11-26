import mongoose, { Schema, type Document, type Types } from "mongoose";
import { HIBAJEGY_PRIORITASOK, type HibajegyPrioritas } from "../constants";

/**
 * Recurring maintenance plan. The next due date is NOT stored: it is computed at read time from
 * `elsoEsedekes`, `intervallumHonap` and `utolsoCiklus` (no cron — principle 14).
 */
export interface IKarbantartasiTerv extends Document {
  _id: Types.ObjectId;
  cim: string;
  partnerId: string;
  partnerNev?: string;
  projektId?: string;
  intervallumHonap: number;
  /** Due date of cycle 0 (UTC midnight). */
  elsoEsedekes: Date;
  /** Last cycle a ticket was generated for; -1 = none yet. */
  utolsoCiklus: number;
  /** Days ahead of the due date a plan counts as "due soon". */
  elorejelzesNap: number;
  aktiv: boolean;
  sablonLeiras?: string;
  kategoria: string;
  prioritas: HibajegyPrioritas;
  felelosId?: string;
  felelosNev?: string;
  letrehozoId: string;
  regiId?: string;
  archivalt: boolean;
  archivalasOka?: string;
  archivalasIdopont?: Date;
  archivaltaId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const KarbantartasiTervSchema = new Schema<IKarbantartasiTerv>(
  {
    cim: { type: String, required: true, trim: true },
    partnerId: { type: String, required: true, index: true },
    partnerNev: String,
    projektId: String,
    intervallumHonap: { type: Number, required: true, min: 1 },
    elsoEsedekes: { type: Date, required: true },
    utolsoCiklus: { type: Number, required: true, default: -1 },
    elorejelzesNap: { type: Number, required: true, default: 14 },
    aktiv: { type: Boolean, required: true, default: true },
    sablonLeiras: String,
    kategoria: { type: String, required: true },
    prioritas: { type: String, enum: HIBAJEGY_PRIORITASOK, required: true },
    felelosId: { type: String, index: true },
    felelosNev: String,
    letrehozoId: { type: String, required: true },
    regiId: String,
    archivalt: { type: Boolean, default: false },
    archivalasOka: String,
    archivalasIdopont: Date,
    archivaltaId: String,
  },
  { timestamps: true, collection: "szerviz_karbantartasi_tervek" },
);
KarbantartasiTervSchema.index({ regiId: 1 }, { sparse: true });

export const KarbantartasiTerv =
  (mongoose.models.KarbantartasiTerv as mongoose.Model<IKarbantartasiTerv>) ||
  mongoose.model<IKarbantartasiTerv>("KarbantartasiTerv", KarbantartasiTervSchema);
