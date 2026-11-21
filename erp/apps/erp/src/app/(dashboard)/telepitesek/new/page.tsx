import { requirePermission } from "@erp/auth";
import { deploymentsApi } from "@erp/deployments";
import { partnerApi } from "@erp/partner";
import { FormPage } from "../../eszkoz/_components/form/form-layout";
import { MezoForm } from "../_components/mezo-form";
import { telepitesSzekciok } from "../_components/urlap-mezok";
import { createTelepitesAction } from "../actions";

export default async function UjTelepitesPage() {
  await requirePermission("deployments:telepites:write");
  const [partnerek, sablonok, csomagok] = await Promise.all([
    partnerApi.listPartnerOptions(),
    deploymentsApi.listSablonValaszto(),
    deploymentsApi.listCsomagValaszto(),
  ]);
  return (
    <FormPage
      title="Új telepítés"
      subtitle="A név és a domain kötelező; a többi később is kitölthető. A lépéseket az adatlapon futtathatod."
      backHref="/telepitesek"
      backLabel="Vissza a telepítésekhez"
      width="max-w-4xl"
    >
      <MezoForm
        action={createTelepitesAction}
        szekciok={telepitesSzekciok({
          partnerek,
          sablonok,
          csomagok: csomagok.map((c) => ({ id: c.id, nev: c.nev })),
        })}
        ertekek={{
          wwwAtiranyitas: true,
          celSema: "http",
          dnsTipus: "A",
          imageTag: "latest",
          workflowRef: "main",
        }}
        submitLabel="Telepítés létrehozása"
        redirectTo="/telepitesek/{id}"
      />
    </FormPage>
  );
}
