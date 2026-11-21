import mongoose, { Schema, type Document, type Types } from "mongoose";
import {
  DNS_REKORD_TIPUSOK,
  LEJARAT_TIPUSOK,
  LEPES_ALLAPOTOK,
  LEPES_KULCSOK,
  PROXY_SEMAK,
  SZAMLAZASI_CIKLUSOK,
  TELEPITES_ALLAPOTOK,
  TELEPITES_FORRASOK,
  type LejaratTipus,
  type LepesAllapot,
  type LepesKulcs,
  type SzamlazasiCiklus,
  type TelepitesAllapot,
  type TelepitesForras,
} from "../constants";

export interface ILepes {
  _id: Types.ObjectId;
  kulcs: LepesKulcs;
  allapot: LepesAllapot;
  kulsoId?: string | null;
  uzenet?: string | null;
  utolsoHiba?: string | null;
  inditva?: Date | null;
  befejezve?: Date | null;
  meta?: Record<string, unknown> | null;
}

export interface IStackEnv {
  nev: string;
  /** Plain value — empty for secret entries. */
  ertek?: string;
  titkos?: boolean;
  /** AES-256-GCM payload of a secret value. Never leaves the facade. */
  titkosErtek?: string;
}

/** An absorbed DomainHosting record (decision D12): a domain / hosting / SSL expiry. */
export interface ILejarat {
  _id: Types.ObjectId;
  tipus: LejaratTipus;
  cimke: string;
  szolgaltato?: string;
  lejarat?: Date;
  autoMegujitas?: boolean;
  reszletek?: string;
}

export interface IKulsoIdk {
  cloudflareZonaId?: string | null;
  cloudflareDnsRekordIdk: string[];
  npmTanusitvanyId?: number | null;
  npmProxyHostId?: number | null;
  portainerStackId?: number | null;
  portainerEndpointId?: number | null;
  portainerWebhookId?: string | null;
  githubUtolsoFutasId?: number | null;
  imageDigest?: string | null;
}

export interface ITelepites extends Document {
  _id: Types.ObjectId;
  azonosito: string;
  nev: string;
  /** Absent only on registry-only records (`forras: "nyilvantartas"`). */
  domain?: string;
  wwwAtiranyitas: boolean;
  allapot: TelepitesAllapot;
  forras: TelepitesForras;
  megjegyzes?: string;
  /** Opaque id of the Partner (no import of `@erp/partner`). */
  partnerId?: string;
  csoportId?: string;
  dns: {
    rekordTipus: "A" | "CNAME";
    nev: string;
    cel?: string;
    proxied: boolean;
  };
  proxy: {
    celHost?: string;
    celPort?: number;
    celSema: "http" | "https";
    websocket: boolean;
  };
  image: { repo?: string; tag?: string; workflowId?: string; workflowRef?: string };
  stack: { nev?: string; sablonId?: string; composeYaml?: string; env: IStackEnv[] };
  csomagId?: string;
  szamlazasiCiklus?: SzamlazasiCiklus;
  arFelulirasHuf?: number;
  kovetkezoSzamlazas?: Date;
  utolsoFizetes?: Date;
  szamlazasiMegjegyzes?: string;
  lepesek: ILepes[];
  kulsoIdk: IKulsoIdk;
  lejaratok: ILejarat[];
  letrehozoId: string;
  archivalasOka?: string;
  archivalasIdopont?: Date;
  archivaltaId?: string;
  migraltDomainHostingId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LepesSchema = new Schema<ILepes>({
  kulcs: { type: String, enum: LEPES_KULCSOK, required: true },
  allapot: { type: String, enum: LEPES_ALLAPOTOK, required: true, default: "fuggo" },
  kulsoId: { type: String, default: null },
  uzenet: { type: String, default: null },
  utolsoHiba: { type: String, default: null },
  inditva: { type: Date, default: null },
  befejezve: { type: Date, default: null },
  meta: { type: Schema.Types.Mixed, default: null },
});

const LejaratSchema = new Schema<ILejarat>({
  tipus: { type: String, enum: LEJARAT_TIPUSOK, required: true },
  cimke: { type: String, required: true, trim: true },
  szolgaltato: { type: String },
  lejarat: { type: Date },
  autoMegujitas: { type: Boolean },
  reszletek: { type: String },
});

const TelepitesSchema = new Schema<ITelepites>(
  {
    azonosito: { type: String, required: true },
    nev: { type: String, required: true, trim: true },
    domain: { type: String, lowercase: true, trim: true },
    wwwAtiranyitas: { type: Boolean, default: true },
    allapot: { type: String, enum: TELEPITES_ALLAPOTOK, default: "piszkozat" },
    forras: { type: String, enum: TELEPITES_FORRASOK, default: "letrehozott" },
    megjegyzes: { type: String },
    partnerId: { type: String },
    csoportId: { type: String },
    dns: {
      rekordTipus: { type: String, enum: DNS_REKORD_TIPUSOK, default: "A" },
      nev: { type: String, default: "@" },
      cel: { type: String },
      proxied: { type: Boolean, default: false },
    },
    proxy: {
      celHost: { type: String },
      celPort: { type: Number },
      celSema: { type: String, enum: PROXY_SEMAK, default: "http" },
      websocket: { type: Boolean, default: true },
    },
    image: {
      repo: { type: String },
      tag: { type: String },
      workflowId: { type: String },
      workflowRef: { type: String, default: "main" },
    },
    stack: {
      nev: { type: String },
      sablonId: { type: String },
      composeYaml: { type: String },
      env: {
        type: [
          new Schema(
            {
              nev: { type: String, required: true },
              ertek: { type: String },
              titkos: { type: Boolean, default: false },
              titkosErtek: { type: String },
            },
            { _id: false },
          ),
        ],
        default: [],
      },
    },
    csomagId: { type: String },
    szamlazasiCiklus: { type: String, enum: SZAMLAZASI_CIKLUSOK },
    arFelulirasHuf: { type: Number, min: 0 },
    kovetkezoSzamlazas: { type: Date },
    utolsoFizetes: { type: Date },
    szamlazasiMegjegyzes: { type: String },
    lepesek: { type: [LepesSchema], default: [] },
    kulsoIdk: {
      cloudflareZonaId: { type: String, default: null },
      cloudflareDnsRekordIdk: { type: [String], default: [] },
      npmTanusitvanyId: { type: Number, default: null },
      npmProxyHostId: { type: Number, default: null },
      portainerStackId: { type: Number, default: null },
      portainerEndpointId: { type: Number, default: null },
      portainerWebhookId: { type: String, default: null },
      githubUtolsoFutasId: { type: Number, default: null },
      imageDigest: { type: String, default: null },
    },
    lejaratok: { type: [LejaratSchema], default: [] },
    letrehozoId: { type: String, required: true },
    archivalasOka: { type: String },
    archivalasIdopont: { type: Date },
    archivaltaId: { type: String },
    migraltDomainHostingId: { type: String },
  },
  { timestamps: true, collection: "deployments_telepitesek" },
);

TelepitesSchema.index({ azonosito: 1 }, { unique: true });
// Unique domain, but registry-only records may have none.
TelepitesSchema.index(
  { domain: 1 },
  { unique: true, partialFilterExpression: { domain: { $type: "string" } } },
);
TelepitesSchema.index({ partnerId: 1, allapot: 1 });
TelepitesSchema.index({ kovetkezoSzamlazas: 1 });
TelepitesSchema.index({ "kulsoIdk.cloudflareZonaId": 1 });
TelepitesSchema.index({ "kulsoIdk.portainerStackId": 1 });

export const Telepites =
  (mongoose.models.Telepites as mongoose.Model<ITelepites>) ||
  mongoose.model<ITelepites>("Telepites", TelepitesSchema);
