import { requirePermission } from "@erp/auth";
import { projektApi } from "@erp/projekt";
import { PROJEKT_PERMISSIONS as P } from "@erp/projekt/client";
import { FormPage } from "../../_components/layout";
import { KoltsegForm } from "../../_components/koltseg-form";

export default async function UjKoltsegPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(P.koltsegWrite);
  const params = await searchParams;
  const projektek = await projektApi.listProjektOpciok();
  return (
    <FormPage
      title="Új költség"
      subtitle="A *-gal jelölt mezők kötelezők."
      backHref="/projekt/koltsegek"
      backLabel="Vissza a költségekhez"
    >
      <KoltsegForm
        projektek={projektek}
        projektId={typeof params.projektId === "string" ? params.projektId : undefined}
      />
    </FormPage>
  );
}
