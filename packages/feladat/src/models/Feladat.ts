import mongoose, { Schema, type Document, type Types } from "mongoose";
import { withStatusTracking, type StatusTrackingFields } from "@erp/db-core";
import type { FeladatPrioritas } from "../constants";

/**
 * A task one user gives another (7e, döntés #43). Status, its log, the felelős and the comments
 * come from the shared `withStatusTracking` shape: `status.key` is a `FeladatAllapot`,
 * `statusHistory` the állapotnapló (refusal / closing / withdrawal reasons in `note`),
 * `assignee.userId` the felelős, `notes` the two-way comments. Names are snapshots taken when
 * the task is given, so the list needs no user lookup for them.
 */
export interface IFeladat extends Document, StatusTrackingFields {
  _id: Types.ObjectId;
  cim: string;
  leiras?: string;
  /** Deadline day — stored as UTC midnight of the chosen `YYYY-MM-DD`. */
  hatarido: Date;
  kiadoId: Types.ObjectId;
  kiadoNev: string;
  felelosNev: string;
  /** Own task: the giver gave it to themself — no acceptance step, starts `elfogadva`. */
  sajat?: boolean;
  /** Group task: every recipient gets their own copy; the copies share this id. */
  csoportId?: Types.ObjectId;
  /** Unset = normál (#48). */
  prioritas?: Exclude<FeladatPrioritas, "normal">;
  /** Group copy of the primary felelős (#48); the other copies are közreműködők. */
  elsodleges?: boolean;
  /** Attachments given with the task — protected media ids (#47); names live in the media store. */
  mediaIds?: Types.ObjectId[];
  /** Attachments of comments: `megjegyzes` is the index in `notes` (append-only, so stable). */
  megjegyzesMediaIds?: Array<{ megjegyzes: number; mediaIds: Types.ObjectId[] }>;
  /** Indexes in `notes` of comments the kiadó sent to the whole group at once (8m). */
  csoportMegjegyzesek?: number[];
  /** Továbbadás (#49): the copy this one was handed on from / to. */
  elozmenyId?: Types.ObjectId;
  kovetkezoId?: Types.ObjectId;
  /** Earlier felelősök along the handover chain — they may still read it. */
  korabbiFelelosIds?: Types.ObjectId[];
  /** Linked task (#50): the entity step it belongs to; the owning module is called back. */
  kapcsolat?: {
    modul: string;
    tipus: string;
    id: string;
    szakasz?: string;
    url: string;
    cimke?: string;
  };
  /** Free category (#65) — display spelling; `kategoriaKulcs` matches spellings. */
  kategoria?: string;
  kategoriaKulcs?: string;
  /** The felelős's own steps (#50); the first not done is shown as the current one. */
  lepesek?: Array<{ nev: string; kesz: boolean; hatarido?: Date }>;
  createdAt: Date;
  updatedAt: Date;
}

const FeladatSchema = withStatusTracking(
  new Schema<IFeladat>(
    {
      cim: { type: String, required: true },
      leiras: { type: String },
      hatarido: { type: Date, required: true },
      kiadoId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
      kiadoNev: { type: String, required: true },
      felelosNev: { type: String, required: true },
      sajat: { type: Boolean },
      csoportId: { type: Schema.Types.ObjectId },
      prioritas: { type: String, enum: ["magas", "surgos"] },
      elsodleges: { type: Boolean },
      mediaIds: { type: [Schema.Types.ObjectId], default: undefined },
      megjegyzesMediaIds: {
        type: [
          new Schema(
            {
              megjegyzes: { type: Number, required: true },
              mediaIds: [Schema.Types.ObjectId],
            },
            { _id: false },
          ),
        ],
        default: undefined,
      },
      csoportMegjegyzesek: { type: [Number], default: undefined },
      elozmenyId: { type: Schema.Types.ObjectId },
      kovetkezoId: { type: Schema.Types.ObjectId },
      korabbiFelelosIds: { type: [Schema.Types.ObjectId], default: undefined },
      kapcsolat: {
        type: new Schema(
          {
            modul: { type: String, required: true },
            tipus: { type: String, required: true },
            id: { type: String, required: true },
            szakasz: { type: String },
            url: { type: String, required: true },
            cimke: { type: String },
          },
          { _id: false },
        ),
        default: undefined,
      },
      kategoria: { type: String },
      kategoriaKulcs: { type: String },
      lepesek: {
        type: [
          new Schema(
            {
              nev: { type: String, required: true },
              kesz: { type: Boolean, default: false },
              hatarido: { type: Date },
            },
            { _id: false },
          ),
        ],
        default: undefined,
      },
    },
    { timestamps: true, collection: "feladatok" },
  ),
);

FeladatSchema.index({ "assignee.userId": 1, "status.key": 1 });
FeladatSchema.index({ kiadoId: 1, "status.key": 1 });
FeladatSchema.index({ csoportId: 1 }, { sparse: true });
FeladatSchema.index({ kategoriaKulcs: 1 }, { sparse: true });
FeladatSchema.index(
  { "kapcsolat.modul": 1, "kapcsolat.tipus": 1, "kapcsolat.id": 1 },
  { sparse: true },
);

export const Feladat =
  (mongoose.models.Feladat as mongoose.Model<IFeladat>) ||
  mongoose.model<IFeladat>("Feladat", FeladatSchema);
