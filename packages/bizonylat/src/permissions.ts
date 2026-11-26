import type { PermissionModule } from "@erp/rbac";
import { BIZONYLAT_PERMISSIONS as P } from "./constants";

export { BIZONYLAT_PERMISSIONS } from "./constants";

const group = "bizonylat";

export const bizonylatPermissions: PermissionModule = {
  moduleKey: "bizonylat",
  permissions: [
    {
      key: P.szallitolevelRead,
      label: "Szállítólevelek megtekintése",
      group,
      isSystem: true,
    },
    {
      key: P.szallitolevelWrite,
      label: "Szállítólevelek kezelése",
      group,
      description:
        "Szállítólevél felvétele, piszkozat szerkesztése, elérhetőség-ellenőrzés",
      isSystem: true,
    },
    {
      key: P.szallitolevelKiad,
      label: "Szállítólevél kiadása",
      group,
      description: "A szállítólevél kiadása a készletből — önálló jogosultság",
      isSystem: true,
    },
    {
      key: P.szallitolevelDelete,
      label: "Szállítólevél sztornózása és archiválása",
      group,
      description: "Sztornó, archiválás és visszaállítás — önálló jogosultság",
      isSystem: true,
    },
    {
      key: P.igazolasRead,
      label: "Teljesítésigazolások megtekintése",
      group,
      isSystem: true,
    },
    {
      key: P.igazolasWrite,
      label: "Teljesítésigazolások kezelése",
      group,
      description:
        "Igazolás felvétele, piszkozat szerkesztése; a beszerzési árak és a belső megjegyzés is látszik",
      isSystem: true,
    },
    {
      key: P.igazolasKuld,
      label: "Teljesítésigazolás kiküldése",
      group,
      description:
        "Aláíró hivatkozás generálása és kiküldése az ügyfélnek — önálló jogosultság",
      isSystem: true,
    },
    {
      key: P.igazolasDelete,
      label: "Teljesítésigazolás archiválása",
      group,
      description: "Archiválás és visszaállítás — önálló jogosultság",
      isSystem: true,
    },
    { key: P.szamlaRead, label: "Számlák megtekintése", group, isSystem: true },
    {
      key: P.szamlaWrite,
      label: "Számlák kezelése",
      group,
      description: "Számla piszkozat felvétele és szerkesztése, kézi állapotjelölés",
      isSystem: true,
    },
    {
      key: P.szamlaKiallit,
      label: "Számla kiállítása (Billingo)",
      group,
      description: "A piszkozat kiállítása a Billingóban — önálló jogosultság",
      isSystem: true,
    },
    {
      key: P.szamlaDelete,
      label: "Számla sztornózása és archiválása",
      group,
      description: "Sztornó, archiválás és visszaállítás — önálló jogosultság",
      isSystem: true,
    },
    {
      key: P.jotallasRead,
      label: "Jótállási jegyek megtekintése",
      group,
      isSystem: true,
    },
    {
      key: P.jotallasWrite,
      label: "Jótállási jegyek kezelése",
      group,
      description: "Jegy kiállítása, állapotváltás, a jogi szöveg szerkesztése",
      isSystem: true,
    },
    {
      key: P.jotallasDelete,
      label: "Jótállási jegy archiválása",
      group,
      description: "Archiválás és visszaállítás — önálló jogosultság",
      isSystem: true,
    },
  ],
  roleTemplates: [
    {
      key: "viewer",
      name: "Viewer",
      description: "Read-only access",
      permissionKeys: [P.szallitolevelRead, P.igazolasRead, P.szamlaRead, P.jotallasRead],
      isSystem: true,
    },
    {
      key: "bizonylat-kezelo",
      name: "Bizonylat-kezelő",
      description:
        "Szállítólevél, teljesítésigazolás, számla és jótállási jegy kezelése, kiadás és küldés. Sztornó/archiválás és Billingo-kiállítás önálló jogosultság.",
      permissionKeys: [
        P.szallitolevelRead,
        P.szallitolevelWrite,
        P.szallitolevelKiad,
        P.igazolasRead,
        P.igazolasWrite,
        P.igazolasKuld,
        P.szamlaRead,
        P.szamlaWrite,
        P.jotallasRead,
        P.jotallasWrite,
      ],
      isSystem: false,
    },
  ],
};
