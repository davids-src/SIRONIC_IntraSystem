import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IPortalUser extends Document {
  _id: Types.ObjectId;
  email: string;
  name: string;
  partnerId: string;
  /** Snapshot of the partner's name (shown in the UI, copied into new tickets). */
  partnerNev: string;
  rolak: string[];
  passwordHash?: string;
  isActive: boolean;
  failedLoginCount: number;
  lockedUntil?: Date;
  lastLoginAt?: Date;
  /** OIDC hookup point: the central IdP `sub`, linked on first verified login (not built yet). */
  platformUserId?: string;
  invitedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PortalUserSchema = new Schema<IPortalUser>(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    partnerId: { type: String, required: true, index: true },
    partnerNev: { type: String, required: true },
    rolak: { type: [String], default: [] },
    passwordHash: { type: String },
    isActive: { type: Boolean, default: true },
    failedLoginCount: { type: Number, default: 0 },
    lockedUntil: { type: Date },
    lastLoginAt: { type: Date },
    platformUserId: { type: String },
    invitedBy: { type: String },
  },
  { timestamps: true, collection: "portal_users" },
);
PortalUserSchema.index({ email: 1 }, { unique: true });
PortalUserSchema.index(
  { platformUserId: 1 },
  { unique: true, partialFilterExpression: { platformUserId: { $type: "string" } } },
);

export const PortalUser =
  (mongoose.models.PortalUser as mongoose.Model<IPortalUser>) ||
  mongoose.model<IPortalUser>("PortalUser", PortalUserSchema);

export type PortalTokenPurpose = "invite" | "reset";

export interface IPortalToken extends Document {
  _id: Types.ObjectId;
  /** SHA-256 of the one-time token; the raw token is only ever in the mail. */
  tokenHash: string;
  purpose: PortalTokenPurpose;
  portalUserId: string;
  expiresAt: Date;
  usedAt?: Date;
}

const PortalTokenSchema = new Schema<IPortalToken>(
  {
    tokenHash: { type: String, required: true, unique: true },
    purpose: { type: String, enum: ["invite", "reset"], required: true },
    portalUserId: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date },
  },
  { timestamps: true, collection: "portal_tokens" },
);

export const PortalToken =
  (mongoose.models.PortalToken as mongoose.Model<IPortalToken>) ||
  mongoose.model<IPortalToken>("PortalToken", PortalTokenSchema);

export interface IPortalRole extends Document {
  key: string;
  nev: string;
  permissions: string[];
}

const PortalRoleSchema = new Schema<IPortalRole>(
  {
    key: { type: String, required: true, unique: true },
    nev: { type: String, required: true },
    permissions: { type: [String], default: [] },
  },
  { collection: "portal_roles" },
);

export const PortalRole =
  (mongoose.models.PortalRole as mongoose.Model<IPortalRole>) ||
  mongoose.model<IPortalRole>("PortalRole", PortalRoleSchema);
