import mongoose, { Schema, type Document, type Types } from "mongoose";
import {
  FIZIKAI_ALLAPOTOK,
  MOZGAS_TIPUSOK,
  type FizikaiAllapot,
  type MozgasTipus,
} from "../constants";

/** One entry of the append-only movement log. Written only by the facade's explicit methods. */
export interface IEszkozMozgas extends Document {
  _id: Types.ObjectId;
  eszkozId: Types.ObjectId;
  tipus: MozgasTipus;
  /** Who performed the action. */
  vegrehajtoId: Types.ObjectId;
  /** Kiadás: the recipient. */
  celUserId?: Types.ObjectId;
  /** The holder whose custody the movement ended (visszavétel / szerviz / elveszett / kivonás). */
  elozoUserId?: Types.ObjectId;
  fizikaiAllapot?: FizikaiAllapot;
  jegyzet?: string;
  createdAt: Date;
}

const EszkozMozgasSchema = new Schema<IEszkozMozgas>(
  {
    eszkozId: { type: Schema.Types.ObjectId, ref: "Eszkoz", required: true },
    tipus: { type: String, enum: MOZGAS_TIPUSOK, required: true },
    vegrehajtoId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    celUserId: { type: Schema.Types.ObjectId, ref: "User" },
    elozoUserId: { type: Schema.Types.ObjectId, ref: "User" },
    fizikaiAllapot: { type: String, enum: FIZIKAI_ALLAPOTOK },
    jegyzet: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: "eszkoz_mozgasok" },
);
EszkozMozgasSchema.index({ eszkozId: 1, createdAt: -1 });

const CSAK_BOVITHETO = "A mozgásnapló csak bővíthető, a bejegyzések nem módosíthatók.";

/** Append-only: every mutating query operation other than insert is refused. */
const TILTOTT = [
  "updateOne",
  "updateMany",
  "replaceOne",
  "findOneAndUpdate",
  "findOneAndReplace",
  "findOneAndDelete",
  "deleteOne",
  "deleteMany",
] as const;
for (const op of TILTOTT) {
  EszkozMozgasSchema.pre(op, function () {
    throw new Error(CSAK_BOVITHETO);
  });
}
EszkozMozgasSchema.pre("save", function () {
  if (!this.isNew) throw new Error(CSAK_BOVITHETO);
});

export const EszkozMozgas =
  (mongoose.models.EszkozMozgas as mongoose.Model<IEszkozMozgas>) ||
  mongoose.model<IEszkozMozgas>("EszkozMozgas", EszkozMozgasSchema);
