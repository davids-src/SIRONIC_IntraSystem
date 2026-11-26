import { connectDB, User } from "@erp/db-core";
import { decideOidcLink, type OidcIdentity, type OidcLinkDecision } from "./oidc";

/**
 * Resolves an IdP identity to a LOCAL user and, on first login, persists the link
 * (`User.platformUserId = sub`). Never creates users. Race-safe without transactions: the link
 * write only succeeds while the account is still unlinked.
 */
export async function linkOidcIdentity(
  identity: OidcIdentity,
): Promise<OidcLinkDecision> {
  await connectDB();

  const toSnapshot = (u: {
    _id: unknown;
    isActive: boolean;
    platformUserId?: string | null;
  }) => ({
    id: String(u._id),
    isActive: u.isActive,
    platformUserId: u.platformUserId ?? null,
  });

  const bySubDoc = identity.sub
    ? await User.findOne({ platformUserId: identity.sub }).lean().exec()
    : null;
  const email = identity.email?.trim().toLowerCase();
  const byEmailDoc =
    !bySubDoc && email ? await User.findOne({ email }).lean().exec() : null;

  const decision = decideOidcLink({
    identity: { ...identity, email },
    bySub: bySubDoc ? toSnapshot(bySubDoc) : null,
    byEmail: byEmailDoc ? toSnapshot(byEmailDoc) : null,
  });

  if (decision.ok && decision.action === "link") {
    const res = await User.updateOne(
      {
        _id: decision.userId,
        $or: [{ platformUserId: null }, { platformUserId: { $exists: false } }],
      },
      { $set: { platformUserId: identity.sub } },
    ).exec();
    if (res.modifiedCount !== 1) return { ok: false, reason: "link_conflict" };
  }
  return decision;
}
