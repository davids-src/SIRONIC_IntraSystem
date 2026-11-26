import mongoose, { Schema, type Document, type Types } from "mongoose";
import {
  DNS_TIPUSOK,
  ESEMENY_CEL_TIPUSOK,
  ESEMENY_MUVELETEK,
  HOZZAFERES_TIPUSOK,
  INTEGRACIO_SZOLGALTATOK,
  OLDAL_SEMAK,
  STACK_TIPUSOK,
  WEBHELY_TIPUSOK,
  type DnsTipus,
  type EsemenyCelTipus,
  type EsemenyMuvelet,
  type HozzaferesTipus,
  type IntegracioSzolgaltato,
  type OldalSema,
  type StackTipus,
  type WebhelyTipus,
} from "./constants";

// ------------------------------------------------------------ InfraStack

/**
 * The CRM-side record of a Portainer stack. Portainer stays the source of truth for the compose
 * file, env and containers (always read live); this row only adds what Portainer cannot hold:
 * type, partner, notes. One row per Portainer stack id (stack NAMES are not unique in Portainer).
 */
export interface IInfraStack extends Document {
  _id: Types.ObjectId;
  nev: string;
  portainerStackId: number;
  endpointId?: number;
  tipus: StackTipus;
  leiras?: string;
  /** Opaque Partner id (no import of `@erp/partner`). Sites may override it. */
  partnerId?: string;
  /** True when the stack disappeared from Portainer (kept so its sites/history survive). */
  elveszett: boolean;
  utolsoSzinkron?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InfraStackSchema = new Schema<IInfraStack>(
  {
    nev: { type: String, required: true, trim: true },
    portainerStackId: { type: Number, required: true },
    endpointId: { type: Number },
    tipus: { type: String, enum: STACK_TIPUSOK, default: "projekt" },
    leiras: { type: String },
    partnerId: { type: String },
    elveszett: { type: Boolean, default: false },
    utolsoSzinkron: { type: Date },
  },
  { timestamps: true, collection: "infra_stackek" },
);
InfraStackSchema.index({ portainerStackId: 1 }, { unique: true });
InfraStackSchema.index({ nev: 1 });
InfraStackSchema.index({ partnerId: 1 });

export const InfraStack =
  (mongoose.models.InfraStack as mongoose.Model<IInfraStack>) ||
  mongoose.model<IInfraStack>("InfraStack", InfraStackSchema);

// ------------------------------------------------------------ InfraOldal

export interface IKulsoIdk {
  npmProxyHostId?: number | null;
  npmTanusitvanyId?: number | null;
  cloudflareZonaId?: string | null;
  cloudflareDnsRekordIdk: string[];
}

/**
 * A site: one NPM proxy host (the main hostname plus its aliases, e.g. `www.`) pointing at ONE
 * service of a stack. Many sites can belong to one stack, each to a different service/port.
 */
export interface IInfraOldal extends Document {
  _id: Types.ObjectId;
  nev: string;
  /** First entry is the main hostname; the rest are aliases served by the same proxy host. */
  hostnevek: string[];
  stackId?: string;
  /** Container (service) name inside the stack = the NPM forward host on the shared network. */
  szolgaltatas: string;
  port: number;
  sema: OldalSema;
  websocket: boolean;
  sslKikenyszer: boolean;
  partnerId?: string;
  megjegyzes?: string;
  dns: { tipus?: DnsTipus; cel?: string; proxied: boolean };
  kulsoIdk: IKulsoIdk;
  utolsoSzinkron?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InfraOldalSchema = new Schema<IInfraOldal>(
  {
    nev: { type: String, required: true, trim: true },
    hostnevek: { type: [String], required: true },
    stackId: { type: String },
    szolgaltatas: { type: String, required: true, trim: true },
    port: { type: Number, required: true },
    sema: { type: String, enum: OLDAL_SEMAK, default: "http" },
    websocket: { type: Boolean, default: true },
    sslKikenyszer: { type: Boolean, default: true },
    partnerId: { type: String },
    megjegyzes: { type: String },
    dns: {
      type: new Schema(
        {
          tipus: { type: String, enum: DNS_TIPUSOK },
          cel: { type: String },
          proxied: { type: Boolean, default: false },
        },
        { _id: false },
      ),
      default: () => ({ proxied: false }),
    },
    kulsoIdk: {
      type: new Schema(
        {
          npmProxyHostId: { type: Number, default: null },
          npmTanusitvanyId: { type: Number, default: null },
          cloudflareZonaId: { type: String, default: null },
          cloudflareDnsRekordIdk: { type: [String], default: [] },
        },
        { _id: false },
      ),
      default: () => ({ cloudflareDnsRekordIdk: [] }),
    },
    utolsoSzinkron: { type: Date },
  },
  { timestamps: true, collection: "infra_oldalak" },
);
InfraOldalSchema.index({ hostnevek: 1 }, { unique: true });
InfraOldalSchema.index({ stackId: 1 });
InfraOldalSchema.index({ partnerId: 1 });
InfraOldalSchema.index({ "kulsoIdk.npmProxyHostId": 1 });

export const InfraOldal =
  (mongoose.models.InfraOldal as mongoose.Model<IInfraOldal>) ||
  mongoose.model<IInfraOldal>("InfraOldal", InfraOldalSchema);

// ------------------------------------------------------------ InfraSablon (stack template)

export interface IInfraSablon extends Document {
  _id: Types.ObjectId;
  nev: string;
  leiras?: string;
  tipus: StackTipus;
  compose: string;
  /** Default env — plain values, so keep real secrets out of templates. */
  env: Array<{ name: string; value: string }>;
  createdAt: Date;
  updatedAt: Date;
}

const InfraSablonSchema = new Schema<IInfraSablon>(
  {
    nev: { type: String, required: true, trim: true },
    leiras: { type: String },
    tipus: { type: String, enum: STACK_TIPUSOK, default: "projekt" },
    compose: { type: String, required: true },
    env: {
      type: [
        new Schema(
          {
            name: { type: String, required: true },
            value: { type: String, default: "" },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
  },
  { timestamps: true, collection: "infra_sablonok" },
);
InfraSablonSchema.index({ nev: 1 }, { unique: true });

export const InfraSablon =
  (mongoose.models.InfraSablon as mongoose.Model<IInfraSablon>) ||
  mongoose.model<IInfraSablon>("InfraSablon", InfraSablonSchema);

// ------------------------------------------------------------ InfraWebhely (non-stack site)

export interface IInfraWebhely extends Document {
  _id: Types.ObjectId;
  nev: string;
  tipus: WebhelyTipus;
  hostnevek: string[];
  partnerId?: string;
  /** Where it is hosted (provider / server), free text. */
  tarhely?: string;
  /** Domain / hosting renewal date. */
  lejarat?: Date;
  megjegyzes?: string;
  utolsoEllenorzes?: {
    at: Date;
    ok: boolean;
    statusz?: number;
    wordpress?: boolean;
    uzenet?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const InfraWebhelySchema = new Schema<IInfraWebhely>(
  {
    nev: { type: String, required: true, trim: true },
    tipus: { type: String, enum: WEBHELY_TIPUSOK, default: "wordpress" },
    hostnevek: { type: [String], default: [] },
    partnerId: { type: String },
    tarhely: { type: String },
    lejarat: { type: Date },
    megjegyzes: { type: String },
    utolsoEllenorzes: {
      type: new Schema(
        {
          at: { type: Date, required: true },
          ok: { type: Boolean, required: true },
          statusz: { type: Number },
          wordpress: { type: Boolean },
          uzenet: { type: String },
        },
        { _id: false },
      ),
    },
  },
  { timestamps: true, collection: "infra_webhelyek" },
);
InfraWebhelySchema.index({ hostnevek: 1 }, { unique: true });
InfraWebhelySchema.index({ partnerId: 1 });

export const InfraWebhely =
  (mongoose.models.InfraWebhely as mongoose.Model<IInfraWebhely>) ||
  mongoose.model<IInfraWebhely>("InfraWebhely", InfraWebhelySchema);

// ------------------------------------------------------------ InfraHozzaferes (login of a webhely)

export interface IInfraHozzaferes extends Document {
  _id: Types.ObjectId;
  webhelyId: string;
  tipus: HozzaferesTipus;
  cimke: string;
  host: string;
  port?: number;
  felhasznalo?: string;
  /** AES-256-GCM envelope (`iv:tag:ct`) — never returned by any list/detail DTO. */
  jelszoTitkositott?: string;
  konyvtar?: string;
  url?: string;
  megjegyzes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InfraHozzaferesSchema = new Schema<IInfraHozzaferes>(
  {
    webhelyId: { type: String, required: true },
    tipus: { type: String, enum: HOZZAFERES_TIPUSOK, default: "ftp" },
    cimke: { type: String, required: true, trim: true },
    host: { type: String, required: true, trim: true },
    port: { type: Number },
    felhasznalo: { type: String },
    jelszoTitkositott: { type: String },
    konyvtar: { type: String },
    url: { type: String },
    megjegyzes: { type: String },
  },
  { timestamps: true, collection: "infra_hozzaferesek" },
);
InfraHozzaferesSchema.index({ webhelyId: 1 });

export const InfraHozzaferes =
  (mongoose.models.InfraHozzaferes as mongoose.Model<IInfraHozzaferes>) ||
  mongoose.model<IInfraHozzaferes>("InfraHozzaferes", InfraHozzaferesSchema);

// ------------------------------------------------------------ InfraEsemeny (append-only)

export interface IInfraEsemeny extends Document {
  _id: Types.ObjectId;
  muvelet: EsemenyMuvelet;
  celTipus: EsemenyCelTipus;
  celId?: string;
  celNev?: string;
  ok: boolean;
  uzenet?: string;
  /** Per-step outcomes etc. Never contains credentials, env values or compose text. */
  reszletek?: Record<string, unknown>;
  /** User id, `cli:<name>` or `mcp:<name>`. */
  szereplo: string;
  createdAt: Date;
}

const InfraEsemenySchema = new Schema<IInfraEsemeny>(
  {
    muvelet: { type: String, enum: ESEMENY_MUVELETEK, required: true },
    celTipus: { type: String, enum: ESEMENY_CEL_TIPUSOK, required: true },
    celId: { type: String },
    celNev: { type: String },
    ok: { type: Boolean, required: true },
    uzenet: { type: String },
    reszletek: { type: Schema.Types.Mixed },
    szereplo: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: "infra_esemenyek" },
);
InfraEsemenySchema.index({ celTipus: 1, celId: 1, createdAt: -1 });
InfraEsemenySchema.index({ createdAt: -1 });

export const InfraEsemeny =
  (mongoose.models.InfraEsemeny as mongoose.Model<IInfraEsemeny>) ||
  mongoose.model<IInfraEsemeny>("InfraEsemeny", InfraEsemenySchema);

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

/** Same collection and shape as the former Telepítések module, so existing connections carry over. */
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
