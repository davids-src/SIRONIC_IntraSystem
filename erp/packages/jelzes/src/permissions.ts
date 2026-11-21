import type { PermissionModule } from "@erp/rbac";
import { JELZES_PERMISSIONS } from "./constants";

/**
 * Receiving and reading Jelzések needs no key — everyone has a bell. Sending a körüzenet or a
 * frissítési jegyzet does; the built-in admin role gets it automatically (it covers every
 * registered key).
 */
export const jelzesPermissions: PermissionModule = {
  moduleKey: "jelzes",
  permissions: [
    {
      key: JELZES_PERMISSIONS.kuld,
      label: "Körüzenet küldése",
      group: "jelzes",
      description:
        "Jelzés (körüzenet, frissítési jegyzet) küldése felhasználóknak, szerepköröknek, jogosultság birtokosainak vagy mindenkinek",
      isSystem: true,
    },
  ],
};
