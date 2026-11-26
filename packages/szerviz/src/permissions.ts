import type { PermissionModule } from "@erp/rbac";
import { SZERVIZ_PERMISSIONS as P } from "./constants";

export { SZERVIZ_PERMISSIONS } from "./constants";

export const szervizPermissions: PermissionModule = {
  moduleKey: "szerviz",
  permissions: [
    {
      key: P.hibajegyRead,
      label: "Hibajegyek megtekintése",
      group: "szerviz",
      isSystem: true,
    },
    {
      key: P.hibajegyWrite,
      label: "Hibajegyek kezelése",
      group: "szerviz",
      description:
        "Hibajegy felvétele, szerkesztése, állapotváltás, felelős kijelölése, megjegyzés, archiválás",
      isSystem: true,
    },
    {
      key: P.hibajegyDelete,
      label: "Hibajegy archiválás visszaállítása",
      group: "szerviz",
      description: "Archivált hibajegy visszaállítása — önálló jogosultság",
      isSystem: true,
    },
    {
      key: P.hibajegyBelso,
      label: "Belső hibajegy-megjegyzések",
      group: "szerviz",
      description:
        "A hibajegyek belső megjegyzéseinek és belső jegyzetének látása és írása",
      isSystem: true,
    },
    {
      key: P.munkalapRead,
      label: "Munkalapok megtekintése",
      group: "szerviz",
      isSystem: true,
    },
    {
      key: P.munkalapWrite,
      label: "Munkalapok kezelése",
      group: "szerviz",
      description: "Munkalap felvétele, piszkozat szerkesztése, archiválás",
      isSystem: true,
    },
    {
      key: P.munkalapLezar,
      label: "Munkalap lezárása",
      group: "szerviz",
      description:
        "Munkalap lezárása és az anyagok kiadása a készletből — önálló jogosultság",
      isSystem: true,
    },
    {
      key: P.munkalapDelete,
      label: "Munkalap archiválás visszaállítása",
      group: "szerviz",
      isSystem: true,
    },
    {
      key: P.karbantartasRead,
      label: "Karbantartási tervek megtekintése",
      group: "szerviz",
      isSystem: true,
    },
    {
      key: P.karbantartasWrite,
      label: "Karbantartási tervek kezelése",
      group: "szerviz",
      description: "Terv felvétele, szerkesztése, hibajegy generálása, archiválás",
      isSystem: true,
    },
    {
      key: P.karbantartasDelete,
      label: "Karbantartási terv visszaállítása",
      group: "szerviz",
      isSystem: true,
    },
  ],
  roleTemplates: [
    {
      key: "viewer",
      name: "Viewer",
      description: "Read-only access",
      permissionKeys: [P.hibajegyRead, P.munkalapRead, P.karbantartasRead],
      isSystem: true,
    },
    {
      key: "szerviz-technikus",
      name: "Szerviz technikus",
      description:
        "Hibajegyek és munkalapok kezelése, munkalap lezárása. Belső megjegyzések és a törlés/visszaállítás önálló jogosultság.",
      permissionKeys: [
        P.hibajegyRead,
        P.hibajegyWrite,
        P.munkalapRead,
        P.munkalapWrite,
        P.munkalapLezar,
        P.karbantartasRead,
      ],
      isSystem: false,
    },
    {
      key: "szerviz-vezeto",
      name: "Szerviz vezető",
      description: "A szerviz modul teljes kezelése, belső megjegyzésekkel.",
      permissionKeys: [
        P.hibajegyRead,
        P.hibajegyWrite,
        P.hibajegyBelso,
        P.munkalapRead,
        P.munkalapWrite,
        P.munkalapLezar,
        P.karbantartasRead,
        P.karbantartasWrite,
      ],
      isSystem: false,
    },
  ],
};
