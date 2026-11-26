import type { PermissionModule } from "@erp/rbac";

export const PARTNER_PERMISSIONS = {
  partnerRead: "partner:partner:read",
  partnerWrite: "partner:partner:write",
  partnerDelete: "partner:partner:delete",
  erdeklodoRead: "partner:erdeklodo:read",
  erdeklodoWrite: "partner:erdeklodo:write",
  erdeklodoDelete: "partner:erdeklodo:delete",
} as const;

export const partnerPermissions: PermissionModule = {
  moduleKey: "partner",
  permissions: [
    {
      key: PARTNER_PERMISSIONS.partnerRead,
      label: "Partnerek megtekintése",
      group: "partner",
      isSystem: true,
    },
    {
      key: PARTNER_PERMISSIONS.partnerWrite,
      label: "Partnerek kezelése",
      group: "partner",
      description:
        "Partnerek felvétele, adatainak, kapcsolattartóinak és árazási profiljának módosítása",
      isSystem: true,
    },
    {
      key: PARTNER_PERMISSIONS.partnerDelete,
      label: "Partnerek archiválása",
      group: "partner",
      description: "Partner archiválása (indoklással) és visszaállítása",
      isSystem: true,
    },
    {
      key: PARTNER_PERMISSIONS.erdeklodoRead,
      label: "Érdeklődők megtekintése",
      group: "partner",
      isSystem: true,
    },
    {
      key: PARTNER_PERMISSIONS.erdeklodoWrite,
      label: "Érdeklődők kezelése",
      group: "partner",
      description:
        "Érdeklődők felvétele, állapotváltás, tevékenységek rögzítése, partnerré alakítás",
      isSystem: true,
    },
    {
      key: PARTNER_PERMISSIONS.erdeklodoDelete,
      label: "Érdeklődők archiválása",
      group: "partner",
      description: "Érdeklődő archiválása (indoklással) és visszaállítása",
      isSystem: true,
    },
  ],
  roleTemplates: [
    {
      key: "partner-olvaso",
      name: "Partner (csak olvasás)",
      description: "Partnerek és érdeklődők megtekintése",
      permissionKeys: [
        PARTNER_PERMISSIONS.partnerRead,
        PARTNER_PERMISSIONS.erdeklodoRead,
      ],
      isSystem: false,
    },
    {
      key: "partner-kezelo",
      name: "Partnerkezelő",
      description: "Partnerek és érdeklődők teljes körű kezelése",
      permissionKeys: Object.values(PARTNER_PERMISSIONS),
      isSystem: false,
    },
  ],
};

/** Any of these opens the Partnerek sidebar group. */
export const PARTNER_MODUL_KULCSOK = [
  PARTNER_PERMISSIONS.partnerRead,
  PARTNER_PERMISSIONS.erdeklodoRead,
] as const;
