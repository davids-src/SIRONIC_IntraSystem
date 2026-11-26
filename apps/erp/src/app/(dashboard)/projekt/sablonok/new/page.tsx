import { requirePermission } from "@erp/auth";
import { PROJEKT_PERMISSIONS as P } from "@erp/projekt/client";
import { FormPage } from "../../_components/layout";
import { SablonForm } from "../../_components/sablon-form";

export default async function UjSablonPage() {
  await requirePermission(P.sablonWrite);
  return (
    <FormPage
      title="Új ellenőrzőlista-sablon"
      subtitle="A *-gal jelölt mezők kötelezők."
      backHref="/projekt/sablonok"
      backLabel="Vissza a sablonokhoz"
    >
      <SablonForm />
    </FormPage>
  );
}
