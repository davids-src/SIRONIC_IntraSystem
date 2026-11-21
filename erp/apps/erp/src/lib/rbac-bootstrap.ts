import {
  registerPermissionModule,
  ensurePermissionsSyncedOnce,
  ensurePermissionsSynced,
  getRegisteredModules,
} from "@erp/rbac";
import { enginePermissions } from "@erp/admin";
import { mediaPermissions } from "@erp/media";
import { jelzesPermissions } from "@erp/jelzes";
import { secretsPermissions } from "@erp/secrets";

[
  enginePermissions,
  mediaPermissions,
  jelzesPermissions,
  secretsPermissions,
  // Domain modules: add `<modul>Permissions` here (docs/05 §3).
].forEach(registerPermissionModule);

export { ensurePermissionsSyncedOnce as ensureRbacBootstrapped };

/** Force a re-sync regardless of the once-per-process guard (admin "sync now" action). */
export async function resyncRbac(): Promise<void> {
  await ensurePermissionsSynced(getRegisteredModules());
}
