import mongoose, { Schema, type Document, type Types } from "mongoose";
import { JELZES_TIPUSOK, type JelzesTipus } from "../constants";

/**
 * One notification as it was sent — the content, written once. Who got it and whether they read
 * it lives in `JelzesCimzett` (one row per recipient, see there).
 */
export interface IJelzes extends Document {
  _id: Types.ObjectId;
  cim: string;
  szoveg?: string;
  tipus: JelzesTipus;
  /** App-relative path (or https URL) opened on click. */
  url?: string;
  kuldoId?: Types.ObjectId;
  kuldoNev?: string;
  /** How many people it went to (fixed at sending). */
  cimzettDb: number;
  /** For the "Elküldött jelzések" list: "Mindenki", "2 szerepkör, 3 felhasználó", … */
  cimzettLeiras?: string;
  /** A push was requested too. */
  push: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const JelzesSchema = new Schema<IJelzes>(
  {
    cim: { type: String, required: true },
    szoveg: { type: String },
    tipus: { type: String, enum: JELZES_TIPUSOK, required: true, index: true },
    url: { type: String },
    kuldoId: { type: Schema.Types.ObjectId, ref: "User" },
    kuldoNev: { type: String },
    cimzettDb: { type: Number, required: true, default: 0 },
    cimzettLeiras: { type: String },
    push: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "jelzesek" },
);
JelzesSchema.index({ tipus: 1, createdAt: -1 });

export const Jelzes =
  (mongoose.models.Jelzes as mongoose.Model<IJelzes>) ||
  mongoose.model<IJelzes>("Jelzes", JelzesSchema);

/**
 * Fan-out: one row per recipient, written when the Jelzés is sent. At this scale (a "mindenki"
 * körüzenet reaches ~100–300 active users) it is a single `insertMany`, and it makes everything
 * that is read often trivial and indexed: the bell's unread count is one `countDocuments` on
 * `{userId, olvasva: null}`, a user's history is one sorted range, the read ratio of a sent
 * körüzenet is a count by `jelzesId`. Recipients are a snapshot — someone joining later does not
 * see an old körüzenet, which is what a circular means. `tipus` and `createdAt` are copied here so
 * the per-user list can be filtered and paged without a join.
 */
export interface IJelzesCimzett extends Document {
  _id: Types.ObjectId;
  jelzesId: Types.ObjectId;
  userId: Types.ObjectId;
  tipus: JelzesTipus;
  olvasva: Date | null;
  createdAt: Date;
}

const JelzesCimzettSchema = new Schema<IJelzesCimzett>(
  {
    jelzesId: { type: Schema.Types.ObjectId, ref: "Jelzes", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tipus: { type: String, enum: JELZES_TIPUSOK, required: true },
    olvasva: { type: Date, default: null },
    createdAt: { type: Date, required: true, default: () => new Date() },
  },
  { collection: "jelzes_cimzettek" },
);
JelzesCimzettSchema.index({ userId: 1, createdAt: -1 });
JelzesCimzettSchema.index({ userId: 1, olvasva: 1 });
JelzesCimzettSchema.index({ jelzesId: 1, userId: 1 }, { unique: true });

export const JelzesCimzett =
  (mongoose.models.JelzesCimzett as mongoose.Model<IJelzesCimzett>) ||
  mongoose.model<IJelzesCimzett>("JelzesCimzett", JelzesCimzettSchema);
