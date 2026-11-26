import type { Model } from "mongoose";
import { PlatformUserModel } from "./models/platform-user";

export type PlatformUserRef = { _id: unknown; email: string };

/**
 * Upserts by email — the identity CRM needs here is just "the stable id OIDC login for
 * this person will produce as `sub`", not a password or any other credential. A person who
 * never logs into apps/auth (password_hash stays null) can still be referenced this way;
 * they'd use magic-link on apps/auth whenever they actually need to sign into a deployed
 * site, same email, no separate signup step.
 */
export async function findOrCreatePlatformUserByEmail(
  email: string,
  displayName: string | null = null,
  model: Model<any> = PlatformUserModel,
): Promise<PlatformUserRef> {
  const normalized = email.toLowerCase().trim();
  const existing = await model
    .findOne({ email: normalized })
    .lean<PlatformUserRef | null>();
  if (existing) return existing;
  try {
    const created = await model.create({ email: normalized, display_name: displayName });
    return { _id: created._id, email: created.email };
  } catch (e) {
    // Lost the create race to a concurrent caller — same atomic-claim shape as setup-lock.ts.
    if (
      e &&
      typeof e === "object" &&
      "code" in e &&
      (e as { code?: number }).code === 11000
    ) {
      const winner = await model
        .findOne({ email: normalized })
        .lean<PlatformUserRef | null>();
      if (winner) return winner;
    }
    throw e;
  }
}
