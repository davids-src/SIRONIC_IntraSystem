import type { PermissionModule } from "@erp/rbac";
import { INFRA_PERMISSIONS as P } from "./constants";

const perm = (key: string, label: string, group: string, description: string) => ({
  key,
  label,
  group,
  description,
  isSystem: true,
});

export const infraPermissions: PermissionModule = {
  moduleKey: "infra",
  permissions: [
    perm(
      P.stackRead,
      "Stackek megtekintése",
      "stack",
      "Stackek, konténerek, image-ek, naplók és az infra áttekintő (a compose/env tartalma nélkül)",
    ),
    perm(
      P.stackWrite,
      "Stackek szerkesztése",
      "stack",
      "Compose és környezeti változók megtekintése és módosítása, új stack létrehozása, partner/típus beállítása",
    ),
    perm(
      P.stackMuvelet,
      "Stack műveletek",
      "stack",
      "Image frissítés (pull + újratelepítés), indítás, leállítás, konténer újraindítás, szinkron — a Portainer felé módosít",
    ),
    perm(
      P.stackDelete,
      "Stackek törlése",
      "stack",
      "Stack végleges törlése a Portainerből",
    ),
    perm(
      P.oldalRead,
      "Oldalak megtekintése",
      "oldal",
      "Az oldalak (domain → stack szolgáltatás) listája, ellenőrzése",
    ),
    perm(
      P.oldalWrite,
      "Oldalak kezelése",
      "oldal",
      "Oldal felvétele és módosítása — a Cloudflare DNS, az NPM proxy és az SSL tanúsítvány felé módosít",
    ),
    perm(
      P.oldalDelete,
      "Oldalak törlése",
      "oldal",
      "Oldal törlése (NPM proxy host, opcionálisan DNS rekord)",
    ),
    perm(
      P.sablonRead,
      "Stack sablonok megtekintése",
      "sablon",
      "A stack sablonok (compose + alapértelmezett env) listája",
    ),
    perm(
      P.sablonWrite,
      "Stack sablonok kezelése",
      "sablon",
      "Sablon felvétele és módosítása",
    ),
    perm(P.sablonDelete, "Stack sablonok törlése", "sablon", "Sablon törlése"),
    perm(
      P.webhelyRead,
      "Webhelyek megtekintése",
      "webhely",
      "WordPress és FTP-s webhelyek nyilvántartása, partnerhez rendelése",
    ),
    perm(
      P.webhelyWrite,
      "Webhelyek kezelése",
      "webhely",
      "Webhely felvétele, módosítása, partnerhez rendelése, ellenőrzése",
    ),
    perm(
      P.webhelyDelete,
      "Webhelyek törlése",
      "webhely",
      "Webhely és a hozzá tartozó hozzáférések törlése",
    ),
    perm(
      P.hozzaferesRead,
      "Hozzáférések megtekintése",
      "webhely",
      "A webhelyek FTP/SFTP/admin belépéseinek listája (jelszó nélkül)",
    ),
    perm(
      P.hozzaferesWrite,
      "Hozzáférések kezelése",
      "webhely",
      "Belépés felvétele, módosítása, jelszó cseréje, törlése",
    ),
    perm(
      P.hozzaferesTitkos,
      "Hozzáférés jelszavának megtekintése",
      "webhely",
      "Eltárolt jelszó felfedése/másolása — minden megtekintés naplózódik",
    ),
    perm(
      P.integracioRead,
      "Integrációk megtekintése",
      "integracio",
      "A kapcsolatok listája és állapota (a hitelesítő adatok soha nem láthatók)",
    ),
    perm(
      P.integracioWrite,
      "Integrációk kezelése",
      "integracio",
      "Kapcsolat felvétele, hitelesítő adatok cseréje, teszt",
    ),
    perm(P.integracioDelete, "Integrációk törlése", "integracio", "Kapcsolat törlése"),
  ],
  roleTemplates: [
    {
      key: "infra-viewer",
      name: "Infra megtekintő",
      description: "Csak olvasás: stackek, konténerek, oldalak, naplók.",
      permissionKeys: [
        P.stackRead,
        P.oldalRead,
        P.integracioRead,
        P.sablonRead,
        P.webhelyRead,
      ],
      isSystem: true,
    },
    {
      key: "infra-operator",
      name: "Infra üzemeltető",
      description:
        "Stack műveletek (frissítés, újraindítás) és oldalak kezelése; a compose-t is szerkesztheti.",
      permissionKeys: [
        P.stackRead,
        P.stackWrite,
        P.stackMuvelet,
        P.oldalRead,
        P.oldalWrite,
        P.integracioRead,
        P.sablonRead,
        P.sablonWrite,
        P.webhelyRead,
        P.webhelyWrite,
        P.hozzaferesRead,
        P.hozzaferesWrite,
      ],
      isSystem: false,
    },
    {
      key: "infra-admin",
      name: "Infra adminisztrátor",
      description:
        "Minden infra-jogosultság: törlés és az integrációk hitelesítő adatainak kezelése.",
      permissionKeys: Object.values(P),
      isSystem: false,
    },
  ],
};
