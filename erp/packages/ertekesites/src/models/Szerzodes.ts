import mongoose, { Schema, type Document, type Types } from "mongoose";
import { withStatusTracking, type StatusTrackingFields } from "@erp/db-core";
import { ALAIRAS_TIPUSOK, SZERZODES_TIPUSOK } from "../constants";

export interface ISzerzodesSablon extends Document {
  _id: Types.ObjectId;
  nev: string;
  kategoria: string;
  leiras?: string;
  szoveg: string;
  valtozok: string[];
  digitalisAlairasKell: boolean;
  aktiv: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SablonSchema = new Schema<ISzerzodesSablon>(
  {
    nev: { type: String, required: true },
    kategoria: { type: String, required: true, index: true },
    leiras: String,
    szoveg: { type: String, required: true },
    valtozok: { type: [String], default: [] },
    digitalisAlairasKell: { type: Boolean, default: false },
    aktiv: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "ertekesites_szerzodes_sablonok" },
);

export const SzerzodesSablon =
  (mongoose.models.SzerzodesSablon as mongoose.Model<ISzerzodesSablon>) ||
  mongoose.model<ISzerzodesSablon>("SzerzodesSablon", SablonSchema);

export interface ISzerzodes extends Document, StatusTrackingFields {
  _id: Types.ObjectId;
  /** `SZ-000042` from `nextSequence('ertekesites:szerzodes')`. */
  azonosito: string;
  nev: string;
  kategoria: string;
  partnerId: string;
  partnerNev: string;
  tipus: (typeof SZERZODES_TIPUSOK)[number];
  sablonId?: string;
  /** Template body frozen at creation — later template edits do not alter the contract. */
  sablonSzoveg?: string;
  /** Rendered text, re-rendered on every draft edit. */
  szoveg?: string;
  valtozok: Record<string, string>;
  fajlHivatkozas?: string;
  fajlNev?: string;
  alairasTipus: (typeof ALAIRAS_TIPUSOK)[number];
  ugyfelNev?: string;
  alairasAdat?: string;
  alairtAt?: Date;
  ervenyessegKezdete?: Date;
  ervenyessegVege?: Date;
  projektId?: string;
  portalLathato: boolean;
  megjegyzes?: string;
  regiId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SzerzodesSchema = withStatusTracking(
  new Schema<ISzerzodes>(
    {
      azonosito: { type: String, required: true, unique: true },
      nev: { type: String, required: true },
      kategoria: { type: String, required: true },
      partnerId: { type: String, required: true, index: true },
      partnerNev: { type: String, required: true },
      tipus: { type: String, enum: SZERZODES_TIPUSOK, required: true },
      sablonId: String,
      sablonSzoveg: String,
      szoveg: String,
      valtozok: { type: Schema.Types.Mixed, default: {} },
      fajlHivatkozas: String,
      fajlNev: String,
      alairasTipus: { type: String, enum: ALAIRAS_TIPUSOK, default: "nincs" },
      ugyfelNev: String,
      alairasAdat: String,
      alairtAt: Date,
      ervenyessegKezdete: Date,
      ervenyessegVege: Date,
      projektId: { type: String, index: true },
      portalLathato: { type: Boolean, default: false },
      megjegyzes: String,
      regiId: { type: String, index: true },
    },
    { timestamps: true, collection: "ertekesites_szerzodesek", minimize: false },
  ),
);

export const Szerzodes =
  (mongoose.models.Szerzodes as mongoose.Model<ISzerzodes>) ||
  mongoose.model<ISzerzodes>("Szerzodes", SzerzodesSchema);
