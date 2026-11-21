import mongoose, { Schema, type Document, type Types } from "mongoose";

/**
 * One chat message of a task's shared conversation (#68). A conversation belongs to a thread
 * (`szalKulcs`): every copy of a group task (`cs:<csoportId>`), or a single task with the copies
 * it was handed on to (`f:<first copy id>`) — so everyone on the task reads and writes the same
 * thread, and a handover or a new member does not split it. Old comments (`Feladat.notes`) are
 * not moved: the thread shows them read-only, to the same people as before.
 */
export interface IFeladatUzenet extends Document {
  _id: Types.ObjectId;
  szalKulcs: string;
  /** The copy it was written on (for the media usage and the link in a notification). */
  feladatId: Types.ObjectId;
  szerzoId: Types.ObjectId;
  /** Name snapshot — the list needs no user lookup. */
  szerzoNev: string;
  szoveg: string;
  /** Participants mentioned with "@Név" when it was last saved. */
  emlitettIds: Types.ObjectId[];
  /** Answer to another message of the same thread. */
  valaszId?: Types.ObjectId;
  mediaIds: Types.ObjectId[];
  /** Set when the author corrected the text. */
  szerkesztve?: Date;
  /** Soft delete: the bubble stays as "törölt üzenet", text and files are hidden. */
  torolve?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const FeladatUzenetSchema = new Schema<IFeladatUzenet>(
  {
    szalKulcs: { type: String, required: true },
    feladatId: { type: Schema.Types.ObjectId, required: true },
    szerzoId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    szerzoNev: { type: String, required: true },
    szoveg: { type: String, default: "" },
    emlitettIds: { type: [Schema.Types.ObjectId], default: [] },
    valaszId: { type: Schema.Types.ObjectId },
    mediaIds: { type: [Schema.Types.ObjectId], default: [] },
    szerkesztve: { type: Date },
    torolve: { type: Date },
  },
  { timestamps: true, collection: "feladat_uzenetek" },
);

FeladatUzenetSchema.index({ szalKulcs: 1, createdAt: 1 });

export const FeladatUzenet =
  (mongoose.models.FeladatUzenet as mongoose.Model<IFeladatUzenet>) ||
  mongoose.model<IFeladatUzenet>("FeladatUzenet", FeladatUzenetSchema);

/** When a participant last opened the thread — the "Látta" line under the last message. */
export interface IFeladatOlvasas extends Document {
  szalKulcs: string;
  userId: Types.ObjectId;
  mikor: Date;
}

const FeladatOlvasasSchema = new Schema<IFeladatOlvasas>(
  {
    szalKulcs: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, required: true },
    mikor: { type: Date, required: true },
  },
  { collection: "feladat_olvasasok" },
);

FeladatOlvasasSchema.index({ szalKulcs: 1, userId: 1 }, { unique: true });

export const FeladatOlvasas =
  (mongoose.models.FeladatOlvasas as mongoose.Model<IFeladatOlvasas>) ||
  mongoose.model<IFeladatOlvasas>("FeladatOlvasas", FeladatOlvasasSchema);
