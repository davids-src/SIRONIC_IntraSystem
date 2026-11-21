import type { PermissionModule } from "@erp/rbac";
import { DEPLOYMENTS_PERMISSIONS as P } from "./constants";

const perm = (key: string, label: string, group: string, description: string) => ({
  key,
  label,
  group,
  description,
  isSystem: true,
});

export const deploymentsPermissions: PermissionModule = {
  moduleKey: "deployments",
  permissions: [
    perm(P.telepitesRead, "Telepítések megtekintése", "telepites", "A telepítések listája, adatlapja, lépései és eseménynaplója"),
    perm(P.telepitesWrite, "Telepítések kezelése", "telepites", "Telepítés felvétele és szerkesztése, lejáratok, kihagyás, archiválás és visszaállítás"),
    perm(P.telepitesDelete, "Telepítések törlése", "telepites", "Végleges törlés (csak el nem indított telepítésnél), lépés-függőség felülírása"),
    perm(P.telepitesFuttat, "Telepítési lépések futtatása", "telepites", "Lépések futtatása, adoptálása, ellenőrzése — a szolgáltatók (Cloudflare, NPM, Portainer, GitHub) felé módosít"),
    perm(P.csomagRead, "Csomagok megtekintése", "csomag", "A számlázási csomagok listája"),
    perm(P.csomagWrite, "Csomagok kezelése", "csomag", "Csomag felvétele és szerkesztése"),
    perm(P.csomagDelete, "Csomagok törlése", "csomag", "Csomag végleges törlése"),
    perm(P.fizetesRead, "Fizetések megtekintése", "fizetes", "A díjak és a késedelmes fizetések tábla"),
    perm(P.fizetesWrite, "Fizetések kezelése", "fizetes", "Időszakok generálása, fizetettnek jelölés, számlázási beállítások"),
    perm(P.fizetesDelete, "Fizetések elengedése", "fizetes", "Díj elengedése (waive)"),
    perm(P.integracioRead, "Integrációk megtekintése", "integracio", "A kapcsolatok listája és állapota (a hitelesítő adatok soha nem láthatók)"),
    perm(P.integracioWrite, "Integrációk kezelése", "integracio", "Kapcsolat felvétele, hitelesítő adatok cseréje, teszt"),
    perm(P.integracioDelete, "Integrációk törlése", "integracio", "Kapcsolat törlése"),
    perm(P.sablonRead, "Stack sablonok megtekintése", "sablon", "A Portainer stack sablonok listája"),
    perm(P.sablonWrite, "Stack sablonok kezelése", "sablon", "Sablon felvétele és szerkesztése"),
    perm(P.sablonDelete, "Stack sablonok törlése", "sablon", "Sablon törlése"),
  ],
  roleTemplates: [
    {
      key: "viewer",
      name: "Viewer",
      description: "Read-only access",
      permissionKeys: [P.telepitesRead, P.csomagRead, P.fizetesRead, P.sablonRead],
      isSystem: true,
    },
    {
      key: "telepites-operator",
      name: "Telepítés-üzemeltető",
      description:
        "Telepítések kezelése és a lépések futtatása; fizetések kezelése; az integrációkat csak látja.",
      permissionKeys: [
        P.telepitesRead,
        P.telepitesWrite,
        P.telepitesFuttat,
        P.csomagRead,
        P.fizetesRead,
        P.fizetesWrite,
        P.integracioRead,
        P.sablonRead,
        P.sablonWrite,
      ],
      isSystem: false,
    },
    {
      key: "telepites-admin",
      name: "Telepítés adminisztrátor",
      description:
        "Minden telepítés-jogosultság: törlés, csomagok, elengedés, integrációk és hitelesítő adatok kezelése.",
      permissionKeys: Object.values(P),
      isSystem: false,
    },
  ],
};
