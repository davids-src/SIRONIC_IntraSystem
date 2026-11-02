import { PlatformUserModel } from "./models/platform-user";
import { MAX_FAILED_ATTEMPTS, LOCKOUT_DURATION_MS } from "./lockout";

/**
 * Atomically increments `failed_login_count` and locks the account once the threshold is
 * crossed. A separate read-then-`$set` (read `failed_login_count`, compute next, write it)
 * loses increments under concurrent failed attempts — `$inc` never does.
 */
export async function recordFailedAttemptAtomic(userId: unknown): Promise<void> {
  const updated = await PlatformUserModel.findOneAndUpdate(
    { _id: userId },
    { $inc: { failed_login_count: 1 } },
    { new: true },
  ).lean<{ failed_login_count: number; locked_until: Date | null } | null>();
  if (!updated) return;
  if (updated.failed_login_count >= MAX_FAILED_ATTEMPTS && !updated.locked_until) {
    await PlatformUserModel.updateOne(
      { _id: userId },
      { $set: { locked_until: new Date(Date.now() + LOCKOUT_DURATION_MS) } },
    );
  }
}
