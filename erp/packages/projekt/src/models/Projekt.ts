import mongoose, { Schema, type Document, type Types } from "mongoose";
import { withStatusTracking, type StatusTrackingFields } from "@erp/db-core";
import {
  CHECKLIST_KATEGORIAK,
  FAZIS_ALLAPOTOK,
  STAGING_JOVAHAGYASOK,
  type ChecklistKategoria,
  type FazisAllapot,
  type StagingJovahagyas,
} from "../constants";

export interface IFazis {
  _id: Types.ObjectId;
  nev: string;
  allapot: FazisAllapot;
  hatarido?: Date;
  /** 0–100 */
  szazalek: number;
  befejezve?: Date;
}

export interface IStagingLink {
  _id: Types.ObjectId;
  cimke: string;
  url: string;
  hozzaadtaId: string;
  hozzaadva: Date;
  jovahagyas: StagingJovahagyas;
  jovahagyoNev?: string;
  jovahagyasIdopont?: Date;
  jovahagyasMegjegyzes?: string;
}

export interface IChecklistTetel {
  _id: Types.ObjectId;
  cimke: string;
  kategoria: ChecklistKategoria;
  /** The project cannot be closed while a required item is open. */
  kotelezo: boolean;
  /** The item can only be ticked once at least one attachment is present. */
  mellekletKotelezo: boolean;
  kesz: boolean;
  keszIdopont?: Date;
  /** Media ids (supplied by the app; this package never imports @erp/media). */
  mellekletMediaIds: string[];
  megjegyzes?: string;
}

/**
 * Projekt. Lifecycle state = `status.key` (nyitott / felfuggesztett / lezart, via
 * `withStatusTracking`); `assignee` is the responsible colleague. `partnerId` is an opaque
 * string and `partnerNev` a write-time snapshot — no import of @erp/partner.
 */
export interface IProjekt extends Document, StatusTrackingFields {
  _id: Types.ObjectId;
  /** `PRJ-000042` from `nextSequence('projekt:projekt')`. */
  azonosito: string;
  partnerId?: string;
  partnerNev?: string;
  nev: string;
  leiras?: string;
  kategoria?: string;
  kezdet?: Date;
  hatarido?: Date;
  lezarasIdopont?: Date;
  tervezettOrak?: number;
  /** Denormalized overall progress 0–100 (average of the phases), kept by the facade. */
  szazalek: number;
  /** Visible to the partner in the future portal (viewer filter in the facade). */
  portalLathato: boolean;
  fazisok: IFazis[];
  stagingLinkek: IStagingLink[];
  checklist: IChecklistTetel[];
  /** Internal — never reaches a portal viewer. */
  belsoJegyzet?: string;
  felelosNev?: string;
  ajanlatId?: string;
  archivalt: boolean;
  archivalasOka?: string;
  archivalasIdopont?: Date;
  archivaltaId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FazisSchema = new Schema<IFazis>({
  nev: { type: String, required: true, trim: true },
  allapot: { type: String, enum: FAZIS_ALLAPOTOK, required: true },
  hatarido: { type: Date },
  szazalek: { type: Number, required: true, min: 0, max: 100, default: 0 },
  befejezve: { type: Date },
});

const StagingLinkSchema = new Schema<IStagingLink>({
  cimke: { type: String, required: true },
  url: { type: String, required: true },
  hozzaadtaId: { type: String, required: true },
  hozzaadva: { type: Date, required: true },
  jovahagyas: { type: String, enum: STAGING_JOVAHAGYASOK, required: true },
  jovahagyoNev: { type: String },
  jovahagyasIdopont: { type: Date },
  jovahagyasMegjegyzes: { type: String },
});

const ChecklistSchema = new Schema<IChecklistTetel>({
  cimke: { type: String, required: true },
  kategoria: { type: String, enum: CHECKLIST_KATEGORIAK, required: true },
  kotelezo: { type: Boolean, required: true, default: false },
  mellekletKotelezo: { type: Boolean, required: true, default: false },
  kesz: { type: Boolean, required: true, default: false },
  keszIdopont: { type: Date },
  mellekletMediaIds: { type: [String], default: [] },
  megjegyzes: { type: String },
});

const ProjektSchema = withStatusTracking(
  new Schema<IProjekt>(
    {
      azonosito: { type: String, required: true, unique: true },
      partnerId: { type: String },
      partnerNev: { type: String },
      nev: { type: String, required: true, trim: true },
      leiras: { type: String },
      kategoria: { type: String, trim: true },
      kezdet: { type: Date },
      hatarido: { type: Date },
      lezarasIdopont: { type: Date },
      tervezettOrak: { type: Number },
      szazalek: { type: Number, default: 0 },
      portalLathato: { type: Boolean, required: true, default: false },
      fazisok: { type: [FazisSchema], default: [] },
      stagingLinkek: { type: [StagingLinkSchema], default: [] },
      checklist: { type: [ChecklistSchema], default: [] },
      belsoJegyzet: { type: String },
      felelosNev: { type: String },
      ajanlatId: { type: String },
      archivalt: { type: Boolean, default: false },
      archivalasOka: { type: String },
      archivalasIdopont: { type: Date },
      archivaltaId: { type: String },
    },
    { timestamps: true, collection: "projekt_projektek" },
  ),
);
ProjektSchema.index({ "status.key": 1, createdAt: -1 });
ProjektSchema.index({ partnerId: 1, portalLathato: 1 });
ProjektSchema.index({ "assignee.userId": 1, "status.key": 1 });

export const Projekt =
  (mongoose.models.Projekt as mongoose.Model<IProjekt>) ||
  mongoose.model<IProjekt>("Projekt", ProjektSchema);
