import mongoose, { Schema, type Document, type Types } from "mongoose";
import {
  ESEMENY_SZEREPLO_TIPUSOK,
  FIZETES_TAROLT_ALLAPOTOK,
  INTEGRACIO_SZOLGALTATOK,
  LEPES_KULCSOK,
  SZAMLAZASI_CIKLUSOK,
  TELEPITES_EVENT_TIPUSOK,
  type EsemenySzereploTipus,
  type FizetesTaroltAllapot,
  type IntegracioSzolgaltato,
  type LepesKulcs,
  type SzamlazasiCiklus,
  type TelepitesEventTipus,
} from "../constants";

// ------------------------------------------------------------ TelepitesEsemeny (append-only)

export interface ITelepitesEsemeny extends Document {
  _id: Types.ObjectId;
  telepitesId: string;
  lepesKulcs?: LepesKulcs | null;
  tipus: TelepitesEventTipus;
  szereploId?: string | null;
  szereploTipus: EsemenySzereploTipus;
  uzenet: string;
  /** Redacted before it is stored — never carries credentials. */
  reszlet?: unknown;
  idotartamMs?: number | null;
  createdAt: Date;
}

const TelepitesEsemenySchema = new Schema<ITelepitesEsemeny>(
  {
    telepitesId: { type: String, required: true },
    lepesKulcs: { type: String, enum: [...LEPES_KULCSOK, null], default: null },
    tipus: { type: String, enum: TELEPITES_EVENT_TIPUSOK, required: true },
    szereploId: { type: String, default: null },
    szereploTipus: { type: String, enum: ESEMENY_SZEREPLO_TIPUSOK, required: true },
    uzenet: { type: String, required: true },
    reszlet: { type: Schema.Types.Mixed, default: null },
    idotartamMs: { type: Number, default: null },
  },
  // Append-only: only `createdAt` is tracked, the facade never updates or deletes rows.
  { timestamps: { createdAt: true, updatedAt: false }, collection: "deployments_esemenyek" },
);
TelepitesEsemenySchema.index({ telepitesId: 1, createdAt: -1 });

export const TelepitesEsemeny =
  (mongoose.models.TelepitesEsemeny as mongoose.Model<ITelepitesEsemeny>) ||
  mongoose.model<ITelepitesEsemeny>("TelepitesEsemeny", TelepitesEsemenySchema);

// ------------------------------------------------------------ Csomag

export interface ICsomag extends Document {
  _id: Types.ObjectId;
  kod: string;
  nev: string;
  leiras?: string;
  arHuf: number;
  alapCiklus: SzamlazasiCiklus;
  eroforrasok: {
    vcpu?: number;
    ramMb?: number;
    diskGb?: number;
    savszelessegGb?: number;
    egyeb?: Record<string, unknown>;
  };
  aktiv: boolean;
  sorrend: number;
  createdAt: Date;
  updatedAt: Date;
}

const CsomagSchema = new Schema<ICsomag>(
  {
    kod: { type: String, required: true, trim: true },
    nev: { type: String, required: true, trim: true },
    leiras: { type: String },
    arHuf: { type: Number, required: true, min: 0 },
    alapCiklus: { type: String, enum: SZAMLAZASI_CIKLUSOK, default: "havi" },
    eroforrasok: {
      vcpu: { type: Number },
      ramMb: { type: Number },
      diskGb: { type: Number },
      savszelessegGb: { type: Number },
      egyeb: { type: Schema.Types.Mixed },
    },
    aktiv: { type: Boolean, default: true },
    sorrend: { type: Number, default: 0 },
  },
  { timestamps: true, collection: "deployments_csomagok" },
);
CsomagSchema.index({ kod: 1 }, { unique: true });

export const Csomag =
  (mongoose.models.Csomag as mongoose.Model<ICsomag>) ||
  mongoose.model<ICsomag>("Csomag", CsomagSchema);

// ------------------------------------------------------------ Fizetés

export interface IFizetes extends Document {
  _id: Types.ObjectId;
  telepitesId: string;
  partnerId?: string;
  csomagId?: string;
  idoszakKezdet: Date;
  /** Last day of the period (inclusive). */
  idoszakVeg: Date;
  osszegHuf: number;
  penznem: string;
  ciklus: SzamlazasiCiklus;
  /** Stored state — "késedelmes" is computed from `idoszakVeg`, never stored. */
  allapot: FizetesTaroltAllapot;
  fizetve?: Date;
  szamlaId?: string;
  megjegyzes?: string;
  letrehozoId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FizetesSchema = new Schema<IFizetes>(
  {
    telepitesId: { type: String, required: true },
    partnerId: { type: String },
    csomagId: { type: String },
    idoszakKezdet: { type: Date, required: true },
    idoszakVeg: { type: Date, required: true },
    osszegHuf: { type: Number, required: true, min: 0 },
    penznem: { type: String, default: "HUF" },
    ciklus: { type: String, enum: SZAMLAZASI_CIKLUSOK, required: true },
    allapot: { type: String, enum: FIZETES_TAROLT_ALLAPOTOK, default: "esedekes" },
    fizetve: { type: Date },
    szamlaId: { type: String },
    megjegyzes: { type: String },
    letrehozoId: { type: String },
  },
  { timestamps: true, collection: "deployments_fizetesek" },
);
// Idempotent period generation: one payment per (telepites, period start).
FizetesSchema.index({ telepitesId: 1, idoszakKezdet: 1 }, { unique: true });
FizetesSchema.index({ allapot: 1, idoszakVeg: 1 });
FizetesSchema.index({ partnerId: 1, allapot: 1 });

export const Fizetes =
  (mongoose.models.Fizetes as mongoose.Model<IFizetes>) ||
  mongoose.model<IFizetes>("Fizetes", FizetesSchema);

// ------------------------------------------------------------ IntegracioKapcsolat

export interface IIntegracioKapcsolat extends Document {
  _id: Types.ObjectId;
  szolgaltato: IntegracioSzolgaltato;
  cimke: string;
  alapUrl: string;
  /** AES-256-GCM payload (`iv:tag:ct`) of the JSON credentials. Never returned by the facade. */
  hitelesitoTitkositott: string;
  meta: Record<string, unknown>;
  aktiv: boolean;
  utolsoEllenorzes?: Date;
  utolsoEllenorzesOk?: boolean;
  utolsoEllenorzesUzenet?: string;
  letrehozoId: string;
  createdAt: Date;
  updatedAt: Date;
}

const IntegracioKapcsolatSchema = new Schema<IIntegracioKapcsolat>(
  {
    szolgaltato: { type: String, enum: INTEGRACIO_SZOLGALTATOK, required: true },
    cimke: { type: String, required: true, trim: true },
    alapUrl: { type: String, required: true, trim: true },
    hitelesitoTitkositott: { type: String, required: true },
    meta: { type: Schema.Types.Mixed, default: {} },
    aktiv: { type: Boolean, default: true },
    utolsoEllenorzes: { type: Date },
    utolsoEllenorzesOk: { type: Boolean },
    utolsoEllenorzesUzenet: { type: String },
    letrehozoId: { type: String, required: true },
  },
  { timestamps: true, collection: "deployments_integraciok" },
);
IntegracioKapcsolatSchema.index({ szolgaltato: 1, cimke: 1 }, { unique: true });

export const IntegracioKapcsolat =
  (mongoose.models.IntegracioKapcsolat as mongoose.Model<IIntegracioKapcsolat>) ||
  mongoose.model<IIntegracioKapcsolat>("IntegracioKapcsolat", IntegracioKapcsolatSchema);

// ------------------------------------------------------------ StackSablon

export interface IStackSablon extends Document {
  _id: Types.ObjectId;
  nev: string;
  leiras?: string;
  alapertelmezett: boolean;
  composeYaml: string;
  helyorzok: Array<{
    kulcs: string;
    cimke: string;
    kotelezo: boolean;
    alapertek?: string;
    titkos: boolean;
  }>;
  szuksegesHalozatok: string[];
  letrehozoId: string;
  createdAt: Date;
  updatedAt: Date;
}

const StackSablonSchema = new Schema<IStackSablon>(
  {
    nev: { type: String, required: true, trim: true },
    leiras: { type: String },
    alapertelmezett: { type: Boolean, default: false },
    composeYaml: { type: String, required: true },
    helyorzok: {
      type: [
        new Schema(
          {
            kulcs: { type: String, required: true },
            cimke: { type: String, required: true },
            kotelezo: { type: Boolean, default: false },
            alapertek: { type: String },
            titkos: { type: Boolean, default: false },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    szuksegesHalozatok: { type: [String], default: ["nginxproxy_default"] },
    letrehozoId: { type: String, required: true },
  },
  { timestamps: true, collection: "deployments_sablonok" },
);

export const StackSablon =
  (mongoose.models.StackSablon as mongoose.Model<IStackSablon>) ||
  mongoose.model<IStackSablon>("StackSablon", StackSablonSchema);

// ------------------------------------------------------------ PartnerTelepitesHozzaferes

export const HOZZAFERES_SZINTEK = ["megtekint", "kezel"] as const;
export type HozzaferesSzint = (typeof HOZZAFERES_SZINTEK)[number];

export interface IPartnerTelepitesHozzaferes extends Document {
  _id: Types.ObjectId;
  partnerId: string;
  /** Opaque id of the partner-portal user. */
  portalFelhasznaloId: string;
  telepitesId: string;
  szint: HozzaferesSzint;
  letrehozoId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PartnerTelepitesHozzaferesSchema = new Schema<IPartnerTelepitesHozzaferes>(
  {
    partnerId: { type: String, required: true },
    portalFelhasznaloId: { type: String, required: true },
    telepitesId: { type: String, required: true },
    szint: { type: String, enum: HOZZAFERES_SZINTEK, default: "megtekint" },
    letrehozoId: { type: String },
  },
  { timestamps: true, collection: "deployments_hozzaferesek" },
);
PartnerTelepitesHozzaferesSchema.index(
  { portalFelhasznaloId: 1, telepitesId: 1 },
  { unique: true },
);
PartnerTelepitesHozzaferesSchema.index({ partnerId: 1, telepitesId: 1 });

export const PartnerTelepitesHozzaferes =
  (mongoose.models.PartnerTelepitesHozzaferes as mongoose.Model<IPartnerTelepitesHozzaferes>) ||
  mongoose.model<IPartnerTelepitesHozzaferes>(
    "PartnerTelepitesHozzaferes",
    PartnerTelepitesHozzaferesSchema,
  );
