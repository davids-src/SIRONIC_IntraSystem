import { connectDB, Permission, Role, User } from "@erp/db-core";

export async function getEffectivePermissionKeys(userId: string): Promise<Set<string>> {
  return (await getSessionAccess(userId)).permissions;
}

/**
 * What a session may do, from one read of the user: its keys, and whether the account is still
 * active at all. A deactivated account keeps a valid JWT until it expires, so "active" has to be
 * re-read on every request — an empty key set alone would still let it reach pages that are
 * gated by ownership rather than by a key (e.g. `/hr/sajat`).
 */
export async function getSessionAccess(
  userId: string,
): Promise<{ active: boolean; permissions: Set<string> }> {
  await connectDB();

  const user = await User.findById(userId)
    .populate({
      path: "roleIds",
      populate: { path: "permissionIds" },
    })
    .exec();

  if (!user || !user.isActive) {
    return { active: false, permissions: new Set() };
  }

  const keys = new Set<string>(user.directPermissionKeys ?? []);

  for (const role of user.roleIds as unknown as Array<{
    permissionIds?: Array<{ key: string }>;
  }>) {
    if (role?.permissionIds) {
      for (const perm of role.permissionIds) {
        if (perm?.key) keys.add(perm.key);
      }
    }
  }

  return { active: true, permissions: keys };
}

export async function userHasPermission(
  userId: string,
  permissionKey: string,
): Promise<boolean> {
  const keys = await getEffectivePermissionKeys(userId);
  return keys.has(permissionKey);
}

export async function userHasAnyPermission(
  userId: string,
  permissionKeys: string[],
): Promise<boolean> {
  const keys = await getEffectivePermissionKeys(userId);
  return permissionKeys.some((key) => keys.has(key));
}

export async function getAllPermissions() {
  await connectDB();
  return Permission.find().sort({ group: 1, key: 1 }).exec();
}

export async function getAllRolesWithPermissions() {
  await connectDB();
  return Role.find().populate("permissionIds").sort({ name: 1 }).exec();
}
