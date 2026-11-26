import {
  registerPermissionModule,
  ensurePermissionsSyncedOnce,
  ensurePermissionsSynced,
  getRegisteredModules,
} from "@erp/rbac";
import { enginePermissions } from "@erp/admin";
import { mediaPermissions } from "@erp/media";
import { jelzesPermissions } from "@erp/jelzes";
import { eszkozPermissions } from "@erp/eszkoz";
import { ertekesitesPermissions } from "@erp/ertekesites";
import { partnerPermissions } from "@erp/partner";
import { secretsPermissions } from "@erp/secrets";
import { arlistaPermissions } from "@erp/arlista";
import { projektPermissions } from "@erp/projekt";
import { keszletPermissions } from "@erp/keszlet";
import { szervizPermissions } from "@erp/szerviz";
import { bizonylatPermissions } from "@erp/bizonylat";
import { infraPermissions } from "@erp/infra";

[
  enginePermissions,
  mediaPermissions,
  jelzesPermissions,
  eszkozPermissions,
  partnerPermissions,
  secretsPermissions,
  arlistaPermissions,
  projektPermissions,
  keszletPermissions,
  ertekesitesPermissions,
  szervizPermissions,
  bizonylatPermissions,
  infraPermissions,
  // Domain modules: add `<modul>Permissions` here (docs/05 §3).
].forEach(registerPermissionModule);

export { ensurePermissionsSyncedOnce as ensureRbacBootstrapped };

/** Force a re-sync regardless of the once-per-process guard (admin "sync now" action). */
export async function resyncRbac(): Promise<void> {
  await ensurePermissionsSynced(getRegisteredModules());
}
