import mongoose, { Schema, type Document, type Types } from "mongoose";

/** Singleton settings document (`kulcs: "alap"`): the editable warranty legal text. */
export interface IBizonylatBeallitas extends Document {
  _id: Types.ObjectId;
  kulcs: string;
  jotallasJogiSzoveg?: string;
  modositotta?: Types.ObjectId;
  updatedAt: Date;
}

const BizonylatBeallitasSchema = new Schema<IBizonylatBeallitas>(
  {
    kulcs: { type: String, required: true, unique: true },
    jotallasJogiSzoveg: String,
    modositotta: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, collection: "bizonylat_beallitasok" },
);

export const BizonylatBeallitas =
  (mongoose.models.BizonylatBeallitas as mongoose.Model<IBizonylatBeallitas>) ||
  mongoose.model<IBizonylatBeallitas>("BizonylatBeallitas", BizonylatBeallitasSchema);
