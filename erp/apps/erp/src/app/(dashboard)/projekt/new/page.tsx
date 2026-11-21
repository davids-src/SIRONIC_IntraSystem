import { requirePermission } from "@erp/auth";
import { partnerApi } from "@erp/partner";
import { projektApi } from "@erp/projekt";
import { PROJEKT_PERMISSIONS as P } from "@erp/projekt/client";
import { FormPage } from "../_components/layout";
import { ProjektForm } from "../_components/projekt-form";

export default async function UjProjektPage() {
  await requirePermission(P.projektWrite);
  const [partnerek, felhasznalok] = await Promise.all([
    partnerApi.listPartnerOptions(),
    projektApi.listFelhasznalok(),
  ]);
  return (
    <FormPage
      title="Új projekt"
      subtitle="A *-gal jelölt mezők kötelezők. Fázisokat és ellenőrzőlistát a projekt adatlapján vehetsz fel."
      backHref="/projekt"
      backLabel="Vissza a projektekhez"
    >
      <ProjektForm partnerek={partnerek} felhasznalok={felhasznalok} />
    </FormPage>
  );
}
