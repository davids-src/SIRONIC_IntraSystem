import mongoose, { Schema, type Document, type Types } from "mongoose";
import { SHARE_KINDS, SHARE_LEVELS, ACCESS_ACTIONS } from "../constants";

/** A stored secret. `valueEncrypted` is `iv:authTag:ciphertext` (hex) and never leaves the facade. */
export interface ISecret extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  valueEncrypted: string;
  /** Opaque partner reference (string) — the partner module is not imported. */
  partnerId?: string;
  ownerId: string;
  ownerName?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SecretSchema = new Schema<ISecret>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String },
    valueEncrypted: { type: String, required: true },
    partnerId: { type: String, index: true },
    ownerId: { type: String, required: true, index: true },
    ownerName: { type: String },
    updatedBy: { type: String },
  },
  { timestamps: true, collection: "secrets_titkok" },
);

export const Secret =
  (mongoose.models.Secret as mongoose.Model<ISecret>) ||
  mongoose.model<ISecret>("Secret", SecretSchema);

export interface ISecretShare extends Document {
  _id: Types.ObjectId;
  secretId: string;
  kind: (typeof SHARE_KINDS)[number];
  targetId: string;
  targetName?: string;
  level: (typeof SHARE_LEVELS)[number];
  grantedBy: string;
  createdAt: Date;
}

const SecretShareSchema = new Schema<ISecretShare>(
  {
    secretId: { type: String, required: true },
    kind: { type: String, enum: SHARE_KINDS, required: true },
    targetId: { type: String, required: true },
    targetName: { type: String },
    level: { type: String, enum: SHARE_LEVELS, default: "read" },
    grantedBy: { type: String, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "secrets_megosztasok",
  },
);
SecretShareSchema.index({ secretId: 1, kind: 1, targetId: 1 }, { unique: true });
SecretShareSchema.index({ kind: 1, targetId: 1 });

export const SecretShare =
  (mongoose.models.SecretShare as mongoose.Model<ISecretShare>) ||
  mongoose.model<ISecretShare>("SecretShare", SecretShareSchema);

/** Audit trail: who revealed which secret, when. Never holds the value. */
export interface ISecretHozzaferes extends Document {
  _id: Types.ObjectId;
  secretId: string;
  secretName: string;
  userId: string;
  userName?: string;
  action: (typeof ACCESS_ACTIONS)[number];
  at: Date;
}

const SecretHozzaferesSchema = new Schema<ISecretHozzaferes>(
  {
    secretId: { type: String, required: true },
    secretName: { type: String, required: true },
    userId: { type: String, required: true },
    userName: { type: String },
    action: { type: String, enum: ACCESS_ACTIONS, required: true },
    at: { type: Date, required: true, default: () => new Date() },
  },
  { collection: "secrets_hozzaferesek" },
);
SecretHozzaferesSchema.index({ secretId: 1, at: -1 });

export const SecretHozzaferes =
  (mongoose.models.SecretHozzaferes as mongoose.Model<ISecretHozzaferes>) ||
  mongoose.model<ISecretHozzaferes>("SecretHozzaferes", SecretHozzaferesSchema);
