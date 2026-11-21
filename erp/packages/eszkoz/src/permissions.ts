import type { PermissionModule } from "@erp/rbac";

export const eszkozPermissions: PermissionModule = {
  moduleKey: "eszkoz",
  permissions: [
    {
      key: "eszkoz:eszkoz:read",
      label: "Eszközök megtekintése",
      group: "eszkoz",
      description: "Az eszközlista, az adatlapok és a mozgásnapló megtekintése",
      isSystem: true,
    },
    {
      key: "eszkoz:eszkoz:write",
      label: "Eszközök kezelése",
      group: "eszkoz",
      description:
        "Eszköz felvétele és szerkesztése, szerviz indítása és lezárása, elveszettnek jelölés, kivonás",
      isSystem: true,
    },
    {
      key: "eszkoz:eszkoz:kiad",
      label: "Eszközök kiadása és visszavétele",
      group: "eszkoz",
      description:
        "Eszköz kiadása egy kollégának és visszavétele — önálló jogosultság, nem jár az eszkoz:eszkoz:write-tal",
      isSystem: true,
    },
    {
      key: "eszkoz:eszkoz:delete",
      label: "Eszközök törlése",
      group: "eszkoz",
      description:
        "Eszköz végleges törlése — csak mozgásnapló nélküli eszköznél, egyébként kivonni kell. Önálló jogosultság, nem jár az eszkoz:eszkoz:write-tal",
      isSystem: true,
    },
  ],
  roleTemplates: [
    {
      key: "viewer",
      name: "Viewer",
      description: "Read-only access",
      permissionKeys: ["eszkoz:eszkoz:read"],
      isSystem: true,
    },
    {
      key: "eszkoz-felelos",
      name: "Eszközfelelős",
      description:
        "Teljes hozzáférés az Eszközök modulhoz: felvétel, szerkesztés, kiadás/visszavétel, szerviz, kivonás és törlés.",
      permissionKeys: [
        "eszkoz:eszkoz:read",
        "eszkoz:eszkoz:write",
        "eszkoz:eszkoz:kiad",
        "eszkoz:eszkoz:delete",
      ],
      isSystem: false,
    },
  ],
};
