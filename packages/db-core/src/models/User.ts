import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  name: string;
  passwordHash?: string;
  /** Central IdP (`apps/auth`) subject this account is linked to; set on first OIDC login. */
  platformUserId?: string;
  emailVerified?: Date;
  image?: string;
  roleIds: Types.ObjectId[];
  directPermissionKeys: string[];
  isActive: boolean;
  resetToken?: string;
  resetTokenExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    passwordHash: { type: String },
    platformUserId: { type: String },
    emailVerified: { type: Date },
    image: { type: String },
    roleIds: [{ type: Schema.Types.ObjectId, ref: "Role" }],
    directPermissionKeys: [{ type: String }],
    isActive: { type: Boolean, default: true },
    resetToken: { type: String },
    resetTokenExpires: { type: Date },
  },
  { timestamps: true },
);

UserSchema.index(
  { platformUserId: 1 },
  { unique: true, partialFilterExpression: { platformUserId: { $type: "string" } } },
);

export const User =
  (mongoose.models.User as mongoose.Model<IUser>) ||
  mongoose.model<IUser>("User", UserSchema);
