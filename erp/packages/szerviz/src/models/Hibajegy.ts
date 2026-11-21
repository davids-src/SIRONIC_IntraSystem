import mongoose, { Schema, type Document, type Types } from "mongoose";
import { withStatusTracking, type StatusTrackingFields } from "@erp/db-core";
import {
  HIBAJEGY_FORRASOK,
  HIBAJEGY_PRIORITASOK,
  MEGJEGYZES_SZEREPKOROK,
  type HibajegyForras,
  type HibajegyPrioritas,
  type MegjegyzesSzerepkor,
} from "../constants";

export interface IMegjegyzes {
  _id: Types.ObjectId;
  szerzoId: string;
  szerzoNev: string;
  szerepkor: MegjegyzesSzerepkor;
  uzenet: string;
  /** Internal comment — never reaches a portal viewer (cut in the facade). */
  belso: boolean;
  letrehozva: Date;
}

/**
 * Hibajegy. Lifecycle = `status.key` (via `withStatusTracking`); `assignee` is the responsible
 * colleague. `partnerId` is an opaque string, `partnerNev` a write-time snapshot.
 */
export interface IHibajegy extends Document, StatusTrackingFields {
  _id: Types.ObjectId;
  /** `TK-000042` from `nextSequence('szerviz:hibajegy')`. */
  azonosito: string;
  partnerId?: string;
  partnerNev?: string;
  egyszeriNev?: string;
  egyszeriTelefon?: string;
  letrehozoId: string;
  forras: HibajegyForras;
  prioritas: HibajegyPrioritas;
  kategoria: string;
  targy: string;
  leiras: string;
  projektId?: string;
  helyszin?: string;
  erintettTetelek?: string;
  mellekletMediaIds: string[];
  megjegyzesek: IMegjegyzes[];
  megoldasJegyzet?: string;
  megoldva?: Date;
  /** Internal — never reaches a portal viewer. */
  belsoJegyzet?: string;
  felelosNev?: string;
  /** Set on tickets generated from a maintenance plan (idempotency key with `ciklus`). */
  karbantartasiTervId?: string;
  ciklus?: number;
  regiId?: string;
  archivalt: boolean;
  archivalasOka?: string;
  archivalasIdopont?: Date;
  archivaltaId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MegjegyzesSchema = new Schema<IMegjegyzes>({
  szerzoId: { type: String, required: true },
  szerzoNev: { type: String, required: true },
  szerepkor: { type: String, enum: MEGJEGYZES_SZEREPKOROK, required: true },
  uzenet: { type: String, required: true },
  belso: { type: Boolean, required: true, default: false },
  letrehozva: { type: Date, required: true },
});

const HibajegySchema = withStatusTracking(
  new Schema<IHibajegy>(
    {
      azonosito: { type: String, required: true, unique: true },
      partnerId: { type: String },
      partnerNev: { type: String },
      egyszeriNev: { type: String },
      egyszeriTelefon: { type: String },
      letrehozoId: { type: String, required: true },
      forras: { type: String, enum: HIBAJEGY_FORRASOK, required: true },
      prioritas: { type: String, enum: HIBAJEGY_PRIORITASOK, required: true },
      kategoria: { type: String, required: true },
      targy: { type: String, required: true, trim: true },
      leiras: { type: String, required: true },
      projektId: { type: String },
      helyszin: { type: String },
      erintettTetelek: { type: String },
      mellekletMediaIds: { type: [String], default: [] },
      megjegyzesek: { type: [MegjegyzesSchema], default: [] },
      megoldasJegyzet: { type: String },
      megoldva: { type: Date },
      belsoJegyzet: { type: String },
      felelosNev: { type: String },
      karbantartasiTervId: { type: String },
      ciklus: { type: Number },
      regiId: { type: String },
      archivalt: { type: Boolean, default: false },
      archivalasOka: { type: String },
      archivalasIdopont: { type: Date },
      archivaltaId: { type: String },
    },
    { timestamps: true, collection: "szerviz_hibajegyek" },
  ),
);
HibajegySchema.index({ "status.key": 1, createdAt: -1 });
HibajegySchema.index({ partnerId: 1, createdAt: -1 });
HibajegySchema.index({ "assignee.userId": 1, "status.key": 1 });
// One ticket per maintenance cycle — the generate action's idempotency guard.
HibajegySchema.index(
  { karbantartasiTervId: 1, ciklus: 1 },
  { unique: true, partialFilterExpression: { karbantartasiTervId: { $type: "string" } } },
);
HibajegySchema.index({ regiId: 1 }, { sparse: true });

export const Hibajegy =
  (mongoose.models.Hibajegy as mongoose.Model<IHibajegy>) ||
  mongoose.model<IHibajegy>("Hibajegy", HibajegySchema);
