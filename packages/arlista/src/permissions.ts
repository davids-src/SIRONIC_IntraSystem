import type { PermissionModule } from "@erp/rbac";

export const arlistaPermissions: PermissionModule = {
  moduleKey: "arlista",
  permissions: [
    {
      key: "arlista:termek:read",
      label: "Termék árlista megtekintése",
      group: "arlista",
      description:
        "Termék-, munkadíj- és csomag-árlista megtekintése (a beszerzési adatok nélkül)",
      isSystem: true,
    },
    {
      key: "arlista:termek:write",
      label: "Termék árlista kezelése",
      group: "arlista",
      description: "Tételek felvétele, szerkesztése, archiválása és visszaállítása",
      isSystem: true,
    },
    {
      key: "arlista:termek:delete",
      label: "Termék árlista végleges törlése",
      group: "arlista",
      description: "Önálló jogosultság — nem jár az arlista:termek:write-tal",
      isSystem: true,
    },
    {
      key: "arlista:szolgaltatas:read",
      label: "Szolgáltatás árlista megtekintése",
      group: "arlista",
      description: "Szolgáltatások, kategóriák, ármátrix és árbontás megtekintése",
      isSystem: true,
    },
    {
      key: "arlista:szolgaltatas:write",
      label: "Szolgáltatás árlista kezelése",
      group: "arlista",
      description: "Szolgáltatások és kategóriák felvétele, szerkesztése, archiválása",
      isSystem: true,
    },
    {
      key: "arlista:szolgaltatas:delete",
      label: "Szolgáltatás árlista végleges törlése",
      group: "arlista",
      description: "Önálló jogosultság — nem jár az arlista:szolgaltatas:write-tal",
      isSystem: true,
    },
    {
      key: "arlista:beallitas:write",
      label: "Árképzési beállítások kezelése",
      group: "arlista",
      description:
        "A szorzó-mátrix, az óradíjak, a sürgősségi szorzók és az ÁFA beállítása — minden szolgáltatás ára változik tőle",
      isSystem: true,
    },
    {
      key: "arlista:beszerzes:read",
      label: "Beszerzési adatok megtekintése",
      group: "arlista",
      description:
        "A termékek titkos beszerzési adatai (beszállító, beszerzési ár) — önálló jogosultság, nem jár a termek:read-del",
      isSystem: true,
    },
    {
      key: "arlista:beszerzes:write",
      label: "Beszerzési adatok kezelése",
      group: "arlista",
      description: "Beszerzési rekordok rögzítése és törlése — önálló jogosultság",
      isSystem: true,
    },
  ],
  roleTemplates: [
    {
      key: "viewer",
      name: "Viewer",
      description: "Read-only access",
      permissionKeys: ["arlista:termek:read", "arlista:szolgaltatas:read"],
      isSystem: true,
    },
    {
      key: "arlista-vezeto",
      name: "Árlista vezető",
      description:
        "Teljes hozzáférés az árlistához. A beszerzési adatok (beszerzes:read/write) és a végleges törlés nem része automatikusan — önálló jogosultságként osztható ki.",
      permissionKeys: [
        "arlista:termek:read",
        "arlista:termek:write",
        "arlista:szolgaltatas:read",
        "arlista:szolgaltatas:write",
        "arlista:beallitas:write",
      ],
      isSystem: false,
    },
  ],
};
