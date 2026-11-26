import mongoose, { Schema, type Document, type Types } from "mongoose";
import {
  MOZGAS_TIPUSOK,
  REFERENCE_TIPUSOK,
  type MozgasTipus,
  type ReferenceTipus,
} from "../constants";

/**
 * One entry of the append-only movement log — the source of truth: `keszlet` is the sum of
 * `valtozas`, `foglalt` the sum of `foglaltValtozas` per stock row (`ellenorzes()` in the facade
 * recomputes both). `kulcs` = `<tipus>:<referenceType>:<referenceId>:<lineIndex>` is unique, so a
 * retried batch can never log (or apply) a line twice.
 */
export interface IKeszletMozgas extends Document {
  _id: Types.ObjectId;
  kulcs: string;
  tipus: MozgasTipus;
  tetelId: Types.ObjectId;
  arlistaTermekId: string;
  raktarhelyKod: string;
  nev: string;
  kod: string;
  /** Signed change of the physical stock. */
  valtozas: number;
  /** Signed change of the allocated quantity. */
  foglaltValtozas: number;
  referenceType: ReferenceTipus;
  referenceId: string;
  lineIndex: number;
  /** Purchase price per unit (bevétel) — SECRET, cut by the facade. */
  beszerzesiAr?: number;
  jegyzet?: string;
  actorId: Types.ObjectId;
  createdAt: Date;
}

const KeszletMozgasSchema = new Schema<IKeszletMozgas>(
  {
    kulcs: { type: String, required: true, unique: true },
    tipus: { type: String, enum: MOZGAS_TIPUSOK, required: true },
    tetelId: { type: Schema.Types.ObjectId, ref: "KeszletTetel", required: true },
    arlistaTermekId: { type: String, required: true },
    raktarhelyKod: { type: String, default: "" },
    nev: { type: String, required: true },
    kod: { type: String, required: true },
    valtozas: { type: Number, required: true, default: 0 },
    foglaltValtozas: { type: Number, required: true, default: 0 },
    referenceType: { type: String, enum: REFERENCE_TIPUSOK, required: true },
    referenceId: { type: String, required: true },
    lineIndex: { type: Number, required: true },
    beszerzesiAr: { type: Number },
    jegyzet: { type: String },
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: "keszlet_mozgasok" },
);
KeszletMozgasSchema.index({ tetelId: 1, createdAt: -1 });
KeszletMozgasSchema.index({ arlistaTermekId: 1, createdAt: -1 });
KeszletMozgasSchema.index({ referenceType: 1, referenceId: 1 });
KeszletMozgasSchema.index({ createdAt: -1 });

const CSAK_BOVITHETO = "A mozgásnapló csak bővíthető, a bejegyzések nem módosíthatók.";
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
  KeszletMozgasSchema.pre(op, function () {
    throw new Error(CSAK_BOVITHETO);
  });
}
KeszletMozgasSchema.pre("save", function () {
  if (!this.isNew) throw new Error(CSAK_BOVITHETO);
});

export const KeszletMozgas =
  (mongoose.models.KeszletMozgas as mongoose.Model<IKeszletMozgas>) ||
  mongoose.model<IKeszletMozgas>("KeszletMozgas", KeszletMozgasSchema);
