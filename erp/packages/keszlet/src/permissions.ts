import type { PermissionModule } from "@erp/rbac";

export const keszletPermissions: PermissionModule = {
  moduleKey: "keszlet",
  permissions: [
    {
      key: "keszlet:keszlet:read",
      label: "Készlet megtekintése",
      group: "keszlet",
      description:
        "Műszerfal, készletlista, raktárhelyek, mozgásnapló és leltárak megtekintése",
      isSystem: true,
    },
    {
      key: "keszlet:keszlet:write",
      label: "Raktárhelyek és készletbeállítások kezelése",
      group: "keszlet",
      description: "Raktárhelyek felvétele/szerkesztése, minimum készletszint beállítása",
      isSystem: true,
    },
    {
      key: "keszlet:bevetel:write",
      label: "Bevételezés",
      group: "keszlet",
      description: "Áru bevételezése a raktárba — önálló jogosultság",
      isSystem: true,
    },
    {
      key: "keszlet:foglalas:write",
      label: "Foglalás kezelése",
      group: "keszlet",
      description: "Készlet foglalása és a foglalás feloldása",
      isSystem: true,
    },
    {
      key: "keszlet:leltar:write",
      label: "Leltározás",
      group: "keszlet",
      description:
        "Leltár indítása, számolás rögzítése és lezárása (korrekciós mozgások)",
      isSystem: true,
    },
    {
      key: "keszlet:rma:read",
      label: "RMA ügyek megtekintése",
      group: "keszlet",
      description: "RMA lista és adatlapok",
      isSystem: true,
    },
    {
      key: "keszlet:rma:write",
      label: "RMA ügyek kezelése",
      group: "keszlet",
      description: "RMA ügy felvétele, állapotváltás, felelős kijelölése",
      isSystem: true,
    },
    {
      key: "keszlet:ertek:read",
      label: "Készletérték és beszerzési árak",
      group: "keszlet",
      description:
        "A készlet értéke és a beszerzési árak láthatósága — nélküle ezek sehol nem jelennek meg",
      isSystem: true,
    },
  ],
  roleTemplates: [
    {
      key: "viewer",
      name: "Viewer",
      description: "Read-only access",
      permissionKeys: ["keszlet:keszlet:read", "keszlet:rma:read"],
      isSystem: true,
    },
    {
      key: "raktaros",
      name: "Raktáros",
      description:
        "Raktárkezelés: bevételezés, foglalás, leltár, raktárhelyek és RMA — a beszerzési árak nélkül.",
      permissionKeys: [
        "keszlet:keszlet:read",
        "keszlet:keszlet:write",
        "keszlet:bevetel:write",
        "keszlet:foglalas:write",
        "keszlet:leltar:write",
        "keszlet:rma:read",
        "keszlet:rma:write",
      ],
      isSystem: false,
    },
    {
      key: "keszlet-vezeto",
      name: "Készletvezető",
      description: "Teljes hozzáférés a Készlet modulhoz, a készletértékkel együtt.",
      permissionKeys: [
        "keszlet:keszlet:read",
        "keszlet:keszlet:write",
        "keszlet:bevetel:write",
        "keszlet:foglalas:write",
        "keszlet:leltar:write",
        "keszlet:rma:read",
        "keszlet:rma:write",
        "keszlet:ertek:read",
      ],
      isSystem: false,
    },
  ],
};
