import mongoose, { Schema, type Document, type Types } from "mongoose";

/**
 * Stock of one árlista item at one location. `arlistaTermekId` is an opaque id — this package
 * never imports @erp/arlista; name/code/unit are denormalized at write time (receipt).
 *
 * Invariant (enforced by conditional atomic updates, never by read-modify-write):
 *   0 <= foglalt <= keszlet,  szabad = keszlet - foglalt.
 * `mozgasKulcsok` holds the idempotency keys of the movements applied to this row in the very
 * same atomic update as the `$inc`, so a retry can tell "already applied" from "not yet".
 */
export interface IKeszletTetel extends Document {
  _id: Types.ObjectId;
  arlistaTermekId: string;
  /** "" = not assigned to a location. */
  raktarhelyKod: string;
  nev: string;
  kod: string;
  egyseg: string;
  keszlet: number;
  foglalt: number;
  /** Low-stock threshold; null = not watched. */
  minimum: number | null;
  /** SECRET — cut by the facade unless the viewer holds `keszlet:ertek:read`. */
  utolsoBeszerzesiAr?: number;
  megjegyzes?: string;
  /** Last bevétel / kiadás / korrekció (reservations do not count) — dead-stock input. */
  utolsoMozgasAt?: Date;
  mozgasKulcsok: string[];
  createdAt: Date;
  updatedAt: Date;
}

const KeszletTetelSchema = new Schema<IKeszletTetel>(
  {
    arlistaTermekId: { type: String, required: true, index: true },
    raktarhelyKod: { type: String, default: "" },
    nev: { type: String, required: true },
    kod: { type: String, required: true },
    egyseg: { type: String, required: true },
    keszlet: { type: Number, required: true, default: 0, min: 0 },
    foglalt: { type: Number, required: true, default: 0, min: 0 },
    minimum: { type: Number, default: null },
    utolsoBeszerzesiAr: { type: Number },
    megjegyzes: { type: String },
    utolsoMozgasAt: { type: Date },
    mozgasKulcsok: { type: [String], default: [] },
  },
  { timestamps: true, collection: "keszlet_tetelek" },
);
KeszletTetelSchema.index({ arlistaTermekId: 1, raktarhelyKod: 1 }, { unique: true });
KeszletTetelSchema.index({ raktarhelyKod: 1 });
KeszletTetelSchema.index({ mozgasKulcsok: 1 });

export const KeszletTetel =
  (mongoose.models.KeszletTetel as mongoose.Model<IKeszletTetel>) ||
  mongoose.model<IKeszletTetel>("KeszletTetel", KeszletTetelSchema);
