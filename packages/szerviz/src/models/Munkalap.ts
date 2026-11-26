import mongoose, { Schema, type Document, type Types } from "mongoose";
import { withStatusTracking, type StatusTrackingFields } from "@erp/db-core";
import { MUNKALAP_FORRASOK, MUNKALAP_SOR_TIPUSOK } from "../constants";
import type { MunkalapSor } from "../types";

/**
 * Munkalap (worklog). State = `status.key` (piszkozat / lezart). Lines embed the árlista price
 * snapshot supplied by the app; the signatures are data-URI images or media ids (validated by the
 * facade). `keszletKiadva` records whether the stock port issued the material lines.
 */
export interface IMunkalap extends Document, StatusTrackingFields {
  _id: Types.ObjectId;
  /** `ML-000042` from `nextSequence('szerviz:munkalap')`. */
  azonosito: string;
  partnerId?: string;
  partnerNev?: string;
  egyszeriNev?: string;
  egyszeriTelefon?: string;
  projektId?: string;
  hibajegyId?: string;
  letrehozoId: string;
  munkaDatum: Date;
  munkaKezdet?: string;
  munkaVege?: string;
  szerelo: string;
  szereloAlairas?: string;
  ugyfelNev?: string;
  ugyfelAlairas?: string;
  helyszin?: string;
  kategoria: string;
  leiras: string;
  sorok: MunkalapSor[];
  utazasKm?: number;
  megjegyzes?: string;
  lezarva?: Date;
  /** True when nothing needed issuing or the port call succeeded. */
  keszletKiadva: boolean;
  /** Result of the last stock-port call. */
  keszletKiadas?: { ok: boolean; idopont: Date; uzenet?: string };
  regiId?: string;
  archivalt: boolean;
  archivalasOka?: string;
  archivalasIdopont?: Date;
  archivaltaId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SorSchema = new Schema(
  {
    tipus: { type: String, enum: MUNKALAP_SOR_TIPUSOK, required: true },
    forras: { type: String, enum: MUNKALAP_FORRASOK, required: true },
    arlistaTetelId: String,
    leiras: { type: String, required: true },
    mennyiseg: { type: Number, required: true },
    egyseg: { type: String, required: true },
    nettoEgysegar: Number,
    keszletbolKiad: { type: Boolean, default: false },
    arSnapshot: { type: Schema.Types.Mixed },
  },
  { _id: false },
);

const MunkalapSchema = withStatusTracking(
  new Schema<IMunkalap>(
    {
      azonosito: { type: String, required: true, unique: true },
      partnerId: { type: String },
      partnerNev: { type: String },
      egyszeriNev: String,
      egyszeriTelefon: String,
      projektId: { type: String },
      hibajegyId: { type: String },
      letrehozoId: { type: String, required: true },
      munkaDatum: { type: Date, required: true },
      munkaKezdet: String,
      munkaVege: String,
      szerelo: { type: String, required: true },
      szereloAlairas: String,
      ugyfelNev: String,
      ugyfelAlairas: String,
      helyszin: String,
      kategoria: { type: String, required: true },
      leiras: { type: String, required: true },
      sorok: { type: [SorSchema], default: [] },
      utazasKm: Number,
      megjegyzes: String,
      lezarva: Date,
      keszletKiadva: { type: Boolean, default: false },
      keszletKiadas: {
        type: new Schema({ ok: Boolean, idopont: Date, uzenet: String }, { _id: false }),
      },
      regiId: String,
      archivalt: { type: Boolean, default: false },
      archivalasOka: String,
      archivalasIdopont: Date,
      archivaltaId: String,
    },
    { timestamps: true, collection: "szerviz_munkalapok" },
  ),
);
MunkalapSchema.index({ "status.key": 1, munkaDatum: -1 });
MunkalapSchema.index({ partnerId: 1, munkaDatum: -1 });
MunkalapSchema.index({ hibajegyId: 1 });
MunkalapSchema.index({ regiId: 1 }, { sparse: true });

export const Munkalap =
  (mongoose.models.Munkalap as mongoose.Model<IMunkalap>) ||
  mongoose.model<IMunkalap>("Munkalap", MunkalapSchema);
