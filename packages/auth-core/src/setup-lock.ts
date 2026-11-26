import mongoose from "mongoose";

const LOCK_ID = "singleton";

/**
 * Atomically claims the one-time "first PlatformUser" bootstrap. A plain
 * `estimatedDocumentCount() === 0` check followed by `create()` is a classic TOCTOU race —
 * two concurrent setup requests can both pass the count check before either insert lands,
 * creating two separate "first" admins (this DB has no transactions to wrap both in).
 * `insertOne` with a fixed `_id` is atomic at the single-document level: the second caller's
 * insert always fails with a duplicate-key error.
 *
 * Returns true if this call claimed the lock (go ahead and create the user), false if setup
 * was already claimed by someone else.
 */
export async function claimSetupLock(): Promise<boolean> {
  try {
    await mongoose.connection
      .collection("setup_locks")
      .insertOne({ _id: LOCK_ID as any, created_at: new Date() });
    return true;
  } catch (e) {
    if (
      e &&
      typeof e === "object" &&
      "code" in e &&
      (e as { code?: number }).code === 11000
    ) {
      return false;
    }
    throw e;
  }
}
