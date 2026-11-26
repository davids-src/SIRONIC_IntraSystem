import type { PermissionModule } from "@erp/rbac";
import { ERTEKESITES_PERMISSIONS as P } from "./constants";

export { ERTEKESITES_PERMISSIONS } from "./constants";

export const ertekesitesPermissions: PermissionModule = {
  moduleKey: "ertekesites",
  permissions: [
    {
      key: P.ajanlatRead,
      label: "Ajánlatok megtekintése",
      group: "ertekesites",
      isSystem: true,
    },
    {
      key: P.ajanlatWrite,
      label: "Ajánlatok kezelése",
      group: "ertekesites",
      description:
        "Ajánlat felvétele, piszkozat szerkesztése, állapotváltás (küldés nélkül), archiválás; a fedezet is látszik",
      isSystem: true,
    },
    {
      key: P.ajanlatKuld,
      label: "Ajánlat kiküldése",
      group: "ertekesites",
      description: "Az ajánlat „Elküldve” állapotba állítása — önálló jogosultság",
      isSystem: true,
    },
    {
      key: P.ajanlatDelete,
      label: "Ajánlat archiválás visszaállítása",
      group: "ertekesites",
      description: "Archivált ajánlat visszaállítása — önálló jogosultság",
      isSystem: true,
    },
    {
      key: P.szerzodesRead,
      label: "Szerződések megtekintése",
      group: "ertekesites",
      isSystem: true,
    },
    {
      key: P.szerzodesWrite,
      label: "Szerződések és sablonok kezelése",
      group: "ertekesites",
      description:
        "Szerződés felvétele, piszkozat szerkesztése, állapotváltás, sablonok kezelése",
      isSystem: true,
    },
    {
      key: P.szerzodesDelete,
      label: "Szerződés törlése",
      group: "ertekesites",
      description: "Szerződés „Törölt” állapotba állítása — önálló jogosultság",
      isSystem: true,
    },
    {
      key: P.megrendeloRead,
      label: "Megrendelőlapok megtekintése",
      group: "ertekesites",
      isSystem: true,
    },
    {
      key: P.megrendeloWrite,
      label: "Megrendelőlapok kezelése",
      group: "ertekesites",
      description: "Megrendelőlap felvétele, szerkesztése, küldése és teljesítése",
      isSystem: true,
    },
    {
      key: P.megrendeloDelete,
      label: "Megrendelőlap törlése",
      group: "ertekesites",
      description: "Megrendelőlap törlése / archiválása — önálló jogosultság",
      isSystem: true,
    },
  ],
  roleTemplates: [
    {
      key: "viewer",
      name: "Viewer",
      description: "Read-only access",
      permissionKeys: [P.ajanlatRead, P.szerzodesRead, P.megrendeloRead],
      isSystem: true,
    },
    {
      key: "ertekesites-vezeto",
      name: "Értékesítési vezető",
      description:
        "Ajánlatok, szerződések és megrendelőlapok teljes kezelése, ajánlat kiküldése. A törlés/visszaállítás önálló jogosultság.",
      permissionKeys: [
        P.ajanlatRead,
        P.ajanlatWrite,
        P.ajanlatKuld,
        P.szerzodesRead,
        P.szerzodesWrite,
        P.megrendeloRead,
        P.megrendeloWrite,
      ],
      isSystem: false,
    },
  ],
};
