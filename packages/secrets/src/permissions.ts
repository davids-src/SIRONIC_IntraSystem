import type { PermissionModule } from "@erp/rbac";
import { SECRETS_PERMISSIONS as P } from "./constants";

export const secretsPermissions: PermissionModule = {
  moduleKey: "secrets",
  permissions: [
    {
      key: P.read,
      label: "Titkok megtekintése",
      group: "secrets",
      description: "A saját és a megosztott titkok listája (érték nélkül)",
      isSystem: true,
    },
    {
      key: P.write,
      label: "Titkok kezelése",
      group: "secrets",
      description:
        "Titok létrehozása, valamint a sajátjának / szerkesztésre megosztottnak módosítása",
      isSystem: true,
    },
    {
      key: P.delete,
      label: "Titkok törlése",
      group: "secrets",
      description: "A saját titok végleges törlése",
      isSystem: true,
    },
    {
      key: P.share,
      label: "Titkok megosztása",
      group: "secrets",
      description: "A saját titok megosztása felhasználókkal és szerepkörökkel",
      isSystem: true,
    },
    {
      key: P.reveal,
      label: "Titkok értékének megjelenítése",
      group: "secrets",
      description: "Az érték visszafejtése és megjelenítése (naplózva)",
      isSystem: true,
    },
  ],
  roleTemplates: [
    {
      key: "secrets-kezelo",
      name: "Titoktár kezelő",
      permissionKeys: [P.read, P.write, P.delete, P.share, P.reveal],
    },
  ],
};
