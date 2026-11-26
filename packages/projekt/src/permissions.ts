import type { PermissionModule } from "@erp/rbac";

const P = (key: string, label: string, group: string, description: string) => ({
  key,
  label,
  group,
  description,
  isSystem: true,
});

export const projektPermissions: PermissionModule = {
  moduleKey: "projekt",
  permissions: [
    P(
      "projekt:projekt:read",
      "Projektek megtekintése",
      "projekt",
      "A projektlista, az adatlapok és az alaprajzok megtekintése",
    ),
    P(
      "projekt:projekt:write",
      "Projektek kezelése",
      "projekt",
      "Projekt felvétele és szerkesztése, fázisok, ellenőrzőlista, staging linkek, alaprajzok, archiválás és visszaállítás",
    ),
    P(
      "projekt:projekt:delete",
      "Projektek törlése",
      "projekt",
      "Projekt végleges törlése — csak költség nélküli projektnél, egyébként archiválni kell",
    ),
    P(
      "projekt:koltseg:read",
      "Projektköltségek megtekintése",
      "koltseg",
      "A projektekhez rögzített költségek megtekintése",
    ),
    P(
      "projekt:koltseg:write",
      "Projektköltségek rögzítése",
      "koltseg",
      "Költség rögzítése és szerkesztése, archiválás és visszaállítás",
    ),
    P(
      "projekt:koltseg:delete",
      "Projektköltségek törlése",
      "koltseg",
      "Költség végleges törlése",
    ),
    P(
      "projekt:hetiterv:read",
      "Heti tervek megtekintése",
      "hetiterv",
      "Bármely munkatárs heti tervének megtekintése (koordináció)",
    ),
    P(
      "projekt:hetiterv:write",
      "Saját heti terv kezelése",
      "hetiterv",
      "Heti terv felvétele és szerkesztése — kizárólag saját magad számára",
    ),
    P(
      "projekt:hetiterv:delegal",
      "Heti terv delegálása",
      "hetiterv",
      "Heti terv felvétele és szerkesztése bármely munkatárs számára",
    ),
    P(
      "projekt:sablon:read",
      "Ellenőrzőlista-sablonok megtekintése",
      "sablon",
      "A sablonlista megtekintése és sablon alkalmazása projektre",
    ),
    P(
      "projekt:sablon:write",
      "Ellenőrzőlista-sablonok kezelése",
      "sablon",
      "Sablon felvétele és szerkesztése, archiválás és visszaállítás",
    ),
    P(
      "projekt:sablon:delete",
      "Ellenőrzőlista-sablonok törlése",
      "sablon",
      "Sablon végleges törlése",
    ),
  ],
  roleTemplates: [
    {
      key: "viewer",
      name: "Viewer",
      description: "Read-only access",
      permissionKeys: ["projekt:projekt:read", "projekt:hetiterv:read"],
      isSystem: true,
    },
    {
      key: "projektvezeto",
      name: "Projektvezető",
      description:
        "Projektek, költségek, ellenőrzőlista-sablonok és saját heti terv teljes körű kezelése.",
      permissionKeys: [
        "projekt:projekt:read",
        "projekt:projekt:write",
        "projekt:koltseg:read",
        "projekt:koltseg:write",
        "projekt:hetiterv:read",
        "projekt:hetiterv:write",
        "projekt:sablon:read",
        "projekt:sablon:write",
      ],
      isSystem: false,
    },
    {
      key: "projekt-admin",
      name: "Projekt adminisztrátor",
      description:
        "Minden projekt-jogosultság, a törléssel és a heti terv delegálásával együtt.",
      permissionKeys: [
        "projekt:projekt:read",
        "projekt:projekt:write",
        "projekt:projekt:delete",
        "projekt:koltseg:read",
        "projekt:koltseg:write",
        "projekt:koltseg:delete",
        "projekt:hetiterv:read",
        "projekt:hetiterv:write",
        "projekt:hetiterv:delegal",
        "projekt:sablon:read",
        "projekt:sablon:write",
        "projekt:sablon:delete",
      ],
      isSystem: false,
    },
  ],
};
