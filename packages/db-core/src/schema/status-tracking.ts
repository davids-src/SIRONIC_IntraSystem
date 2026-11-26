import { Schema, type Types } from "mongoose";

/**
 * Shared status/responsibility/notes shape — one embedded pattern reused by every
 * domain module entity that needs ownership and an audit trail. See docs/ARCHITECTURE.md §4.
 *
 * `statusHistory` is append-only and *is* the audit log: status-changing Server Actions
 * push a new entry rather than overwriting, so there is no separate audit collection.
 */

export interface StatusEntry {
  key: string;
  changedAt: Date;
  changedBy: Types.ObjectId;
  note?: string;
}

export interface AssigneeRef {
  /** Unset when the assignee was entered as free text (no matching User account). */
  userId?: Types.ObjectId;
  assignedAt: Date;
  assignedBy: Types.ObjectId;
}

export interface NoteEntry {
  text: string;
  authorId: Types.ObjectId;
  createdAt: Date;
}

export interface StatusTrackingFields {
  status: StatusEntry;
  statusHistory: StatusEntry[];
  assignee: AssigneeRef | null;
  notes: NoteEntry[];
}

const statusEntrySchema = new Schema<StatusEntry>(
  {
    key: { type: String, required: true },
    changedAt: { type: Date, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    note: { type: String },
  },
  { _id: false },
);

const assigneeSchema = new Schema<AssigneeRef>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    assignedAt: { type: Date, required: true },
    assignedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { _id: false },
);

const noteEntrySchema = new Schema<NoteEntry>(
  {
    text: { type: String, required: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, required: true },
  },
  { _id: false },
);

/** Adds `status`, `statusHistory`, `assignee`, `notes` to a Mongoose schema in place. */
export function withStatusTracking<T extends Schema>(schema: T): T {
  schema.add({
    status: { type: statusEntrySchema, required: true },
    statusHistory: { type: [statusEntrySchema], default: [] },
    assignee: { type: assigneeSchema, default: null },
    notes: { type: [noteEntrySchema], default: [] },
  });
  return schema;
}

/**
 * Appends a status change to `statusHistory` and updates the current `status` in place.
 * Call before `.save()` — does not persist by itself.
 */
export function appendStatusChange<T extends StatusTrackingFields>(
  doc: T,
  key: string,
  changedBy: Types.ObjectId | string,
  note?: string,
): void {
  const entry = {
    key,
    changedAt: new Date(),
    changedBy: changedBy as Types.ObjectId,
    note,
  } as StatusEntry;
  doc.statusHistory = [...(doc.statusHistory ?? []), entry];
  doc.status = entry;
}
