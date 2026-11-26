import { connectDB, User } from "@erp/db-core";
import type { SecretViewer } from "@erp/secrets";

/**
 * The session user in the shape `secretsApi` takes. The session carries only permission keys, so
 * the role ids (needed for role shares) are read from the DB on every call.
 */
export async function toSecretViewer(user: {
  id: string;
  name?: string;
  permissions: string[];
}): Promise<SecretViewer & { userName?: string }> {
  await connectDB();
  const doc = await User.findById(user.id).select("roleIds").lean().exec();
  return {
    userId: user.id,
    userName: user.name,
    permissions: user.permissions,
    roleIds: (doc?.roleIds ?? []).map(String),
  };
}
